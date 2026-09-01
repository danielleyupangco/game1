import type { Holding, Snapshot } from '@/types'
import { toBase } from '@/domain/investments/portfolio'

/**
 * How a position's value moved between snapshots — and whether that movement
 * can be read as performance at all.
 *
 * This exists because the honest answer is usually "not quite". The sheet
 * records what each position is worth on a date but not the money moved into or
 * out of it, so a position that doubled might have doubled or might have been
 * topped up. Quoting the first figure as a return is the single easiest way for
 * this dashboard to say something false with a straight face.
 *
 * So nothing here is called a return. It reports the value change, and it
 * reports the largest single-interval jump alongside it, because that jump is
 * what a deposit or a withdrawal looks like from the outside. A position whose
 * value drifted smoothly is one whose change can be trusted as performance; one
 * that stepped 36% in eight weeks is not, however tempting the annualised
 * number looks.
 */

export type Interval = {
  from: string
  to: string
  fromValue: number
  toValue: number
  /** toValue ÷ fromValue − 1 */
  change: number
  days: number
}

export type PositionDrift = {
  ticker: string
  first: { asOf: string; value: number }
  last: { asOf: string; value: number }
  /** last ÷ first − 1, over the whole window */
  totalChange: number
  /** the same, annualised */
  annualised: number | null
  years: number
  intervals: Interval[]
  /** the interval that moved most in either direction — the deposit suspect */
  biggestStep: Interval | null
  /**
   * True when no single interval moved more than `stepThreshold`. Only then is
   * the value change worth reading as performance, and even then only because
   * nothing visible contradicts it.
   */
  smooth: boolean
}

/**
 * A step larger than this in one interval is treated as money moving rather
 * than the market. Snapshots here are one to four months apart, so a fund
 * moving a quarter of its value in one of them is far more likely to be a
 * contribution than a return. Deliberately generous: the point is to catch the
 * obvious cases, not to adjudicate the marginal ones.
 */
export const STEP_THRESHOLD = 0.25

function daysBetween(a: string, b: string): number {
  return Math.round((new Date(`${b}T00:00:00`).getTime() - new Date(`${a}T00:00:00`).getTime()) / 86400000)
}

export function positionDrift(
  ticker: string,
  holdings: Holding[],
  snapshots: Snapshot[],
  stepThreshold = STEP_THRESHOLD,
): PositionDrift | null {
  const ordered = [...snapshots].sort((a, b) => a.asOf.localeCompare(b.asOf))
  const points: { asOf: string; value: number }[] = []
  for (const snapshot of ordered) {
    const value = holdings
      .filter((row) => row.snapshotId === snapshot.id && row.ticker === ticker)
      .reduce((sum, row) => sum + toBase(row.value, row.currency, snapshot.usdPhp), 0)
    if (value > 0) points.push({ asOf: snapshot.asOf, value })
  }
  if (points.length < 2) return null

  const intervals: Interval[] = []
  for (let i = 1; i < points.length; i += 1) {
    const from = points[i - 1]
    const to = points[i]
    const days = daysBetween(from.asOf, to.asOf)
    // Two snapshots on the same day carry no information about movement.
    if (days <= 0) continue
    intervals.push({
      from: from.asOf,
      to: to.asOf,
      fromValue: from.value,
      toValue: to.value,
      change: from.value > 0 ? to.value / from.value - 1 : 0,
      days,
    })
  }

  const first = points[0]
  const last = points[points.length - 1]
  const years = daysBetween(first.asOf, last.asOf) / 365.25
  // Annualising a short window multiplies its noise into nonsense: four days at
  // +467% compounds to a number with seventy digits in it. Below a couple of
  // months the raw change is the only figure worth reporting.
  const longEnough = years >= 60 / 365.25
  const totalChange = first.value > 0 ? last.value / first.value - 1 : 0
  const biggestStep =
    intervals.length > 0
      ? intervals.reduce((worst, row) => (Math.abs(row.change) > Math.abs(worst.change) ? row : worst))
      : null

  return {
    ticker,
    first,
    last,
    totalChange,
    annualised: longEnough && first.value > 0 ? Math.pow(last.value / first.value, 1 / years) - 1 : null,
    years,
    intervals,
    biggestStep,
    smooth: intervals.every((row) => Math.abs(row.change) <= stepThreshold),
  }
}
