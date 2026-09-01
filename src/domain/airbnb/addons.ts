import type { AddOnQuote, Booking, Resolution } from '@/types'
import { isAdjustment } from '@/domain/airbnb/metrics'

/**
 * The add-on business, kept entirely to itself.
 *
 * Food, boats and tours are Kuya Allan's trade. The guest pays through the
 * Airbnb platform, the money lands in the owner's account, and almost all of it
 * goes straight out again to the crew. What stays is the patong — the mark-up
 * on his quote.
 *
 * None of this appears in the room business's revenue, rate, occupancy, profit
 * or forecast, and that is deliberate: the gross is several times the patong,
 * so mixing them made every figure ambiguous. This module exists so the flow
 * can still be seen properly in one place, with all three numbers side by side.
 */

export type AddOnStay = {
  id: string
  guestName: string
  checkIn: string
  checkOut: string
  nights: number
  /** how many people the add-ons were for, which is what makes a per-head price */
  guests: number
  /** what the guest was charged for food, boats and tours */
  charged: number
  /** what the island crew quoted for the same */
  toAllan: number
  /** charged − toAllan: the only part the owner keeps */
  patong: number
  /** patong as a share of what the guest paid */
  marginPct: number
  /** what actually moved through Airbnb against this stay, when known */
  throughAirbnb: number
  /**
   * Where the figures came from.
   *
   * A form row knows both sides of the trade, so its patong is arithmetic. A
   * sheet row knows one number and does not say which side it is — the old
   * spreadsheet's add-on column recorded the crew's gross in the early years
   * and the owner's balance later, with nothing marking the change. So a sheet
   * figure is reported but never added into the patong.
   */
  source: 'form' | 'sheet'
  /** true when the record is missing a side and the patong cannot be trusted */
  incomplete: boolean
  currency: 'PHP' | 'USD'
  /** anything the crew needed to know */
  notes: string
}

function nameKey(name: string): string {
  return name.trim().toLowerCase().replace(/\s+/g, ' ')
}

function daysApart(a: string, b: string): number {
  const left = new Date(`${a}T00:00:00`).getTime()
  const right = new Date(`${b}T00:00:00`).getTime()
  if (Number.isNaN(left) || Number.isNaN(right)) return Number.POSITIVE_INFINITY
  return Math.abs(Math.round((left - right) / 86400000))
}

export type AddOnInput = {
  bookings: Booking[]
  quotes: AddOnQuote[]
  resolutions: Resolution[]
}

/**
 * One row per stay that had add-ons, from whichever source knows about it.
 *
 * The form is the better source — it has both sides of the trade. Where the
 * form has not reached, the old sheet's figure is used and labelled as such,
 * because a number whose provenance is weaker should look weaker.
 */
