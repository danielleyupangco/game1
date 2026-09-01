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
  /** true when someone typed this in rather than importing it */
  manual?: boolean
  /** who entered it, so a shared book says who recorded what */
  enteredBy?: string
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
  /** what the guest wrote afterwards */
  review: string
  /** anything the host needs to remember: dietary needs, arrival plans */
  notes: string
  /** phone, email or handle — however you reach them */
  contact: string
}

/**
 * Money that moved through Airbnb against a reservation but is not room
 * revenue: resolution payouts (the guest paying for catering, boat and tours
 * through the platform) and resolution adjustments (refunds and corrections).
 *
 * Deliberately NOT profit. Almost all of a resolution payout is passed straight
 * to the island crew; what the business keeps is the margin recorded on the
 * add-on form. Adding resolutions to room revenue would count the crew's money
 * as earnings, so these are held apart and used to reconcile the bank instead.
 */
export type Resolution = WithProvenance & {
  confirmationCode: string
  guestName: string
  date: string
  checkIn: string
  checkOut: string
  amount: number
  currency: Currency
  kind: 'payout' | 'adjustment'
  details: string
}

/**
 * One submission of the guest add-on form — the source of truth for catering,
 * boat and transfer pricing.
 *
 * The guest is quoted a total; the island crew quotes their cost; the
 * difference is what the business actually keeps. Test and setup submissions
 * are flagged rather than deleted, so the record stays complete and a
 * misclassification is visible and reversible.
 */
export type AddOnQuote = WithProvenance & {
  submittedAt: string
  guestName: string
  email: string
  checkIn: string
  checkOut: string
  nights: number
  guests: number
  adults: number
  kids: number
  /** what the guest is charged, after the form's own calculation */
  guestTotal: number
  /** what the island crew quoted for the same stay */
  allanCost: number
  /** guestTotal − allanCost: the only part the business keeps */
  margin: number
  /** collected up front through Airbnb */
  downpayment: number
  /** the balance the guest hands over in cash on the island */
  cashOnArrival: number
  currency: Currency
  purpose: string
  allergies: string
  requests: string
  snacks: string
  pickup: string
  dropoff: string
  howHeard: string
  /** a test or setup submission, kept for completeness but out of the numbers */
  excluded: boolean
  /** why it was excluded, so the judgement is arguable rather than silent */
  excludedReason: string
}

/**
 * Forward-looking assumptions. Kept apart from the DCF: that values the whole
 * business over a decade, this asks what the next twelve months look like.
 */
export type ForecastAssumptions = {
  /** cash in the business account today */
  openingCash: number
  /** rate growth applied to next year's expected ADR */
  adrGrowth: number
  /** multipliers on expected pickup for the cautious and hopeful cases */
  lowFactor: number
  highFactor: number
  /** months to project */
  horizonMonths: number
  /**
   * Whether unspent project budgets are treated as cash leaving the account.
   * On by default — the conservative reading — but it dominates the runway on a
   * small property, so it is a visible switch rather than a buried constant.
   */
  includeCapex: boolean
}

/**
 * A distribution of profit to the owners. Not an expense: it comes out of
 * money already earned, so it never touches the P&L — it only moves cash. Kept
 * separate for exactly that reason, since folding it into costs is what makes
 * a profitable year look like a loss.
 */
export type DividendRecipient = {
  name: string
  /** peso value of their share, allocated on the USD split below */
  amount: number
  /**
   * What they were actually paid, in dollars.
   *
   * The owners agree these distributions in USD and the peso figure is whatever
   * the transfer converted at on the day, so the dollar amount is the recorded
   * fact and the peso one is derived from it. Reporting the peso split as the
   * primary number is what made the running totals disagree with what the two
   * of them remember receiving.
   */
  amountUsd: number
}

export type DividendPayout = WithProvenance & {
  date: string
  amount: number
  currency: Currency
  /** the whole release in dollars, which is the currency it was agreed in */
  amountUsd: number
  /** who received what, so a two-owner business can see its own split */
  recipients: DividendRecipient[]
  approvedBy: string
  note: string
}

/**
 * A competing listing being watched.
 *
 * Airbnb cannot be read automatically from here, so every figure on a
 * competitor is something a person saw and recorded on a date. The listing is
 * the identity; what it cost and offered on a given day is an observation
 * against it, which is what makes a price history possible at all.
 */
export type CompetitorListing = {
  id: string
  /** the numeric id in the airbnb.com/rooms/<id> URL */
  roomId: string
  name: string
  host: string
  area: string
  url: string
  /** why this one is worth watching */
  note: string
  /** false once a listing is no longer worth tracking, rather than deleting it */
  active: boolean
  addedAt: string
}

export type CompetitorObservation = WithProvenance & {
  listingId: string
  /** the day someone actually looked */
  observedOn: string
  /** the dates the price was quoted for, since a rate is meaningless without them */
  quotedFor: string
  nights: number
  guests: number
  /** all-in nightly rate before Airbnb's guest fee, in `currency` */
  nightlyRate: number
  cleaningFee: number
  currency: Currency
  bedrooms: number
  maxGuests: number
  rating: number
  reviewCount: number
  /** how much of the next 90 days is already taken, when the calendar shows it */
  nightsBookedNext90: number
  amenities: string[]
  note: string
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
  | 'addons'

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

export const CAPEX_CATEGORIES = [
  'Repairs & maintenance',
  'Equipment',
  'Building works',
  'Furniture & fittings',
  'Power & water',
  'Boat & transport',
  'Expansion',
  'Other',
] as const

export type CapexCategory = (typeof CAPEX_CATEGORIES)[number]

export type CapitalProject = {
  id: string
  name: string
  /** budget for the whole project — what you expect it to cost */
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
  /** open projects are still spending; done ones are closed out */
  status?: 'planned' | 'active' | 'done'
}

/**
 * Money actually spent on a capital item.
 *
 * Deliberately not an Expense: capital spend buys something that lasts, so it
 * leaves the bank without reducing this year's profit. Keeping the two apart is
 * what stops a ₱3.9M build looking like a catastrophic trading year.
 */
export type CapitalSpend = WithProvenance & {
  /** the project this belongs to, or '' for one-off spend */
  projectId: string
  date: string
  item: string
  category: CapexCategory | string
  amount: number
  currency: Currency
  vendor: string
  note: string
}

/**
 * The operating cost model, as an owner thinks about it: things you pay every
 * month whatever happens, things that cost you per night sold, and things that
 * cost you per booking. It is the input to the price floor.
 */
export type CostLineItem = {
  id: string
  label: string
  amount: number
}

export type CostModel = {
  fixedMonthly: CostLineItem[]
  perNight: CostLineItem[]
  perStay: CostLineItem[]
  /** platform commission taken off the top, as a fraction */
  platformFeePct: number
  /** average nights in a booking, used to spread per-stay costs */
  nightsPerStay: number
  /** nights the property can sell in a year */
  availableNightsPerYear: number
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
