import { describe, expect, it } from 'vitest'
import { aggregate, costBreakdown, monthlyMetrics, seasonality } from '@/domain/airbnb/metrics'
import { evaluateProject, irr, npv, paybackYears, projectCashflows, runDcf, sensitivity, tornado } from '@/domain/airbnb/dcf'
import { priceCurve, suggestByMonth, weekdayDemand } from '@/domain/airbnb/pricing'
import { DEFAULT_DCF, DEFAULT_PRICING } from '@/state/defaults'
import { nightsByMonth } from '@/lib/dates'
import { dateFromSheetName } from '@/lib/workbook'
import {
  buildCrosstabExpenses,
  detectPeriodColumns,
  headerToDate,
  isSummaryLabel,
  looksLikeMetricRow,
} from '@/lib/crosstab'
import { toExpenseNature, toISO, toNumber } from '@/lib/coerce'
import type { Booking, CapitalProject, Expense, Provenance } from '@/types'

const prov: Provenance = { importId: 'i', fileName: 'f.xlsx', sheetName: 'S', rowNumber: 2 }

function booking(checkIn: string, checkOut: string, net: number, over: Partial<Booking> = {}): Booking {
  const nights = Math.round(
    (new Date(`${checkOut}T00:00:00`).getTime() - new Date(`${checkIn}T00:00:00`).getTime()) / 86400000,
  )
  return {
    id: `${checkIn}-${checkOut}-${net}`,
    prov,
    confirmationCode: checkIn,
    guestName: 'G',
    channel: 'Airbnb',
    bookedOn: checkIn,
    checkIn,
    checkOut,
    nights,
    guests: 2,
    grossRevenue: net,
    fees: 0,
    netRevenue: net,
    addOnRevenue: 0,
    currency: 'PHP',
    status: 'confirmed',
    ...over,
  }
}

function expense(date: string, category: string, amount: number, nature: Expense['nature'] = 'fixed'): Expense {
  return { id: `${date}-${category}`, prov, date, category, nature, amount, currency: 'PHP', vendor: '', note: '' }
}

describe('night apportionment', () => {
  it('splits a stay across the months it touches', () => {
    expect(nightsByMonth('2026-03-29', '2026-04-02')).toEqual({ '2026-03': 3, '2026-04': 1 })
  })

  it('counts the check-out night for nobody', () => {
    expect(nightsByMonth('2026-03-01', '2026-03-02')).toEqual({ '2026-03': 1 })
  })

  it('recognises revenue in both months, not just the check-in month', () => {
    const series = monthlyMetrics({
      bookings: [booking('2026-03-29', '2026-04-02', 40000)],
      expenses: [],
      usdPhp: 58,
      availableNightsPerYear: 365,
    })
    const march = series.find((m) => m.month === '2026-03')!
    const april = series.find((m) => m.month === '2026-04')!
    expect(march.revenue).toBeCloseTo(30000)
    expect(april.revenue).toBeCloseTo(10000)
    expect(march.nightsSold).toBe(3)
    expect(april.nightsSold).toBe(1)
  })
})

