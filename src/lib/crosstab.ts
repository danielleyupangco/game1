import type { SheetPreview } from '@/lib/workbook'
import { toISO, toNumber, toText } from '@/lib/coerce'
import { toExpenseNature } from '@/lib/coerce'
import { uid } from '@/lib/id'
import type { Currency, Expense, Provenance } from '@/types'

/**
 * Crosstab (matrix) import: categories down the side, periods across the top.
 *
 * This is the shape every management P&L and expense summary is written in, and
 * it is not a table of records — one source row becomes twelve. Reading it means
 * finding which header cells are dates, then emitting a record per populated
 * cell, each carrying both its row and its column so a figure can still be
 * traced back to the exact cell it came from.
 */

export type PeriodColumn = {
  /** index into sheet.headers */
  index: number
  header: string
  /** ISO date the column represents */
  date: string
}

const MONTH_NAMES: Record<string, number> = {
  jan: 1, january: 1, feb: 2, febuary: 2, february: 2, mar: 3, march: 3,
  apr: 4, april: 4, may: 5, jun: 6, june: 6, jul: 7, july: 7,
  aug: 8, august: 8, sep: 9, sept: 9, september: 9, oct: 10, october: 10,
  nov: 11, november: 11, dec: 12, december: 12,
}

/**
 * Reads a header cell as a period. Accepts real dates, "January", "Jan-26",
 * "2026-03". A bare month name has no year, so `defaultYear` supplies one —
 * which is why the import UI asks for it rather than guessing.
 */
export function headerToDate(header: string, defaultYear: number): string | null {
  const text = header.trim()
  if (!text) return null

  const monthEnd = (year: number, month: number) =>
    `${year}-${String(month).padStart(2, '0')}-${new Date(year, month, 0).getDate()}`

  // A bare month name is tried first: the general date reader would take
  // "January" as the 1st, but a month column in a P&L is the whole month, and
  // an accrual for it belongs at month end.
  const cleaned = text.toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim()
  const monthMatch = cleaned.match(/^([a-z]+)\s*(\d{2,4})?$/)
  if (monthMatch) {
    const month = MONTH_NAMES[monthMatch[1]]
    if (month) {
      const raw = monthMatch[2] ? Number(monthMatch[2]) : null
      const year = raw === null ? defaultYear : raw < 100 ? 2000 + raw : raw
      return monthEnd(year, month)
    }
  }

  // Everything else must look like a date *in its entirety*. A loose reader
  // would take a sheet title such as "Y3 - Jan 1 to Dec 31 2026" as January,
  // and an auto-generated "Column 1" as a year — both of which turn a label
  // column into a period and wreck the whole import.
  const yearMonth = text.match(/^(\d{4})[-/](\d{1,2})$/)
  if (yearMonth) return monthEnd(Number(yearMonth[1]), Number(yearMonth[2]))

  if (/^\d{4}-\d{1,2}-\d{1,2}$/.test(text) || /^\d{1,2}[/.-]\d{1,2}[/.-]\d{2,4}$/.test(text)) {
    return toISO(text)
  }

  return null
}

/** Header cells that read as periods. Fewer than three and it isn't a crosstab. */
export function detectPeriodColumns(headers: string[], defaultYear: number): PeriodColumn[] {
  const found: PeriodColumn[] = []
  headers.forEach((header, index) => {
    const date = headerToDate(header, defaultYear)
    if (date) found.push({ index, header, date })
  })
  return found
}

export function looksLikeCrosstab(sheet: SheetPreview, defaultYear: number): boolean {
  return detectPeriodColumns(sheet.headers, defaultYear).length >= 3
}

/**
 * The column holding the category label: the one with the most non-numeric
 * text. A column of numbers is never a label, however far left it sits — that
 * mistake turns every cost line into a figure like "442000".
 */
export function guessLabelColumn(sheet: SheetPreview, periods: PeriodColumn[]): number {
  const periodIndexes = new Set(periods.map((period) => period.index))
  let best = 0
  let bestScore = 0
  sheet.headers.forEach((_, index) => {
    if (periodIndexes.has(index)) return
    const textual = sheet.rows.filter((row) => {
      const value = row[index]
      return typeof value === 'string' && value.trim() !== '' && toNumber(value) === null
    }).length
    if (textual > bestScore) {
      bestScore = textual
      best = index
    }
  })
  return best
}

