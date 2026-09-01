import type {
  AncillaryBenchmark,
  CompetitorListing,
  CompetitorObservation,
  MarketReport,
  Provenance,
} from '@/types'
import { uid } from '@/lib/id'

/**
 * Reading the fortnightly competitor report.
 *
 * The watch arrives as a written HTML report rather than a data file, and that
 * is the right format for it — half of what it knows is prose. So this reads it
 * the way a person would: find the rate table, find the new-entrant table, find
 * the ancillary prices, and keep the argument around them intact rather than
 * throwing it away to get at the numbers.
 *
 * It is deliberately tolerant. The report is written by hand each fortnight and
 * its wording will drift, so nothing here depends on an exact phrase: sections
 * are found by heading text, columns by header name, and anything unrecognised
 * is reported as skipped instead of silently dropped. A report that half-parses
 * is more useful than one that throws.
 */

export type ReportParseResult = {
  report: MarketReport
  listings: CompetitorListing[]
  observations: CompetitorObservation[]
  benchmarks: AncillaryBenchmark[]
  /** rows the parser could not read, so nothing disappears quietly */
  skipped: { where: string; reason: string }[]
}

const MONTHS = [
  'january',
  'february',
  'march',
  'april',
  'may',
  'june',
  'july',
  'august',
  'september',
  'october',
  'november',
  'december',
]

/** "1 Sept 2026" / "18 Aug 2026" / "4–6 Oct 2026" → ISO, first date only. */
export function parseReportDate(text: string, fallbackYear: number): string | null {
  const cleaned = text.replace(/–|—/g, '-').trim()
  const match = cleaned.match(/(\d{1,2})\s*(?:-\s*\d{1,2}\s*)?([A-Za-z]{3,9})\.?\s*(\d{4})?/)
  if (!match) return null
  const day = Number(match[1])
  const monthName = match[2].toLowerCase()
  const index = MONTHS.findIndex((month) => month.startsWith(monthName.slice(0, 3)))
  if (index < 0 || !Number.isFinite(day)) return null
  const year = match[3] ? Number(match[3]) : fallbackYear
  return `${year}-${String(index + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`
}

/** "₱25,110" / "&#8369;6,710" / "₱1,200–1,800 pp" → the numbers in it. */
export function moneyRange(text: string): { low: number; high: number } | null {
  const numbers = text
    .replace(/,/g, '')
    .match(/\d+(?:\.\d+)?/g)
    ?.map(Number)
    .filter((value) => Number.isFinite(value) && value > 0)
  if (!numbers || numbers.length === 0) return null
  return { low: Math.min(...numbers), high: Math.max(...numbers) }
}

function money(text: string): number {
  return moneyRange(text)?.low ?? 0
}

/** "4.96 (76)" → rating and review count. */
export function parseRating(text: string): { rating: number; reviews: number } {
  const value = text.match(/(\d+(?:\.\d+)?)/)
  const count = text.match(/\((\d+)\)/)
  return { rating: value ? Number(value[1]) : 0, reviews: count ? Number(count[1]) : 0 }
}

/** "Entire home · 9g · 3BR/7bed/3ba" → the numbers a rate has to be read against. */
export function parseLayout(text: string): { maxGuests: number; bedrooms: number } {
  const guests = text.match(/(\d+)\s*\+?\s*g\b/i)
  const bedrooms = text.match(/(\d+)\s*BR\b/i)
  return {
    maxGuests: guests ? Number(guests[1]) : 0,
    bedrooms: bedrooms ? Number(bedrooms[1]) : 0,
  }
}

function roomIdOf(href: string): string {
  return href.match(/\/rooms\/(\d+)/)?.[1] ?? href.match(/\/profile\/(\d+)/)?.[1] ?? ''
}

function text(node: Element | null | undefined): string {
  return (node?.textContent ?? '').replace(/\s+/g, ' ').trim()
}

/** The heading whose text contains `needle`, and everything up to the next one. */
function sectionAfter(doc: Document, needle: string): Element[] {
  const headings = [...doc.querySelectorAll('h1, h2, h3')]
  const start = headings.find((heading) => text(heading).toLowerCase().includes(needle.toLowerCase()))
  if (!start) return []
  const out: Element[] = []
  let node = start.nextElementSibling
  while (node && !/^H[123]$/.test(node.tagName)) {
    out.push(node)
    node = node.nextElementSibling
  }
  return out
}

