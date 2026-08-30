import type { AllocationRow, AllocationDimension, PositionView } from '@/domain/investments/portfolio'
import { allocationBy, targetsFor } from '@/domain/investments/portfolio'
import type { Settings } from '@/types'

/**
 * Decision support, not advice.
 *
 * The engine ranks candidate moves by an explicit weighted score. Every input
 * to that score is shown alongside the suggestion, so a move can be argued
 * with rather than taken on trust. Nothing here knows anything about markets
 * beyond what you imported.
 */

export type ScoreWeights = {
  /** how much closing an allocation gap matters */
  gapClosure: number
  /** how much avoiding a taxable realised gain matters */
  taxEfficiency: number
  /** how much reducing single-position concentration matters */
  concentration: number
  /** how much a supplied valuation signal matters */
  valuation: number
}

export const DEFAULT_WEIGHTS: ScoreWeights = {
  gapClosure: 0.45,
  taxEfficiency: 0.25,
  concentration: 0.2,
  valuation: 0.1,
}

export type MoveKind = 'buy' | 'trim'

export type Move = {
  id: string
  kind: MoveKind
  /** the allocation bucket this move serves */
  bucket: string
  dimension: AllocationDimension
  /** specific position, when the move is a trim */
  ticker: string | null
  /** peso amount to move */
  amount: number
  score: number
  components: {
    gapClosure: number
    taxEfficiency: number
    concentration: number
    valuation: number
  }
  /** plain-language reasons, one line each, shown in the UI */
  rationale: string[]
  /** unrealised gain that a trim would crystallise, in base currency */
  realisedGain: number
}

/**
 * PH context: listed-share sales carry a 0.6% stock transaction tax on gross
 * proceeds rather than capital gains tax, and there is no CGT on listed
 * equities. That makes trimming cheaper here than in most jurisdictions — but
 * still not free, so cost is scored rather than ignored.
 */
export const TRANSACTION_COST_RATE = 0.006

export type ValuationSignal = {
  /** ticker -> signal in [-1, 1]; positive = looks cheap, negative = looks rich */
  [ticker: string]: number
}

function normalise(value: number, max: number): number {
  if (max <= 0) return 0
  return Math.max(0, Math.min(1, value / max))
}

