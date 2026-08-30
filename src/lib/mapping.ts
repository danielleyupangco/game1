import type { SheetPreview } from '@/lib/workbook'
import type { DatasetSpec, FieldSpec } from '@/lib/schema'
import { DATASETS } from '@/lib/schema'
import { toAssetClass, toCurrency, toExpenseNature, toISO, toNumber, toText, toTxnType } from '@/lib/coerce'
import { daysBetween } from '@/lib/dates'
import { uid } from '@/lib/id'
import type {
  BenchmarkPoint,
  Booking,
  Currency,
  DatasetKey,
  Expense,
  Holding,
  Provenance,
  Transaction,
} from '@/types'

export type Mapping = Record<string, string>

function normalise(header: string): string {
  return header.toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim()
}

/**
 * Scores a header against a field's synonyms. Exact match beats whole-word
 * match beats substring, so "Net Amount" maps to `amount` rather than `netRevenue`
 * when both are candidates for the same sheet.
 */
function scoreHeader(header: string, field: FieldSpec): number {
  const h = normalise(header)
  if (!h) return 0
  let best = 0
  const candidates = [field.label, field.key, ...field.synonyms]
  for (const candidate of candidates) {
    const c = normalise(candidate)
    if (!c) continue
    if (h === c) best = Math.max(best, 100)
    else if (new RegExp(`(^| )${c}( |$)`).test(h)) best = Math.max(best, 80)
    else if (h.startsWith(c) || h.endsWith(c)) best = Math.max(best, 60)
    else if (h.includes(c)) best = Math.max(best, 45)
    else if (c.includes(h) && h.length > 3) best = Math.max(best, 35)
  }
  return best
}

/**
 * Best-effort auto-mapping. Greedy by score so the strongest pairings claim
 * their column first; anything unclaimed is left for the human to set.
 */
export function autoMap(headers: string[], dataset: DatasetKey): Mapping {
  const spec = DATASETS[dataset]
  const pairs: { field: string; header: string; score: number }[] = []
  for (const field of spec.fields) {
    for (const header of headers) {
      const score = scoreHeader(header, field)
      if (score >= 35) pairs.push({ field: field.key, header, score })
    }
  }
  pairs.sort((a, b) => b.score - a.score)

  const mapping: Mapping = {}
  const usedHeaders = new Set<string>()
  for (const pair of pairs) {
    if (mapping[pair.field] || usedHeaders.has(pair.header)) continue
    mapping[pair.field] = pair.header
    usedHeaders.add(pair.header)
  }
  return mapping
}

export function missingRequired(mapping: Mapping, dataset: DatasetKey): FieldSpec[] {
  return DATASETS[dataset].fields.filter((field) => field.required && !mapping[field.key])
}

export type RowResult<T> = { ok: true; value: T } | { ok: false; reason: string }

export type BuildResult<T> = {
  rows: T[]
  rejected: { rowNumber: number; reason: string }[]
  /** field -> count of rows where the mapped column was blank */
  blanks: Record<string, number>
}

type Reader = {
  raw: (field: string) => unknown
  text: (field: string, fallback?: string) => string
  number: (field: string) => number | null
  date: (field: string) => string | null
  currency: (field: string) => Currency
}

function makeReader(
  headers: string[],
  row: unknown[],
  mapping: Mapping,
  spec: DatasetSpec,
  dayFirst: boolean,
  blanks: Record<string, number>,
): Reader {
  const indexOf = (field: string) => {
    const header = mapping[field]
    if (!header) return -1
    return headers.indexOf(header)
  }
  const raw = (field: string) => {
    const index = indexOf(field)
    if (index < 0) return null
    const value = row[index]
    if (value === null || value === undefined || String(value).trim() === '') {
      blanks[field] = (blanks[field] ?? 0) + 1
      return null
    }
    return value
  }
  const fallbackOf = (field: string) => spec.fields.find((f) => f.key === field)?.default
  return {
    raw,
    text: (field, fallback) => toText(raw(field), fallback ?? String(fallbackOf(field) ?? '')),
    number: (field) => {
      const value = toNumber(raw(field))
      if (value !== null) return value
      const fallback = fallbackOf(field)
      return typeof fallback === 'number' ? fallback : null
    },
    date: (field) => toISO(raw(field), dayFirst),
    currency: (field) => toCurrency(raw(field), (fallbackOf(field) as Currency) ?? 'PHP'),
  }
}

export type BuildContext = {
  sheet: SheetPreview
  fileName: string
  mapping: Mapping
  importId: string
  dayFirst: boolean
  /** holdings only */
  snapshotId?: string
}

function buildRows<T>(
  dataset: DatasetKey,
  ctx: BuildContext,
  make: (read: Reader, prov: Provenance) => RowResult<T>,
): BuildResult<T> {
  const spec = DATASETS[dataset]
  const rows: T[] = []
  const rejected: { rowNumber: number; reason: string }[] = []
  const blanks: Record<string, number> = {}

  ctx.sheet.rows.forEach((row, index) => {
    const rowNumber = ctx.sheet.rowNumbers[index] ?? index + 2
    const prov: Provenance = {
      importId: ctx.importId,
      fileName: ctx.fileName,
      sheetName: ctx.sheet.name,
      rowNumber,
    }
    const read = makeReader(ctx.sheet.headers, row, ctx.mapping, spec, ctx.dayFirst, blanks)
    const result = make(read, prov)
    if (result.ok) rows.push(result.value)
    else rejected.push({ rowNumber, reason: result.reason })
  })

  return { rows, rejected, blanks }
}

