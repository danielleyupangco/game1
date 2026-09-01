import type { SheetPreview } from '@/lib/workbook'
import type { AddOnQuote, Provenance } from '@/types'
import { toISO, toNumber } from '@/lib/coerce'
import { uid } from '@/lib/id'

/**
 * The guest add-on form.
 *
 * Guests fill in a form for catering, boat transfers and tours; the responses
 * land in a sheet that is the source of truth for what the business keeps on
 * top of the room. The shape that matters:
 *
 *   guest total  — what the guest is charged
 *   Allan's cost — what the island crew quoted for the same stay
 *   margin       — the difference, and the only part that is the business's
 *
 * Room revenue and this margin are the two earnings lines. The money the guest
 * pays for food and boats is mostly the crew's; treating the gross as revenue
 * would make the business look roughly twice its size at a fraction of its
 * real margin.
 */

const REQUIRED = ['guest name', 'check-in']
const MARGIN_SIGNALS = ["allan's cost", 'margin (php)', 'guest cost calculated on the form']

function normalise(header: string): string {
  return header.trim().toLowerCase()
}

export function looksLikeAddOnForm(sheet: SheetPreview): boolean {
  const headers = sheet.headers.map(normalise)
  return (
    REQUIRED.every((wanted) => headers.some((header) => header.startsWith(wanted))) &&
    MARGIN_SIGNALS.some((signal) => headers.includes(signal))
  )
}

/**
 * Addresses whose submissions are the owner testing the form rather than a
 * guest booking add-ons. Kept as a named list so it is editable and visible,
 * not a regex buried in a condition.
 */
export const OWNER_ADDRESSES = ['danielleyupangco@gmail.com', 'daniellemaryyupangco@gmail.com']

/** Text the form itself puts in a field label — a sign nobody typed an answer. */
const PLACEHOLDER_MARKERS = [
  'pickup location *',
  'drop-off location *',
  'any allergies or dietary restrictions?',
  'main purpose of stay at island t',
  'additional drinks/snacks for the grocery list',
  'other special requests',
  'how did you hear about us?',
]

/**
 * Decides whether a submission is a real guest.
 *
 * Returns the reason it is not, or an empty string when it is. Every rule is
 * one the owner described: her own address, an obvious test name, or a row
 * where the answers are still the form's own field labels. The row is kept
 * either way — flagged, listed, and reversible — because silently deleting
 * somebody's data is how a total stops being checkable.
 */
export function testSubmissionReason(row: Record<string, string>): string {
  const email = (row['email'] ?? '').trim().toLowerCase()
  const name = (row['guest name'] ?? '').trim()

  if (OWNER_ADDRESSES.includes(email)) return 'submitted from the owner’s own address'
  if (/@example\.(com|org|net)$/i.test(email)) return 'placeholder email address'
  if (/\btest\b|^test/i.test(name)) return 'name looks like a test entry'
  if (/\btest\b/i.test(row['purpose'] ?? '')) return 'purpose says it is a test'
  if (name !== '' && /^\d+$/.test(name)) return 'name is a number, not a guest'

  const answers = [row['pickup details'], row['dropoff details'], row['allergies'], row['purpose'], row['snacks']]
    .join(' ')
    .toLowerCase()
  if (PLACEHOLDER_MARKERS.some((marker) => answers.includes(marker))) {
    return 'answers are still the form’s own field labels'
  }
  if (!name) return 'no guest name'
  return ''
}

type Row = Record<string, string>

/**
 * Header lookup by prefix. The sheet's headers are long sentences that get
 * edited over time ("Guest downpayment sent to Dani via airbnb"), so matching
 * on a stable opening fragment survives rewording that an exact match would not.
 */
function columnIndex(headers: string[], ...wanted: string[]): number {
  for (const want of wanted) {
    const exact = headers.indexOf(want)
    if (exact >= 0) return exact
    const prefixed = headers.findIndex((header) => header.startsWith(want))
    if (prefixed >= 0) return prefixed
  }
  return -1
}

const FIELDS: Record<string, string[]> = {
  submitted: ['submitted', 'timestamp'],
  'guest name': ['guest name', 'guest'],
  email: ['email'],
  'check-in': ['check-in', 'check in'],
  'check-out': ['check-out', 'check out'],
  nights: ['nights'],
  guests: ['guests'],
  adults: ['adults'],
  kids: ['kids', 'children'],
  purpose: ['purpose'],
  'pickup details': ['pickup details'],
  'dropoff details': ['dropoff details', 'drop-off details'],
  snorkel: ['snorkel rental', 'snorkel'],
  total: ['total (php)'],
  allergies: ['allergies'],
  snacks: ['additional snacks', 'additional drinks'],
  requests: ['special requests'],
  'how heard': ['how heard'],
  'allan cost': ["allan's cost"],
  charged: ['guest cost calculated on the form'],
  margin: ['margin (php)'],
  downpayment: ['guest downpayment sent to dani'],
  cash: ['remaining owed to pay in cash'],
}

