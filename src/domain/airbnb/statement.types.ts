import type { Expense, DividendPayout } from '@/types'

export type { Expense, DividendPayout }

/**
 * The slice of monthly metrics the statement needs. Declared structurally so
 * the statement module does not depend on the whole metrics pipeline, and can
 * be tested against a handful of literals.
 */
export type MonthMetricsLike = {
  month: string
  revenue: number
  nightsSold: number
  availableNights: number
  occupancy: number
  bookings: number
  guestNights: number
  adr: number
  revpar: number
}
