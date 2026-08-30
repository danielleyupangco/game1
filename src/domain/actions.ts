import type { PositionView } from '@/domain/investments/portfolio'
import { allocationBy, riskView, targetsFor } from '@/domain/investments/portfolio'
import type { PerformanceSeries } from '@/domain/investments/performance'
import type { MonthMetrics, Totals } from '@/domain/airbnb/metrics'
import type { Settings } from '@/types'
import { money, pct, pp } from '@/lib/format'
import { monthLabel } from '@/lib/format'

/**
 * The Home page's action items and alerts.
 *
 * Everything here is derived from imported data and stated targets — there is
 * no rule that fires on a hunch, and each item carries the number that caused
 * it so it can be dismissed on the merits.
 */

export type Severity = 'critical' | 'warning' | 'info'

export type ActionItem = {
  id: string
  severity: Severity
  /** short headline, shown in the strip */
  title: string
  /** one line of why, with the number that triggered it */
  detail: string
  section: 'investments' | 'airbnb' | 'data'
  link: string
  /** used to rank; higher surfaces first */
  weight: number
}

const SEVERITY_WEIGHT: Record<Severity, number> = { critical: 100, warning: 50, info: 10 }

export type ActionInput = {
  positions: PositionView[]
  settings: Settings
  performance: PerformanceSeries | null
  airbnbSeries: MonthMetrics[]
  airbnbT12: Totals | null
  freshness: Partial<Record<string, string>>
  hasHoldings: boolean
  hasBookings: boolean
  hasExpenses: boolean
  snapshotCount: number
}

