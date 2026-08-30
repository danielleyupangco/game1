import type { Booking, Currency, Expense } from '@/types'
import { daysInMonth, monthKey, monthRange, nightsByMonth } from '@/lib/dates'

/** Cancelled reservations stay in the data for the record but earn nothing. */
export function isActive(booking: Booking): boolean {
  return !/cancel|declin|void/i.test(booking.status)
}

/**
 * A refund or correction, booked as a negative row. It nets off revenue and
 * nights rather than spreading across a stay that never happened.
 */
export function isAdjustment(booking: Booking): boolean {
  return booking.nights < 0 || booking.grossRevenue < 0 || booking.netRevenue < 0
}

function toBase(value: number, currency: Currency, usdPhp: number): number {
  return currency === 'USD' ? value * usdPhp : value
}

export type MonthMetrics = {
  month: string
  /** room revenue recognised in this month, apportioned by nights stayed */
  revenue: number
  /** ancillary revenue kept — catering, tours, transfers */
  addOnRevenue: number
  /** room + add-ons; what the P&L runs on */
  totalRevenue: number
  grossRevenue: number
  nightsSold: number
  availableNights: number
  occupancy: number
  /** average daily rate = revenue / nights sold */
  adr: number
  /** room revenue per available night — catches "great rate, empty house" */
  revpar: number
  /** total revenue per available night, add-ons included */
  totalRevpar: number
  bookings: number
  guestNights: number
  fixedCost: number
  variableCost: number
  totalCost: number
  netProfit: number
  netMargin: number
  sourceBookings: Booking[]
  sourceExpenses: Expense[]
}

export type MetricsInput = {
  bookings: Booking[]
  expenses: Expense[]
  usdPhp: number
  /** nights the property can sell in a full month; scaled by month length */
  availableNightsPerYear: number
}

/**
 * Monthly series across the full span of imported data. Revenue is recognised
 * over the nights stayed rather than on the check-in date, so a long stay
 * straddling month-end doesn't create a fake spike followed by a fake trough.
 */
