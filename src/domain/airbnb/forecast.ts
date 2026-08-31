import type { Booking, CostModel, ForecastAssumptions } from '@/types'
import { isActive, isAdjustment, type MonthMetrics } from '@/domain/airbnb/metrics'
import { summariseCosts } from '@/domain/airbnb/pricefloor'
import { addMonths, daysBetween, daysInMonth } from '@/lib/dates'

/**
 * Forecasting a property that books months ahead.
 *
 * The naive approach — draw a line through last year and extend it — ignores
 * the one thing you actually know: what is already on the books. The method
 * here separates the two.
 *
 *   forecast = nights already booked + nights history says will still arrive
 *
 * The second half comes from a booking curve built from your own reservations:
 * for each stay, how many days before the month began was it booked. That gives
 * the share of a month's eventual business that is typically on the books at
 * any point, and so how much is still to come for a month N days away.
 *
 * It is honest about its own limits. A curve built from a few dozen bookings is
 * thin, so every projection reports the sample it rests on, and a month with no
 * comparable history says so rather than inventing a number.
 */

export type BookingCurve = {
  /**
   * Share of a month's final nights typically on the books, by days before the
   * month starts. Index 0 = the month has begun.
   */
  points: { daysOut: number; share: number }[]
  sample: number
  /** median days between booking and arrival — a readable summary of the curve */
  medianLead: number
}

const BUCKETS = [0, 15, 30, 45, 60, 90, 120, 180, 270]

function median(values: number[]): number {
  if (values.length === 0) return Number.NaN
  const sorted = [...values].sort((a, b) => a - b)
  const mid = Math.floor(sorted.length / 2)
  return sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2
}

function sellable(bookings: Booking[]): Booking[] {
  return bookings.filter((booking) => isActive(booking) && !isAdjustment(booking) && booking.bookedOn)
}

/**
 * Builds the pickup curve from history. Each completed month contributes the
 * share of its nights that had been booked at each horizon.
 */
export function bookingCurve(bookings: Booking[], asOfMonth: string): BookingCurve {
  const usable = sellable(bookings).filter((booking) => booking.checkIn.slice(0, 7) < asOfMonth)

  const byMonth = new Map<string, Booking[]>()
  for (const booking of usable) {
    const key = booking.checkIn.slice(0, 7)
    const bucket = byMonth.get(key)
    if (bucket) bucket.push(booking)
    else byMonth.set(key, [booking])
  }

  const shares = new Map<number, number[]>()
  for (const [month, list] of byMonth) {
    const total = list.reduce((sum, booking) => sum + booking.nights, 0)
    if (total === 0) continue
    const monthStart = `${month}-01`
    for (const daysOut of BUCKETS) {
      const cutoff = new Date(`${monthStart}T00:00:00`)
      cutoff.setDate(cutoff.getDate() - daysOut)
      const cutoffIso = cutoff.toISOString().slice(0, 10)
      const booked = list
        .filter((booking) => booking.bookedOn <= cutoffIso)
        .reduce((sum, booking) => sum + booking.nights, 0)
      const list2 = shares.get(daysOut) ?? []
      list2.push(booked / total)
      shares.set(daysOut, list2)
    }
  }

  // A curve must never rise as the horizon lengthens; averaging noisy months
  // can produce that, so it is clamped monotonic on the way out.
  let ceiling = 1
  const points = BUCKETS.map((daysOut) => {
    const values = shares.get(daysOut) ?? []
    const raw = values.length > 0 ? values.reduce((sum, v) => sum + v, 0) / values.length : Number.NaN
    const share = Number.isFinite(raw) ? Math.min(ceiling, Math.max(0, raw)) : Number.NaN
    if (Number.isFinite(share)) ceiling = share
    return { daysOut, share }
  })

  return {
    points,
    sample: usable.length,
    medianLead: median(usable.map((booking) => daysBetween(booking.bookedOn, booking.checkIn))),
  }
}