export function proposeMoves(
  positions: PositionView[],
  settings: Settings,
  dimension: AllocationDimension = 'assetClass',
  weights: ScoreWeights = DEFAULT_WEIGHTS,
  valuation: ValuationSignal = {},
  /** new cash available to deploy, base currency */
  cashToDeploy = 0,
): { moves: Move[]; rows: AllocationRow[]; totalDrift: number } {
  const targets = targetsFor(settings, dimension)
  const rows = allocationBy(positions, dimension, targets, settings.driftBandPct)
  const total = positions.reduce((sum, p) => sum + p.value, 0)
  const moves: Move[] = []

  const gaps = rows.filter((row) => row.gap !== null)
  const largestGap = Math.max(1, ...gaps.map((row) => Math.abs(row.gap ?? 0)))
  const totalDrift = gaps.reduce((sum, row) => sum + Math.abs(row.drift ?? 0), 0) / 2

  for (const row of rows) {
    if (row.gap === null || row.drift === null) continue
    if (Math.abs(row.drift) <= settings.driftBandPct) continue

    const inBucket = positions
      .filter((p) => String(p[dimension] || 'Unspecified') === row.key)
      .sort((a, b) => b.value - a.value)

    if (row.gap > 0) {
      // Under target: buy. Prefer the cheapest-looking name already held.
      const ranked = [...inBucket].sort(
        (a, b) => (valuation[b.ticker] ?? 0) - (valuation[a.ticker] ?? 0),
      )
      const pick = ranked[0] ?? null
      const amount = cashToDeploy > 0 ? Math.min(row.gap, cashToDeploy) : row.gap

      const components = {
        gapClosure: normalise(Math.abs(row.gap), largestGap),
        // Buying never realises a gain, so it is maximally tax-efficient.
        taxEfficiency: 1,
        concentration: pick ? 1 - Math.min(1, pick.weight / 0.25) : 0.5,
        valuation: pick ? ((valuation[pick.ticker] ?? 0) + 1) / 2 : 0.5,
      }

      const rationale = [
        `${row.key} is ${(Math.abs(row.drift) * 100).toFixed(1)} pp under its ${(row.target! * 100).toFixed(0)}% target — the largest gap this move closes.`,
        pick
          ? `Adding to ${pick.ticker} keeps the position count flat rather than introducing a new holding to track.`
          : `No existing holding in ${row.key} — this needs a new position.`,
        'A purchase realises no gain, so it carries no tax cost.',
      ]
      if (pick && valuation[pick.ticker] !== undefined) {
        rationale.push(
          `Valuation signal for ${pick.ticker}: ${valuation[pick.ticker] > 0 ? 'cheap' : 'rich'} (${valuation[pick.ticker].toFixed(2)}).`,
        )
      }
      if (cashToDeploy > 0 && row.gap > cashToDeploy) {
        rationale.push(`Sized down to the ₱${Math.round(cashToDeploy).toLocaleString()} of cash you flagged as available.`)
      }

      moves.push({
        id: `buy-${dimension}-${row.key}`,
        kind: 'buy',
        bucket: row.key,
        dimension,
        ticker: pick?.ticker ?? null,
        amount,
        score:
          components.gapClosure * weights.gapClosure +
          components.taxEfficiency * weights.taxEfficiency +
          components.concentration * weights.concentration +
          components.valuation * weights.valuation,
        components,
        rationale,
        realisedGain: 0,
      })
    } else {
      // Over target: trim. Prefer the richest-looking, most concentrated name
      // with the smallest embedded gain per peso raised.
      const trimAmount = Math.abs(row.gap)
      const candidates = inBucket.map((position) => {
        const gainFraction = position.costBasis > 0 ? Math.max(0, position.value / position.costBasis - 1) : 0
        const embeddedGain = gainFraction * Math.min(trimAmount, position.value)
        return { position, gainFraction, embeddedGain }
      })
      candidates.sort((a, b) => {
        const scoreA = a.position.weight * 2 - a.gainFraction + (valuation[a.position.ticker] ?? 0) * -1
        const scoreB = b.position.weight * 2 - b.gainFraction + (valuation[b.position.ticker] ?? 0) * -1
        return scoreB - scoreA
      })

      const pick = candidates[0]
      if (!pick) continue
      const amount = Math.min(trimAmount, pick.position.value)
      const cost = amount * TRANSACTION_COST_RATE

      const components = {
        gapClosure: normalise(trimAmount, largestGap),
        // Cheaper to sell = higher score. Cost is measured against the proceeds.
        taxEfficiency: 1 - Math.min(1, (cost / Math.max(amount, 1)) / 0.02),
        concentration: Math.min(1, pick.position.weight / 0.25),
        valuation: (-(valuation[pick.position.ticker] ?? 0) + 1) / 2,
      }

      const rationale = [
        `${row.key} sits ${(row.drift * 100).toFixed(1)} pp over its ${(row.target! * 100).toFixed(0)}% target.`,
        `${pick.position.ticker} is the largest holding in the bucket at ${(pick.position.weight * 100).toFixed(1)}% of the portfolio.`,
        `Selling ₱${Math.round(amount).toLocaleString()} costs roughly ₱${Math.round(cost).toLocaleString()} in stock transaction tax at ${(TRANSACTION_COST_RATE * 100).toFixed(2)}% of proceeds.`,
      ]
      if (pick.gainFraction > 0) {
        rationale.push(
          `Crystallises about ₱${Math.round(pick.embeddedGain).toLocaleString()} of unrealised gain (${(pick.gainFraction * 100).toFixed(0)}% above cost).`,
        )
      }
      if (valuation[pick.position.ticker] !== undefined) {
        rationale.push(
          `Valuation signal: ${valuation[pick.position.ticker] < 0 ? 'rich' : 'cheap'} (${valuation[pick.position.ticker].toFixed(2)}).`,
        )
      }

      moves.push({
        id: `trim-${dimension}-${row.key}-${pick.position.ticker}`,
        kind: 'trim',
        bucket: row.key,
        dimension,
        ticker: pick.position.ticker,
        amount,
        score:
          components.gapClosure * weights.gapClosure +
          components.taxEfficiency * weights.taxEfficiency +
          components.concentration * weights.concentration +
          components.valuation * weights.valuation,
        components,
        rationale,
        realisedGain: pick.embeddedGain,
      })
    }
  }

  // Concentration is a risk in its own right, independent of asset-class
  // targets. Where a drift move already trims the same name, the point is
  // folded into that move rather than listed twice.
  const concentrated = positions.filter((p) => p.weight > 0.25)
  for (const position of concentrated) {
    const existing = moves.find((move) => move.kind === 'trim' && move.ticker === position.ticker)
    if (existing) {
      existing.rationale.push(
        `Separately, ${position.ticker} is ${(position.weight * 100).toFixed(1)}% of the portfolio — above the 25% single-name threshold — so this trim reduces concentration risk as well as drift.`,
      )
      existing.components.concentration = 1
      continue
    }
    const excess = (position.weight - 0.25) * total
    moves.push({
      id: `concentration-${position.ticker}`,
      kind: 'trim',
      bucket: 'Single-name concentration',
      dimension,
      ticker: position.ticker,
      amount: excess,
      score: 0.5 + Math.min(0.5, (position.weight - 0.25) * 2),
      components: { gapClosure: 0, taxEfficiency: 0.8, concentration: 1, valuation: 0.5 },
      rationale: [
        `${position.ticker} is ${(position.weight * 100).toFixed(1)}% of the portfolio — above the 25% single-name threshold.`,
        'This flag is independent of asset-class targets: a bucket can sit on target while one name inside it carries most of the risk.',
        `Trimming to 25% frees roughly ₱${Math.round(excess).toLocaleString()}.`,
      ],
      realisedGain:
        position.costBasis > 0 ? Math.max(0, position.value / position.costBasis - 1) * excess : 0,
    })
  }

  return { moves: moves.sort((a, b) => b.score - a.score), rows, totalDrift }
}
