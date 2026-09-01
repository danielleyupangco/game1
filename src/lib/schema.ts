import type { DatasetKey } from '@/types'

export type FieldType = 'string' | 'number' | 'date' | 'currency' | 'enum'

export type FieldSpec = {
  key: string
  label: string
  type: FieldType
  required?: boolean
  /** lowercase fragments matched against source headers for auto-mapping */
  synonyms: string[]
  hint?: string
  enumValues?: string[]
  /** used when the column is absent or blank */
  default?: string | number
}

export type DatasetSpec = {
  key: DatasetKey
  label: string
  domain: 'investments' | 'airbnb'
  blurb: string
  fields: FieldSpec[]
}

export const DATASETS: Record<DatasetKey, DatasetSpec> = {
  holdings: {
    key: 'holdings',
    label: 'Portfolio holdings',
    domain: 'investments',
    blurb:
      'One row per position, valued on a single date. Each import becomes a versioned snapshot, so re-importing next month builds a return series rather than overwriting. Quantity and cost basis are optional — a sheet with just names and market values works.',
    fields: [
      { key: 'ticker', label: 'Ticker or name', type: 'string', required: true, synonyms: ['ticker', 'symbol', 'code', 'stock', 'name', 'holding', 'investment', 'security', 'fund', 'item'] },
      { key: 'name', label: 'Long name', type: 'string', synonyms: ['security name', 'description', 'asset', 'long name', 'full name', 'details', 'notes'] },
      { key: 'quantity', label: 'Quantity', type: 'number', synonyms: ['quantity', 'qty', 'shares', 'units', 'holdings', 'no. of shares'], hint: 'Optional. Only needed if your sheet has no market value column.' },
      { key: 'price', label: 'Price per unit', type: 'number', synonyms: ['price', 'market price', 'nav', 'last', 'close', 'unit price'] },
      { key: 'value', label: 'Market value', type: 'number', synonyms: ['market value', 'value', 'value (php)', 'amount', 'current value', 'balance', 'php', 'peso value'], hint: 'Either this or quantity × price is required.' },
      { key: 'costBasis', label: 'Total cost basis', type: 'number', synonyms: ['cost', 'cost basis', 'book value', 'invested', 'purchase value', 'acquisition'] },
      { key: 'assetClass', label: 'Asset class', type: 'enum', synonyms: ['asset class', 'class', 'category', 'type', 'type specific', 'sector', 'instrument'], default: 'Unclassified' },
      { key: 'geography', label: 'Geography', type: 'string', synonyms: ['geography', 'region', 'country', 'market', 'location', 'geo'], default: 'Unspecified' },
      { key: 'currency', label: 'Currency', type: 'currency', synonyms: ['currency', 'ccy', 'curr'], default: 'PHP' },
      { key: 'account', label: 'Account / broker', type: 'string', synonyms: ['account', 'broker', 'platform', 'custodian', 'wallet', 'owner', 'provider'], default: 'Default' },
    ],
  },

  transactions: {
    key: 'transactions',
    label: 'Transactions',
    domain: 'investments',
    blurb:
      'Buys, sells, dividends, fees and — critically — deposits and withdrawals. Without cashflows, a return number cannot tell your gains apart from your contributions.',
    fields: [
      { key: 'date', label: 'Date', type: 'date', required: true, synonyms: ['date', 'trade date', 'transaction date', 'settled', 'timestamp'] },
      { key: 'ticker', label: 'Ticker / symbol', type: 'string', synonyms: ['ticker', 'symbol', 'code', 'stock', 'security'] },
      { key: 'type', label: 'Type', type: 'enum', required: true, synonyms: ['type', 'action', 'transaction type', 'side', 'activity'], enumValues: ['buy', 'sell', 'dividend', 'fee', 'deposit', 'withdrawal'] },
      { key: 'quantity', label: 'Quantity', type: 'number', synonyms: ['quantity', 'qty', 'shares', 'units'] },
      { key: 'price', label: 'Price', type: 'number', synonyms: ['price', 'unit price', 'rate'] },
      { key: 'amount', label: 'Cash amount', type: 'number', required: true, synonyms: ['amount', 'net amount', 'total', 'cash', 'value', 'proceeds'], hint: 'Sign is normalised on import: money leaving your pocket becomes negative.' },
      { key: 'fees', label: 'Fees', type: 'number', synonyms: ['fee', 'fees', 'commission', 'charges', 'tax'], default: 0 },
      { key: 'currency', label: 'Currency', type: 'currency', synonyms: ['currency', 'ccy'], default: 'PHP' },
      { key: 'account', label: 'Account', type: 'string', synonyms: ['account', 'broker', 'platform'], default: 'Default' },
      { key: 'note', label: 'Note', type: 'string', synonyms: ['note', 'notes', 'memo', 'remarks', 'description'], default: '' },
    ],
  },

  benchmark: {
    key: 'benchmark',
    label: 'Benchmark index levels',
    domain: 'investments',
    blurb: 'Closing index level by date (PSEi by default). Only needed for the relative-performance chart.',
    fields: [
      { key: 'date', label: 'Date', type: 'date', required: true, synonyms: ['date', 'day', 'period'] },
      { key: 'level', label: 'Index level', type: 'number', required: true, synonyms: ['close', 'level', 'index', 'value', 'price', 'psei'] },
    ],
  },

  bookings: {
    key: 'bookings',
    label: 'Bookings',
    domain: 'airbnb',
    blurb:
      'One row per reservation. Nights are split across the months a stay touches, so a stay straddling month-end reports honestly on both sides.',
    fields: [
      { key: 'confirmationCode', label: 'Confirmation code', type: 'string', synonyms: ['confirmation', 'code', 'reservation', 'booking id', 'id'] },
      { key: 'guestName', label: 'Guest name', type: 'string', synonyms: ['guest', 'name', 'customer', 'client'], default: '' },
      { key: 'checkIn', label: 'Check-in', type: 'date', required: true, synonyms: ['check-in', 'checkin', 'start date', 'arrival', 'from'] },
      { key: 'checkOut', label: 'Check-out', type: 'date', required: true, synonyms: ['check-out', 'checkout', 'end date', 'departure', 'to'] },
      { key: 'bookedOn', label: 'Booked on', type: 'date', synonyms: ['booked', 'booking date', 'reserved', 'created'] },
      { key: 'nights', label: 'Nights', type: 'number', synonyms: ['nights', 'no. of nights', 'length of stay', 'los', 'duration'], hint: 'If absent, derived from check-in and check-out.' },
      { key: 'guests', label: 'Guests', type: 'number', synonyms: ['guests', 'pax', 'people', 'occupants', 'adults'], default: 1 },
      { key: 'grossRevenue', label: 'Gross revenue', type: 'number', required: true, synonyms: ['gross', 'total', 'amount', 'revenue', 'gross earnings', 'paid'] },
      { key: 'fees', label: 'Fees deducted', type: 'number', synonyms: ['fee', 'service fee', 'host fee', 'commission', 'deduction'], default: 0 },
      { key: 'netRevenue', label: 'Net payout', type: 'number', synonyms: ['payout', 'net earnings', 'net amount', 'net payout'], hint: 'If absent, computed as gross − fees.' },
      { key: 'addOnRevenue', label: 'Add-on revenue kept', type: 'number', synonyms: ['add ons revenue', 'add on revenue', 'addons', 'extras', 'ancillary', 'balance', 'margin', 'your share'], hint: 'Catering, tours, transfers — your share only, not the guest total. Reported separately from room revenue.', default: 0 },
      { key: 'channel', label: 'Channel', type: 'string', synonyms: ['channel', 'source', 'platform', 'listing', 'via'], default: 'Direct' },
      { key: 'currency', label: 'Currency', type: 'currency', synonyms: ['currency', 'ccy'], default: 'PHP' },
      { key: 'status', label: 'Status', type: 'string', synonyms: ['status', 'state'], default: 'confirmed', hint: 'Rows reading cancelled are kept but excluded from revenue.' },
      { key: 'country', label: 'Guest country', type: 'string', synonyms: ['country', 'origin', 'nationality', 'from', 'market'], default: '' },
      { key: 'rating', label: 'Guest rating', type: 'string', synonyms: ['guest rating', 'rating', 'grade', 'score'], default: '' },
      { key: 'review', label: 'Guest review', type: 'string', synonyms: ['review', 'guest review', 'feedback', 'comment', 'testimonial'], default: '' },
      { key: 'contact', label: 'Contact', type: 'string', synonyms: ['contact', 'email', 'phone', 'mobile', 'number'], default: '' },
      { key: 'notes', label: 'Notes', type: 'string', synonyms: ['notes', 'remarks', 'requests', 'memo'], default: '' },
    ],
  },

  expenses: {
    key: 'expenses',
    label: 'Expenses',
    domain: 'airbnb',
    blurb:
      'Property costs. Fixed vs variable is the split that matters — fixed costs run whether or not anyone books, variable costs scale with stays.',
    fields: [
      { key: 'date', label: 'Date', type: 'date', required: true, synonyms: ['date', 'month', 'period', 'paid on'] },
      { key: 'category', label: 'Category', type: 'string', required: true, synonyms: ['category', 'item', 'description', 'expense', 'particulars', 'type'] },
      { key: 'nature', label: 'Fixed or variable', type: 'enum', synonyms: ['nature', 'fixed', 'variable', 'cost type', 'classification'], enumValues: ['fixed', 'variable'], hint: 'Left blank, the category is classified by keyword — always reviewable.' },
      { key: 'amount', label: 'Amount', type: 'number', required: true, synonyms: ['amount', 'cost', 'total', 'value', 'php', 'peso'] },
      { key: 'vendor', label: 'Vendor / payee', type: 'string', synonyms: ['vendor', 'payee', 'supplier', 'paid to', 'who'], default: '' },
      { key: 'currency', label: 'Currency', type: 'currency', synonyms: ['currency', 'ccy'], default: 'PHP' },
      { key: 'note', label: 'Note', type: 'string', synonyms: ['note', 'notes', 'remarks', 'memo'], default: '' },
    ],
  },

  /**
   * Read whole rather than mapped: the responses sheet is generated by the
   * form, so its columns are fixed and naming them here would be a second
   * place to keep in step. The fields list stays empty for that reason.
   */
  addons: {
    key: 'addons',
    label: 'Guest add-on form',
    domain: 'airbnb',
    blurb:
      'Responses from the guest add-on form — catering, boat transfers and tours. This is the source of truth for what the business keeps on top of the room: the guest total less the island crew’s cost. Export the responses tab as CSV and drop it here; test and setup submissions are flagged out automatically and can be put back.',
    fields: [],
  },
}

export const DATASET_LIST = Object.values(DATASETS)