/** Interpolated share of final nights expected on the books this far out. */
export function shareOnBooks(curve: BookingCurve, daysOut: number): number {
  const known = curve.points.filter((point) => Number.isFinite(point.share))
  if (known.length === 0) return Number.NaN
  if (daysOut <= known[0].daysOut) return known[0].share
  const last = known[known.length - 1]
  if (daysOut >= last.daysOut) return last.share

  for (let i = 1; i < known.length; i++) {
    if (daysOut <= known[i].daysOut) {
      const a = known[i - 1]
      const b = known[i]
      const t = (daysOut - a.daysOut) / (b.daysOut - a.daysOut)
      return a.share + (b.share - a.share) * t
    }
  }
  return last.share
}

export type MonthForecast = {
  month: string
  /** nights already reserved */
  booked: number
  /** what history says a month like this ends up selling */
  seasonalNights: number
  /** central estimate */
  expected: number
  low: number
  high: number
  availableNights: number
  adr: number
  expectedRevenue: number
  lowRevenue: number
  highRevenue: number
  /** days between today and the first of this month */
  daysOut: number
  shareTypicallyBooked: number
  /** how many past years this month's seasonal figure rests on */
  history: number
  /** true when the month is already at or past capacity from bookings alone */
  capped: boolean
}

export type Forecast = {
  curve: BookingCurve
  months: MonthForecast[]
  totals: { booked: number; expected: number; low: number; high: number; revenue: number }
  /** true when there is not enough history for the pickup half to mean much */
  thin: boolean
}

export type ForecastInput = {
  bookings: Booking[]
  series: MonthMetrics[]
  assumptions: ForecastAssumptions
  availableNightsPerYear: number
  asOf?: string
}

export function buildForecast(input: ForecastInput): Forecast {
  const asOf = input.asOf ?? new Date().toISOString().slice(0, 10)
  const asOfMonth = asOf.slice(0, 7)
  const curve = bookingCurve(input.bookings, asOfMonth)
  const usable = sellable(input.bookings)

  // Seasonal shape: average nights and rate for each calendar month, from
  // completed months only.
  const seasonal = new Map<number, { nights: number[]; adr: number[] }>()
  for (const month of input.series) {
    if (month.month >= asOfMonth) continue
    const index = Number(month.month.slice(5, 7))
    const bucket = seasonal.get(index) ?? { nights: [], adr: [] }
    bucket.nights.push(month.nightsSold)
    if (month.adr > 0) bucket.adr.push(month.adr)
    seasonal.set(index, bucket)
  }

  const recentAdr = (() => {
    const withRate = input.series.filter((month) => month.month < asOfMonth && month.adr > 0).slice(-12)
    return withRate.length > 0 ? withRate.reduce((sum, m) => sum + m.adr, 0) / withRate.length : 0
  })()

  const availabilityRatio = input.availableNightsPerYear / 365
  const months: MonthForecast[] = []

  for (let offset = 0; offset < Math.max(1, input.assumptions.horizonMonths); offset++) {
    const month = addMonths(asOfMonth, offset)
    const monthIndex = Number(month.slice(5, 7))
    const capacity = Math.round(daysInMonth(month) * availabilityRatio)

    const booked = usable
      .filter((booking) => booking.checkIn.slice(0, 7) === month)
      .reduce((sum, booking) => sum + booking.nights, 0)

    const bucket = seasonal.get(monthIndex)
    const seasonalNights =
      bucket && bucket.nights.length > 0
        ? bucket.nights.reduce((sum, n) => sum + n, 0) / bucket.nights.length
        : Number.NaN
    const seasonalAdr =
      bucket && bucket.adr.length > 0 ? bucket.adr.reduce((sum, n) => sum + n, 0) / bucket.adr.length : recentAdr

    const daysOut = Math.max(0, daysBetween(asOf, `${month}-01`))
    const share = shareOnBooks(curve, daysOut)

    // Two readings of the same month, reconciled: what the booking curve implies
    // from what is already in, and what this month usually sells. The pickup
    // reading is only meaningful once a real share is on the books.
    const fromCurve = Number.isFinite(share) && share > 0.05 ? booked / share : Number.NaN
    const fromSeason = Number.isFinite(seasonalNights) ? seasonalNights : Number.NaN

    let expected: number
    if (Number.isFinite(fromCurve) && Number.isFinite(fromSeason)) expected = (fromCurve + fromSeason) / 2
    else if (Number.isFinite(fromCurve)) expected = fromCurve
    else if (Number.isFinite(fromSeason)) expected = fromSeason
    else expected = booked

    // Never forecast below what is already reserved, or above what can be sold.
    expected = Math.min(capacity, Math.max(booked, expected))
    const remaining = Math.max(0, expected - booked)
    const low = Math.min(capacity, booked + remaining * input.assumptions.lowFactor)
    const high = Math.min(capacity, booked + remaining * input.assumptions.highFactor)

    const years = offset / 12
    const adr = (seasonalAdr || recentAdr) * Math.pow(1 + input.assumptions.adrGrowth, years)

    months.push({
      month,
      booked,
      seasonalNights: Number.isFinite(seasonalNights) ? seasonalNights : 0,
      expected,
      low,
      high,
      availableNights: capacity,
      adr,
      expectedRevenue: expected * adr,
      lowRevenue: low * adr,
      highRevenue: high * adr,
      daysOut,
      shareTypicallyBooked: share,
      history: bucket?.nights.length ?? 0,
      capped: booked >= capacity,
    })
  }

  return {
    curve,
    months,
    totals: {
      booked: months.reduce((sum, m) => sum + m.booked, 0),
      expected: months.reduce((sum, m) => sum + m.expected, 0),
      low: months.reduce((sum, m) => sum + m.low, 0),
      high: months.reduce((sum, m) => sum + m.high, 0),
      revenue: months.reduce((sum, m) => sum + m.expectedRevenue, 0),
    },
    thin: curve.sample < 20,
  }
}

