import { describe, expect, it } from 'vitest'
import { buildDepreciation, lifeYearsFor } from '@/domain/airbnb/depreciation'
import { buildStatement, expenseMatrix } from '@/domain/airbnb/statement'
import { costBreakdown, monthlyMetrics } from '@/domain/airbnb/metrics'
import { businessCash, ownerOfHolding, personalHoldings, splitByOwner } from '@/domain/investments/ownership'
import { runDcf } from '@/domain/airbnb/dcf'
import type { Booking, CapitalSpend, Expense, Holding, Provenance } from '@/types'

const prov: Provenance = { importId: 'i', fileName: 'f.xlsx', sheetName: 'S', rowNumber: 2 }

const spend = (date: string, item: string, category: string, amount: number): CapitalSpend => ({
  id: `${date}-${item}`,
  prov,
  projectId: '',
  date,
  item,
  category,
  amount,
  currency: 'PHP',
  vendor: '',
  note: '',
})

const expense = (date: string, category: string, amount: number): Expense => ({
  id: `${date}-${category}`,
  prov,
  date,
  category,
  nature: 'fixed',
  amount,
  currency: 'PHP',
  vendor: '',
  note: '',
})

const month = (m: string, revenue: number) => ({
  month: m,
  revenue,
  nightsSold: 10,
  availableNights: 30,
  occupancy: 10 / 30,
  bookings: 3,
  guestNights: 40,
  adr: revenue / 10,
  revpar: revenue / 30,
})

describe('depreciation from the capital ledger', () => {
  it('writes an item off straight-line from the month it was bought', () => {
    // A five-year life is sixty equal charges starting in the purchase month.
    const schedule = buildDepreciation([spend('2026-07-27', 'Inflatable pool', 'Furniture & fittings', 24000)], '2026-09')
    const item = schedule.items[0]

    expect(item.lifeYears).toBe(5)
    expect(item.monthlyCharge).toBeCloseTo(400)
    expect(schedule.byMonth['2026-06']).toBeUndefined()
    expect(schedule.byMonth['2026-07']).toBeCloseTo(400)
    expect(item.finalMonth).toBe('2031-06')
    // Three months charged by the September it is struck at.
    expect(item.accumulated).toBeCloseTo(1200)
    expect(item.netBookValue).toBeCloseTo(22800)
  })

  it('gives a longer life to the things that last longer', () => {
    expect(lifeYearsFor('Building works')).toBeGreaterThan(lifeYearsFor('Furniture & fittings'))
    // An unrecognised category still gets a life rather than living forever.
    expect(lifeYearsFor('Something new')).toBeGreaterThan(0)
  })

  it('includes guest comfort purchases, which the flat monthly figure left out', () => {
    const schedule = buildDepreciation(
      [
        spend('2026-07-02', 'Bed frame', 'Furniture & fittings', 7000),
        spend('2026-06-15', 'Sofa cushions', 'Furniture & fittings', 13991),
        spend('2026-07-27', 'Inflatable pool', 'Furniture & fittings', 25000),
      ],
      '2026-08',
    )
    expect(schedule.items.map((item) => item.item).sort()).toEqual(['Bed frame', 'Inflatable pool', 'Sofa cushions'])
    expect(schedule.totalCost).toBeCloseTo(45991)
    expect(schedule.byMonth['2026-08']).toBeGreaterThan(0)
  })

  it('ignores a refund or a zero row rather than charging a negative life', () => {
    const schedule = buildDepreciation([spend('2026-01-01', 'Returned', 'Equipment', 0)], '2026-06')
    expect(schedule.items).toHaveLength(0)
    expect(schedule.totalCost).toBe(0)
  })
})

describe('the statement uses the derived charge instead of the sheet estimate', () => {
  const series = [month('2026-01', 200000), month('2026-02', 240000)]
  // The sheet's flat rows and one real purchase covering the same months.
  const expenses = [
    expense('2026-01-05', 'Salary', 34000),
    expense('2026-01-05', 'Depreciation', 12750),
    expense('2026-02-05', 'Depreciation', 12750),
  ]
  const capital = [spend('2026-01-10', 'Generator', 'Power & water', 240000)]

  it('replaces the flat rows rather than stacking on top of them', () => {
    const schedule = buildDepreciation(capital, '2026-02')
    const built = buildStatement({ series, expenses, depreciationByMonth: schedule.byMonth })

    // 240,000 over ten years is 2,000 a month — not 2,000 plus the sheet's 12,750.
    expect(built[0].depreciation).toBeCloseTo(2000)
    expect(built[1].depreciation).toBeCloseTo(2000)
    expect(built[0].byCategory.Depreciation).toBeCloseTo(2000)
    // And it must not have leaked into operating costs on the way past.
    expect(built[0].opex).toBeCloseTo(34000)
  })

  it('leaves the flat rows alone when no capital ledger is supplied', () => {
    const built = buildStatement({ series, expenses })
    expect(built[0].depreciation).toBeCloseTo(12750)
  })

  it('shows the same figure on the expense summary as on the income statement', () => {
    const schedule = buildDepreciation(capital, '2026-02')
    const rows = expenseMatrix(expenses, ['2026-01', '2026-02'], schedule.byMonth)
    const line = rows.find((row) => row.category === 'Depreciation')!
    expect(line.byMonth['2026-01']).toBeCloseTo(2000)
    expect(line.total).toBeCloseTo(4000)
  })
})