export type AddOnParseResult = {
  quotes: AddOnQuote[]
  /** how many were flagged as tests, so the exclusion is a number on screen */
  excludedCount: number
  rejected: { rowNumber: number; reason: string }[]
}

export function parseAddOnForm(sheet: SheetPreview, prov: Omit<Provenance, 'rowNumber'>): AddOnParseResult {
  const headers = sheet.headers.map(normalise)
  const index: Record<string, number> = {}
  for (const [key, candidates] of Object.entries(FIELDS)) index[key] = columnIndex(headers, ...candidates)

  const quotes: AddOnQuote[] = []
  const rejected: { rowNumber: number; reason: string }[] = []
  let excludedCount = 0

  sheet.rows.forEach((cells, position) => {
    const rowNumber = sheet.rowNumbers?.[position] ?? position + 2
    const row: Row = {}
    for (const [key, column] of Object.entries(index)) {
      const cell = column >= 0 ? cells[column] : undefined
      row[key] = cell === undefined || cell === null ? '' : String(cell).trim()
    }
    // The sheet is a live form target with blank rows below the last response.
    if (!row['guest name'] && !row['check-in'] && !row['submitted']) return

    const checkIn = toISO(row['check-in'])
    const checkOut = toISO(row['check-out'])
    if (!checkIn) {
      rejected.push({ rowNumber, reason: 'unreadable check-in date' })
      return
    }

    const num = (key: string) => toNumber((row[key] ?? '').replace(/,/g, '')) ?? 0
    const charged = num('charged') || num('total')
    const allanCost = num('allan cost')
    // The sheet computes a margin column, but it is a formula that can be stale
    // or blank; deriving it keeps the two numbers on screen consistent.
    const margin = num('margin') || (charged > 0 && allanCost > 0 ? charged - allanCost : 0)
    const reason = testSubmissionReason(row)
    if (reason) excludedCount += 1

    quotes.push({
      id: uid('aoq'),
      prov: { ...prov, rowNumber },
      submittedAt: toISO(row['submitted']) ?? checkIn,
      guestName: row['guest name'],
      email: row['email'],
      checkIn,
      checkOut: checkOut ?? checkIn,
      nights: num('nights'),
      guests: num('guests'),
      adults: num('adults'),
      kids: num('kids'),
      guestTotal: charged,
      allanCost,
      margin,
      downpayment: num('downpayment'),
      cashOnArrival: num('cash'),
      currency: 'PHP',
      purpose: row['purpose'],
      allergies: row['allergies'],
      requests: row['requests'],
      snacks: row['snacks'],
      pickup: row['pickup details'],
      dropoff: row['dropoff details'],
      howHeard: row['how heard'],
      excluded: reason !== '',
      excludedReason: reason,
    })
  })

  return { quotes, excludedCount, rejected }
}

/** Names arrive with inconsistent spacing and casing across the two sources. */
function nameKey(name: string): string {
  return name.trim().toLowerCase().replace(/\s+/g, ' ')
}

function daysApart(a: string, b: string): number {
  const left = new Date(`${a}T00:00:00`).getTime()
  const right = new Date(`${b}T00:00:00`).getTime()
  if (Number.isNaN(left) || Number.isNaN(right)) return Number.POSITIVE_INFINITY
  return Math.abs(Math.round((left - right) / 86400000))
}

export type AddOnMatch = {
  quote: AddOnQuote
  bookingId: string | null
  /** how the two records were tied together, shown rather than assumed */
  how: 'name and dates' | 'dates only' | 'unmatched'
}

/**
 * Ties a form submission to the reservation it belongs to.
 *
 * The form has no confirmation code — the guest never sees one — so the join is
 * on the guest's name and arrival date. A name match with dates within two days
 * is safe; dates alone are accepted only when exactly one stay is in the frame,
 * and the basis is carried through so the weaker join is visible on screen.
 */
export function matchQuotes(
  quotes: AddOnQuote[],
  bookings: { id: string; guestName: string; checkIn: string; checkOut: string }[],
): AddOnMatch[] {
  return quotes.map((quote) => {
    if (quote.excluded) return { quote, bookingId: null, how: 'unmatched' as const }

    const named = bookings.filter(
      (booking) => nameKey(booking.guestName) === nameKey(quote.guestName) && daysApart(booking.checkIn, quote.checkIn) <= 2,
    )
    if (named.length === 1) return { quote, bookingId: named[0].id, how: 'name and dates' as const }

    const sameDates = bookings.filter((booking) => daysApart(booking.checkIn, quote.checkIn) <= 1)
    if (sameDates.length === 1) return { quote, bookingId: sameDates[0].id, how: 'dates only' as const }

    return { quote, bookingId: null, how: 'unmatched' as const }
  })
}
