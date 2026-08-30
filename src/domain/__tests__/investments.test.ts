import { describe, expect, it } from 'vitest'
import { buildPerformance, trailingReturn, volatility, xirr, maxDrawdown } from '@/domain/investments/performance'
import { allocationBy, buildPositions, riskView } from '@/domain/investments/portfolio'
import { proposeMoves } from '@/domain/investments/rebalance'
import { DEFAULT_SETTINGS } from '@/state/defaults'
import type { Holding, Provenance, Snapshot, Transaction } from '@/types'

const prov: Provenance = { importId: 'i', fileName: 'f.xlsx', sheetName: 'S', rowNumber: 2 }

function snapshot(id: string, asOf: string, usdPhp = 58): Snapshot {
  return { id, asOf, label: id, createdAt: asOf, importId: 'i', usdPhp }
}

function holding(snapshotId: string, ticker: string, value: number, over: Partial<Holding> = {}): Holding {
  return {
    id: `${snapshotId}-${ticker}`,
    prov,
    snapshotId,
    ticker,
    name: ticker,
    assetClass: 'Equity',
    geography: 'Philippines',
    currency: 'PHP',
    quantity: 1,
    costBasis: value,
    price: value,
    value,
    account: 'A',
    ...over,
  }
}

function txn(date: string, type: Transaction['type'], amount: number): Transaction {
  return {
    id: `${date}-${type}`,
    prov,
    date,
    ticker: '',
    type,
    quantity: 0,
    price: 0,
    amount,
    currency: 'PHP',
    fees: 0,
    account: 'A',
    note: '',
  }
}

describe('portfolio aggregation', () => {
  it('converts USD holdings at the snapshot rate, not today’s', () => {
    const snap = snapshot('s1', '2026-01-01', 50)
    const positions = buildPositions(
      [holding('s1', 'VOO', 1000, { currency: 'USD' }), holding('s1', 'SM', 5000)],
      snap,
    )
    const voo = positions.find((p) => p.ticker === 'VOO')!
    expect(voo.valueNative).toBe(1000)
    expect(voo.value).toBe(50000)
    expect(positions.reduce((sum, p) => sum + p.value, 0)).toBe(55000)
  })

  it('groups the same ticker across accounts into one position, keeping both source rows', () => {
    const snap = snapshot('s1', '2026-01-01')
    const positions = buildPositions(
      [
        { ...holding('s1', 'SM', 100), id: 'a', account: 'COL' },
        { ...holding('s1', 'SM', 300), id: 'b', account: 'BPI' },
      ],
      snap,
    )
    expect(positions).toHaveLength(1)
    expect(positions[0].value).toBe(400)
    expect(positions[0].sources).toHaveLength(2)
  })

  it('flags a targeted bucket you hold nothing of as under-weight', () => {
    const snap = snapshot('s1', '2026-01-01')
    const positions = buildPositions([holding('s1', 'SM', 1000)], snap)
    const rows = allocationBy(positions, 'assetClass', [
      { key: 'Equity', weight: 0.5 },
      { key: 'Fixed Income', weight: 0.5 },
    ], 0.05)
    const fixed = rows.find((r) => r.key === 'Fixed Income')!
    expect(fixed.value).toBe(0)
    expect(fixed.status).toBe('under')
    expect(fixed.gap).toBeCloseTo(500)
  })

  it('reports effective positions below the actual count when weights are lopsided', () => {
    const snap = snapshot('s1', '2026-01-01')
    const positions = buildPositions(
      [holding('s1', 'A', 900), holding('s1', 'B', 50), holding('s1', 'C', 50)],
      snap,
    )
    const risk = riskView(positions)
    expect(risk.positionCount).toBe(3)
    expect(risk.effectivePositions).toBeLessThan(1.3)
    expect(risk.top5Weight).toBeCloseTo(1)
  })
})