describe('operating metrics', () => {
  it('excludes cancelled bookings from revenue but keeps them on file', () => {
    const series = monthlyMetrics({
      bookings: [
        booking('2026-03-01', '2026-03-05', 40000),
        booking('2026-03-10', '2026-03-14', 40000, { status: 'Cancelled by guest' }),
      ],
      expenses: [],
      usdPhp: 58,
      availableNightsPerYear: 365,
    })
    expect(series[0].revenue).toBeCloseTo(40000)
    expect(series[0].nightsSold).toBe(4)
  })

  it('converts USD revenue to PHP', () => {
    const series = monthlyMetrics({
      bookings: [booking('2026-03-01', '2026-03-02', 100, { currency: 'USD' })],
      expenses: [],
      usdPhp: 58,
      availableNightsPerYear: 365,
    })
    expect(series[0].revenue).toBeCloseTo(5800)
  })

  it('separates RevPAR from ADR — a high rate on an empty house shows up', () => {
    const series = monthlyMetrics({
      bookings: [booking('2026-03-01', '2026-03-03', 100000)],
      expenses: [],
      usdPhp: 58,
      availableNightsPerYear: 365,
    })
    const march = series[0]
    expect(march.adr).toBeCloseTo(50000)
    expect(march.revpar).toBeCloseTo(100000 / 31)
    expect(march.revpar).toBeLessThan(march.adr)
  })

  it('derives cost per available night from fixed plus variable costs', () => {
    const totals = aggregate(
      monthlyMetrics({
        bookings: [booking('2026-03-01', '2026-03-11', 100000)],
        expenses: [expense('2026-03-15', 'Crew', 31000), expense('2026-03-16', 'Catering', 10000, 'variable')],
        usdPhp: 58,
        availableNightsPerYear: 365,
      }),
    )
    expect(totals.availableNights).toBe(31)
    expect(totals.costPerAvailableNight).toBeCloseTo(41000 / 31)
    expect(totals.variableCostPerNight).toBeCloseTo(1000)
    expect(totals.netProfit).toBeCloseTo(59000)
  })

  it('averages each calendar month across years for seasonality', () => {
    const series = monthlyMetrics({
      bookings: [booking('2025-03-01', '2025-03-11', 100000), booking('2026-03-01', '2026-03-21', 200000)],
      expenses: [],
      usdPhp: 58,
      availableNightsPerYear: 365,
    })
    const march = seasonality(series).find((point) => point.monthIndex === 3)!
    expect(march.years).toBe(2)
    expect(march.occupancy).toBeCloseTo(30 / 62)
  })

  it('groups costs by category and ranks them', () => {
    const lines = costBreakdown(
      [expense('2026-01-01', 'Crew', 60000), expense('2026-02-01', 'Crew', 60000), expense('2026-01-05', 'Fuel', 5000, 'variable')],
      58,
    )
    expect(lines[0].category).toBe('Crew')
    expect(lines[0].amount).toBe(120000)
    expect(lines[0].sources).toHaveLength(2)
    expect(lines[0].share).toBeCloseTo(120000 / 125000)
  })
})

describe('DCF', () => {
  it('discounts a flat cash flow to the textbook perpetuity value', () => {
    // Zero growth, zero inflation: FCF is constant, so the terminal value is
    // simply FCF / r and the whole thing collapses to a perpetuity.
    const flat = {
      ...DEFAULT_DCF,
      availableNightsPerYear: 100,
      startOccupancy: 0.5,
      terminalOccupancy: 0.5,
      occupancyRampYears: 1,
      adr: 20000,
      adrGrowth: 0,
      variableCostPerNight: 0,
      fixedCostPerYear: 0,
      costInflation: 0,
      taxRate: 0,
      maintenanceCapexPerYear: 0,
      discountRate: 0.1,
      terminalGrowth: 0,
      projectionYears: 50,
      netDebt: 0,
    }
    const result = runDcf(flat)
    const annualFcf = 100 * 0.5 * 20000
    expect(result.enterpriseValue).toBeCloseTo(annualFcf / 0.1, 0)
  })

  it('subtracts net debt to get equity value', () => {
    const result = runDcf({ ...DEFAULT_DCF, netDebt: 2_000_000 })
    const noDebt = runDcf({ ...DEFAULT_DCF, netDebt: 0 })
    expect(noDebt.equityValue - result.equityValue).toBeCloseTo(2_000_000, 6)
  })

  it('refuses to produce a number when terminal growth meets the discount rate', () => {
    const result = runDcf({ ...DEFAULT_DCF, discountRate: 0.08, terminalGrowth: 0.08 })
    expect(result.invalid).toBe(true)
    expect(Number.isNaN(result.equityValue)).toBe(true)
  })

  it('ramps occupancy linearly from start to terminal', () => {
    const result = runDcf({ ...DEFAULT_DCF, startOccupancy: 0.2, terminalOccupancy: 0.6, occupancyRampYears: 5 })
    expect(result.years[0].occupancy).toBeCloseTo(0.2)
    expect(result.years[2].occupancy).toBeCloseTo(0.4)
    expect(result.years[4].occupancy).toBeCloseTo(0.6)
    expect(result.years[8].occupancy).toBeCloseTo(0.6)
  })

  it('reports the terminal share so an assumption-heavy answer is visible', () => {
    const shortHorizon = runDcf({ ...DEFAULT_DCF, projectionYears: 3 })
    const longHorizon = runDcf({ ...DEFAULT_DCF, projectionYears: 20 })
    expect(shortHorizon.terminalShare).toBeGreaterThan(longHorizon.terminalShare)
  })

  it('ranks the discount rate and occupancy above cost inflation in the tornado', () => {
    const bars = tornado(DEFAULT_DCF)
    expect(bars[0].swing).toBeGreaterThanOrEqual(bars[bars.length - 1].swing)
    expect(bars.map((bar) => bar.key)).toContain('discountRate')
  })

  it('builds a sensitivity grid where value falls as the discount rate rises', () => {
    const grid = sensitivity(DEFAULT_DCF, 'discountRate', [0.1, 0.14, 0.18], 'terminalOccupancy', [0.4, 0.55, 0.7])
    expect(grid.values[0][0]).toBeGreaterThan(grid.values[2][0])
    expect(grid.values[0][2]).toBeGreaterThan(grid.values[0][0])
  })
})

