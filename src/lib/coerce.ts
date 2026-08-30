import type { AssetClass, Currency, ExpenseNature, TxnType } from '@/types'
import { ASSET_CLASSES } from '@/types'
import { toISODate } from '@/lib/dates'

/**
 * Cell values arrive as strings, numbers, Dates or nulls depending on how the
 * sheet was authored. These coercers accept all of that and say clearly when
 * they can't — a row that fails is reported, never silently dropped.
 */

export function toNumber(value: unknown): number | null {
  if (value === null || value === undefined || value === '') return null
  if (typeof value === 'number') return Number.isFinite(value) ? value : null
  if (typeof value === 'boolean') return value ? 1 : 0
  let text = String(value).trim()
  if (!text) return null

  // (1,234.50) is accounting notation for negative.
  let negative = false
  if (/^\(.*\)$/.test(text)) {
    negative = true
    text = text.slice(1, -1)
  }
  if (/-\s*$/.test(text)) {
    negative = true
    text = text.replace(/-\s*$/, '')
  }

  text = text.replace(/[₱$€£¥]|PHP|USD|EUR/gi, '')
  text = text.replace(/,/g, '').replace(/\s/g, '')

  let isPercent = false
  if (text.endsWith('%')) {
    isPercent = true
    text = text.slice(0, -1)
  }

  if (text === '' || text === '-' || text === '—') return null
  const parsed = Number(text)
  if (!Number.isFinite(parsed)) return null
  const magnitude = isPercent ? parsed / 100 : parsed
  return negative ? -magnitude : magnitude
}

const MONTHS: Record<string, number> = {
  jan: 1, feb: 2, mar: 3, apr: 4, may: 5, jun: 6,
  jul: 7, aug: 8, sep: 9, sept: 9, oct: 10, nov: 11, dec: 12,
}

/**
 * Returns 'YYYY-MM-DD'. Ambiguous all-numeric dates are read day-first when the
 * first part is >12, otherwise month-first — and `dayFirst` lets the import UI
 * override that for sheets written in DD/MM.
 */
export function toISO(value: unknown, dayFirst = false): string | null {
  if (value === null || value === undefined || value === '') return null
  if (value instanceof Date) {
    return Number.isNaN(value.getTime()) ? null : toISODate(value)
  }

  if (typeof value === 'number') {
    // Excel serial day number (1899-12-30 epoch). Read back in UTC: the serial
    // encodes a calendar date with no timezone, so using local components would
    // shift it a day for anyone west of Greenwich.
    if (value > 20000 && value < 60000) {
      const ms = Math.round((value - 25569) * 86400000)
      const date = new Date(ms)
      return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, '0')}-${String(date.getUTCDate()).padStart(2, '0')}`
    }
    return null
  }

  const text = String(value).trim()
  if (!text) return null

  const iso = text.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/)
  if (iso) return `${iso[1]}-${iso[2].padStart(2, '0')}-${iso[3].padStart(2, '0')}`

  const slash = text.match(/^(\d{1,2})[/.-](\d{1,2})[/.-](\d{2,4})/)
  if (slash) {
    const [, a, b, y] = slash
    let year = Number(y)
    if (year < 100) year += year < 70 ? 2000 : 1900
    let day = Number(a)
    let month = Number(b)
    if (!dayFirst && Number(a) <= 12) {
      month = Number(a)
      day = Number(b)
    }
    if (month > 12 || day > 31 || month < 1 || day < 1) return null
    return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`
  }

  // "12 Mar 2025" / "Mar 12, 2025" / "March 2025"
  const named = text.match(/([A-Za-z]{3,9})/)
  if (named) {
    const month = MONTHS[named[1].slice(0, 4).toLowerCase()] ?? MONTHS[named[1].slice(0, 3).toLowerCase()]
    if (month) {
      const numbers = text.match(/\d+/g)?.map(Number) ?? []
      const year = numbers.find((n) => n > 1900) ?? new Date().getFullYear()
      const day = numbers.find((n) => n >= 1 && n <= 31) ?? 1
      return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`
    }
  }

  const parsed = new Date(text)
  return Number.isNaN(parsed.getTime()) ? null : toISODate(parsed)
}

export function toCurrency(value: unknown, fallback: Currency = 'PHP'): Currency {
  const text = String(value ?? '').trim().toUpperCase()
  if (text.includes('USD') || text.includes('$') || text === 'US') return 'USD'
  if (text.includes('PHP') || text.includes('₱') || text.includes('PESO')) return 'PHP'
  return fallback
}

export function toAssetClass(value: unknown): AssetClass {
  const text = String(value ?? '').trim().toLowerCase()
  if (!text) return 'Unclassified'
  const exact = ASSET_CLASSES.find((cls) => cls.toLowerCase() === text)
  if (exact) return exact
  if (/equit|stock|share|etf|index fund|uitf|mutual/.test(text)) return 'Equity'
  if (/bond|fixed|treasur|t-bill|note|deposit|time dep/.test(text)) return 'Fixed Income'
  if (/cash|money market|savings|mmf/.test(text)) return 'Cash'
  if (/reit|real estate|property|land/.test(text)) return 'Real Estate'
  if (/crypto|btc|eth|bitcoin|coin|token/.test(text)) return 'Crypto'
  if (/alt|private|vc|hedge|commodit|gold/.test(text)) return 'Alternatives'
  return 'Unclassified'
}

export function toTxnType(value: unknown): TxnType | null {
  const text = String(value ?? '').trim().toLowerCase()
  if (!text) return null
  if (/^(b|buy|bought|purchase|subscri)/.test(text)) return 'buy'
  if (/^(s|sell|sold|redeem|redempt|disposal)/.test(text)) return 'sell'
  if (/div|coupon|interest|income|distribution/.test(text)) return 'dividend'
  if (/fee|charge|commission|tax|levy/.test(text)) return 'fee'
  if (/deposit|fund|contribut|top.?up|transfer in|inflow/.test(text)) return 'deposit'
  if (/withdraw|redeem out|transfer out|outflow/.test(text)) return 'withdrawal'
  return null
}

/**
 * A cost line named "per night" or "per stay" states its own behaviour, so it
 * is checked before anything else — those words beat every other keyword.
 */
const PER_UNIT_HINTS = /\bper\s*(night|stay|guest|booking|head|pax|trip)\b/i
const VARIABLE_COST_HINTS =
  /cater|food|meal|grocer|fuel|boat|gas|clean|laundry|linen|guest|amenit|water deliver|consumab|transfer|welcome|commission|cogs/i
const FIXED_COST_HINTS =
  /tax|insur|salar|wage|crew|staff|caretaker|allan|maintenance|repair|internet|starlink|permit|licen|depreciat|rent|subscription|security|towel|supplies/i

/**
 * Classifies an expense when the sheet doesn't say. Keyword-driven and
 * deliberately visible: the Airbnb tab shows which rows were auto-classified
 * so a wrong guess can be corrected rather than quietly skewing cost-per-night.
 */
export function toExpenseNature(value: unknown, category: string): ExpenseNature {
  const text = String(value ?? '').trim().toLowerCase()
  if (text.startsWith('f')) return 'fixed'
  if (text.startsWith('v')) return 'variable'
  if (PER_UNIT_HINTS.test(category)) return 'variable'
  if (FIXED_COST_HINTS.test(category)) return 'fixed'
  if (VARIABLE_COST_HINTS.test(category)) return 'variable'
  return 'fixed'
}

export function toText(value: unknown, fallback = ''): string {
  if (value === null || value === undefined) return fallback
  const text = String(value).trim()
  return text === '' ? fallback : text
}
