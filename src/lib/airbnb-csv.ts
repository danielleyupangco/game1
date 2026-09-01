import type { SheetPreview } from '@/lib/workbook'
import type { Booking, Provenance, Resolution } from '@/types'
import { toISO, toNumber } from '@/lib/coerce'
import { uid } from '@/lib/id'

/**
 * The Airbnb transaction export.
 *
 * This file has a fixed shape that arrives the same way every month, so it is
 * recognised rather than mapped column by column. Getting it right matters more
 * than usual because the four row types mean four different things and adding
 * them together would double-count the business into looking twice its size:
 *
 *   Reservation          — room revenue. The only earnings line.
 *   Resolution Payout    — the guest paying for catering, boat and tours
 *                          through the platform. Collected, then passed almost
 *                          entirely to the island crew. Not earnings.
 *   Resolution Adjustment— a refund or correction against one of the above.
 *   Payout               — a bank transfer of money already counted above.
 *                          Ignored entirely: it is the same peso arriving.
 *
 * Payouts across the whole file equal reservations plus resolutions, which is
 * the check that this reading is the right one.
 */

const REQUIRED_HEADERS = ['type', 'confirmation code', 'gross earnings']

function normalise(header: string): string {
  return header.trim().toLowerCase()
}

export function looksLikeAirbnbPayout(sheet: SheetPreview): boolean {
  const headers = sheet.headers.map(normalise)
  return REQUIRED_HEADERS.every((wanted) => headers.includes(wanted))
}

type Row = Record<string, string>

/** Airbnb writes thousands separators into some numeric columns but not others. */
function money(value: string | undefined): number {
  if (value === undefined || value.trim() === '') return 0
  return toNumber(value.replace(/,/g, '')) ?? 0
}

function rowsOf(sheet: SheetPreview): { row: Row; rowNumber: number }[] {
  const headers = sheet.headers.map(normalise)
  return sheet.rows.map((cells, index) => {
    const row: Row = {}
    headers.forEach((header, column) => {
      const cell = cells[column]
      row[header] = cell === undefined || cell === null ? '' : String(cell).trim()
    })
    return { row, rowNumber: sheet.rowNumbers?.[index] ?? index + 2 }
  })
}

export type AirbnbParseResult = {
  bookings: Booking[]
  resolutions: Resolution[]
  /** transfers to the bank — counted nowhere, reported so the total is arguable */
  payoutTotal: number
  payoutCount: number
  rejected: { rowNumber: number; reason: string }[]
}

export function parseAirbnbPayout(sheet: SheetPreview, prov: Omit<Provenance, 'rowNumber'>): AirbnbParseResult {
  const bookings: Booking[] = []
  const resolutions: Resolution[] = []
  const rejected: { rowNumber: number; reason: string }[] = []
  let payoutTotal = 0
  let payoutCount = 0

  for (const { row, rowNumber } of rowsOf(sheet)) {
    const type = row['type']
    if (!type) continue
    const provenance: Provenance = { ...prov, rowNumber }

    if (type === 'Payout') {
      payoutTotal += money(row['paid out'])
      payoutCount += 1
      continue
    }

    const code = row['confirmation code']
    if (!code) {
      rejected.push({ rowNumber, reason: `${type} row with no confirmation code` })
      continue
    }
    const checkIn = toISO(row['start date'])
    const checkOut = toISO(row['end date'])
    if (!checkIn || !checkOut) {
      rejected.push({ rowNumber, reason: 'unreadable stay dates' })
      continue
    }

    if (type === 'Resolution Payout' || type === 'Resolution Adjustment') {
      resolutions.push({
        id: uid('res'),
        prov: provenance,
        confirmationCode: code,
        guestName: row['guest'],
        date: toISO(row['date']) ?? checkIn,
        checkIn,
        checkOut,
        amount: money(row['amount']),
        currency: row['currency'] === 'USD' ? 'USD' : 'PHP',
        kind: type === 'Resolution Payout' ? 'payout' : 'adjustment',
        details: row['details'],
      })
      continue
    }

    if (type !== 'Reservation' && type !== 'Adjustment') {
      rejected.push({ rowNumber, reason: `unrecognised row type "${type}"` })
      continue
    }

    // Both fee columns come out of the same payout, so they are one number here.
    const fees = money(row['service fee']) + money(row['fast pay fee'])
    const net = money(row['amount'])
    // An adjustment row carries no gross of its own; the payout is the whole
    // story, and the sign is what marks it as a reversal.
    const gross = money(row['gross earnings']) || net
    const nights = toNumber(row['nights']) ?? 0

    bookings.push({
      id: uid('bkg'),
      prov: provenance,
      confirmationCode: code,
      guestName: row['guest'],
      channel: 'Airbnb',
      bookedOn: toISO(row['booking date']) ?? checkIn,
      checkIn,
      checkOut,
      nights: type === 'Adjustment' ? -Math.abs(nights) : nights,
      guests: 0,
      grossRevenue: gross,
      fees,
      netRevenue: net,
      addOnRevenue: 0,
      currency: row['currency'] === 'USD' ? 'USD' : 'PHP',
      status: type === 'Adjustment' ? 'adjustment' : 'confirmed',
      country: '',
      rating: '',
      review: '',
      notes: row['details'],
      contact: '',
    })
  }

  return { bookings, resolutions, payoutTotal, payoutCount, rejected }
}

/**
 * Reconciliation: the bank should have received exactly what the reservations
 * and resolutions add up to. A gap means the export is partial (a pending file
 * has no payouts yet) or a row type was misread.
 */
export function reconcile(result: AirbnbParseResult): {
  reservations: number
  resolutions: number
  expected: number
  paidOut: number
  difference: number
} {
  const reservations = result.bookings.reduce((sum, booking) => sum + booking.netRevenue, 0)
  const resolutions = result.resolutions.reduce((sum, row) => sum + row.amount, 0)
  const expected = reservations + resolutions
  return {
    reservations,
    resolutions,
    expected,
    paidOut: result.payoutTotal,
    difference: result.payoutTotal - expected,
  }
}