describe('capital allocation', () => {
  const project: CapitalProject = {
    id: 'p',
    name: 'Fourth room',
    capex: 1_000_000,
    annualCashflow: 300_000,
    rampYears: 0,
    lifeYears: 10,
    terminalValue: 0,
    note: '',
  }

  it('computes NPV consistently with its own IRR', () => {
    const flows = projectCashflows(project)
    const rate = irr(flows)
    expect(npv(rate, flows)).toBeCloseTo(0, 4)
  })

  it('finds the payback year by interpolation', () => {
    expect(paybackYears([-1000, 400, 400, 400])).toBeCloseTo(2.5, 3)
  })

  it('reports no payback when the project never recovers its capex', () => {
    expect(Number.isNaN(paybackYears([-1000, 100, 100]))).toBe(true)
  })

  it('states the spread against the portfolio, which is the real comparison', () => {
    const result = evaluateProject(project, 0.14, 0.1)
    expect(result.spreadVsPortfolio).toBeCloseTo(result.irr - 0.1, 6)
    expect(result.profitabilityIndex).toBeCloseTo((result.npv + 1_000_000) / 1_000_000, 6)
  })

  it('delays cash flows during the ramp', () => {
    const ramped = projectCashflows({ ...project, rampYears: 2 })
    expect(ramped[1]).toBeLessThan(300_000)
    expect(ramped[ramped.length - 1]).toBeCloseTo(300_000)
  })
})

describe('pricing', () => {
  it('trades occupancy against rate along the elasticity curve', () => {
    const curve = priceCurve(20000, 0.5, -1.5)
    const up = curve.find((point) => Math.abs(point.rateChange - 0.2) < 1e-9)!
    expect(up.adr).toBeCloseTo(24000)
    expect(up.occupancy).toBeLessThan(0.5)
    // Elastic demand: a price rise costs more occupancy than it gains in rate.
    expect(up.revpar).toBeLessThan(20000 * 0.5)
  })

  it('never projects occupancy above 100%', () => {
    const curve = priceCurve(20000, 0.95, -2)
    expect(Math.max(...curve.map((point) => point.occupancy))).toBeLessThanOrEqual(1)
  })

  it('recommends a cut when demand is elastic enough to pay for it', () => {
    const season = seasonality(
      monthlyMetrics({
        bookings: [booking('2026-03-01', '2026-03-11', 300000)],
        expenses: [],
        usdPhp: 58,
        availableNightsPerYear: 365,
      }),
    )
    const [suggestion] = suggestByMonth(season, { ...DEFAULT_PRICING, priceElasticity: -2.5 }, 30000).filter(
      (s) => s.monthIndex === 3,
    )
    expect(suggestion.rateChange).toBeLessThan(0)
    expect(suggestion.projectedRevpar).toBeGreaterThanOrEqual(suggestion.currentRevpar)
  })

  it('marks a suggestion as cap-bound when inelastic demand has no interior optimum', () => {
    const season = seasonality(
      monthlyMetrics({
        bookings: [booking('2026-03-01', '2026-03-11', 300000)],
        expenses: [],
        usdPhp: 58,
        availableNightsPerYear: 365,
      }),
    )
    const [suggestion] = suggestByMonth(season, { ...DEFAULT_PRICING, priceElasticity: -0.5 }, 30000).filter(
      (s) => s.monthIndex === 3,
    )
    expect(suggestion.capBound).toBe(true)
    expect(suggestion.rateChange).toBeCloseTo(DEFAULT_PRICING.maxRateChangePct)
    expect(suggestion.reasoning.some((line) => line.includes('no interior optimum'))).toBe(true)
  })

  it('labels a month with no history as low confidence rather than guessing', () => {
    const season = seasonality(
      monthlyMetrics({
        bookings: [booking('2026-03-01', '2026-03-11', 300000)],
        expenses: [],
        usdPhp: 58,
        availableNightsPerYear: 365,
      }),
    )
    const august = suggestByMonth(season, DEFAULT_PRICING, 30000).find((s) => s.monthIndex === 8)!
    expect(august.observations).toBe(0)
    expect(august.confidence).toBe('low')
    expect(august.reasoning[0]).toContain('No bookings recorded')
  })

  it('only proposes a weekend uplift where weekend nights actually outsell', () => {
    // 2026-03-06 is a Friday; this stay covers Fri and Sat only.
    const weekendHeavy = weekdayDemand(
      [booking('2026-03-06', '2026-03-08', 50000), booking('2026-03-13', '2026-03-15', 50000)],
      DEFAULT_PRICING,
    )
    expect(weekendHeavy.find((d) => d.day === 5)!.suggestedUplift).toBeGreaterThan(0)

    const evenDemand = weekdayDemand([booking('2026-03-02', '2026-03-30', 50000)], DEFAULT_PRICING)
    expect(evenDemand.every((d) => d.suggestedUplift === 0)).toBe(true)
  })
})

