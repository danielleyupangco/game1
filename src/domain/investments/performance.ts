import type { BenchmarkPoint, Holding, Snapshot, Transaction } from '@/types'
import { buildPositions, sortedSnapshots, totalValue } from '@/domain/investments/portfolio'
import { daysBetween } from '@/lib/dates'

/**
 * Time-weighted return, computed by chain-linking Modified Dietz sub-period
 * returns between consecutive snapshots.
 *
 * Why this method: a true TWR needs a portfolio valuation on every cashflow
 * date, which snapshot-based data does not give you. Modified Dietz
 * approximates it by weighting each flow by the fraction of the period it was
 * invested, then chain-linking removes the effect of the size of the portfolio.
 * The result answers "how did my selections do", not "how much did I make" —
 * that second question is money-weighted return, reported separately below.
 *
 * Accuracy degrades when flows are large relative to the portfolio and
 * snapshots are far apart. `flowRatio` on each period exposes that so the UI
 * can warn rather than quietly mislead.
 */

export type Period = {
  startDate: string
  endDate: string
  startValue: number
  endValue: number
  netFlow: number
  weightedFlow: number
  /** Modified Dietz return for this sub-period */
  ret: number
  /** |netFlow| / startValue — above ~0.2 the approximation gets loose */
  flowRatio: number
}

export type PerformanceSeries = {
  periods: Period[]
  /** cumulative growth of 1 unit, indexed at each snapshot date */
  index: { date: string; value: number; portfolio: number }[]
  sinceInception: number
  annualised: number
  years: number
  /** true when any period carried flows large enough to distort the estimate */
  lowConfidence: boolean
  /**
   * False when no deposit or withdrawal transactions cover the period. Without
   * them there is no way to tell a contribution from a gain, so these figures
   * are change-in-value, not return, and must not be labelled as return.
   */
  contributionsKnown: boolean
  /**
   * Rough scale of money that arrived as new positions rather than as market
   * movement: the first-seen value of every holding that wasn't in the previous
   * snapshot. An estimate, and an undercount — it cannot see money added to a
   * position you already held.
   */
  estimatedNewMoney: number
}

/** External flows only: deposits and withdrawals move money in and out of the portfolio. */
function externalFlows(transactions: Transaction[], usdPhp: number) {
  return transactions
    .filter((t) => t.type === 'deposit' || t.type === 'withdrawal')
    .map((t) => ({
      date: t.date,
      // deposit amounts are positive, withdrawals negative, from the mapper
      amount: t.currency === 'USD' ? t.amount * usdPhp : t.amount,
    }))
}

export function buildPerformance(
  holdings: Holding[],
  snapshots: Snapshot[],
  transactions: Transaction[],
  usdPhp: number,
): PerformanceSeries {
  const ordered = sortedSnapshots(snapshots)
  const values = ordered.map((snapshot) => ({
    snapshot,
    value: totalValue(buildPositions(holdings, snapshot)),
  }))

  const flows = externalFlows(transactions, usdPhp)
  const periods: Period[] = []

  for (let i = 1; i < values.length; i++) {
    const start = values[i - 1]
    const end = values[i]
    const days = daysBetween(start.snapshot.asOf, end.snapshot.asOf)
    if (days <= 0) continue

    const inPeriod = flows.filter((f) => f.date > start.snapshot.asOf && f.date <= end.snapshot.asOf)
    const netFlow = inPeriod.reduce((sum, f) => sum + f.amount, 0)
    const weightedFlow = inPeriod.reduce((sum, f) => {
      const elapsed = daysBetween(start.snapshot.asOf, f.date)
      return sum + f.amount * ((days - elapsed) / days)
    }, 0)

    const denominator = start.value + weightedFlow
    if (denominator === 0) continue

    periods.push({
      startDate: start.snapshot.asOf,
      endDate: end.snapshot.asOf,
      startValue: start.value,
      endValue: end.value,
      netFlow,
      weightedFlow,
      ret: (end.value - start.value - netFlow) / denominator,
      flowRatio: start.value > 0 ? Math.abs(netFlow) / start.value : 1,
    })
  }

  const index: { date: string; value: number; portfolio: number }[] = []
  if (values.length > 0) {
    index.push({ date: values[0].snapshot.asOf, value: 1, portfolio: values[0].value })
  }
  let cumulative = 1
  for (const period of periods) {
    cumulative *= 1 + period.ret
    const match = values.find((v) => v.snapshot.asOf === period.endDate)
    index.push({ date: period.endDate, value: cumulative, portfolio: match?.value ?? 0 })
  }

  const first = values[0]?.snapshot.asOf
  const last = values[values.length - 1]?.snapshot.asOf
  const years = first && last ? daysBetween(first, last) / 365.25 : 0

  const contributionsKnown =
    first !== undefined &&
    last !== undefined &&
    flows.some((flow) => flow.date >= first && flow.date <= last)

  return {
    periods,
    index,
    sinceInception: cumulative - 1,
    annualised: years > 0.05 ? Math.pow(cumulative, 1 / years) - 1 : Number.NaN,
    years,
    lowConfidence: periods.some((p) => p.flowRatio > 0.2),
    contributionsKnown,
    estimatedNewMoney: estimateNewMoney(holdings, ordered, usdPhp),
  }
}

