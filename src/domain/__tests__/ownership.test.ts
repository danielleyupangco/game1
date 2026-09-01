import { describe, expect, it } from 'vitest'
import { cashShare, ownerOf, splitByOwner } from '@/domain/investments/ownership'
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
