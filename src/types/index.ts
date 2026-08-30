// ---------------------------------------------------------------------------
// Domain types. Every imported record carries provenance back to its source
// file + sheet + row so any number on screen can be traced to where it came from.
// ---------------------------------------------------------------------------

export type Currency = 'PHP' | 'USD'

export type Provenance = {
  /** id of the ImportBatch this row arrived in */
  importId: string
  /** original filename as uploaded */
  fileName: string
  sheetName: string
  /** 1-based row number in the source sheet, including the header row */
  rowNumber: number
  /**
   * Column header the value came from. Only set for crosstab imports, where a
   * single source row becomes many records and the row number alone would not
   * say which cell produced which one.
   */
  column?: string
}

export type WithProvenance = { id: string; prov: Provenance }

// --- Investments -----------------------------------------------------------

export type AssetClass =
  | 'Equity'
  | 'Fixed Income'
  | 'Cash'
  | 'Real Estate'
  | 'Alternatives'
  | 'Crypto'
  | 'Unclassified'

export const ASSET_CLASSES: AssetClass[] = [
  'Equity',
  'Fixed Income',
  'Cash',
  'Real Estate',
  'Alternatives',
  'Crypto',
  'Unclassified',
]

/**
 * One row of a portfolio snapshot: what you held, at what price, on `asOf`.
 * Snapshots are versioned — importing the same portfolio at a later date adds a
 * new snapshot rather than overwriting, which is what makes return series possible.
 */
export type Holding = WithProvenance & {
  snapshotId: string
  ticker: string
  name: string
  assetClass: AssetClass
  geography: string
  currency: Currency
  quantity: number
  /** total cost basis in the holding's own currency */
  costBasis: number
  /** price per unit in the holding's own currency */
  price: number
  /** quantity * price, in the holding's own currency */
  value: number
  account: string
}

export type Snapshot = {
  id: string
  /** ISO date (YYYY-MM-DD) the holdings were valued at */
  asOf: string
  label: string
  createdAt: string
  importId: string
  /** FX rate used to convert USD -> PHP for this snapshot */
  usdPhp: number
}

export type TxnType = 'buy' | 'sell' | 'dividend' | 'fee' | 'deposit' | 'withdrawal'

/**
 * External cashflows and trades. Deposits/withdrawals are what let us strip
 * contribution effects out of returns (see domain/investments/performance.ts).
 */
export type Transaction = WithProvenance & {
  date: string
  ticker: string
  type: TxnType
  quantity: number
  price: number
  /** signed cash amount in `currency`: negative = money into the market */
  amount: number
  currency: Currency
  fees: number
  account: string
  note: string
}

/** Benchmark index level series, e.g. PSEi close by date. */
export type BenchmarkPoint = WithProvenance & {
  date: string
  level: number
}

// --- Airbnb (Island T) -----------------------------------------------------

export type Booking = WithProvenance & {
  confirmationCode: string
  guestName: string
  channel: string
  bookedOn: string
  checkIn: string
  checkOut: string
  nights: number
  guests: number
  /** total the guest paid, in `currency` */
  grossRevenue: number
  /** platform/host fees deducted */
  fees: number
  /** what actually lands: gross - fees */
  netRevenue: number
  /**
   * Ancillary revenue you keep — catering, boat trips, tours — net of anything
   * passed through to crew or suppliers. Kept apart from room revenue because
   * ADR and RevPAR are accommodation measures: folding add-ons into them would
   * flatter the rate and make the numbers incomparable to any benchmark.
   */
  addOnRevenue: number
  currency: Currency
  status: string
  /** where the guest travelled from, when the sheet records it */
  country: string
  /** host's own grade for the stay, when the sheet records one */
  rating: string
}

export type ExpenseNature = 'fixed' | 'variable'

export type Expense = WithProvenance & {
  date: string
  category: string
  /** fixed = incurred whether or not anyone books; variable = scales with stays */
  nature: ExpenseNature
  amount: number
  currency: Currency
  vendor: string
  note: string
}