export type CrosstabOptions = {
  sheet: SheetPreview
  fileName: string
  importId: string
  labelColumn: number
  periods: PeriodColumn[]
  currency: Currency
  /** rows the user excluded — totals, blank groupings, subheadings */
  excludedRows: number[]
  /** period columns the user excluded — usually ones already imported */
  excludedPeriods?: number[]
  /** explicit fixed/variable per category label; falls back to keyword rules */
  natures: Record<string, 'fixed' | 'variable'>
}

export type CrosstabResult = {
  rows: Expense[]
  rejected: { rowNumber: number; reason: string }[]
  /** distinct category labels found, for the include/exclude UI */
  labels: {
    rowIndex: number
    rowNumber: number
    label: string
    total: number
    cells: number
    /** a total, a ratio or a count — excluded by default, but reversible */
    isSummary: boolean
    /** fixed or variable, as guessed or as overridden */
    nature: 'fixed' | 'variable'
  }[]
}

/** Rows that restate other rows. Importing them would double-count the sheet. */
const SUMMARY_ROW = /^(total|subtotal|sub-total|grand total|sum|net|gross|ebitda|ebit|opex|cogs|revenue|income|margin|%|.*% of sales)\b/i

export function isSummaryLabel(label: string): boolean {
  return SUMMARY_ROW.test(label.trim())
}

/**
 * A row of counts or ratios rather than money — night counts, occupancy,
 * guest numbers. A management P&L interleaves these with the cost lines, and
 * importing one as an expense would put "18" in the accounts as eighteen pesos.
 *
 * Judged on the values, not the label, because the labels vary endlessly.
 */
export function looksLikeMetricRow(values: number[]): boolean {
  if (values.length === 0) return false
  const magnitudes = values.map(Math.abs)
  // Every value at or below 1: a rate or a percentage.
  if (magnitudes.every((value) => value <= 1)) return true
  // Small whole numbers: a count of nights, stays or guests.
  return values.every((value) => Number.isInteger(value)) && Math.max(...magnitudes) < 200
}

export function buildCrosstabExpenses(options: CrosstabOptions): CrosstabResult {
  const { sheet, labelColumn } = options
  const dropped = new Set(options.excludedPeriods ?? [])
  const periods = options.periods.filter((period) => !dropped.has(period.index))
  const rows: Expense[] = []
  const rejected: { rowNumber: number; reason: string }[] = []
  const labels: CrosstabResult['labels'] = []
  const excluded = new Set(options.excludedRows)

  sheet.rows.forEach((row, rowIndex) => {
    const rowNumber = sheet.rowNumbers[rowIndex] ?? rowIndex + 2
    const label = toText(row[labelColumn])
    if (!label) return

    const cells = periods
      .map((period) => ({ period, value: toNumber(row[period.index]) }))
      .filter((cell): cell is { period: PeriodColumn; value: number } => cell.value !== null && cell.value !== 0)

    labels.push({
      rowIndex,
      rowNumber,
      label,
      total: cells.reduce((sum, cell) => sum + Math.abs(cell.value), 0),
      cells: cells.length,
      isSummary: isSummaryLabel(label) || looksLikeMetricRow(cells.map((cell) => cell.value)),
      nature: options.natures[label] ?? toExpenseNature(null, label),
    })

    if (excluded.has(rowIndex)) return
    if (cells.length === 0) {
      rejected.push({ rowNumber, reason: `no numbers in any period column for "${label}"` })
      return
    }

    for (const cell of cells) {
      const prov: Provenance = {
        importId: options.importId,
        fileName: options.fileName,
        sheetName: sheet.name,
        rowNumber,
        column: cell.period.header,
      }
      rows.push({
        id: uid('exp'),
        prov,
        date: cell.period.date,
        category: label,
        nature: options.natures[label] ?? toExpenseNature(null, label),
        amount: Math.abs(cell.value),
        currency: options.currency,
        vendor: '',
        note: '',
      })
    }
  })

  return { rows, rejected, labels }
}