/**
 * Sums the opening value of every position that appears for the first time in a
 * later snapshot. Money that shows up as a brand-new holding is a contribution,
 * not a gain, so this gives a floor on how much of the change in value was new
 * money — useful precisely when transaction data is missing.
 */
function estimateNewMoney(holdings: Holding[], ordered: Snapshot[], usdPhp: number): number {
  if (ordered.length < 2) return 0
  const seen = new Set<string>()
  let total = 0

  ordered.forEach((snapshot, index) => {
    const positions = buildPositions(holdings, snapshot)
    for (const position of positions) {
      const key = position.ticker
      if (index === 0) {
        seen.add(key)
        continue
      }
      if (!seen.has(key)) {
        seen.add(key)
        total += position.currency === 'USD' ? position.valueNative * usdPhp : position.valueNative
      }
    }
  })
  return total
}

/** Chain-linked return over the trailing `months`, or NaN if history is too short. */
export function trailingReturn(series: PerformanceSeries, months: number): number {
  if (series.index.length < 2) return Number.NaN
  const endDate = series.index[series.index.length - 1].date
  const cutoff = new Date(`${endDate}T00:00:00`)
  cutoff.setMonth(cutoff.getMonth() - months)
  const cutoffIso = cutoff.toISOString().slice(0, 10)

  const inWindow = series.periods.filter((p) => p.endDate > cutoffIso)
  if (inWindow.length === 0) return Number.NaN
  // Not enough history: the earliest data point is inside the window.
  if (series.index[0].date > cutoffIso && months > 1) return Number.NaN

  return inWindow.reduce((acc, p) => acc * (1 + p.ret), 1) - 1
}

export function yearToDateReturn(series: PerformanceSeries): number {
  if (series.index.length < 2) return Number.NaN
  const endDate = series.index[series.index.length - 1].date
  const startOfYear = `${endDate.slice(0, 4)}-01-01`
  const inWindow = series.periods.filter((p) => p.endDate >= startOfYear)
  if (inWindow.length === 0) return Number.NaN
  return inWindow.reduce((acc, p) => acc * (1 + p.ret), 1) - 1
}

/**
 * Money-weighted return (IRR of the actual cashflows). Answers "what did my
 * money earn", including the effect of when contributions landed.
 */
