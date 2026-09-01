import type { Booking, Expense } from '@/types'
import { aggregate, isActive, isAdjustment, monthlyMetrics, trailing, type MonthMetrics } from '@/domain/airbnb/metrics'
import { daysBetween } from '@/lib/dates'

/**
 * Insights the operator can act on, computed from the booking ledger.
 *
 * Deliberately separate from the P&L: those numbers say how the business did,
 * these say why. Every one is a count or an average over rows that exist — none
 * is a forecast, and any of them reads as "not enough data" rather than
 * guessing when the history is too thin to support it.
 */

export type YearRow = {
  year: string
  nights: number
  availableNights: number
  occupancy: number
  adr: number
  revpar: number
  roomRevenue: number
  cost: number
  profit: number
  margin: number
  bookings: number
  months: number
}

export function byYear(series: MonthMetrics[]): YearRow[] {
  const years = [...new Set(series.map((month) => month.month.slice(0, 4)))].sort()
  return years.map((year) => {
    const months = series.filter((month) => month.month.startsWith(year))
    const totals = aggregate(months)
    return {
      year,
      nights: totals.nightsSold,
      availableNights: totals.availableNights,
      occupancy: totals.occupancy,
      adr: totals.adr,
      revpar: totals.revpar,
      roomRevenue: totals.revenue,
      cost: totals.totalCost,
      profit: totals.netProfit,
      margin: totals.netMargin,
      bookings: totals.bookings,
      months: months.length,
    }
  })
}

export type LeadTimeStat = {
  /** days between booking and arrival */
  median: number
  mean: number
  /** share booked within 14 days of arrival */
  lastMinuteShare: number
  /** share booked more than 90 days out */
  farOutShare: number
  sample: number
  /** median lead time per year, to see whether the book is filling earlier or later */
  byYear: { year: string; median: number; sample: number }[]
}

function median(values: number[]): number {
  if (values.length === 0) return Number.NaN
  const sorted = [...values].sort((a, b) => a - b)
  const middle = Math.floor(sorted.length / 2)
  return sorted.length % 2 === 0 ? (sorted[middle - 1] + sorted[middle]) / 2 : sorted[middle]
}

/**
 * How far ahead people book. A book that is filling later than it used to is
 * the earliest warning of a demand problem — it shows up months before the
 * occupancy line does.
 */
export function leadTime(bookings: Booking[]): LeadTimeStat {
  const usable = bookings
    .filter((booking) => isActive(booking) && !isAdjustment(booking) && booking.bookedOn && booking.checkIn)
    .map((booking) => ({ year: booking.checkIn.slice(0, 4), days: daysBetween(booking.bookedOn, booking.checkIn) }))
    .filter((row) => row.days >= 0 && row.days < 900)

  const days = usable.map((row) => row.days)
  const years = [...new Set(usable.map((row) => row.year))].sort()

  return {
    median: median(days),
    mean: days.length > 0 ? days.reduce((sum, day) => sum + day, 0) / days.length : Number.NaN,
    lastMinuteShare: days.length > 0 ? days.filter((day) => day <= 14).length / days.length : Number.NaN,
    farOutShare: days.length > 0 ? days.filter((day) => day > 90).length / days.length : Number.NaN,
    sample: days.length,
    byYear: years.map((year) => {
      const forYear = usable.filter((row) => row.year === year).map((row) => row.days)
      return { year, median: median(forYear), sample: forYear.length }
    }),
  }
}

export type MixRow = {
  key: string
  bookings: number
  nights: number
  revenue: number
  share: number
}

function mixBy(bookings: Booking[], pick: (booking: Booking) => string): MixRow[] {
  const buckets = new Map<string, { bookings: number; nights: number; revenue: number }>()
  for (const booking of bookings) {
    const key = pick(booking).trim()
    if (!key) continue
    const bucket = buckets.get(key) ?? { bookings: 0, nights: 0, revenue: 0 }
    bucket.bookings += 1
    bucket.nights += booking.nights
    bucket.revenue += booking.netRevenue
    buckets.set(key, bucket)
  }
  const total = [...buckets.values()].reduce((sum, bucket) => sum + bucket.revenue, 0)
  return [...buckets.entries()]
    .map(([key, bucket]) => ({ key, ...bucket, share: total > 0 ? bucket.revenue / total : 0 }))
    .sort((a, b) => b.revenue - a.revenue)
}

export function countryMix(bookings: Booking[]): MixRow[] {
  return mixBy(
    bookings.filter((booking) => isActive(booking) && !isAdjustment(booking)),
    (booking) => booking.country,
  )
}

export type StayShape = {
  /** distribution of length of stay */
  nights: { nights: number; bookings: number }[]
  medianNights: number
  medianParty: number
  /** guests who booked more than once */
  repeatGuests: { name: string; stays: number; revenue: number }[]
  /** share of revenue from parties of 6 or more */
  largePartyShare: number
}

