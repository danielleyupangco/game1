import type { CostModel } from '@/types'

/**
 * What a night has to earn, given what the place costs to run.
 *
 * This is a FLOOR, never a price. Cost-plus pricing is the standard way small
 * operators leave money on the table: what a guest will pay is set by what else
 * they could book, not by your payroll. The floor tells you the rate below
 * which a booking is actively costing you money — everything above it is a
 * commercial decision that belongs on the Pricing tab.
 */

export type CostSummary = {
  fixedPerMonth: number
  fixedPerYear: number
  perNight: number
  perStay: number
  /** per-stay costs spread over the nights in a typical booking */
  variablePerNight: number
}

export function summariseCosts(model: CostModel): CostSummary {
  const sum = (items: { amount: number }[]) => items.reduce((total, item) => total + item.amount, 0)
  const fixedPerMonth = sum(model.fixedMonthly)
  const perNight = sum(model.perNight)
  const perStay = sum(model.perStay)
  const nightsPerStay = Math.max(1, model.nightsPerStay)

  return {
    fixedPerMonth,
    fixedPerYear: fixedPerMonth * 12,
    perNight,
    perStay,
    variablePerNight: perNight + perStay / nightsPerStay,
  }
}

export type FloorScenario = {
  label: string
  /** nights sold in the year */
  nights: number
  occupancy: number
  /** rate at which the year exactly breaks even, before platform fee */
  breakEvenRate: number
  /** the same rate grossed up so the fee comes out of it */
  listedRate: number
  /** fixed cost carried by each night sold */
  fixedPerNight: number
}

/**
 * The rate needed to break even at a given number of nights.
 *
 * Fixed costs do not care how many nights you sell, so the fewer you sell the
 * more each one has to carry — which is why an empty year needs a far higher
 * rate to survive than a full one, and why chasing rate when occupancy is
 * falling makes the arithmetic worse, not better.
 */
export function floorAt(model: CostModel, nights: number): FloorScenario {
  const costs = summariseCosts(model)
  const available = Math.max(1, model.availableNightsPerYear)
  const sold = Math.max(1, nights)
  const fixedPerNight = costs.fixedPerYear / sold
  const breakEvenRate = fixedPerNight + costs.variablePerNight
  const feeGross = 1 - Math.min(0.9, Math.max(0, model.platformFeePct))

  return {
    label: `${sold} nights`,
    nights: sold,
    occupancy: sold / available,
    breakEvenRate,
    listedRate: breakEvenRate / feeGross,
    fixedPerNight,
  }
}

export type FloorTable = {
  costs: CostSummary
  scenarios: FloorScenario[]
  /** break-even nights at a rate you actually charge */
  breakEvenNightsAt: (rate: number) => number
  /** what one extra night is worth at a given rate, after variable cost */
  contributionAt: (rate: number) => number
}

export function buildFloors(model: CostModel, occupancies: number[] = [0.15, 0.25, 0.35, 0.5, 0.65]): FloorTable {
  const costs = summariseCosts(model)
  const available = Math.max(1, model.availableNightsPerYear)

  return {
    costs,
    scenarios: occupancies.map((occupancy) => ({
      ...floorAt(model, Math.round(available * occupancy)),
      label: `${Math.round(occupancy * 100)}% full`,
    })),
    breakEvenNightsAt: (rate) => {
      const net = rate * (1 - model.platformFeePct)
      const contribution = net - costs.variablePerNight
      return contribution > 0 ? costs.fixedPerYear / contribution : Number.NaN
    },
    contributionAt: (rate) => rate * (1 - model.platformFeePct) - costs.variablePerNight,
  }
}

export type CapexProgress = {
  budget: number
  spent: number
  remaining: number
  usedShare: number
  /** spend grouped by category, largest first */
  byCategory: { category: string; amount: number; share: number }[]
  over: boolean
}

export function capexProgress(
  budget: number,
  spend: { amount: number; category: string }[],
): CapexProgress {
  const spent = spend.reduce((total, row) => total + row.amount, 0)
  const buckets = new Map<string, number>()
  for (const row of spend) buckets.set(row.category, (buckets.get(row.category) ?? 0) + row.amount)

  return {
    budget,
    spent,
    remaining: budget - spent,
    usedShare: budget > 0 ? spent / budget : 0,
    byCategory: [...buckets.entries()]
      .map(([category, amount]) => ({ category, amount, share: spent > 0 ? amount / spent : 0 }))
      .sort((a, b) => b.amount - a.amount),
    over: spent > budget && budget > 0,
  }
}