export function buildAddOnStays(input: AddOnInput): AddOnStay[] {
  const stays = input.bookings.filter((booking) => !isAdjustment(booking) && booking.nights > 0)
  const rows: AddOnStay[] = []
  const claimed = new Set<string>()

  const throughAirbnbFor = (booking: Booking) =>
    input.resolutions
      .filter((row) => row.confirmationCode === booking.confirmationCode)
      .reduce((sum, row) => sum + row.amount, 0)

  // Form submissions first: they carry both the guest's price and the crew's.
  for (const quote of input.quotes) {
    if (quote.excluded) continue
    const booking = stays.find(
      (stay) => nameKey(stay.guestName) === nameKey(quote.guestName) && daysApart(stay.checkIn, quote.checkIn) <= 2,
    )
    if (booking) claimed.add(booking.id)
    const charged = quote.guestTotal
    const toAllan = quote.allanCost
    const patong = quote.margin
    rows.push({
      id: quote.id,
      guestName: quote.guestName || booking?.guestName || 'Unnamed',
      checkIn: quote.checkIn,
      checkOut: quote.checkOut,
      nights: quote.nights || booking?.nights || 0,
      guests: quote.guests || booking?.guests || 0,
      charged,
      toAllan,
      patong,
      marginPct: charged > 0 ? patong / charged : 0,
      throughAirbnb: booking ? throughAirbnbFor(booking) : 0,
      source: 'form',
      incomplete: charged <= 0 || toAllan <= 0,
      currency: quote.currency,
      notes: [quote.allergies, quote.requests, quote.snacks].filter((note) => note.trim()).join(' · '),
    })
  }

  // Then the stays the old sheet recorded a figure for, which knows only the
  // owner's side — so the crew's cost is left blank rather than guessed at.
  //
  // Airbnb splits the payout for an altered or long reservation into several
  // rows under one confirmation code. Those are all the same stay, and the
  // add-on figure was recorded once against it, so only the first row may
  // carry it — otherwise one stay's add-ons are counted two or three times.
  const seenCode = new Set<string>()
  for (const booking of stays) {
    if (claimed.has(booking.id) || booking.addOnRevenue === 0) continue
    if (booking.confirmationCode && seenCode.has(booking.confirmationCode)) continue
    if (booking.confirmationCode) seenCode.add(booking.confirmationCode)
    const throughAirbnb = throughAirbnbFor(booking)
    rows.push({
      id: booking.id,
      guestName: booking.guestName || booking.confirmationCode,
      checkIn: booking.checkIn,
      checkOut: booking.checkOut,
      nights: booking.nights,
      guests: booking.guests,
      charged: 0,
      toAllan: 0,
      patong: booking.addOnRevenue,
      marginPct: 0,
      throughAirbnb,
      source: 'sheet',
      incomplete: booking.addOnRevenue < 0,
      currency: booking.currency,
      notes: '',
    })
  }

  return rows.sort((a, b) => b.checkIn.localeCompare(a.checkIn))
}

export type AddOnSummary = {
  stays: number
  /** stays whose figures came from a form submission — both sides known */
  measured: number
  charged: number
  toAllan: number
  /**
   * What the owner kept, summed only over stays where both sides of the trade
   * are known. Sheet rows are deliberately excluded: their single number does
   * not say whether it is the crew's gross or the owner's balance, and summing
   * it would restate the crew's turnover as her income.
   */
  patong: number
  /** patong ÷ charged, on the same measured stays */
  marginPct: number
  throughAirbnb: number
  /** the old sheet's add-on column, reported apart because it is not comparable */
  unverified: number
  unverifiedStays: number
  /** rows where a side is missing, so the figure on them is not trustworthy */
  incomplete: AddOnStay[]
}

export function summariseAddOns(rows: AddOnStay[]): AddOnSummary {
  const measured = rows.filter((row) => row.source === 'form' && !row.incomplete && row.charged > 0 && row.toAllan > 0)
  const sheet = rows.filter((row) => row.source === 'sheet')
  const charged = measured.reduce((sum, row) => sum + row.charged, 0)
  const patong = measured.reduce((sum, row) => sum + row.patong, 0)

  return {
    stays: rows.length,
    measured: measured.length,
    charged,
    toAllan: measured.reduce((sum, row) => sum + row.toAllan, 0),
    patong,
    marginPct: charged > 0 ? patong / charged : 0,
    throughAirbnb: rows.reduce((sum, row) => sum + row.throughAirbnb, 0),
    unverified: sheet.reduce((sum, row) => sum + row.patong, 0),
    unverifiedStays: sheet.length,
    incomplete: rows.filter((row) => row.incomplete),
  }
}

export type AddOnMonth = { month: string; charged: number; toAllan: number; patong: number }

export function addOnsByMonth(rows: AddOnStay[]): AddOnMonth[] {
  const buckets = new Map<string, AddOnMonth>()
  for (const row of rows) {
    const month = row.checkIn.slice(0, 7)
    const bucket = buckets.get(month) ?? { month, charged: 0, toAllan: 0, patong: 0 }
    bucket.charged += row.charged
    bucket.toAllan += row.toAllan
    bucket.patong += row.patong
    buckets.set(month, bucket)
  }
  return [...buckets.values()].sort((a, b) => a.month.localeCompare(b.month))
}
