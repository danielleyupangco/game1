import type { Booking, PricingAssumptions } from '@/types'
import type { MonthMetrics, SeasonPoint } from '@/domain/airbnb/metrics'
import { isActive } from '@/domain/airbnb/metrics'
import { monthName } from '@/lib/dates'

/**
 * Pricing suggestions.
 *
 * The engine never says "raise price" on its own. It computes what happens to
 * revenue when a rate change moves occupancy, using an elasticity you set, and
 * only recommends a move when projected RevPAR improves. Both sides of the
 * trade-off are returned so the curve can be shown, not just the answer.
 */

export type PriceScenario = {
  /** rate change as a fraction, e.g. 0.1 = +10% */
  rateChange: number
  adr: number
  occupancy: number
  revpar: number
  /** RevPAR change vs. the current rate */
  revparDelta: number
}

/**
 * Constant-elasticity demand: a 1% rate rise moves occupancy by
 * `elasticity` percent. Occupancy is clamped to [0, 1] because you cannot sell
 * a night twice, which also stops the model producing nonsense at low prices.
 */
export function priceCurve(
  currentAdr: number,
  currentOccupancy: number,
  elasticity: number,
  steps: number[] = [-0.2, -0.15, -0.1, -0.05, 0, 0.05, 0.1, 0.15, 0.2, 0.25, 0.3],
): PriceScenario[] {
  const baseRevpar = currentAdr * currentOccupancy
  return steps.map((rateChange) => {
    const adr = currentAdr * (1 + rateChange)
    const occupancy = Math.max(0, Math.min(1, currentOccupancy * Math.pow(1 + rateChange, elasticity)))
    const revpar = adr * occupancy
    return {
      rateChange,
      adr,
      occupancy,
      revpar,
      revparDelta: baseRevpar > 0 ? revpar / baseRevpar - 1 : 0,
    }
  })
}

export type MonthSuggestion = {
  monthIndex: number
  label: string
  season: 'high' | 'low'
  currentAdr: number
  currentOccupancy: number
  currentRevpar: number
  suggestedAdr: number
  rateChange: number
  projectedOccupancy: number
  projectedRevpar: number
  revparUplift: number
  /**
   * True when the suggestion sits on the max-change cap rather than at a real
   * peak — which is what always happens with inelastic demand, since RevPAR
   * then rises monotonically with price and the model has no interior optimum.
   */
  capBound: boolean
  /** how many years of history the month rests on */
  observations: number
  confidence: 'high' | 'medium' | 'low'
  reasoning: string[]
  curve: PriceScenario[]
}

function pickBest(curve: PriceScenario[], maxChange: number): PriceScenario {
  const eligible = curve.filter((point) => Math.abs(point.rateChange) <= maxChange + 1e-9)
  return eligible.reduce((best, point) => (point.revpar > best.revpar ? point : best), eligible[0])
}

export function suggestByMonth(
  season: SeasonPoint[],
  assumptions: PricingAssumptions,
  portfolioAdr: number,
): MonthSuggestion[] {
  return season
    .map((point) => {
      const isHigh = assumptions.highSeasonMonths.includes(point.monthIndex)
      // Months with no history borrow the whole-portfolio ADR as a starting rate.
      const currentAdr = point.adr > 0 ? point.adr : portfolioAdr
      const currentOccupancy = point.occupancy

      const curve = priceCurve(currentAdr, currentOccupancy, assumptions.priceElasticity)
      const best = pickBest(curve, assumptions.maxRateChangePct)
      const capBound =
        Math.abs(Math.abs(best.rateChange) - assumptions.maxRateChangePct) < 1e-6 && best.rateChange !== 0

      const reasoning: string[] = []
      if (point.years === 0) {
        reasoning.push('No bookings recorded for this month yet — the suggestion rests on your portfolio-wide average rate.')
      } else {
        reasoning.push(
          `${point.years} year${point.years === 1 ? '' : 's'} of history: ${(currentOccupancy * 100).toFixed(0)}% occupancy at ₱${Math.round(currentAdr).toLocaleString()} ADR.`,
        )
      }
      reasoning.push(
        isHigh
          ? 'Dry-season month in Palawan — demand is structurally stronger here.'
          : 'Wet-season month — rate cuts defend occupancy, but only pay off if demand actually responds.',
      )
      reasoning.push(
        `At an elasticity of ${assumptions.priceElasticity}, a ${(best.rateChange * 100).toFixed(0)}% rate move implies ${(best.occupancy * 100).toFixed(0)}% occupancy and a ${(best.revparDelta * 100).toFixed(1)}% change in RevPAR.`,
      )
      if (capBound && Math.abs(assumptions.priceElasticity) < 1) {
        reasoning.push(
          `Your cap is setting this number, not the data. With elasticity between 0 and −1, revenue rises at every price, so the model has no interior optimum — it will always recommend the largest move you allow. Treat this as "there is room to raise", not as a computed target, and lower the elasticity if you think demand reacts more sharply than that.`,
        )
      } else if (capBound) {
        reasoning.push(`Capped at your ${(assumptions.maxRateChangePct * 100).toFixed(0)}% maximum move — the unconstrained optimum is further out.`)
      }
      if (currentOccupancy > 0.85) {
        reasoning.push('Occupancy above 85% is the clearest evidence of underpricing — you are selling out.')
      }
      if (currentOccupancy > 0 && currentOccupancy < assumptions.targetOccupancy * 0.6) {
        reasoning.push(
          `Occupancy is far below your ${(assumptions.targetOccupancy * 100).toFixed(0)}% target. If a rate cut does not fill the month, the problem is demand, not price.`,
        )
      }

      return {
        monthIndex: point.monthIndex,
        label: monthName(point.monthIndex),
        season: isHigh ? ('high' as const) : ('low' as const),
        currentAdr,
        currentOccupancy,
        currentRevpar: currentAdr * currentOccupancy,
        suggestedAdr: best.adr,
        rateChange: best.rateChange,
        projectedOccupancy: best.occupancy,
        projectedRevpar: best.revpar,
        revparUplift: best.revparDelta,
        capBound,
        observations: point.years,
        confidence: point.years >= 2 ? ('high' as const) : point.years === 1 ? ('medium' as const) : ('low' as const),
        reasoning,
        curve,
      }
    })
    .filter(Boolean)
}

