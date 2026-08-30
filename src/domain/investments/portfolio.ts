import type { AllocationTarget, Currency, Holding, Settings, Snapshot } from '@/types'

/** Converts a value in `from` currency into the base currency (PHP). */
export function toBase(value: number, from: Currency, usdPhp: number): number {
  if (from === 'PHP') return value
  return value * usdPhp
}

export type PositionView = {
  ticker: string
  name: string
  assetClass: string
  geography: string
  currency: Currency
  quantity: number
  price: number
  /** native-currency value as reported */
  valueNative: number
  /** value converted to PHP */
  value: number
  costBasis: number
  gain: number
  gainPct: number
  weight: number
  /** every source row that rolled into this position */
  sources: Holding[]
}

export function latestSnapshot(snapshots: Snapshot[]): Snapshot | null {
  if (snapshots.length === 0) return null
  return [...snapshots].sort((a, b) => (a.asOf < b.asOf ? 1 : -1))[0]
}

export function sortedSnapshots(snapshots: Snapshot[]): Snapshot[] {
  return [...snapshots].sort((a, b) => (a.asOf < b.asOf ? -1 : 1))
}

/**
 * Rolls a snapshot's rows into one position per ticker+currency. The same
 * ticker held in two accounts is one position, but the underlying rows are
 * kept on `sources` so any figure can be traced back to its sheet row.
 */
export function buildPositions(holdings: Holding[], snapshot: Snapshot | null): PositionView[] {
  if (!snapshot) return []
  const rows = holdings.filter((h) => h.snapshotId === snapshot.id)
  const usdPhp = snapshot.usdPhp || 58

  const grouped = new Map<string, Holding[]>()
  for (const row of rows) {
    const key = `${row.ticker}|${row.currency}`
    const bucket = grouped.get(key)
    if (bucket) bucket.push(row)
    else grouped.set(key, [row])
  }

  const positions: PositionView[] = []
  for (const bucket of grouped.values()) {
    const first = bucket[0]
    const quantity = bucket.reduce((sum, h) => sum + h.quantity, 0)
    const valueNative = bucket.reduce((sum, h) => sum + h.value, 0)
    const costBasis = bucket.reduce((sum, h) => sum + h.costBasis, 0)
    const value = toBase(valueNative, first.currency, usdPhp)
    const costBase = toBase(costBasis, first.currency, usdPhp)
    positions.push({
      ticker: first.ticker,
      name: first.name,
      assetClass: first.assetClass,
      geography: first.geography,
      currency: first.currency,
      quantity,
      price: quantity !== 0 ? valueNative / quantity : first.price,
      valueNative,
      value,
      costBasis: costBase,
      gain: costBase > 0 ? value - costBase : 0,
      gainPct: costBase > 0 ? value / costBase - 1 : Number.NaN,
      weight: 0,
      sources: bucket,
    })
  }

  const total = positions.reduce((sum, p) => sum + p.value, 0)
  for (const position of positions) position.weight = total > 0 ? position.value / total : 0

  return positions.sort((a, b) => b.value - a.value)
}

export type AllocationRow = {
  key: string
  value: number
  actual: number
  target: number | null
  drift: number | null
  /** peso amount that would need to move to hit target */
  gap: number | null
  status: 'over' | 'under' | 'on-target' | 'untargeted'
}

export type AllocationDimension = 'assetClass' | 'geography' | 'currency'

export function allocationBy(
  positions: PositionView[],
  dimension: AllocationDimension,
  targets: AllocationTarget[],
  driftBand: number,
): AllocationRow[] {
  const total = positions.reduce((sum, p) => sum + p.value, 0)
  const buckets = new Map<string, number>()
  for (const position of positions) {
    const key = String(position[dimension] || 'Unspecified')
    buckets.set(key, (buckets.get(key) ?? 0) + position.value)
  }
  // Targeted buckets you hold nothing of still need to show as under-weight.
  for (const target of targets) if (!buckets.has(target.key)) buckets.set(target.key, 0)

  const rows: AllocationRow[] = []
  for (const [key, value] of buckets) {
    const actual = total > 0 ? value / total : 0
    const target = targets.find((t) => t.key === key)?.weight ?? null
    const drift = target === null ? null : actual - target
    rows.push({
      key,
      value,
      actual,
      target,
      drift,
      gap: target === null ? null : (target - actual) * total,
      status:
        drift === null
          ? 'untargeted'
          : Math.abs(drift) <= driftBand
            ? 'on-target'
            : drift > 0
              ? 'over'
              : 'under',
    })
  }
  return rows.sort((a, b) => b.value - a.value)
}

export type RiskView = {
  total: number
  top5Weight: number
  topPosition: PositionView | null
  positionCount: number
  /** Herfindahl-Hirschman index of position weights: 1 = single position */
  hhi: number
  /** number of equally-weighted positions that would carry the same HHI */
  effectivePositions: number
}

export function riskView(positions: PositionView[]): RiskView {
  const total = positions.reduce((sum, p) => sum + p.value, 0)
  const top5 = positions.slice(0, 5).reduce((sum, p) => sum + p.value, 0)
  const hhi = positions.reduce((sum, p) => sum + p.weight * p.weight, 0)
  return {
    total,
    top5Weight: total > 0 ? top5 / total : 0,
    topPosition: positions[0] ?? null,
    positionCount: positions.length,
    hhi,
    effectivePositions: hhi > 0 ? 1 / hhi : 0,
  }
}

export function totalValue(positions: PositionView[]): number {
  return positions.reduce((sum, p) => sum + p.value, 0)
}

export function totalCost(positions: PositionView[]): number {
  return positions.reduce((sum, p) => sum + p.costBasis, 0)
}

export function targetsFor(settings: Settings, dimension: AllocationDimension): AllocationTarget[] {
  if (dimension === 'assetClass') return settings.targetsByAssetClass
  if (dimension === 'geography') return settings.targetsByGeography
  return settings.targetsByCurrency
}