describe('spreadsheet coercion', () => {
  it('reads accounting negatives and currency symbols', () => {
    expect(toNumber('(1,234.50)')).toBe(-1234.5)
    expect(toNumber('₱ 12,000')).toBe(12000)
    expect(toNumber('$1,234.56')).toBe(1234.56)
    expect(toNumber('12.5%')).toBeCloseTo(0.125)
    expect(toNumber('—')).toBeNull()
    expect(toNumber('')).toBeNull()
  })

  it('reads the date formats a real export actually uses', () => {
    expect(toISO('2026-03-05')).toBe('2026-03-05')
    expect(toISO('03/05/2026')).toBe('2026-03-05')
    expect(toISO('05/03/2026', true)).toBe('2026-03-05')
    expect(toISO('13/03/2026')).toBe('2026-03-13')
    expect(toISO('5 Mar 2026')).toBe('2026-03-05')
    expect(toISO(new Date('2026-03-05T00:00:00'))).toBe('2026-03-05')
    // 46086 is the Excel serial for 2026-03-05 (1899-12-30 epoch).
    expect(toISO(46086)).toBe('2026-03-05')
    expect(toISO('not a date')).toBeNull()
  })

  it('classifies costs by keyword when the sheet does not say', () => {
    expect(toExpenseNature('', 'Boat fuel & transfers')).toBe('variable')
    expect(toExpenseNature('', 'Guest catering')).toBe('variable')
    expect(toExpenseNature('', 'Property tax')).toBe('fixed')
    expect(toExpenseNature('', 'Crew salaries')).toBe('fixed')
    // An explicit column always wins over the keyword guess.
    expect(toExpenseNature('Variable', 'Property tax')).toBe('variable')
  })
})

describe('awkward sheet structures', () => {
  it('reads a date out of a sheet name', () => {
    expect(dateFromSheetName('August 13, 2026')).toBe('2026-08-13')
    expect(dateFromSheetName('Oct 28, 2025 Portfolio')).toBe('2025-10-28')
    expect(dateFromSheetName('2026-08-13 holdings')).toBe('2026-08-13')
    expect(dateFromSheetName('Feb 2026')).toBe('2026-02-28')
    expect(dateFromSheetName('10 big bets AI')).toBeNull()
    expect(dateFromSheetName('Sheet1')).toBeNull()
  })
})

describe('refund and cancellation rows', () => {
  it('nets a negative-night refund off revenue and occupancy', () => {
    const refund = booking('2026-03-20', '2026-03-22', -20000, { nights: -2, status: 'adjustment' })
    const series = monthlyMetrics({
      bookings: [booking('2026-03-01', '2026-03-11', 100000), refund],
      expenses: [],
      usdPhp: 58,
      availableNightsPerYear: 365,
    })
    const march = series.find((m) => m.month === '2026-03')!
    expect(march.nightsSold).toBe(8)
    expect(march.revenue).toBeCloseTo(80000)
  })

  it('books a refund whole into one month rather than spreading it', () => {
    const refund = booking('2026-03-30', '2026-04-02', -30000, { nights: -3, status: 'adjustment' })
    const series = monthlyMetrics({
      bookings: [booking('2026-03-01', '2026-03-11', 100000), refund],
      expenses: [],
      usdPhp: 58,
      availableNightsPerYear: 365,
    })
    expect(series.find((m) => m.month === '2026-03')!.revenue).toBeCloseTo(70000)
    expect(series.find((m) => m.month === '2026-04')?.revenue ?? 0).toBeCloseTo(0)
  })

  it('still excludes rows the sheet marks cancelled', () => {
    const series = monthlyMetrics({
      bookings: [
        booking('2026-03-01', '2026-03-03', 30000),
        booking('2026-03-10', '2026-03-14', 40000, { status: 'Cancelled by guest' }),
      ],
      expenses: [],
      usdPhp: 58,
      availableNightsPerYear: 365,
    })
    expect(series[0].revenue).toBeCloseTo(30000)
    expect(series[0].nightsSold).toBe(2)
  })
})