export function monthlyMetrics(input: MetricsInput): MonthMetrics[] {
  const active = input.bookings.filter(isActive)
  const dates: string[] = []
  for (const booking of active) dates.push(monthKey(booking.checkIn), monthKey(booking.checkOut))
  for (const expense of input.expenses) dates.push(monthKey(expense.date))
  if (dates.length === 0) return []

  const months = monthRange(dates.reduce((a, b) => (a < b ? a : b)), dates.reduce((a, b) => (a > b ? a : b)))
  const availabilityRatio = input.availableNightsPerYear / 365

  const byMonth = new Map<string, MonthMetrics>()
  for (const month of months) {
    byMonth.set(month, {
      month,
      revenue: 0,
      addOnRevenue: 0,
      totalRevenue: 0,
      grossRevenue: 0,
      nightsSold: 0,
      availableNights: Math.round(daysInMonth(month) * availabilityRatio),
      occupancy: 0,
      adr: 0,
      revpar: 0,
      totalRevpar: 0,
      bookings: 0,
      guestNights: 0,
      fixedCost: 0,
      variableCost: 0,
      totalCost: 0,
      netProfit: 0,
      netMargin: 0,
      sourceBookings: [],
      sourceExpenses: [],
    })
  }

  for (const booking of active) {
    const net = toBase(booking.netRevenue, booking.currency, input.usdPhp)
    const gross = toBase(booking.grossRevenue, booking.currency, input.usdPhp)
    const addOns = toBase(booking.addOnRevenue, booking.currency, input.usdPhp)

    if (isAdjustment(booking)) {
      // Lands whole in the month it was recorded; there is no stay to spread.
      const bucket = byMonth.get(monthKey(booking.checkIn))
      if (bucket) {
        bucket.revenue += net
        bucket.addOnRevenue += addOns
        bucket.grossRevenue += gross
        bucket.nightsSold += booking.nights
        bucket.sourceBookings.push(booking)
      }
      continue
    }

    const spread = nightsByMonth(booking.checkIn, booking.checkOut)
    const totalNights = Object.values(spread).reduce((sum, n) => sum + n, 0) || booking.nights || 1

    for (const [month, nights] of Object.entries(spread)) {
      const bucket = byMonth.get(month)
      if (!bucket) continue
      const share = nights / totalNights
      bucket.revenue += net * share
      bucket.addOnRevenue += addOns * share
      bucket.grossRevenue += gross * share
      bucket.nightsSold += nights
      bucket.guestNights += nights * booking.guests
      bucket.sourceBookings.push(booking)
    }
    // The booking counts once, in the month it checks in.
    const checkInBucket = byMonth.get(monthKey(booking.checkIn))
    if (checkInBucket) checkInBucket.bookings += 1
  }

  for (const expense of input.expenses) {
    const bucket = byMonth.get(monthKey(expense.date))
    if (!bucket) continue
    const amount = toBase(expense.amount, expense.currency, input.usdPhp)
    if (expense.nature === 'fixed') bucket.fixedCost += amount
    else bucket.variableCost += amount
    bucket.sourceExpenses.push(expense)
  }

  for (const bucket of byMonth.values()) {
    bucket.totalRevenue = bucket.revenue + bucket.addOnRevenue
    bucket.occupancy = bucket.availableNights > 0 ? bucket.nightsSold / bucket.availableNights : 0
    // ADR and RevPAR stay accommodation-only, which is what makes them
    // comparable to anything outside this property.
    bucket.adr = bucket.nightsSold > 0 ? bucket.revenue / bucket.nightsSold : 0
    bucket.revpar = bucket.availableNights > 0 ? bucket.revenue / bucket.availableNights : 0
    bucket.totalRevpar = bucket.availableNights > 0 ? bucket.totalRevenue / bucket.availableNights : 0
    bucket.totalCost = bucket.fixedCost + bucket.variableCost
    bucket.netProfit = bucket.totalRevenue - bucket.totalCost
    bucket.netMargin = bucket.totalRevenue > 0 ? bucket.netProfit / bucket.totalRevenue : 0
    // De-duplicate: a stay spanning three months was pushed three times.
    bucket.sourceBookings = [...new Map(bucket.sourceBookings.map((b) => [b.id, b])).values()]
  }

  return months.map((month) => byMonth.get(month)!).filter(Boolean)
}

export type Totals = {
  revenue: number
  addOnRevenue: number
  totalRevenue: number
  grossRevenue: number
  nightsSold: number
  availableNights: number
  occupancy: number
  adr: number
  revpar: number
  totalRevpar: number
  bookings: number
  fixedCost: number
  variableCost: number
  totalCost: number
  netProfit: number
  netMargin: number
  costPerBooking: number
  costPerAvailableNight: number
  variableCostPerNight: number
  months: number
}

export function aggregate(series: MonthMetrics[]): Totals {
  const sum = (pick: (m: MonthMetrics) => number) => series.reduce((acc, m) => acc + pick(m), 0)
  const revenue = sum((m) => m.revenue)
  const addOnRevenue = sum((m) => m.addOnRevenue)
  const totalRevenue = revenue + addOnRevenue
  const nightsSold = sum((m) => m.nightsSold)
  const availableNights = sum((m) => m.availableNights)
  const fixedCost = sum((m) => m.fixedCost)
  const variableCost = sum((m) => m.variableCost)
  const bookings = sum((m) => m.bookings)
  const totalCost = fixedCost + variableCost

  return {
    revenue,
    addOnRevenue,
    totalRevenue,
    grossRevenue: sum((m) => m.grossRevenue),
    nightsSold,
    availableNights,
    occupancy: availableNights > 0 ? nightsSold / availableNights : 0,
    adr: nightsSold > 0 ? revenue / nightsSold : 0,
    revpar: availableNights > 0 ? revenue / availableNights : 0,
    totalRevpar: availableNights > 0 ? totalRevenue / availableNights : 0,
    bookings,
    fixedCost,
    variableCost,
    totalCost,
    netProfit: totalRevenue - totalCost,
    netMargin: totalRevenue > 0 ? (totalRevenue - totalCost) / totalRevenue : 0,
    costPerBooking: bookings > 0 ? totalCost / bookings : 0,
    costPerAvailableNight: availableNights > 0 ? totalCost / availableNights : 0,
    variableCostPerNight: nightsSold > 0 ? variableCost / nightsSold : 0,
    months: series.length,
  }
}