export function moneyWeightedReturn(
  holdings: Holding[],
  snapshots: Snapshot[],
  transactions: Transaction[],
  usdPhp: number,
): number {
  const ordered = sortedSnapshots(snapshots)
  if (ordered.length < 2) return Number.NaN
  const firstDate = ordered[0].asOf
  const lastDate = ordered[ordered.length - 1].asOf
  const startValue = totalValue(buildPositions(holdings, ordered[0]))
  const endValue = totalValue(buildPositions(holdings, ordered[ordered.length - 1]))

  const flows: { date: string; amount: number }[] = [{ date: firstDate, amount: -startValue }]
  for (const flow of externalFlows(transactions, usdPhp)) {
    if (flow.date > firstDate && flow.date <= lastDate) {
      // A deposit is cash out of your pocket into the portfolio.
      flows.push({ date: flow.date, amount: -flow.amount })
    }
  }
  flows.push({ date: lastDate, amount: endValue })

  return xirr(flows, firstDate)
}

/** Bisection on NPV — slower than Newton but cannot diverge on ugly flow patterns. */
export function xirr(flows: { date: string; amount: number }[], anchor: string): number {
  if (flows.length < 2) return Number.NaN
  const npv = (rate: number) =>
    flows.reduce((sum, flow) => {
      const years = daysBetween(anchor, flow.date) / 365.25
      return sum + flow.amount / Math.pow(1 + rate, years)
    }, 0)

  let low = -0.95
  let high = 10
  let npvLow = npv(low)
  let npvHigh = npv(high)
  if (Number.isNaN(npvLow) || Number.isNaN(npvHigh) || npvLow * npvHigh > 0) return Number.NaN

  for (let i = 0; i < 200; i++) {
    const mid = (low + high) / 2
    const npvMid = npv(mid)
    if (Math.abs(npvMid) < 1e-6) return mid
    if (npvLow * npvMid < 0) {
      high = mid
      npvHigh = npvMid
    } else {
      low = mid
      npvLow = npvMid
    }
  }
  return (low + high) / 2
}

export type BenchmarkComparison = {
  date: string
  portfolio: number
  benchmark: number
}[]

/** Rebases the benchmark to 1 at the first snapshot so both lines start together. */
export function compareToBenchmark(
  series: PerformanceSeries,
  benchmark: BenchmarkPoint[],
): BenchmarkComparison {
  if (series.index.length === 0 || benchmark.length === 0) return []
  const sorted = [...benchmark].sort((a, b) => (a.date < b.date ? -1 : 1))

  const levelOn = (date: string): number | null => {
    let candidate: BenchmarkPoint | null = null
    for (const point of sorted) {
      if (point.date <= date) candidate = point
      else break
    }
    return candidate?.level ?? null
  }

  const base = levelOn(series.index[0].date)
  if (!base) return []

  return series.index
    .map((point) => {
      const level = levelOn(point.date)
      return level === null ? null : { date: point.date, portfolio: point.value, benchmark: level / base }
    })
    .filter((row): row is { date: string; portfolio: number; benchmark: number } => row !== null)
}

export type DrawdownPoint = { date: string; value: number; drawdown: number }

export function drawdownSeries(series: PerformanceSeries): DrawdownPoint[] {
  let peak = 0
  return series.index.map((point) => {
    peak = Math.max(peak, point.value)
    return { date: point.date, value: point.value, drawdown: peak > 0 ? point.value / peak - 1 : 0 }
  })
}

export function maxDrawdown(series: PerformanceSeries): number {
  const points = drawdownSeries(series)
  return points.length === 0 ? Number.NaN : Math.min(...points.map((p) => p.drawdown))
}

/**
 * Annualised volatility of the sub-period returns. Snapshots are usually
 * irregular, so each period return is scaled to a common annual footing before
 * taking the standard deviation.
 */
export function volatility(series: PerformanceSeries): number {
  const scaled = series.periods
    .map((period) => {
      const years = daysBetween(period.startDate, period.endDate) / 365.25
      return years > 0 ? period.ret / Math.sqrt(years) : null
    })
    .filter((value): value is number => value !== null)

  if (scaled.length < 2) return Number.NaN
  const mean = scaled.reduce((sum, value) => sum + value, 0) / scaled.length
  const variance = scaled.reduce((sum, value) => sum + (value - mean) ** 2, 0) / (scaled.length - 1)
  return Math.sqrt(variance)
}