describe('add-on revenue', () => {
  it('keeps add-ons out of ADR but in total revenue', () => {
    const series = monthlyMetrics({
      bookings: [booking('2026-03-01', '2026-03-03', 40000, { addOnRevenue: 20000 })],
      expenses: [],
      usdPhp: 58,
      availableNightsPerYear: 365,
    })
    const march = series[0]
    expect(march.adr).toBeCloseTo(20000)
    expect(march.revenue).toBeCloseTo(40000)
    expect(march.addOnRevenue).toBeCloseTo(20000)
    expect(march.totalRevenue).toBeCloseTo(60000)
    expect(march.totalRevpar).toBeGreaterThan(march.revpar)
  })

  it('runs margin off total revenue, not room revenue alone', () => {
    const totals = aggregate(
      monthlyMetrics({
        bookings: [booking('2026-03-01', '2026-03-03', 40000, { addOnRevenue: 20000 })],
        expenses: [expense('2026-03-15', 'Crew', 30000)],
        usdPhp: 58,
        availableNightsPerYear: 365,
      }),
    )
    expect(totals.totalRevenue).toBeCloseTo(60000)
    expect(totals.netProfit).toBeCloseTo(30000)
    expect(totals.netMargin).toBeCloseTo(0.5)
  })
})

describe('crosstab import', () => {
  it('reads month names, real dates and abbreviations as periods', () => {
    expect(headerToDate('January', 2026)).toBe('2026-01-31')
    expect(headerToDate('Febuary', 2026)).toBe('2026-02-28')
    expect(headerToDate('Jan-26', 2020)).toBe('2026-01-31')
    expect(headerToDate('2026-03-01', 2020)).toBe('2026-03-01')
    expect(headerToDate('Category', 2026)).toBeNull()
    expect(headerToDate('', 2026)).toBeNull()
  })

  it('turns one row into one record per populated period, keeping the cell reference', () => {
    const sheet = {
      name: 'P&L',
      headers: ['Line', 'January', 'February', 'March'],
      rows: [['Salaries', 34000, 34000, null]],
      rowNumbers: [5],
      sections: [],
      impliedDate: null,
    }
    const periods = detectPeriodColumns(sheet.headers, 2026)
    expect(periods).toHaveLength(3)
    const result = buildCrosstabExpenses({
      sheet,
      fileName: 'f.xlsx',
      importId: 'i',
      labelColumn: 0,
      periods,
      currency: 'PHP',
      excludedRows: [],
      natures: {},
    })
    expect(result.rows).toHaveLength(2)
    expect(result.rows[0].date).toBe('2026-01-31')
    expect(result.rows[0].category).toBe('Salaries')
    expect(result.rows[0].prov.column).toBe('January')
    expect(result.rows[0].prov.rowNumber).toBe(5)
  })

  it('recognises summary rows so a sheet is not counted twice', () => {
    expect(isSummaryLabel('Total')).toBe(true)
    expect(isSummaryLabel('EBITDA % of sales')).toBe(true)
    expect(isSummaryLabel('Gross Profit')).toBe(true)
    expect(isSummaryLabel('Salaries')).toBe(false)
    expect(isSummaryLabel('Starlink')).toBe(false)
  })
})