describe('time-weighted return', () => {
  it('strips a mid-period deposit out of the return', () => {
    // 1,000,000 grows to 1,100,000 while 500,000 is deposited halfway.
    // The gain is 1,100,000 - 1,000,000 - 500,000 = -400,000 against a
    // Dietz denominator of 1,000,000 + 0.5 * 500,000 = 1,250,000.
    const snaps = [snapshot('s1', '2026-01-01'), snapshot('s2', '2026-12-31')]
    const holdings = [holding('s1', 'X', 1_000_000), holding('s2', 'X', 1_100_000)]
    const series = buildPerformance(holdings, snaps, [txn('2026-07-02', 'deposit', 500_000)], 58)
    expect(series.periods).toHaveLength(1)
    expect(series.periods[0].ret).toBeCloseTo(-400_000 / 1_250_000, 3)
  })

  it('returns the raw growth when there are no flows', () => {
    const snaps = [snapshot('s1', '2026-01-01'), snapshot('s2', '2026-12-31')]
    const holdings = [holding('s1', 'X', 1_000_000), holding('s2', 'X', 1_200_000)]
    const series = buildPerformance(holdings, snaps, [], 58)
    expect(series.sinceInception).toBeCloseTo(0.2, 6)
  })

  it('chain-links sub-periods rather than summing them', () => {
    const snaps = [snapshot('s1', '2026-01-01'), snapshot('s2', '2026-07-01'), snapshot('s3', '2027-01-01')]
    const holdings = [holding('s1', 'X', 100), holding('s2', 'X', 110), holding('s3', 'X', 121)]
    const series = buildPerformance(holdings, snaps, [], 58)
    // 1.1 * 1.1 - 1 = 0.21, not 0.10 + 0.10.
    expect(series.sinceInception).toBeCloseTo(0.21, 6)
  })

  it('flags low confidence when a flow is large relative to the portfolio', () => {
    const snaps = [snapshot('s1', '2026-01-01'), snapshot('s2', '2026-12-31')]
    const holdings = [holding('s1', 'X', 100_000), holding('s2', 'X', 600_000)]
    const series = buildPerformance(holdings, snaps, [txn('2026-06-01', 'deposit', 500_000)], 58)
    expect(series.lowConfidence).toBe(true)
  })

  it('does not report a trailing window longer than the history available', () => {
    const snaps = [snapshot('s1', '2026-10-01'), snapshot('s2', '2026-12-01')]
    const holdings = [holding('s1', 'X', 100), holding('s2', 'X', 110)]
    const series = buildPerformance(holdings, snaps, [], 58)
    expect(Number.isNaN(trailingReturn(series, 12))).toBe(true)
  })

  it('measures drawdown from the running peak', () => {
    const snaps = [snapshot('s1', '2026-01-01'), snapshot('s2', '2026-06-01'), snapshot('s3', '2026-12-01')]
    const holdings = [holding('s1', 'X', 100), holding('s2', 'X', 150), holding('s3', 'X', 120)]
    const series = buildPerformance(holdings, snaps, [], 58)
    expect(maxDrawdown(series)).toBeCloseTo(-0.2, 6)
  })

  it('annualises volatility from irregular snapshot gaps', () => {
    const snaps = [
      snapshot('s1', '2026-01-01'),
      snapshot('s2', '2026-04-01'),
      snapshot('s3', '2026-07-01'),
      snapshot('s4', '2026-10-01'),
    ]
    const holdings = [holding('s1', 'X', 100), holding('s2', 'X', 110), holding('s3', 'X', 105), holding('s4', 'X', 120)]
    expect(volatility(buildPerformance(holdings, snaps, [], 58))).toBeGreaterThan(0)
  })
})

describe('xirr', () => {
  it('recovers a known 10% annual return', () => {
    const rate = xirr(
      [
        { date: '2026-01-01', amount: -1000 },
        { date: '2027-01-01', amount: 1100 },
      ],
      '2026-01-01',
    )
    expect(rate).toBeCloseTo(0.1, 3)
  })

  it('returns NaN when every flow has the same sign', () => {
    expect(
      Number.isNaN(
        xirr(
          [
            { date: '2026-01-01', amount: -100 },
            { date: '2027-01-01', amount: -100 },
          ],
          '2026-01-01',
        ),
      ),
    ).toBe(true)
  })
})