describe('the cost model carries depreciation into profit', () => {
  const booking: Booking = {
    id: 'b1',
    prov,
    confirmationCode: 'ABC123',
    guestName: 'Guest',
    channel: 'Airbnb',
    bookedOn: '2026-01-01',
    checkIn: '2026-01-05',
    checkOut: '2026-01-15',
    nights: 10,
    guests: 2,
    grossRevenue: 200000,
    fees: 0,
    netRevenue: 200000,
    addOnRevenue: 0,
    currency: 'PHP',
    status: 'Confirmed',
    country: '',
    rating: '',
    review: '',
    notes: '',
    contact: '',
  }

  it('charges what was bought as a fixed cost, in place of the sheet estimate', () => {
    const base = monthlyMetrics({
      bookings: [booking],
      expenses: [expense('2026-01-05', 'Depreciation', 12750)],
      usdPhp: 58,
      availableNightsPerYear: 365,
    })
    const withCapital = monthlyMetrics({
      bookings: [booking],
      expenses: [expense('2026-01-05', 'Depreciation', 12750)],
      capitalSpend: [spend('2026-01-10', 'Generator', 'Power & water', 240000)],
      usdPhp: 58,
      availableNightsPerYear: 365,
    })

    expect(base[0].fixedCost).toBeCloseTo(12750)
    expect(withCapital[0].fixedCost).toBeCloseTo(2000)
    expect(withCapital[0].netProfit).toBeCloseTo(200000 - 2000)
  })
})

describe('the cost breakdown charges the same depreciation as the statement', () => {
  it('swaps the flat rows for the derived charge, and traces back to the purchases', () => {
    const expenses = [expense('2026-01-05', 'Salary', 34000), expense('2026-01-05', 'Depreciation', 12750)]
    const capital = [spend('2026-01-10', 'Generator', 'Power & water', 240000)]
    const lines = costBreakdown(expenses, 58, capital)
    const line = lines.find((row) => row.category === 'Depreciation')!

    expect(line.amount).toBeCloseTo(2000)
    expect(line.sources).toHaveLength(1)
    expect(lines.filter((row) => row.category === 'Depreciation')).toHaveLength(1)
  })

  it('leaves the sheet rows alone when there is no capital ledger', () => {
    const lines = costBreakdown([expense('2026-01-05', 'Depreciation', 12750)], 58)
    expect(lines.find((row) => row.category === 'Depreciation')!.amount).toBeCloseTo(12750)
  })
})

describe('the Airbnb bank balance is business money, counted once', () => {
  const holding = (ticker: string, account: string, value: number): Holding => ({
    id: ticker + account,
    prov,
    snapshotId: 'snap',
    ticker,
    name: 'Cash savings account',
    assetClass: 'Cash',
    geography: 'Philippines',
    currency: 'PHP',
    quantity: value,
    costBasis: value,
    price: 1,
    value,
    account,
  })

  const holdings = [
    holding('BPI (Airbnb)', 'Island T (business)', 2285106.86),
    holding('BDO Savings', 'Dani', 1049313),
    holding('BPI Wedding', 'DaNics (wedding gifts)', 500000),
  ]

  it('reads the operating account as the business’s, not Dani’s', () => {
    expect(ownerOfHolding(holdings[0])).toBe('business')
    expect(ownerOfHolding(holdings[1])).toBe('dani')
    expect(ownerOfHolding(holdings[2])).toBe('joint')
  })

  it('still finds it when the account column says Dani, because the label says Airbnb', () => {
    expect(ownerOfHolding(holding('BPI (Airbnb)', 'Dani', 100))).toBe('business')
  })

  it('keeps it out of the personal book', () => {
    const personal = personalHoldings(holdings)
    expect(personal).toHaveLength(2)
    expect(personal.some((row) => row.ticker === 'BPI (Airbnb)')).toBe(false)
    expect(businessCash(holdings, 58)).toBeCloseTo(2285106.86)
  })

  it('gives it its own bucket rather than folding it into hers', () => {
    const splits = splitByOwner(holdings, 58)
    const business = splits.find((split) => split.owner === 'business')!
    const dani = splits.find((split) => split.owner === 'dani')!
    expect(business.value).toBeCloseTo(2285106.86)
    expect(dani.value).toBeCloseTo(1049313)
  })

  it('adds it to the valuation exactly once, so nothing is double counted', () => {
    const assumptions = {
      availableNightsPerYear: 330,
      startOccupancy: 0.5,
      terminalOccupancy: 0.55,
      occupancyRampYears: 4,
      adr: 18000,
      adrGrowth: 0.04,
      variableCostPerNight: 2500,
      fixedCostPerYear: 733200,
      costInflation: 0.045,
      taxRate: 0.25,
      maintenanceCapexPerYear: 250000,
      discountRate: 0.14,
      terminalGrowth: 0.03,
      projectionYears: 10,
      netDebt: 0,
    }
    const float = businessCash(holdings, 58)
    const withCash = runDcf(assumptions, float)
    const without = runDcf(assumptions)

    expect(withCash.enterpriseValue).toBeCloseTo(without.enterpriseValue)
    expect(withCash.equityValue - without.equityValue).toBeCloseTo(float)
    expect(withCash.cashInBusiness).toBeCloseTo(float)
  })
})