export type CashMonth = {
  month: string
  opening: number
  revenue: number
  fixedCost: number
  variableCost: number
  capex: number
  net: number
  closing: number
  /** true when the account goes below zero */
  short: boolean
}

export type CashForecast = {
  months: CashMonth[]
  lowest: CashMonth | null
  /** months until cash runs out at the expected case, or null if it never does */
  runsOutIn: number | null
}

/**
 * Cash, month by month. Distinct from profit: capital spend leaves the bank
 * without touching the P&L, which is exactly how a profitable business runs
 * out of money.
 */
export function buildCashForecast(
  forecast: Forecast,
  costModel: CostModel,
  openingCash: number,
  addOnPerNight: number,
  plannedCapex: { month: string; amount: number }[],
): CashForecast {
  const costs = summariseCosts(costModel)
  const months: CashMonth[] = []
  let balance = openingCash

  for (const month of forecast.months) {
    const opening = balance
    const revenue = month.expectedRevenue + month.expected * addOnPerNight
    const variableCost = month.expected * costs.variablePerNight
    const capex = plannedCapex
      .filter((planned) => planned.month === month.month)
      .reduce((sum, planned) => sum + planned.amount, 0)
    const net = revenue - costs.fixedPerMonth - variableCost - capex
    balance = opening + net

    months.push({
      month: month.month,
      opening,
      revenue,
      fixedCost: costs.fixedPerMonth,
      variableCost,
      capex,
      net,
      closing: balance,
      short: balance < 0,
    })
  }

  const shortfall = months.findIndex((month) => month.short)
  return {
    months,
    lowest: months.length > 0 ? months.reduce((low, m) => (m.closing < low.closing ? m : low)) : null,
    runsOutIn: shortfall >= 0 ? shortfall : null,
  }
}