function tablesIn(nodes: Element[]): HTMLTableElement[] {
  const out: HTMLTableElement[] = []
  for (const node of nodes) {
    if (node.tagName === 'TABLE') out.push(node as HTMLTableElement)
    else out.push(...(node.querySelectorAll('table') as NodeListOf<HTMLTableElement>))
  }
  return out
}

/** Column index by header name, so a reordered table still reads correctly. */
function columnsOf(table: HTMLTableElement): (...names: string[]) => number {
  const headers = [...table.querySelectorAll('thead th')].map((cell) => text(cell).toLowerCase())
  return (...names: string[]) => {
    for (const name of names) {
      const index = headers.findIndex((header) => header.includes(name.toLowerCase()))
      if (index >= 0) return index
    }
    return -1
  }
}

export function proximityOf(tier: string): CompetitorListing['proximity'] {
  const key = tier.toLowerCase()
  if (key.includes('same island') || key.includes('nearest')) return 'same-island'
  if (key.includes('moderate') || key.includes('1–2') || key.includes('1-2')) return 'near'
  if (key.includes('farthest') || key.includes('2–3') || key.includes('2-3')) return 'far'
  if (key.includes('culion')) return 'same-island'
  if (key.includes('coron')) return 'near'
  if (key.includes('busuanga')) return 'far'
  return 'unknown'
}

/**
 * Whether a benchmark price is per person, per vehicle, or per day.
 *
 * Read from the rate itself first, then the item, then the notes — in that
 * order, because the notes routinely mention a second unit. "₱5,000–9,000 /
 * boat" is a group price whose note helpfully adds "~₱1,000–2,250 pp split 4–6
 * guests"; searching all three at once made it a per-person price and put a
 * whole boat charter next to a single island-hopping seat.
 */
export function basisOf(rate: string, note: string, item = ''): AncillaryBenchmark['basis'] {
  const readOne = (text: string): AncillaryBenchmark['basis'] => {
    const key = text.toLowerCase()
    if (/per group|\/ ?boat|\/ ?vehicle|per boat|per vehicle|\(\s*\d+\s*pax\s*\)|for \d+ pax/.test(key)) return 'group'
    if (/\bpp\b|per person|\/ ?person/.test(key)) return 'guest'
    if (/\/ ?day|per day/.test(key)) return 'day'
    return 'unknown'
  }
  for (const source of [rate, item, note]) {
    const found = readOne(source)
    if (found !== 'unknown') return found
  }
  return 'unknown'
}

function bulletsIn(nodes: Element[]): string[] {
  const out: string[] = []
  for (const node of nodes) {
    const items = node.tagName === 'LI' ? [node] : [...node.querySelectorAll('li')]
    for (const item of items) {
      const line = text(item)
      if (line) out.push(line)
    }
    if (items.length === 0 && (node.tagName === 'P' || node.classList.contains('take'))) {
      for (const paragraph of node.tagName === 'P' ? [node] : [...node.querySelectorAll('p')]) {
        const line = text(paragraph)
        if (line) out.push(line)
      }
    }
  }
  return out
}

/**
 * Reads one report.
 *
 * `known` lets a listing seen in an earlier report keep its identity, so a rate
 * observed a fortnight apart lands on the same listing and becomes a trend
 * rather than two unrelated rows. Matching is by Airbnb room id where there is
 * one and by name otherwise, since the new-entrant table has no links.
 */