export function stayShape(bookings: Booking[]): StayShape {
  const usable = bookings.filter((booking) => isActive(booking) && !isAdjustment(booking))

  const counts = new Map<number, number>()
  for (const booking of usable) counts.set(booking.nights, (counts.get(booking.nights) ?? 0) + 1)

  const byGuest = new Map<string, { stays: number; revenue: number }>()
  for (const booking of usable) {
    const name = booking.guestName.trim()
    if (!name) continue
    const bucket = byGuest.get(name) ?? { stays: 0, revenue: 0 }
    bucket.stays += 1
    bucket.revenue += booking.netRevenue
    byGuest.set(name, bucket)
  }

  const revenue = usable.reduce((sum, booking) => sum + booking.netRevenue, 0)
  const largeParty = usable
    .filter((booking) => booking.guests >= 6)
    .reduce((sum, booking) => sum + booking.netRevenue, 0)

  return {
    nights: [...counts.entries()].map(([nights, bookings]) => ({ nights, bookings })).sort((a, b) => a.nights - b.nights),
    medianNights: median(usable.map((booking) => booking.nights)),
    medianParty: median(usable.map((booking) => booking.guests)),
    repeatGuests: [...byGuest.entries()]
      .filter(([, bucket]) => bucket.stays > 1)
      .map(([name, bucket]) => ({ name, ...bucket }))
      .sort((a, b) => b.stays - a.stays || b.revenue - a.revenue),
    largePartyShare: revenue > 0 ? largeParty / revenue : 0,
  }
}

export type SeasonSplit = {
  highNights: number
  lowNights: number
  highRevpar: number
  lowRevpar: number
  /** how many times better a high-season night is than a low-season one */
  ratio: number
}

/** Revenue concentration between the dry and wet seasons. */
export function seasonSplit(series: MonthMetrics[], highSeasonMonths: number[]): SeasonSplit {
  const isHigh = (month: MonthMetrics) => highSeasonMonths.includes(Number(month.month.slice(5, 7)))
  const high = series.filter(isHigh)
  const low = series.filter((month) => !isHigh(month))
  const rev = (months: MonthMetrics[]) => months.reduce((sum, month) => sum + month.revenue, 0)
  const avail = (months: MonthMetrics[]) => months.reduce((sum, month) => sum + month.availableNights, 0)

  const highRevpar = avail(high) > 0 ? rev(high) / avail(high) : 0
  const lowRevpar = avail(low) > 0 ? rev(low) / avail(low) : 0
  return {
    highNights: high.reduce((sum, month) => sum + month.nightsSold, 0),
    lowNights: low.reduce((sum, month) => sum + month.nightsSold, 0),
    highRevpar,
    lowRevpar,
    ratio: lowRevpar > 0 ? highRevpar / lowRevpar : Number.NaN,
  }
}

export type PaceRow = {
  month: string
  /** nights sold in the same month a year earlier */
  lastYear: number
  thisYear: number
  delta: number
}

/**
 * This year against last, month by month. The single most useful operating
 * view an owner has, and the one a single-year chart cannot show.
 */
export function pace(series: MonthMetrics[]): { year: string; priorYear: string; rows: PaceRow[] } | null {
  const years = [...new Set(series.map((month) => month.month.slice(0, 4)))].sort()
  if (years.length < 2) return null
  const year = years[years.length - 1]
  const priorYear = years[years.length - 2]

  const nightsIn = (y: string, monthIndex: number) =>
    series.find((month) => month.month === `${y}-${String(monthIndex).padStart(2, '0')}`)?.nightsSold ?? 0

  return {
    year,
    priorYear,
    rows: Array.from({ length: 12 }, (_, index) => {
      const monthIndex = index + 1
      const lastYear = nightsIn(priorYear, monthIndex)
      const thisYear = nightsIn(year, monthIndex)
      return { month: String(monthIndex).padStart(2, '0'), lastYear, thisYear, delta: thisYear - lastYear }
    }),
  }
}

export type CostShape = {
  fixedPerYear: number
  variablePerNight: number
  contributionPerNight: number
  breakEvenNights: number
  breakEvenOccupancy: number
  /** nights sold over the trailing twelve months */
  latestNights: number
}

export function costShape(series: MonthMetrics[], expenses: Expense[], usdPhp: number): CostShape {
  // The trailing twelve months, not the last twelve rows. The series runs on
  // past today into next year's reservations, so taking the tail reached into
  // months that have bookings but no costs yet — which understated fixed costs
  // by a fifth and made break-even look four nights easier than it is.
  const recent = trailing(series, 12)
  const totals = aggregate(recent)
  void expenses
  void usdPhp

  const fixedPerYear = totals.fixedCost
  const variablePerNight = totals.nightsSold > 0 ? totals.variableCost / totals.nightsSold : 0
  // Room revenue only: the crew's food and boats are their business, and the
  // owner's margin on them is neither reliable nor recorded far enough back to
  // belong in a break-even.
  const contributionPerNight = totals.adr - variablePerNight

  return {
    fixedPerYear,
    variablePerNight,
    contributionPerNight,
    breakEvenNights: contributionPerNight > 0 ? fixedPerYear / contributionPerNight : Number.NaN,
    breakEvenOccupancy:
      contributionPerNight > 0 && totals.availableNights > 0
        ? fixedPerYear / contributionPerNight / totals.availableNights
        : Number.NaN,
    latestNights: totals.nightsSold,
  }
}

export type InsightBundle = {
  years: YearRow[]
  lead: LeadTimeStat
  countries: MixRow[]
  stays: StayShape
  season: SeasonSplit
  pace: ReturnType<typeof pace>
  costs: CostShape
}

export function buildInsights(
  bookings: Booking[],
  expenses: Expense[],
  usdPhp: number,
  availableNightsPerYear: number,
  highSeasonMonths: number[],
): InsightBundle {
  const series = monthlyMetrics({ bookings, expenses, usdPhp, availableNightsPerYear })
  return {
    years: byYear(series),
    lead: leadTime(bookings),
    countries: countryMix(bookings),
    stays: stayShape(bookings),
    season: seasonSplit(series, highSeasonMonths),
    pace: pace(series),
    costs: costShape(series, expenses, usdPhp),
  }
}