export function buildHoldings(ctx: BuildContext): BuildResult<Holding> {
  return buildRows<Holding>('holdings', ctx, (read, prov) => {
    const ticker = read.text('ticker')
    if (!ticker) return { ok: false, reason: 'no ticker' }
    const quantity = read.number('quantity')
    if (quantity === null) return { ok: false, reason: 'quantity is not a number' }

    const price = read.number('price')
    const mappedValue = read.number('value')
    const value = mappedValue ?? (price !== null ? quantity * price : null)
    if (value === null) return { ok: false, reason: 'needs either a market value or a price' }
    const unitPrice = price ?? (quantity !== 0 ? value / quantity : 0)

    return {
      ok: true,
      value: {
        id: uid('hld'),
        prov,
        snapshotId: ctx.snapshotId ?? '',
        ticker: ticker.toUpperCase(),
        name: read.text('name', ticker),
        assetClass: toAssetClass(read.raw('assetClass') ?? read.raw('name') ?? ticker),
        geography: read.text('geography', 'Unspecified'),
        currency: read.currency('currency'),
        quantity,
        costBasis: read.number('costBasis') ?? 0,
        price: unitPrice,
        value,
        account: read.text('account', 'Default'),
      },
    }
  })
}

export function buildTransactions(ctx: BuildContext): BuildResult<Transaction> {
  return buildRows<Transaction>('transactions', ctx, (read, prov) => {
    const date = read.date('date')
    if (!date) return { ok: false, reason: 'unreadable date' }
    const type = toTxnType(read.raw('type'))
    if (!type) return { ok: false, reason: `unrecognised transaction type "${read.text('type')}"` }
    const amount = read.number('amount')
    if (amount === null) return { ok: false, reason: 'amount is not a number' }

    // Normalise sign so cash leaving your pocket is always negative, whether
    // the source sheet used a sign column, a negative number, or neither.
    const outflow = type === 'buy' || type === 'fee' || type === 'withdrawal'
    const magnitude = Math.abs(amount)
    const signed = outflow ? -magnitude : magnitude

    return {
      ok: true,
      value: {
        id: uid('txn'),
        prov,
        date,
        ticker: read.text('ticker').toUpperCase(),
        type,
        quantity: read.number('quantity') ?? 0,
        price: read.number('price') ?? 0,
        amount: signed,
        currency: read.currency('currency'),
        fees: Math.abs(read.number('fees') ?? 0),
        account: read.text('account', 'Default'),
        note: read.text('note'),
      },
    }
  })
}

export function buildBenchmark(ctx: BuildContext): BuildResult<BenchmarkPoint> {
  return buildRows<BenchmarkPoint>('benchmark', ctx, (read, prov) => {
    const date = read.date('date')
    if (!date) return { ok: false, reason: 'unreadable date' }
    const level = read.number('level')
    if (level === null || level <= 0) return { ok: false, reason: 'index level is not a positive number' }
    return { ok: true, value: { id: uid('bmk'), prov, date, level } }
  })
}

export function buildBookings(ctx: BuildContext): BuildResult<Booking> {
  return buildRows<Booking>('bookings', ctx, (read, prov) => {
    const checkIn = read.date('checkIn')
    if (!checkIn) return { ok: false, reason: 'unreadable check-in date' }
    let checkOut = read.date('checkOut')
    const mappedNights = read.number('nights')

    if (!checkOut && mappedNights !== null && mappedNights > 0) {
      const derived = new Date(`${checkIn}T00:00:00`)
      derived.setDate(derived.getDate() + Math.round(mappedNights))
      checkOut = derived.toISOString().slice(0, 10)
    }
    if (!checkOut) return { ok: false, reason: 'needs a check-out date or a night count' }

    const nights = mappedNights ?? daysBetween(checkIn, checkOut)
    if (nights <= 0) return { ok: false, reason: 'check-out is not after check-in' }

    const gross = read.number('grossRevenue')
    const net = read.number('netRevenue')
    if (gross === null && net === null) return { ok: false, reason: 'no revenue amount' }

    const fees = Math.abs(read.number('fees') ?? 0)
    const grossRevenue = gross ?? (net as number) + fees
    const netRevenue = net ?? grossRevenue - fees

    return {
      ok: true,
      value: {
        id: uid('bkg'),
        prov,
        confirmationCode: read.text('confirmationCode', `${checkIn}-${prov.rowNumber}`),
        guestName: read.text('guestName'),
        channel: read.text('channel', 'Direct'),
        bookedOn: read.date('bookedOn') ?? checkIn,
        checkIn,
        checkOut,
        nights,
        guests: Math.max(1, Math.round(read.number('guests') ?? 1)),
        grossRevenue,
        fees,
        netRevenue,
        currency: read.currency('currency'),
        status: read.text('status', 'confirmed'),
      },
    }
  })
}

export function buildExpenses(ctx: BuildContext): BuildResult<Expense> {
  return buildRows<Expense>('expenses', ctx, (read, prov) => {
    const date = read.date('date')
    if (!date) return { ok: false, reason: 'unreadable date' }
    const category = read.text('category')
    if (!category) return { ok: false, reason: 'no category' }
    const amount = read.number('amount')
    if (amount === null) return { ok: false, reason: 'amount is not a number' }

    return {
      ok: true,
      value: {
        id: uid('exp'),
        prov,
        date,
        category,
        nature: toExpenseNature(read.raw('nature'), category),
        amount: Math.abs(amount),
        currency: read.currency('currency'),
        vendor: read.text('vendor'),
        note: read.text('note'),
      },
    }
  })
}

export const BUILDERS = {
  holdings: buildHoldings,
  transactions: buildTransactions,
  benchmark: buildBenchmark,
  bookings: buildBookings,
  expenses: buildExpenses,
} as const