export function buildActions(input: ActionInput): ActionItem[] {
  const items: ActionItem[] = []
  const push = (item: Omit<ActionItem, 'weight'> & { weight?: number }) =>
    items.push({ ...item, weight: (item.weight ?? 0) + SEVERITY_WEIGHT[item.severity] })

  // --- Allocation drift ----------------------------------------------------
  if (input.hasHoldings) {
    for (const dimension of ['assetClass', 'currency', 'geography'] as const) {
      const targets = targetsFor(input.settings, dimension)
      if (targets.length === 0) continue
      const rows = allocationBy(input.positions, dimension, targets, input.settings.driftBandPct)
      // A dimension where every holding lands in one bucket carries no
      // information — usually the source sheet had no column for it. Reporting
      // "100% vs a 50% target" there is an artefact of missing data, not drift.
      const populated = rows.filter((row) => row.value > 0)
      if (populated.length <= 1) continue
      const worst = rows
        .filter((row) => row.status === 'over' || row.status === 'under')
        .sort((a, b) => Math.abs(b.drift ?? 0) - Math.abs(a.drift ?? 0))[0]
      if (!worst || worst.drift === null) continue
      push({
        id: `drift-${dimension}`,
        severity: Math.abs(worst.drift) > input.settings.driftBandPct * 2 ? 'critical' : 'warning',
        title: `Rebalance — ${worst.key} ${worst.drift > 0 ? 'over' : 'under'} target`,
        detail: `${pct(worst.actual)} against a ${pct(worst.target ?? 0)} target (${pp(worst.drift)}). Closing it exactly means ${worst.gap && worst.gap > 0 ? 'buying' : 'trimming'} ${money(Math.abs(worst.gap ?? 0), 'PHP', true)}.`,
        section: 'investments',
        link: '/investments',
        weight: Math.abs(worst.drift) * 100,
      })
    }

    // --- Single-name concentration -----------------------------------------
    const risk = riskView(input.positions)
    if (risk.topPosition && risk.topPosition.weight > 0.25) {
      push({
        id: 'concentration',
        severity: risk.topPosition.weight > 0.4 ? 'critical' : 'warning',
        title: `${risk.topPosition.ticker} is ${pct(risk.topPosition.weight)} of the portfolio`,
        detail: `Above the 25% single-name threshold. Your ${risk.positionCount} positions behave like ${risk.effectivePositions.toFixed(1)} equally-weighted ones.`,
        section: 'investments',
        link: '/investments',
        weight: risk.topPosition.weight * 50,
      })
    }
  }

  // --- Airbnb operating signals -------------------------------------------
  if (input.airbnbT12 && input.hasBookings) {
    const t12 = input.airbnbT12

    if (t12.revenue > 0 && input.hasExpenses && t12.netMargin < 0) {
      push({
        id: 'negative-margin',
        severity: 'critical',
        title: 'Island T is running at a loss',
        detail: `${money(t12.revenue, 'PHP', true)} revenue against ${money(t12.totalCost, 'PHP', true)} of cost over the last 12 months — a ${pct(t12.netMargin)} margin.`,
        section: 'airbnb',
        link: '/airbnb',
      })
    }

    if (input.hasExpenses && t12.revpar > 0 && t12.costPerAvailableNight > t12.revpar) {
      push({
        id: 'revpar-below-cost',
        severity: 'warning',
        title: 'Cost per available night exceeds RevPAR',
        detail: `Each available night costs ${money(t12.costPerAvailableNight, 'PHP')} and earns ${money(t12.revpar, 'PHP')}. Occupancy or rate has to move, or fixed costs do.`,
        section: 'airbnb',
        link: '/airbnb',
      })
    }

    // Recent occupancy against the trailing year — a real drop, not seasonality.
    const recent = input.airbnbSeries.slice(-3)
    const recentNights = recent.reduce((sum, m) => sum + m.nightsSold, 0)
    const recentAvailable = recent.reduce((sum, m) => sum + m.availableNights, 0)
    const recentOccupancy = recentAvailable > 0 ? recentNights / recentAvailable : 0
    if (recent.length === 3 && t12.occupancy > 0 && recentOccupancy < t12.occupancy * 0.6) {
      push({
        id: 'occupancy-drop',
        severity: 'warning',
        title: 'Occupancy has dropped over the last three months',
        detail: `${pct(recentOccupancy)} across ${monthLabel(recent[0].month)}–${monthLabel(recent[2].month)} against a 12-month average of ${pct(t12.occupancy)}. Check whether this is the low season or something else.`,
        section: 'airbnb',
        link: '/airbnb',
      })
    }

    // Expense spike: last month against the median of the preceding twelve.
    const withCosts = input.airbnbSeries.filter((m) => m.totalCost > 0)
    if (withCosts.length >= 4) {
      const last = withCosts[withCosts.length - 1]
      const prior = withCosts.slice(-13, -1).map((m) => m.totalCost).sort((a, b) => a - b)
      const median = prior[Math.floor(prior.length / 2)] ?? 0
      if (median > 0 && last.totalCost > median * 1.5) {
        push({
          id: 'expense-spike',
          severity: 'warning',
          title: `Costs spiked in ${monthLabel(last.month)}`,
          detail: `${money(last.totalCost, 'PHP', true)} against a typical ${money(median, 'PHP', true)} — ${pct(last.totalCost / median - 1, 0)} above the median month.`,
          section: 'airbnb',
          link: '/airbnb',
        })
      }
    }

    // Seasonal heads-up: the next quarter's historical occupancy.
    const nextMonths = [1, 2, 3].map((offset) => ((new Date().getMonth() + offset) % 12) + 1)
    const seasonal = input.airbnbSeries.filter((m) => nextMonths.includes(Number(m.month.slice(5, 7))))
    if (seasonal.length >= 2) {
      const nights = seasonal.reduce((sum, m) => sum + m.nightsSold, 0)
      const available = seasonal.reduce((sum, m) => sum + m.availableNights, 0)
      const seasonalOccupancy = available > 0 ? nights / available : 0
      if (seasonalOccupancy < t12.occupancy * 0.75) {
        push({
          id: 'low-season-ahead',
          severity: 'info',
          title: 'Low season ahead — review pricing',
          detail: `The next three months have historically run at ${pct(seasonalOccupancy)} occupancy against a ${pct(t12.occupancy)} annual average. The pricing tab shows where a rate cut pays for itself and where it doesn't.`,
          section: 'airbnb',
          link: '/airbnb',
        })
      }
    }
  }

  // --- Data gaps -----------------------------------------------------------
  if (input.hasHoldings && input.performance && !input.performance.contributionsKnown) {
    push({
      id: 'no-cashflows',
      severity: 'warning',
      title: 'Performance figures include your contributions',
      detail: `With no deposit or withdrawal records, money you added is counted as money you made. At least ${money(input.performance.estimatedNewMoney, 'PHP', true)} of the change arrived as new positions. Import transactions to turn this into a real return.`,
      section: 'data',
      link: '/data?dataset=transactions',
      weight: 30,
    })
  }

  if (input.hasHoldings && input.snapshotCount < 2) {
    push({
      id: 'need-second-snapshot',
      severity: 'info',
      title: 'Import holdings again to start the return series',
      detail: 'A return needs two dated snapshots. One import gives you a position list; the second turns it into performance.',
      section: 'data',
      link: '/data?dataset=holdings',
    })
  }

  if (input.hasBookings && !input.hasExpenses) {
    push({
      id: 'need-expenses',
      severity: 'info',
      title: 'Add expenses to unlock P&L and valuation',
      detail: 'Revenue alone gives ADR, occupancy and RevPAR. Costs are what turn those into margin, break-even and a DCF worth reading.',
      section: 'data',
      link: '/data?dataset=expenses',
    })
  }

  for (const [dataset, timestamp] of Object.entries(input.freshness)) {
    if (!timestamp) continue
    const ageDays = (Date.now() - new Date(timestamp).getTime()) / 86400000
    if (ageDays > 90) {
      push({
        id: `stale-${dataset}`,
        severity: 'warning',
        title: `${dataset} data is ${Math.round(ageDays / 30)} months old`,
        detail: 'Numbers on screen are only as current as the last import. Everything derived from this dataset is stale.',
        section: 'data',
        link: `/data?dataset=${dataset}`,
        weight: ageDays / 10,
      })
    }
  }

  return items.sort((a, b) => b.weight - a.weight)
}
