import type { DividendPayout, Expense, MonthMetricsLike } from '@/domain/airbnb/statement.types'

export type { MonthMetricsLike }

/**
 * The income statement, cash flow and expense summary, in the shape the owner
 * already reads them.
 *
 * Two things this is careful about, because getting either wrong changes what
 * the business looks like:
 *
 * 1. Room revenue is the revenue. Food, boats and tours are the island crew's
 *    business; the owner keeps only a margin on them, and only from the month
 *    she began recording it. That margin is other income, on its own line —
 *    never folded into the rate, the occupancy, or the top line.
 * 2. Capital spend and dividends never reach the P&L. Both move cash. One buys
 *    something that lasts; the other distributes money already earned. Folding
 *    either into costs is what makes a good year read as a bad one.
 * 3. Capital spend does reach the P&L eventually, as depreciation — the annual
 *    slice of what was bought. That charge is derived from the capital ledger
 *    (see domain/airbnb/depreciation.ts) rather than taken from the sheet's flat
 *    monthly figure, and when it is supplied it *replaces* the sheet's
 *    Depreciation rows rather than stacking on top of them.
 */

/** Operating cost lines, in the order the owner's own summary lists them. */
export const EXPENSE_ORDER = [
  'Salary',
  'Maintenance',
  'Repair & Maintenance works',
  'Starlink',
  'Supplies (towels)',
  'Reimbursements',
  'Transportation / Travel',
  'Admin/Financial Fees',
  'Subscriptions',
  'Softwares & Tools',
  'Advertising',
  'Marketing',
  'Events and Collaborations',
  'Inventory / supplies',
  'Outsourcing',
  'Depreciation',
] as const

/** Costs that scale with stays rather than running regardless. */
const COGS_CATEGORIES = new Set(['Per night costs', 'Per stay costs', 'COGs', 'COGS'])

export type StatementMonth = {
  month: string
  nightsSold: number
  availableNights: number
  occupancy: number
  stays: number
  guestNights: number

  /** room payouts, and nothing else */
  revenue: number

  cogs: number
  cogsPct: number
  grossProfit: number
  grossMargin: number

  opex: number
  opexPct: number
  /** operating cost by category, for the line-by-line statement */
  byCategory: Record<string, number>

  ebitda: number
  ebitdaPct: number
  depreciation: number
  ebit: number
  ebitPct: number

  adr: number
  revpar: number
}

export type StatementInput = {
  series: MonthMetricsLike[]
  expenses: Expense[]
  /**
   * The depreciation charge per month, derived from what was actually bought.
   *
   * When given, it stands in for the Depreciation rows in `expenses`: those are
   * the sheet's flat estimate of the same thing, and counting both would charge
   * the island's fit-out twice.
   */
  depreciationByMonth?: Record<string, number>
}

function monthOf(iso: string): string {
  return iso.slice(0, 7)
}

export function buildStatement(input: StatementInput): StatementMonth[] {
  const derived = input.depreciationByMonth
  const byMonth = new Map<string, Record<string, number>>()
  for (const expense of input.expenses) {
    // The sheet's own Depreciation rows are a flat estimate; when a schedule
    // built from the capital ledger is available it is the better number, so
    // the estimate is dropped rather than added to.
    if (derived && expense.category === 'Depreciation') continue
    const month = monthOf(expense.date)
    const bucket = byMonth.get(month) ?? {}
    bucket[expense.category] = (bucket[expense.category] ?? 0) + expense.amount
    byMonth.set(month, bucket)
  }

  return input.series.map((month) => {
    const categories = byMonth.get(month.month) ?? {}
    let cogs = 0
    let depreciation = 0
    let opex = 0
    const byCategory: Record<string, number> = {}
    for (const [category, amount] of Object.entries(categories)) {
      byCategory[category] = amount
      if (COGS_CATEGORIES.has(category)) cogs += amount
      else if (category === 'Depreciation') depreciation += amount
      else opex += amount
    }
    if (derived) {
      depreciation = derived[month.month] ?? 0
      // Keep the line-by-line statement agreeing with the EBIT line above it.
      if (depreciation > 0) byCategory.Depreciation = depreciation
    }

    // Revenue is the room. Food, boats and tours are the crew's business and
    // live on their own page; nothing about them reaches this statement.
    const revenue = month.revenue

    const grossProfit = revenue - cogs
    const ebitda = grossProfit - opex
    const ebit = ebitda - depreciation
    const safe = (value: number) => (revenue > 0 ? value / revenue : 0)

    return {
      month: month.month,
      nightsSold: month.nightsSold,
      availableNights: month.availableNights,
      occupancy: month.occupancy,
      stays: month.bookings,
      guestNights: month.guestNights,
      revenue,
      cogs,
      cogsPct: safe(cogs),
      grossProfit,
      grossMargin: safe(grossProfit),
      opex,
      opexPct: safe(opex),
      byCategory,
      ebitda,
      ebitdaPct: safe(ebitda),
      depreciation,
      ebit,
      ebitPct: safe(ebit),
      adr: month.adr,
      revpar: month.revpar,
    }
  })
}