// --- Imports ---------------------------------------------------------------

export type DatasetKey =
  | 'holdings'
  | 'transactions'
  | 'benchmark'
  | 'bookings'
  | 'expenses'

export type ImportBatch = {
  id: string
  dataset: DatasetKey
  fileName: string
  sheetName: string
  importedAt: string
  rowCount: number
  /** target field -> source column header chosen in the mapping step */
  mapping: Record<string, string>
  /** rows the parser could not coerce, kept so nothing silently disappears */
  rejected: { rowNumber: number; reason: string }[]
  /** for holdings imports, the snapshot the rows landed in */
  snapshotId?: string
}

// --- Settings & assumptions ------------------------------------------------

export type AllocationTarget = {
  key: string
  /** target weight as a fraction (0.35 = 35%) */
  weight: number
}

export type Settings = {
  baseCurrency: Currency
  usdPhp: number
  benchmarkName: string
  /** rebalancing band: drift beyond this fraction of the portfolio raises a flag */
  driftBandPct: number
  /** cash held outside the brokerage, in base currency */
  cashOnHand: number
  targetsByAssetClass: AllocationTarget[]
  targetsByGeography: AllocationTarget[]
  targetsByCurrency: AllocationTarget[]
}

export type DcfAssumptions = {
  /** nights the property can physically sell per year */
  availableNightsPerYear: number
  /** occupancy in year 1, then ramping toward `terminalOccupancy` */
  startOccupancy: number
  terminalOccupancy: number
  occupancyRampYears: number
  adr: number
  adrGrowth: number
  variableCostPerNight: number
  fixedCostPerYear: number
  costInflation: number
  /** effective tax rate applied to operating profit */
  taxRate: number
  maintenanceCapexPerYear: number
  discountRate: number
  terminalGrowth: number
  projectionYears: number
  netDebt: number
}

export type CapitalProject = {
  id: string
  name: string
  /** upfront cash out, base currency */
  capex: number
  /** incremental annual net cash inflow once running */
  annualCashflow: number
  /** years before `annualCashflow` starts */
  rampYears: number
  /** how long the benefit lasts */
  lifeYears: number
  /** salvage/terminal value at end of life */
  terminalValue: number
  note: string
}

export type PricingAssumptions = {
  /** how much occupancy moves for a 1% price move (negative; -0.6 = inelastic) */
  priceElasticity: number
  /** months treated as high season for Culion */
  highSeasonMonths: number[]
  /** target occupancy the engine steers toward */
  targetOccupancy: number
  /** cap on any single suggested rate move */
  maxRateChangePct: number
  weekendUpliftPct: number
}

// --- Analysis ---------------------------------------------------------------

export type FindingSeverity = 'critical' | 'warning' | 'info' | 'positive'

export type FindingStatus = 'open' | 'doing' | 'done' | 'dismissed'

/**
 * A written finding about the portfolio or the property.
 *
 * Distinct from the computed alerts on the Home page: those are rules that
 * re-evaluate on every render, these are authored judgements that persist,
 * carry their own evidence, and can be worked through and closed off. Both
 * appear side by side so the dashboard is the whole picture rather than the
 * half a rule engine can see.
 */
export type Finding = {
  id: string
  createdAt: string
  author: string
  severity: FindingSeverity
  /** grouping label, e.g. "Cash drag", "Data quality" */
  theme: string
  title: string
  /** paragraphs of the argument */
  body: string[]
  /** the numbers the claim rests on, so it can be checked rather than trusted */
  evidence: { label: string; value: string }[]
  /** holdings this bears on; matched against ticker or name */
  related: string[]
  section: 'investments' | 'airbnb' | 'data' | 'overall'
  /** the single next step, if there is one */
  action: string | null
  status: FindingStatus
  /** higher sorts first */
  priority: number
}
