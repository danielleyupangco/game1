import type { CapitalProject, DcfAssumptions } from '@/types'

/**
 * A discounted cash flow for a single operating property, written to be read.
 * Each year is a row you can follow: nights sold, revenue, costs, tax, capex,
 * free cash flow. Nothing is inlined into a single formula.
 */

export type DcfYear = {
  year: number
  occupancy: number
  nightsSold: number
  adr: number
  revenue: number
  variableCost: number
  fixedCost: number
  ebitda: number
  tax: number
  capex: number
  freeCashFlow: number
  discountFactor: number
  presentValue: number
}

export type DcfResult = {
  years: DcfYear[]
  /** sum of discounted explicit-period cash flows */
  pvExplicit: number
  /** undiscounted terminal value at the end of the projection */
  terminalValue: number
  pvTerminal: number
  enterpriseValue: number
  /**
   * Cash the business is sitting on, added to enterprise value.
   *
   * The Airbnb takings live in a bank account that the DCF knows nothing about
   * — it values the operation, not the float. Adding it here is what makes the
   * balance count exactly once: inside what the business is worth, and nowhere
   * in personal net worth.
   */
  cashInBusiness: number
  equityValue: number
  /** share of value coming from the terminal value — high means the answer rests on assumptions, not observed cashflows */
  terminalShare: number
  /** true when terminal growth >= discount rate, which makes the formula meaningless */
  invalid: boolean
}

function occupancyForYear(assumptions: DcfAssumptions, year: number): number {
  const { startOccupancy, terminalOccupancy, occupancyRampYears } = assumptions
  if (occupancyRampYears <= 1) return terminalOccupancy
  if (year >= occupancyRampYears) return terminalOccupancy
  const progress = (year - 1) / (occupancyRampYears - 1)
  return startOccupancy + (terminalOccupancy - startOccupancy) * progress
}

/**
 * `cashInBusiness` is passed in rather than stored as an assumption because it
 * is an observed bank balance, not a judgement: it is read live off the Island T
 * operating account in the holdings, so it cannot drift out of date.
 */
export function runDcf(assumptions: DcfAssumptions, cashInBusiness = 0): DcfResult {
  const invalid = assumptions.terminalGrowth >= assumptions.discountRate
  const years: DcfYear[] = []

  for (let year = 1; year <= Math.max(1, Math.round(assumptions.projectionYears)); year++) {
    const inflation = Math.pow(1 + assumptions.costInflation, year - 1)
    const occupancy = occupancyForYear(assumptions, year)
    const nightsSold = assumptions.availableNightsPerYear * occupancy
    const adr = assumptions.adr * Math.pow(1 + assumptions.adrGrowth, year - 1)
    const revenue = nightsSold * adr
    const variableCost = nightsSold * assumptions.variableCostPerNight * inflation
    const fixedCost = assumptions.fixedCostPerYear * inflation
    const ebitda = revenue - variableCost - fixedCost
    const tax = Math.max(0, ebitda) * assumptions.taxRate
    const capex = assumptions.maintenanceCapexPerYear * inflation
    const freeCashFlow = ebitda - tax - capex
    const discountFactor = 1 / Math.pow(1 + assumptions.discountRate, year)

    years.push({
      year,
      occupancy,
      nightsSold,
      adr,
      revenue,
      variableCost,
      fixedCost,
      ebitda,
      tax,
      capex,
      freeCashFlow,
      discountFactor,
      presentValue: freeCashFlow * discountFactor,
    })
  }

  const pvExplicit = years.reduce((sum, row) => sum + row.presentValue, 0)
  const finalYear = years[years.length - 1]

  // Gordon growth on the final year's free cash flow.
  const terminalValue = invalid
    ? Number.NaN
    : (finalYear.freeCashFlow * (1 + assumptions.terminalGrowth)) /
      (assumptions.discountRate - assumptions.terminalGrowth)
  const pvTerminal = invalid ? Number.NaN : terminalValue * finalYear.discountFactor
  const enterpriseValue = invalid ? Number.NaN : pvExplicit + pvTerminal

  return {
    years,
    pvExplicit,
    terminalValue,
    pvTerminal,
    enterpriseValue,
    cashInBusiness,
    equityValue: invalid ? Number.NaN : enterpriseValue - assumptions.netDebt + cashInBusiness,
    terminalShare: invalid || enterpriseValue === 0 ? Number.NaN : pvTerminal / enterpriseValue,
    invalid,
  }
}

export type SensitivityGrid = {
  rowKey: keyof DcfAssumptions
  colKey: keyof DcfAssumptions
  rowValues: number[]
  colValues: number[]
  /** equity value at [row][col] */
  values: number[][]
}

/** Two-way data table: discount rate down the side, occupancy across the top. */
export function sensitivity(
  base: DcfAssumptions,
  rowKey: keyof DcfAssumptions,
  rowValues: number[],
  colKey: keyof DcfAssumptions,
  colValues: number[],
  cashInBusiness = 0,
): SensitivityGrid {
  const values = rowValues.map((rowValue) =>
    colValues.map((colValue) => {
      const scenario = { ...base, [rowKey]: rowValue, [colKey]: colValue } as DcfAssumptions
      return runDcf(scenario, cashInBusiness).equityValue
    }),
  )
  return { rowKey, colKey, rowValues, colValues, values }
}