describe('rebalancing engine', () => {
  const settings = {
    ...DEFAULT_SETTINGS,
    driftBandPct: 0.05,
    targetsByAssetClass: [
      { key: 'Equity', weight: 0.5 },
      { key: 'Fixed Income', weight: 0.5 },
    ],
  }

  it('suggests no drift move when every bucket is inside the band', () => {
    const snap = snapshot('s1', '2026-01-01')
    const positions = buildPositions(
      [holding('s1', 'A', 500), holding('s1', 'B', 500, { assetClass: 'Fixed Income' })],
      snap,
    )
    const { moves, totalDrift } = proposeMoves(positions, settings, 'assetClass')
    expect(totalDrift).toBeCloseTo(0)
    expect(moves.every((move) => move.id.startsWith('concentration-'))).toBe(true)
  })

  it('folds concentration into an existing trim rather than proposing the same sale twice', () => {
    const snap = snapshot('s1', '2026-01-01')
    const positions = buildPositions(
      [holding('s1', 'BIG', 900), holding('s1', 'BOND', 100, { assetClass: 'Fixed Income' })],
      snap,
    )
    const { moves } = proposeMoves(positions, settings, 'assetClass')
    const forBig = moves.filter((move) => move.ticker === 'BIG')
    expect(forBig).toHaveLength(1)
    expect(forBig[0].components.concentration).toBe(1)
    expect(forBig[0].rationale.some((line) => line.includes('25% single-name threshold'))).toBe(true)
  })

  it('proposes a buy sized to the gap, with reasons attached', () => {
    const snap = snapshot('s1', '2026-01-01')
    const positions = buildPositions(
      [holding('s1', 'A', 900), holding('s1', 'B', 100, { assetClass: 'Fixed Income' })],
      snap,
    )
    const { moves } = proposeMoves(positions, settings, 'assetClass')
    const buy = moves.find((m) => m.kind === 'buy' && m.bucket === 'Fixed Income')!
    expect(buy.amount).toBeCloseTo(400)
    expect(buy.rationale.length).toBeGreaterThan(1)
    expect(buy.components.taxEfficiency).toBe(1)
  })

  it('caps a buy at the cash actually available', () => {
    const snap = snapshot('s1', '2026-01-01')
    const positions = buildPositions(
      [holding('s1', 'A', 900), holding('s1', 'B', 100, { assetClass: 'Fixed Income' })],
      snap,
    )
    const { moves } = proposeMoves(positions, settings, 'assetClass', undefined, {}, 150)
    const buy = moves.find((m) => m.kind === 'buy')!
    expect(buy.amount).toBe(150)
  })

  it('raises a concentration move even when the asset class is on target', () => {
    const snap = snapshot('s1', '2026-01-01')
    const positions = buildPositions(
      [
        holding('s1', 'BIG', 500),
        holding('s1', 'SMALL', 0.01),
        holding('s1', 'BOND', 500, { assetClass: 'Fixed Income' }),
      ],
      snap,
    )
    const { moves } = proposeMoves(positions, settings, 'assetClass')
    expect(moves.some((m) => m.id.startsWith('concentration-BIG'))).toBe(true)
  })
})

describe('missing cashflow data', () => {
  it('does not claim a return when no deposits or withdrawals are known', () => {
    const snaps = [snapshot('s1', '2026-01-01'), snapshot('s2', '2026-12-31')]
    const holdings = [holding('s1', 'X', 1_000_000), holding('s2', 'X', 1_500_000)]
    const series = buildPerformance(holdings, snaps, [], 58)
    expect(series.contributionsKnown).toBe(false)
  })

  it('knows contributions once a deposit covers the window', () => {
    const snaps = [snapshot('s1', '2026-01-01'), snapshot('s2', '2026-12-31')]
    const holdings = [holding('s1', 'X', 1_000_000), holding('s2', 'X', 1_500_000)]
    const series = buildPerformance(holdings, snaps, [txn('2026-06-01', 'deposit', 400_000)], 58)
    expect(series.contributionsKnown).toBe(true)
  })

  it('counts a position that appears later as new money, not as a gain', () => {
    const snaps = [snapshot('s1', '2026-01-01'), snapshot('s2', '2026-12-31')]
    const holdings = [
      holding('s1', 'X', 1_000_000),
      holding('s2', 'X', 1_000_000),
      holding('s2', 'NEW', 500_000),
    ]
    const series = buildPerformance(holdings, snaps, [], 58)
    expect(series.estimatedNewMoney).toBeCloseTo(500_000)
  })

  it('converts a new USD position into base currency', () => {
    const snaps = [snapshot('s1', '2026-01-01', 58), snapshot('s2', '2026-12-31', 58)]
    const holdings = [
      holding('s1', 'X', 1_000),
      holding('s2', 'X', 1_000),
      holding('s2', 'USDPOS', 100, { currency: 'USD' }),
    ]
    const series = buildPerformance(holdings, snaps, [], 58)
    expect(series.estimatedNewMoney).toBeCloseTo(5_800)
  })
})