describe('crosstab row classification', () => {
  it('treats ratios and small counts as metrics, not money', () => {
    expect(looksLikeMetricRow([0.58, 0.53, 0.51])).toBe(true)
    expect(looksLikeMetricRow([18, 15, 16, 25])).toBe(true)
    expect(looksLikeMetricRow([31, 28, 31, 30])).toBe(true)
    expect(looksLikeMetricRow([34000, 34000, 34000])).toBe(false)
    expect(looksLikeMetricRow([2700, 2700])).toBe(false)
    expect(looksLikeMetricRow([])).toBe(false)
  })

  it('flags the rows a management P&L interleaves with its costs', () => {
    const sheet = {
      name: 'P&L',
      headers: ['Line', 'January', 'February'],
      rows: [
        ['Nights', 18, 15],
        ['Occupancy', 0.58, 0.53],
        ['Revenue - reservations', 373908, 289330],
        ['Salary', 34000, 34000],
        ['Starlink', 2700, 2700],
        ['EBITDA', 272708, 194130],
      ],
      rowNumbers: [3, 4, 5, 6, 7, 8],
      sections: [],
      impliedDate: null,
    }
    const result = buildCrosstabExpenses({
      sheet,
      fileName: 'f.xlsx',
      importId: 'i',
      labelColumn: 0,
      periods: detectPeriodColumns(sheet.headers, 2026),
      currency: 'PHP',
      excludedRows: [],
      natures: {},
    })
    const summary = Object.fromEntries(result.labels.map((row) => [row.label, row.isSummary]))
    expect(summary['Nights']).toBe(true)
    expect(summary['Occupancy']).toBe(true)
    expect(summary['Revenue - reservations']).toBe(true)
    expect(summary['EBITDA']).toBe(true)
    expect(summary['Salary']).toBe(false)
    expect(summary['Starlink']).toBe(false)
  })
})

describe('period header strictness', () => {
  it('refuses headers that merely contain a date', () => {
    // A sheet title, and the placeholder name given to an empty header cell.
    expect(headerToDate('Y3 - Jan 1 to Dec 31 2026', 2026)).toBeNull()
    expect(headerToDate('Column 1', 2026)).toBeNull()
    expect(headerToDate('Column 3', 2026)).toBeNull()
    expect(headerToDate('Y3', 2026)).toBeNull()
    expect(headerToDate('Income statement PHP', 2026)).toBeNull()
  })

  it('still accepts the shapes a period column actually uses', () => {
    expect(headerToDate('2026-01-01', 2020)).toBe('2026-01-01')
    expect(headerToDate('2026-02', 2020)).toBe('2026-02-28')
    expect(headerToDate('03/01/2026', 2020)).toBe('2026-03-01')
    expect(headerToDate('Apr', 2026)).toBe('2026-04-30')
  })
})

describe('fixed vs variable classification', () => {
  it('reads a per-unit cost line as variable whatever else it says', () => {
    expect(toExpenseNature('', 'Per night costs')).toBe('variable')
    expect(toExpenseNature('', 'Per stay costs')).toBe('variable')
    expect(toExpenseNature('', 'Maintenance per stay')).toBe('variable')
  })

  it('keeps flat monthly lines fixed', () => {
    expect(toExpenseNature('', 'Supplies (towels)')).toBe('fixed')
    expect(toExpenseNature('', 'Starlink')).toBe('fixed')
    expect(toExpenseNature('', 'Salary')).toBe('fixed')
    expect(toExpenseNature('', 'Depreciation')).toBe('fixed')
  })
})

describe('overlapping period columns', () => {
  const sheet = {
    name: 'Y1 P&L',
    headers: ['Line', '2024-12-01', '2025-01-01', '2025-02-01'],
    rows: [['Salary', 34000, 34000, 34000]],
    rowNumbers: [6],
    sections: [],
    impliedDate: null,
  }

  it('imports every period when none are excluded', () => {
    const result = buildCrosstabExpenses({
      sheet,
      fileName: 'f.xlsx',
      importId: 'i',
      labelColumn: 0,
      periods: detectPeriodColumns(sheet.headers, 2025),
      currency: 'PHP',
      excludedRows: [],
      natures: {},
    })
    expect(result.rows).toHaveLength(3)
  })

  it('drops the columns a previous import already covered', () => {
    const periods = detectPeriodColumns(sheet.headers, 2025)
    const alreadyImported = new Set(['2025-01', '2025-02'])
    const result = buildCrosstabExpenses({
      sheet,
      fileName: 'f.xlsx',
      importId: 'i',
      labelColumn: 0,
      periods,
      currency: 'PHP',
      excludedRows: [],
      excludedPeriods: periods
        .filter((period) => alreadyImported.has(period.date.slice(0, 7)))
        .map((period) => period.index),
      natures: {},
    })
    expect(result.rows).toHaveLength(1)
    expect(result.rows[0].date.slice(0, 7)).toBe('2024-12')
  })
})