/** Adds a run of months into one column — a year, a trailing twelve, a quarter. */
export function totalStatement(months: StatementMonth[]): StatementMonth {
  const sum = (pick: (month: StatementMonth) => number) => months.reduce((total, month) => total + pick(month), 0)
  const byCategory: Record<string, number> = {}
  for (const month of months) {
    for (const [category, amount] of Object.entries(month.byCategory)) {
      byCategory[category] = (byCategory[category] ?? 0) + amount
    }
  }
  const revenue = sum((m) => m.revenue)
  const safe = (value: number) => (revenue > 0 ? value / revenue : 0)
  const cogs = sum((m) => m.cogs)
  const opex = sum((m) => m.opex)
  const depreciation = sum((m) => m.depreciation)
  const grossProfit = revenue - cogs
  const ebitda = grossProfit - opex
  const nightsSold = sum((m) => m.nightsSold)
  const availableNights = sum((m) => m.availableNights)
  return {
    month: months.length > 0 ? `${months[0].month} → ${months[months.length - 1].month}` : '',
    nightsSold,
    availableNights,
    occupancy: availableNights > 0 ? nightsSold / availableNights : 0,
    stays: sum((m) => m.stays),
    guestNights: sum((m) => m.guestNights),
    revenue,
    cogs,
    cogsPct: safe(cogs),
    grossProfit,
    grossMargin: safe(grossProfit),
    opex,
    opexPct: safe(opex),
    byCategory,
    ebitda,
    ebitdaPct: safe(ebitda),
    depreciation,
    ebit: ebitda - depreciation,
    ebitPct: safe(ebitda - depreciation),
    adr: nightsSold > 0 ? revenue / nightsSold : 0,
    revpar: availableNights > 0 ? revenue / availableNights : 0,
  }
}

export type CashMonthActual = {
  month: string
  /** money in from stays and the owner's add-on margin */
  operating: number
  operatingCosts: number
  /** what the business bought that lasts — out of the bank, not the P&L */
  investing: number
  /** profit paid out to the owners — also out of the bank, not the P&L */
  financing: number
  net: number
  running: number
}

/**
 * Cash actually moved, month by month — as distinct from profit earned.
 *
 * The three sections are kept apart because they answer different questions:
 * operations asks whether the business pays for itself, investing asks what was
 * built, financing asks what was taken out.
 */
export function buildActualCash(
  statement: StatementMonth[],
  capitalByMonth: Record<string, number>,
  dividends: DividendPayout[],
  openingCash = 0,
): CashMonthActual[] {
  const dividendByMonth: Record<string, number> = {}
  for (const payout of dividends) {
    const month = monthOf(payout.date)
    dividendByMonth[month] = (dividendByMonth[month] ?? 0) + payout.amount
  }

  let running = openingCash
  return statement.map((month) => {
    const operating = month.revenue
    // Depreciation is a bookkeeping charge, not money leaving the bank.
    const operatingCosts = month.cogs + month.opex
    const investing = capitalByMonth[month.month] ?? 0
    const financing = dividendByMonth[month.month] ?? 0
    const net = operating - operatingCosts - investing - financing
    running += net
    return { month: month.month, operating, operatingCosts, investing, financing, net, running }
  })
}

export type DividendShare = { name: string; usd: number; php: number }

export type DividendSummary = {
  payouts: number
  totalUsd: number
  totalPhp: number
  /** what each owner has been paid, most-paid first */
  byRecipient: DividendShare[]
}

/**
 * What each owner has actually been paid.
 *
 * The dollar figure leads because that is the currency the distributions were
 * agreed and remembered in; the peso figure is whatever each transfer converted
 * at. Summing the peso column and calling it the split is what made the running
 * totals disagree with what the two of them believed they had received.
 */
export function summariseDividends(dividends: DividendPayout[]): DividendSummary {
  const byName = new Map<string, DividendShare>()
  for (const payout of dividends) {
    for (const recipient of payout.recipients) {
      const share = byName.get(recipient.name) ?? { name: recipient.name, usd: 0, php: 0 }
      share.usd += recipient.amountUsd ?? 0
      share.php += recipient.amount
      byName.set(recipient.name, share)
    }
  }

  return {
    payouts: dividends.length,
    totalUsd: dividends.reduce((sum, payout) => sum + (payout.amountUsd ?? 0), 0),
    totalPhp: dividends.reduce((sum, payout) => sum + payout.amount, 0),
    byRecipient: [...byName.values()].sort((a, b) => b.usd - a.usd || b.php - a.php),
  }
}

export type ExpenseCell = { category: string; byMonth: Record<string, number>; total: number }

/**
 * The expense summary: categories down, months across, exactly as she reads it.
 *
 * `depreciationByMonth` overrides the sheet's Depreciation row for the same
 * reason `buildStatement` does — so the summary and the income statement are
 * charging the same figure for the same thing.
 */
export function expenseMatrix(
  expenses: Expense[],
  months: string[],
  depreciationByMonth?: Record<string, number>,
): ExpenseCell[] {
  const rows = new Map<string, Record<string, number>>()
  for (const expense of expenses) {
    if (depreciationByMonth && expense.category === 'Depreciation') continue
    const month = monthOf(expense.date)
    if (!months.includes(month)) continue
    const row = rows.get(expense.category) ?? {}
    row[month] = (row[month] ?? 0) + expense.amount
    rows.set(expense.category, row)
  }
  if (depreciationByMonth) {
    const row: Record<string, number> = {}
    for (const month of months) {
      const amount = depreciationByMonth[month] ?? 0
      if (amount > 0) row[month] = amount
    }
    if (Object.keys(row).length > 0) rows.set('Depreciation', row)
  }

  const order = (category: string) => {
    const index = (EXPENSE_ORDER as readonly string[]).indexOf(category)
    return index >= 0 ? index : EXPENSE_ORDER.length
  }

  return [...rows.entries()]
    .map(([category, byMonth]) => ({
      category,
      byMonth,
      total: Object.values(byMonth).reduce((sum, amount) => sum + amount, 0),
    }))
    .sort((a, b) => order(a.category) - order(b.category) || b.total - a.total)
}