export function trailing(series: MonthMetrics[], months: number): MonthMetrics[] {
  return series.slice(-months)
}

export function yearToDate(series: MonthMetrics[], year: string): MonthMetrics[] {
  return series.filter((m) => m.month.startsWith(year))
}

export type SeasonPoint = {
  monthIndex: number
  occupancy: number
  adr: number
  revpar: number
  revenue: number
  years: number
}

/** Averages each calendar month across all years, which is what a seasonality read needs. */
export function seasonality(series: MonthMetrics[]): SeasonPoint[] {
  const buckets = new Map<number, MonthMetrics[]>()
  for (const month of series) {
    const index = Number(month.month.slice(5, 7))
    const bucket = buckets.get(index)
    if (bucket) bucket.push(month)
    else buckets.set(index, [month])
  }

  const out: SeasonPoint[] = []
  for (let i = 1; i <= 12; i++) {
    const bucket = buckets.get(i) ?? []
    const nights = bucket.reduce((sum, m) => sum + m.nightsSold, 0)
    const available = bucket.reduce((sum, m) => sum + m.availableNights, 0)
    const revenue = bucket.reduce((sum, m) => sum + m.revenue, 0)
    out.push({
      monthIndex: i,
      occupancy: available > 0 ? nights / available : 0,
      adr: nights > 0 ? revenue / nights : 0,
      revpar: available > 0 ? revenue / available : 0,
      revenue: bucket.length > 0 ? revenue / bucket.length : 0,
      years: bucket.length,
    })
  }
  return out
}

export type CostLine = {
  category: string
  nature: 'fixed' | 'variable'
  amount: number
  share: number
  sources: Expense[]
}

export function costBreakdown(expenses: Expense[], usdPhp: number): CostLine[] {
  const buckets = new Map<string, { nature: 'fixed' | 'variable'; amount: number; sources: Expense[] }>()
  for (const expense of expenses) {
    const key = expense.category
    const amount = toBase(expense.amount, expense.currency, usdPhp)
    const bucket = buckets.get(key)
    if (bucket) {
      bucket.amount += amount
      bucket.sources.push(expense)
    } else {
      buckets.set(key, { nature: expense.nature, amount, sources: [expense] })
    }
  }
  const total = [...buckets.values()].reduce((sum, b) => sum + b.amount, 0)
  return [...buckets.entries()]
    .map(([category, bucket]) => ({
      category,
      nature: bucket.nature,
      amount: bucket.amount,
      share: total > 0 ? bucket.amount / total : 0,
      sources: bucket.sources,
    }))
    .sort((a, b) => b.amount - a.amount)
}

export type ChannelLine = {
  channel: string
  bookings: number
  nights: number
  revenue: number
  adr: number
  share: number
}

export function channelBreakdown(bookings: Booking[], usdPhp: number): ChannelLine[] {
  const buckets = new Map<string, { bookings: number; nights: number; revenue: number }>()
  for (const booking of bookings.filter(isActive)) {
    const key = booking.channel || 'Direct'
    const bucket = buckets.get(key) ?? { bookings: 0, nights: 0, revenue: 0 }
    bucket.bookings += 1
    bucket.nights += booking.nights
    bucket.revenue += toBase(booking.netRevenue, booking.currency, usdPhp)
    buckets.set(key, bucket)
  }
  const total = [...buckets.values()].reduce((sum, b) => sum + b.revenue, 0)
  return [...buckets.entries()]
    .map(([channel, bucket]) => ({
      channel,
      bookings: bucket.bookings,
      nights: bucket.nights,
      revenue: bucket.revenue,
      adr: bucket.nights > 0 ? bucket.revenue / bucket.nights : 0,
      share: total > 0 ? bucket.revenue / total : 0,
    }))
    .sort((a, b) => b.revenue - a.revenue)
}
