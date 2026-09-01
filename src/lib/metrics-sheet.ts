import type { SheetPreview } from '@/lib/workbook'
import type { AddOnQuote, Provenance } from '@/types'
import { toISO, toNumber } from '@/lib/coerce'
import { uid } from '@/lib/id'

/**
 * The mastersheet's per-year "metrics" tab.
 *
 * This is the sheet the owner actually maintains by hand, and from Y3 it is the
 * only source that carries all three sides of the add-on trade against a
 * confirmation code:
 *
 *   requested  — what the guest was charged for food, boats and tours
 *   To Allan   — what the island crew quoted for the same
 *   Balance    — the difference, which is the owner's patong
 *
 * It also carries the two things no export has: the guest's country and the
 * review they left. So a refresh of this tab updates the guest book and the
 * add-on ledger at once, while room revenue stays sourced from the Airbnb
 * payout export, which is the authority on money actually received.
 */

function normalise(header: string): string {
  return header.trim().toLowerCase()
}

const REQUIRED = ['confirmation code', 'to allan', 'requested', 'balance']

export function looksLikeMetricsSheet(sheet: SheetPreview): boolean {
  const headers = sheet.headers.map(normalise)
  return REQUIRED.every((wanted) => headers.includes(wanted))
}

/** Details the payout export cannot carry, keyed by confirmation code. */
export type StayDetail = {
  confirmationCode: string
  guestName: string
  country: string
  review: string
  guests: number
  /** the sheet's own room revenue, used only to flag a disagreement */
  roomRevenue: number
}

export type MetricsParseResult = {
  details: StayDetail[]
  quotes: AddOnQuote[]
  rejected: { rowNumber: number; reason: string }[]
  /** rows where requested − To Allan does not equal Balance */
  inconsistent: { code: string; expected: number; recorded: number }[]
}

export function parseMetricsSheet(sheet: SheetPreview, prov: Omit<Provenance, 'rowNumber'>): MetricsParseResult {
  const headers = sheet.headers.map(normalise)
  const at = (...names: string[]) => {
    for (const name of names) {
      const index = headers.indexOf(name)
      if (index >= 0) return index
    }
    return -1
  }

  const columns = {
    code: at('confirmation code'),
    booked: at('booking date'),
    checkIn: at('start date'),
    checkOut: at('end date'),
    nights: at('nights'),
    guest: at('guest'),
    people: at('no of people', 'no. of people', 'guests'),
    room: at('reservation revenue'),
    toAllan: at('to allan'),
    requested: at('requested'),
    balance: at('balance'),
    country: at('country'),
    review: at('review', 'guest review'),
  }

  const details: StayDetail[] = []
  const quotes: AddOnQuote[] = []
  const rejected: { rowNumber: number; reason: string }[] = []
  const inconsistent: { code: string; expected: number; recorded: number }[] = []

  sheet.rows.forEach((cells, position) => {
    const rowNumber = sheet.rowNumbers?.[position] ?? position + 2
    const text = (index: number) => {
      if (index < 0) return ''
      const cell = cells[index]
      return cell === undefined || cell === null ? '' : String(cell).trim()
    }
    const money = (index: number) => toNumber(text(index).replace(/,/g, '')) ?? 0

    const code = text(columns.code)
    // The tab ends with an averages row that carries figures but no code.
    if (!/^[A-Z0-9]{6,}$/.test(code)) return

    const checkIn = toISO(text(columns.checkIn))
    const checkOut = toISO(text(columns.checkOut))
    if (!checkIn) {
      rejected.push({ rowNumber, reason: 'unreadable check-in date' })
      return
    }

    details.push({
      confirmationCode: code,
      guestName: text(columns.guest),
      country: text(columns.country),
      review: text(columns.review),
      guests: Math.max(0, Math.round(money(columns.people))),
      roomRevenue: money(columns.room),
    })

    const toAllan = money(columns.toAllan)
    const requested = money(columns.requested)
    const balance = money(columns.balance)

    // A row with neither side recorded is a stay that had no add-ons, not a
    // gap — skip it rather than writing a zero-value quote.
    if (toAllan === 0 && requested === 0) return

    if (Math.abs(requested - toAllan - balance) > 1) {
      inconsistent.push({ code, expected: requested - toAllan, recorded: balance })
    }

    quotes.push({
      id: uid('aoq'),
      prov: { ...prov, rowNumber },
      submittedAt: toISO(text(columns.booked)) ?? checkIn,
      guestName: text(columns.guest),
      email: '',
      checkIn,
      checkOut: checkOut ?? checkIn,
      nights: Math.max(0, Math.round(money(columns.nights))),
      guests: Math.max(0, Math.round(money(columns.people))),
      adults: 0,
      kids: 0,
      guestTotal: requested,
      allanCost: toAllan,
      // Trust the sheet's own Balance: it is the number the owner reconciles
      // against, and the two agree on every row that has both sides.
      margin: balance,
      downpayment: 0,
      cashOnArrival: 0,
      currency: 'PHP',
      purpose: '',
      allergies: '',
      requests: '',
      snacks: '',
      pickup: '',
      dropoff: '',
      howHeard: '',
      excluded: false,
      excludedReason: '',
    })
  })

  return { details, quotes, rejected, inconsistent }
}