export type TornadoBar = {
  key: keyof DcfAssumptions
  label: string
  low: number
  high: number
  /** absolute swing in equity value */
  swing: number
  lowInput: number
  highInput: number
}

export type TornadoSpec = {
  key: keyof DcfAssumptions
  label: string
  /** ± absolute shift applied to the base assumption */
  delta: number
}

export const DEFAULT_TORNADO: TornadoSpec[] = [
  { key: 'discountRate', label: 'Discount rate', delta: 0.02 },
  { key: 'terminalOccupancy', label: 'Terminal occupancy', delta: 0.1 },
  { key: 'adr', label: 'ADR', delta: 0 },
  { key: 'terminalGrowth', label: 'Terminal growth', delta: 0.01 },
  { key: 'variableCostPerNight', label: 'Variable cost / night', delta: 0 },
  { key: 'fixedCostPerYear', label: 'Fixed cost / year', delta: 0 },
  { key: 'costInflation', label: 'Cost inflation', delta: 0.02 },
]

/**
 * Ranks assumptions by how much equity value moves when each is flexed alone.
 * Rate-style inputs shift by an absolute delta; peso inputs by ±15%, since a
 * ±0.02 shift on an ADR of ₱25,000 would be meaningless.
 */
export function tornado(
  base: DcfAssumptions,
  specs: TornadoSpec[] = DEFAULT_TORNADO,
  cashInBusiness = 0,
): TornadoBar[] {
  const baseline = runDcf(base, cashInBusiness).equityValue

  const bars = specs.map((spec) => {
    const current = base[spec.key] as number
    const delta = spec.delta > 0 ? spec.delta : Math.abs(current) * 0.15
    const lowInput = current - delta
    const highInput = current + delta
    const low = runDcf({ ...base, [spec.key]: lowInput }, cashInBusiness).equityValue
    const high = runDcf({ ...base, [spec.key]: highInput }, cashInBusiness).equityValue
    return {
      key: spec.key,
      label: spec.label,
      low,
      high,
      swing: Number.isFinite(low) && Number.isFinite(high) ? Math.abs(high - low) : 0,
      lowInput,
      highInput,
    }
  })

  if (!Number.isFinite(baseline)) return []
  return bars.sort((a, b) => b.swing - a.swing)
}

// --- Capital allocation ----------------------------------------------------

export type ProjectResult = {
  project: CapitalProject
  cashflows: number[]
  npv: number
  irr: number
  /** years until cumulative cash flow turns positive; NaN if it never does */
  payback: number
  profitabilityIndex: number
  /** IRR minus the portfolio's expected return: the actual comparison that matters */
  spreadVsPortfolio: number
}

export function projectCashflows(project: CapitalProject): number[] {
  const flows: number[] = [-Math.abs(project.capex)]
  const ramp = Math.max(0, Math.round(project.rampYears))
  const life = Math.max(1, Math.round(project.lifeYears))
  for (let year = 1; year <= ramp + life; year++) {
    // Straight-line phase-in during the ramp, full run-rate afterwards.
    const scale = year <= ramp ? year / (ramp + 1) : 1
    let flow = project.annualCashflow * scale
    if (year === ramp + life) flow += project.terminalValue
    flows.push(flow)
  }
  return flows
}

export function npv(rate: number, flows: number[]): number {
  return flows.reduce((sum, flow, year) => sum + flow / Math.pow(1 + rate, year), 0)
}

/** Bisection IRR on annual flows. Returns NaN when no sign change exists. */
export function irr(flows: number[]): number {
  let low = -0.9
  let high = 5
  let npvLow = npv(low, flows)
  if (!Number.isFinite(npvLow) || npvLow * npv(high, flows) > 0) return Number.NaN
  for (let i = 0; i < 200; i++) {
    const mid = (low + high) / 2
    const npvMid = npv(mid, flows)
    if (Math.abs(npvMid) < 1e-6) return mid
    if (npvLow * npvMid < 0) high = mid
    else {
      low = mid
      npvLow = npvMid
    }
  }
  return (low + high) / 2
}

export function paybackYears(flows: number[]): number {
  let cumulative = 0
  for (let year = 0; year < flows.length; year++) {
    const previous = cumulative
    cumulative += flows[year]
    if (previous < 0 && cumulative >= 0) {
      // Interpolate within the year the balance crosses zero.
      return year - 1 + Math.abs(previous) / Math.abs(flows[year])
    }
  }
  return Number.NaN
}

export function evaluateProject(
  project: CapitalProject,
  discountRate: number,
  portfolioExpectedReturn: number,
): ProjectResult {
  const cashflows = projectCashflows(project)
  const value = npv(discountRate, cashflows)
  const rate = irr(cashflows)
  return {
    project,
    cashflows,
    npv: value,
    irr: rate,
    payback: paybackYears(cashflows),
    profitabilityIndex: project.capex > 0 ? (value + Math.abs(project.capex)) / Math.abs(project.capex) : Number.NaN,
    spreadVsPortfolio: Number.isFinite(rate) ? rate - portfolioExpectedReturn : Number.NaN,
  }
}