export function parseCompetitorReport(
  html: string,
  fileName: string,
  known: CompetitorListing[] = [],
): ReportParseResult {
  const doc = new DOMParser().parseFromString(html, 'text/html')
  const skipped: { where: string; reason: string }[] = []
  const importedAt = new Date().toISOString()

  const title = text(doc.querySelector('h1')) || 'Competitor report'
  const sub = text(doc.querySelector('.sub')) || ''
  const fallbackYear = new Date().getFullYear()

  const reportedOn =
    parseReportDate(title.match(/refreshed ([^—·]+)/i)?.[1] ?? '', fallbackYear) ??
    parseReportDate(sub.match(/captured[^.]*on ([^,.]+)/i)?.[1] ?? '', fallbackYear) ??
    new Date().toISOString().slice(0, 10)

  // "live rates for a 2-night stay, 4–6 Oct 2026, 2 guests"
  const stay = sub.match(/(\d+)\s*-?\s*night/i)
  const partySize = sub.match(/(\d+)\s*guests?/i)
  const quotedFor =
    parseReportDate(sub.match(/,\s*([0-9]{1,2}\s*[–-]?\s*[0-9]{0,2}\s*[A-Za-z]{3,9}\.?\s*\d{4})/)?.[1] ?? '', fallbackYear) ?? ''

  const reportId = uid('rpt')
  const prov: Provenance = {
    importId: reportId,
    fileName,
    sheetName: `Competitor report · ${reportedOn}`,
    rowNumber: 0,
  }

  // --- what the report says, in its own words -------------------------------
  const changes = bulletsIn([...doc.querySelectorAll('.changed')])
  // The paragraph usually opens with its own "Bottom line:" label, which the
  // card already provides as a heading.
  const bottomLine = (text(doc.querySelector('.lede p')) || '').replace(/^bottom line[:—-]\s*/i, '')
  const takeaways = bulletsIn(sectionAfter(doc, 'what it means'))
  const triggers = bulletsIn(sectionAfter(doc, 'triggers'))

  const playbook: { heading: string; points: string[] }[] = []
  const playbookNodes = sectionAfter(doc, 'playbook')
  for (const heading of [...doc.querySelectorAll('h3')]) {
    const label = text(heading)
    if (!label || /triggers/i.test(label)) continue
    const owns = playbookNodes.some((node) => node === heading.nextElementSibling)
    if (!owns) continue
    const points: string[] = []
    let node = heading.nextElementSibling
    while (node && !/^H[123]$/.test(node.tagName)) {
      points.push(...bulletsIn([node]))
      node = node.nextElementSibling
    }
    if (points.length > 0) playbook.push({ heading: label, points })
  }

  // "Culion-area homes 121 → 125"
  const supply = changes.join(' ').match(/homes\s*(\d{2,4})\s*(?:→|->|&rarr;)\s*(\d{2,4})/i)

  const report: MarketReport = {
    id: reportId,
    reportedOn,
    quotedFor,
    nights: stay ? Number(stay[1]) : 0,
    guests: partySize ? Number(partySize[1]) : 0,
    title,
    bottomLine,
    changes,
    takeaways,
    playbook,
    triggers,
    supplyCount: supply ? Number(supply[2]) : null,
    supplyPrevious: supply ? Number(supply[1]) : null,
    sourceFile: fileName,
    importedAt,
  }

  // --- listings and their rates ---------------------------------------------
  const listings: CompetitorListing[] = []
  const observations: CompetitorObservation[] = []
  const byRoomId = new Map(known.filter((row) => row.roomId).map((row) => [row.roomId, row]))
  const byName = new Map(known.map((row) => [row.name.toLowerCase(), row]))
  const claimed = new Map<string, CompetitorListing>()

  /** One identity per listing across reports, created only when new. */
  const identify = (
    roomId: string,
    name: string,
    host: string,
    area: string,
    url: string,
    note: string,
    extra: Partial<CompetitorListing>,
  ): CompetitorListing => {
    const key = roomId || name.toLowerCase()
    const existing =
      claimed.get(key) ?? (roomId ? byRoomId.get(roomId) : undefined) ?? byName.get(name.toLowerCase())
    const listing: CompetitorListing = existing
      ? { ...existing, name: name || existing.name, host: host || existing.host, url: url || existing.url, ...extra }
      : {
          id: uid('cmp'),
          roomId,
          name,
          host,
          area,
          url,
          note,
          active: true,
          addedAt: reportedOn,
          ...extra,
        }
    claimed.set(key, listing)
    if (!listings.some((row) => row.id === listing.id)) listings.push(listing)
    return listing
  }

  const rateTables = tablesIn(sectionAfter(doc, 'pricing'))
  const boatTables = tablesIn(sectionAfter(doc, 'houseboat'))
  const newTables = tablesIn(sectionAfter(doc, 'new listings'))

  for (const [table, kind] of [
    ...rateTables.map((t) => [t, 'main'] as const),
    ...boatTables.map((t) => [t, 'boat'] as const),
    ...newTables.map((t) => [t, 'new'] as const),
  ]) {
    const at = columnsOf(table)
    const columns = {
      listing: at('listing', 'paolyn listing'),
      host: at('host'),
      type: at('type', 'capacity'),
      rated: at('rating'),
      rate: at('rate / night', 'rate'),
      delta: at('δ', 'Δ', 'vs aug', 'why it matters'),
      where: at('where'),
    }
    let tier = kind === 'boat' ? 'Coron — houseboats' : kind === 'new' ? 'New entrant' : ''

    for (const row of [...table.querySelectorAll('tbody tr')]) {
      const cells = [...row.querySelectorAll('td')]
      // A full-width cell is a tier heading, not a listing.
      if (cells.length === 1) {
        tier = text(cells[0])
        continue
      }
      const cell = (index: number) => (index >= 0 && index < cells.length ? text(cells[index]) : '')
      const nameCell = cells[columns.listing >= 0 ? columns.listing : 0]
      const link = nameCell?.querySelector('a')
      const name = text(nameCell)
        .replace(/^(YOU|NEW|BOAT|DAVID)\s+/i, '')
        .trim()
      if (!name) {
        skipped.push({ where: kind, reason: 'row has no listing name' })
        continue
      }

      const rateText = cell(columns.rate)
      const rateValue = money(rateText)
      const isMine = /\byou\b/i.test(text(nameCell).slice(0, 12))
      const where = cell(columns.where) || tier
      const shape = parseLayout(cell(columns.type))
      const stars = parseRating(cell(columns.rated))

      const listing = identify(
        roomIdOf(link?.getAttribute('href') ?? ''),
        name,
        cell(columns.host).split('·')[0].trim() || (kind === 'boat' ? 'Paolo' : ''),
        where,
        link?.getAttribute('href') ?? '',
        cell(columns.delta),
        {
          proximity: proximityOf(where),
          layout: cell(columns.type) || undefined,
          isMine: isMine || undefined,
        },
      )

      // A listing whose calendar is closed for the sampled dates has no rate to
      // record — but "Booked" is itself the strongest demand signal there is, so
      // the row is kept with a zero rate rather than dropped.
      const delta = cell(columns.delta)
      observations.push({
        id: uid('obs'),
        prov: { ...prov, rowNumber: observations.length + 1 },
        listingId: listing.id,
        observedOn: reportedOn,
        quotedFor: report.quotedFor,
        nights: report.nights,
        guests: report.guests,
        nightlyRate: rateValue,
        cleaningFee: 0,
        currency: 'PHP',
        bedrooms: shape.bedrooms,
        maxGuests: shape.maxGuests,
        rating: stars.rating,
        reviewCount: stars.reviews,
        nightsBookedNext90: 0,
        amenities: [],
        note: delta,
        demandSignal: /booked|below 60-day|usually|cooled/i.test(`${rateText} ${delta}`)
          ? `${rateText} ${delta}`.match(/(usually booked|below 60-day average|booked|demand cooled)/i)?.[0] ?? ''
          : '',
        reportId,
        quotedNights: report.nights,
      })
    }
  }

  // --- what the market charges for add-ons -----------------------------------
  const benchmarks: AncillaryBenchmark[] = []
  for (const table of tablesIn(sectionAfter(doc, 'ancillary'))) {
    const at = columnsOf(table)
    const columns = { item: at('add-on', 'item'), rate: at('market rate', 'rate'), note: at('notes', 'note') }
    for (const row of [...table.querySelectorAll('tbody tr')]) {
      const cells = [...row.querySelectorAll('td')]
      const cell = (index: number) => (index >= 0 && index < cells.length ? text(cells[index]) : '')
      const item = cell(columns.item)
      const rateText = cell(columns.rate)
      const range = moneyRange(rateText)
      if (!item || !range) {
        if (item) skipped.push({ where: 'ancillary', reason: `no price on "${item}"` })
        continue
      }
      benchmarks.push({
        id: uid('anc'),
        prov: { ...prov, rowNumber: benchmarks.length + 1 },
        reportId,
        observedOn: reportedOn,
        item,
        low: range.low,
        high: range.high,
        basis: basisOf(rateText, cell(columns.note), item),
        currency: 'PHP',
        note: cell(columns.note),
      })
    }
  }

  return { report, listings, observations, benchmarks, skipped }
}

/** A quick check before offering to import — is this one of these reports? */
export function looksLikeCompetitorReport(html: string): boolean {
  const head = html.slice(0, 4000).toLowerCase()
  return (
    head.includes('competitor') &&
    (head.includes('airbnb') || head.includes('culion') || head.includes('coron'))
  )
}