export type WeekdayStat = {
  /** 0 = Sunday */
  day: number
  label: string
  nights: number
  share: number
  suggestedUplift: number
}

const DAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

/**
 * Counts nights actually stayed by day of week. Weekend demand concentration
 * is what justifies a weekend uplift — if Friday and Saturday aren't fuller
 * than Tuesday, a weekend premium just prices out midweek guests.
 */
export function weekdayDemand(bookings: Booking[], assumptions: PricingAssumptions): WeekdayStat[] {
  const counts = new Array(7).fill(0) as number[]
  for (const booking of bookings.filter(isActive)) {
    const cursor = new Date(`${booking.checkIn}T00:00:00`)
    const end = new Date(`${booking.checkOut}T00:00:00`)
    let guard = 0
    while (cursor < end && guard++ < 400) {
      counts[cursor.getDay()] += 1
      cursor.setDate(cursor.getDate() + 1)
    }
  }
  const total = counts.reduce((sum, count) => sum + count, 0)
  const average = total / 7

  return counts.map((nights, day) => {
    const isWeekend = day === 5 || day === 6
    // Only apply the uplift where the data shows above-average demand.
    const outperforms = average > 0 && nights > average * 1.1
    return {
      day,
      label: DAY_LABELS[day],
      nights,
      share: total > 0 ? nights / total : 0,
      suggestedUplift: isWeekend && outperforms ? assumptions.weekendUpliftPct : 0,
    }
  })
}

export type PricingHeadline = {
  /** weighted revenue uplift if every month's suggestion were adopted */
  annualUplift: number
  annualUpliftPct: number
  strongest: MonthSuggestion | null
  raiseCount: number
  cutCount: number
}

export function pricingHeadline(
  suggestions: MonthSuggestion[],
  series: MonthMetrics[],
): PricingHeadline {
  const availableByMonth = new Map<number, number>()
  for (const month of series) {
    const index = Number(month.month.slice(5, 7))
    availableByMonth.set(index, (availableByMonth.get(index) ?? 0) + month.availableNights)
  }
  const years = new Set(series.map((m) => m.month.slice(0, 4))).size || 1

  let currentRevenue = 0
  let projectedRevenue = 0
  for (const suggestion of suggestions) {
    const nights = (availableByMonth.get(suggestion.monthIndex) ?? 0) / years
    currentRevenue += suggestion.currentRevpar * nights
    projectedRevenue += suggestion.projectedRevpar * nights
  }

  const withUplift = suggestions.filter((s) => s.revparUplift > 0.001)
  return {
    annualUplift: projectedRevenue - currentRevenue,
    annualUpliftPct: currentRevenue > 0 ? projectedRevenue / currentRevenue - 1 : 0,
    strongest:
      withUplift.length > 0
        ? withUplift.reduce((best, s) => (s.revparUplift > best.revparUplift ? s : best))
        : null,
    raiseCount: suggestions.filter((s) => s.rateChange > 0.001).length,
    cutCount: suggestions.filter((s) => s.rateChange < -0.001).length,
  }
}
