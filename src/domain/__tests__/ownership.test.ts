import { describe, expect, it } from 'vitest'
import { cashShare, equityShare, ownerOf, splitByOwner } from '@/domain/investments/ownership'
import { buildBrief } from '@/domain/airbnb/marketbrief'
import type { Holding, Provenance } from '@/types'

const prov: Provenance = { importId: 'i', fileName: 'f.xlsx', sheetName: 'S', rowNumber: 2 }

const holding = (account: string, value: number, over: Partial<Holding> = {}): Holding => ({
  id: `${account}-${value}-${Math.random()}`,
  prov,
  snapshotId: 's1',
  ticker: 'X',
  name: 'X',
  assetClass: 'Equity',
  geography: 'PH',
  currency: 'PHP',
  quantity: 1,
  costBasis: value,
  price: value,
  value,
  account,
  ...over,
})

describe('whose money it is', () => {
  it('reads the joint pot from however the sheet spelled it', () => {
    expect(ownerOf('DaNics (wedding gifts)')).toBe('joint')
    expect(ownerOf('Da Nics')).toBe('joint')
    expect(ownerOf('Joint account')).toBe('joint')
    expect(ownerOf('Nicolo + Dani')).toBe('joint')
    expect(ownerOf('wedding fund')).toBe('joint')
  })

  it('treats a named personal account as hers', () => {
    expect(ownerOf('Dani')).toBe('dani')
    expect(ownerOf('BPI')).toBe('dani')
  })

  it('does not guess when the account column says nothing', () => {
    expect(ownerOf('')).toBe('unassigned')
    expect(ownerOf('Default')).toBe('unassigned')
    expect(ownerOf('N/A')).toBe('unassigned')
  })

  it('splits the book and shows which labels landed where', () => {
    const splits = splitByOwner(
      [
        holding('Dani', 100),
        holding('Dani', 50),
        holding('DaNics (wedding gifts)', 400),
        holding('Default', 25),
      ],
      58,
    )
    expect(splits.map((s) => s.owner)).toEqual(['dani', 'joint', 'unassigned'])
    expect(splits[0].value).toBe(150)
    expect(splits[0].holdings).toBe(2)
    expect(splits[1].value).toBe(400)
    expect(splits[1].accounts).toEqual(['DaNics (wedding gifts)'])
  })

  it('converts a USD holding before adding it to a peso total', () => {
    const [split] = splitByOwner([holding('Dani', 100, { currency: 'USD' })], 58)
    expect(split.value).toBe(5800)
  })

  it('measures how much of a pot is sitting in cash', () => {
    const result = cashShare(
      [holding('Dani', 300, { assetClass: 'Cash' }), holding('Dani', 100, { assetClass: 'Equity' })],
      58,
    )
    expect(result.cash).toBe(300)
    expect(result.total).toBe(400)
    expect(result.share).toBe(0.75)
  })

  it('reports a zero share rather than dividing by nothing', () => {
    expect(cashShare([], 58).share).toBe(0)
  })
})

describe('the brief handed to Claude', () => {
  const base = {
    series: [
      {
        month: '2026-01',
        revenue: 200000,
        addOnRevenue: 20000,
        totalRevenue: 220000,
        grossRevenue: 210000,
        nightsSold: 12,
        availableNights: 31,
        occupancy: 12 / 31,
        adr: 16667,
        revpar: 6452,
        totalRevpar: 7097,
        bookings: 4,
        guestNights: 40,
        fixedCost: 0,
        variableCost: 0,
        totalCost: 0,
        netProfit: 0,
        netMargin: 0,
        sourceBookings: [],
        sourceExpenses: [],
      },
    ],
    bookings: [],
    addons: [],
    listings: [],
    observations: [],
    asOf: '2026-09-01',
  }

  it('never claims a competitor rate it was not given', () => {
    const brief = buildBrief(base)
    expect(brief).toContain('(none tracked yet)')
    expect(brief).toContain('You cannot see live Airbnb prices')
    expect(brief).toContain('belongs in toVerify')
  })

  it('carries the real seasonality rather than a summary of it', () => {
    const brief = buildBrief(base)
    expect(brief).toContain('January:')
    expect(brief).toContain('December:')
  })

  it('asks for JSON in a fixed shape so the page can render it', () => {
    const brief = buildBrief(base)
    expect(brief).toContain('"positioning"')
    expect(brief).toContain('"moves"')
    expect(brief).toContain('"toVerify"')
    expect(brief).toContain('Return JSON only')
  })

  it('tells the model not to recommend what the lead-time data contradicts', () => {
    expect(buildBrief(base)).toContain('Do not recommend last-minute discounting')
  })
})

/**
 * A term deposit is fixed income, not cash — so a pot can read 1% cash while
 * nearly three quarters of it is parked until a maturity date. This is why the
 * joint tile asks how much is in the market instead.
 */
describe('how much of a pot is actually invested', () => {
  const row = (assetClass: string, value: number) =>
    ({
      id: assetClass + value,
      prov: { importId: 'i', fileName: 'f', sheetName: 's', rowNumber: 1 },
      snapshotId: 'snap',
      ticker: assetClass,
      name: assetClass,
      assetClass,
      geography: 'PH',
      currency: 'PHP' as const,
      quantity: 1,
      costBasis: 0,
      price: value,
      value,
      account: 'DaNics (wedding gifts)',
    }) as never

  const pot = [row('Fixed Income', 2426216), row('Cash', 30635), row('Equity', 888415)]

  it('does not call a pot invested just because it holds no cash', () => {
    expect(cashShare(pot, 61.27).share).toBeCloseTo(0.009, 3)
    expect(equityShare(pot, 61.27).share).toBeCloseTo(0.266, 3)
  })

  it('converts dollars before comparing', () => {
    const usd = [{ ...(row('Equity', 100) as object), currency: 'USD' }] as never[]
    expect(equityShare(usd, 58).equity).toBeCloseTo(5800)
  })

  it('is zero on an empty pot rather than dividing by nothing', () => {
    expect(equityShare([], 58).share).toBe(0)
  })
})

/**
 * The sheet carries a cost basis for almost nothing, so a gain measured as
 * "everything's value minus the few known costs" reports every uncosted holding
 * as pure profit. Recorded here because it went unnoticed until one time
 * deposit was entered at its principal and the joint pot claimed +37.9%.
 */
describe('unrealised gain across a book that is mostly uncosted', () => {
  const position = (value: number, costBasis: number) => ({ value, costBasis })
  const gainOf = (positions: { value: number; costBasis: number }[]) => {
    const withCost = positions.filter((p) => p.costBasis > 0)
    const cost = positions.reduce((sum, p) => sum + p.costBasis, 0)
    const costedValue = withCost.reduce((sum, p) => sum + p.value, 0)
    return { cost, gain: costedValue - cost }
  }

  it('ignores the value of positions that have no cost to compare against', () => {
    // A deposit at its principal, plus Vanguard holdings with no cost recorded.
    const pot = [position(2426216, 2426216), position(444208, 0), position(444208, 0), position(30635, 0)]
    expect(gainOf(pot).gain).toBe(0)
  })

  it('still reports a real gain on the part that is costed', () => {
    const pot = [position(150, 100), position(999, 0)]
    const { cost, gain } = gainOf(pot)
    expect(gain).toBe(50)
    expect(gain / cost).toBeCloseTo(0.5)
  })
})
