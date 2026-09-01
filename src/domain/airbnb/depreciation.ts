import type { CapitalSpend } from '@/types'

/**
 * Depreciation, derived from what was actually bought.
 *
 * The mastersheet carried depreciation as a flat ₱12,750 a month — a figure
 * typed once and never revisited. It has no connection to the things the
 * business owns, so it neither rose when the bridge was rebuilt nor fell when
 * an item reached the end of its life, and it silently left out every guest
 * comfort purchase: the bed frame, the sofa cushions, the inflatable pool.
 *
 * This builds the charge from the capital ledger instead. Every peso of capital
 * spend is written off straight-line over the life of the thing it bought,
 * starting the month it was paid for. The result is that the cost analysis
 * finally reflects the island as it has actually been fitted out, and a new
 * purchase shows up in the cost of running the place without anyone having to
 * remember to adjust a constant.
 *
 * Straight-line rather than anything cleverer, because the point is that the
 * owners can check it: cost ÷ months, running from the month it was bought.
 */

/**
 * How long each kind of purchase is expected to last, in years.
 *
 * These are judgements, not accounting law, and they are here in one visible
 * place so they can be argued with. They lean conservative — a shorter life
 * charges more per month, so a mistake understates profit rather than
 * flattering it.
 */
export const USEFUL_LIFE_YEARS: Record<string, number> = {
  'Building works': 20,
  Expansion: 20,
  'Power & water': 10,
  'Boat & transport': 8,
  Equipment: 5,
  'Furniture & fittings': 5,
  'Repairs & maintenance': 5,
  Other: 5,
}

export const DEFAULT_LIFE_YEARS = 5

export function lifeYearsFor(category: string): number {
  return USEFUL_LIFE_YEARS[category] ?? DEFAULT_LIFE_YEARS
}

export type DepreciationItem = {
  id: string
  date: string
  item: string
  category: string
  /** what it cost */
  cost: number
  lifeYears: number
  /** cost ÷ (lifeYears × 12) */
  monthlyCharge: number
  /** charged so far, up to and including the reporting month */
  accumulated: number
  /** cost − accumulated: what is still left to write off */
  netBookValue: number
  /** the month the last charge falls in */
  finalMonth: string
}

export type DepreciationSchedule = {
  /** the charge for each month, keyed YYYY-MM */
  byMonth: Record<string, number>
  items: DepreciationItem[]
  /** everything bought, at cost */
  totalCost: number
  /** written off so far */
  accumulated: number
  /** still to be written off */
  netBookValue: number
  /** what the charge is running at in the reporting month */
  monthlyRunRate: number
}

function monthOf(iso: string): string {
  return iso.slice(0, 7)
}

function addMonths(month: string, count: number): string {
  const year = Number(month.slice(0, 4))
  const index = Number(month.slice(5, 7)) - 1 + count
  const outYear = year + Math.floor(index / 12)
  const outMonth = ((index % 12) + 12) % 12
  return `${outYear}-${String(outMonth + 1).padStart(2, '0')}`
}

/**
 * A straight-line schedule over every capital item.
 *
 * `asOf` is the month the accumulated and net-book figures are struck at —
 * usually the last month the statement covers, so the two agree.
 */
export function buildDepreciation(spend: CapitalSpend[], asOf?: string): DepreciationSchedule {
  const byMonth: Record<string, number> = {}
  const items: DepreciationItem[] = []
  const closing = asOf ?? spend.reduce((latest, row) => (monthOf(row.date) > latest ? monthOf(row.date) : latest), '')

  for (const row of spend) {
    const cost = row.amount
    if (!Number.isFinite(cost) || cost <= 0) continue
    const lifeYears = lifeYearsFor(row.category)
    const months = Math.max(1, Math.round(lifeYears * 12))
    const monthlyCharge = cost / months
    const start = monthOf(row.date)

    let accumulated = 0
    for (let step = 0; step < months; step += 1) {
      const month = addMonths(start, step)
      byMonth[month] = (byMonth[month] ?? 0) + monthlyCharge
      if (closing && month <= closing) accumulated += monthlyCharge
    }

    items.push({
      id: row.id,
      date: row.date,
      item: row.item,
      category: row.category,
      cost,
      lifeYears,
      monthlyCharge,
      accumulated: Math.min(accumulated, cost),
      netBookValue: Math.max(0, cost - accumulated),
      finalMonth: addMonths(start, months - 1),
    })
  }

  const totalCost = items.reduce((sum, item) => sum + item.cost, 0)
  const accumulated = items.reduce((sum, item) => sum + item.accumulated, 0)

  return {
    byMonth,
    items: items.sort((a, b) => b.cost - a.cost),
    totalCost,
    accumulated,
    netBookValue: totalCost - accumulated,
    monthlyRunRate: closing ? (byMonth[closing] ?? 0) : 0,
  }
}
