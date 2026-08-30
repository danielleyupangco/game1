import type ExcelJSNamespace from 'exceljs'

// ExcelJS is ~900 kB. It's only needed the moment a file is actually read, so
// it loads on demand rather than in the initial bundle.
type ExcelJSModule = typeof import('exceljs')
let excelJsPromise: Promise<ExcelJSModule> | null = null
function loadExcelJs(): Promise<ExcelJSModule> {
  if (!excelJsPromise) {
    // ExcelJS ships as CommonJS, so the bundler may hand back either the
    // namespace or a `default` wrapper depending on how it interops.
    excelJsPromise = import('exceljs').then(
      (module) => ((module as { default?: ExcelJSModule }).default ?? module) as ExcelJSModule,
    )
  }
  return excelJsPromise
}

export type SheetPreview = {
  name: string
  headers: string[]
  /** every data row as an array aligned to `headers` */
  rows: unknown[][]
  /** source row number of rows[i], so provenance survives blank-row skipping */
  rowNumbers: number[]
  /**
   * Sheets often stack several tables under repeated headers — one block per
   * account, owner or period. Each section is a contiguous run of rows under
   * one header, so they can be labelled and included separately on import.
   * A plain single-table sheet has exactly one section.
   */
  sections: { label: string; startIndex: number; endIndex: number }[]
  /** date parsed out of the sheet name, when it reads as one */
  impliedDate: string | null
}

export type ParsedWorkbook = {
  fileName: string
  sheets: SheetPreview[]
}

function cellToPrimitive(value: ExcelJSNamespace.CellValue): unknown {
  if (value === null || value === undefined) return null
  if (value instanceof Date) return value
  if (typeof value === 'object') {
    const obj = value as unknown as Record<string, unknown>
    // Formula cells carry their computed result alongside the formula text.
    if ('result' in obj) return cellToPrimitive(obj.result as ExcelJSNamespace.CellValue)
    if ('text' in obj) return obj.text
    if ('richText' in obj) {
      return (obj.richText as { text: string }[]).map((part) => part.text).join('')
    }
    if ('hyperlink' in obj) return obj.text ?? obj.hyperlink
    if ('error' in obj) return null
    // A formula whose result was never cached by the writing application. There
    // is no value to recover, and returning the object would stringify to
    // "[object Object]" and be imported as if it were data.
    if ('formula' in obj || 'sharedFormula' in obj) return null
    return null
  }
  return value
}

/**
 * Finds the header row rather than assuming row 1 — real exports have title
 * banners, blank spacers and report metadata above the actual table.
 * Heuristic: within the first 15 rows, the row with the most non-empty,
 * mostly-textual cells wins.
 */
function findHeaderRow(matrix: unknown[][]): number {
  let best = 0
  let bestScore = -1
  const limit = Math.min(matrix.length, 15)
  for (let i = 0; i < limit; i++) {
    const row = matrix[i] ?? []
    const filled = row.filter((cell) => cell !== null && cell !== undefined && String(cell).trim() !== '')
    if (filled.length < 2) continue
    const textual = filled.filter((cell) => typeof cell === 'string' && Number.isNaN(Number(cell)))
    const score = filled.length + textual.length * 1.5
    if (score > bestScore) {
      bestScore = score
      best = i
    }
  }
  return best
}

/** True when a row repeats the header — the start of another stacked table. */
function looksLikeHeader(row: unknown[], headers: string[]): boolean {
  const cells = row.map((cell) => String(cell ?? '').trim().toLowerCase()).filter(Boolean)
  if (cells.length < 2) return false
  const known = new Set(headers.map((h) => h.toLowerCase()))
  const matches = cells.filter((cell) => known.has(cell)).length
  return matches >= Math.max(2, Math.ceil(cells.length * 0.6))
}

/**
 * Subtotal and grand-total rows. Importing these would double-count the sheet,
 * so they are dropped — but only when the label is a total on its own, never
 * when it merely contains the word (a fund called "Total Intl Stock Index"
 * is a holding, not a subtotal).
 */
const TOTAL_ROW = /^(grand\s+)?(total|subtotal|sub-total|sum|net total)\s*[:.]?$/i

function isTotalRow(row: unknown[]): boolean {
  const labels = row.map((cell) => String(cell ?? '').trim()).filter(Boolean)
  if (labels.length === 0) return false
  return TOTAL_ROW.test(labels[0])
}

/**
 * Reads a date out of a sheet name — "August 13, 2026", "Oct 28, 2025 Portfolio",
 * "2026-08-13", "Q3 2026". Returns null when the name isn't a date, which is the
 * common case for a plain single-snapshot workbook.
 */
export function dateFromSheetName(name: string): string | null {
  const iso = name.match(/(20\d{2})[-/](\d{1,2})[-/](\d{1,2})/)
  if (iso) return `${iso[1]}-${iso[2].padStart(2, '0')}-${iso[3].padStart(2, '0')}`

  const MONTHS: Record<string, number> = {
    jan: 1, feb: 2, mar: 3, apr: 4, may: 5, jun: 6,
    jul: 7, aug: 8, sep: 9, oct: 10, nov: 11, dec: 12,
  }
  const named = name.match(/([A-Za-z]{3,9})\.?\s+(\d{1,2})\s*,?\s*(20\d{2})/)
  if (named) {
    const month = MONTHS[named[1].slice(0, 3).toLowerCase()]
    if (month) return `${named[3]}-${String(month).padStart(2, '0')}-${named[2].padStart(2, '0')}`
  }
  const monthYear = name.match(/([A-Za-z]{3,9})\.?\s+(20\d{2})/)
  if (monthYear) {
    const month = MONTHS[monthYear[1].slice(0, 3).toLowerCase()]
    // Month with no day: use the last day of that month, which is what a
    // "March 2026" portfolio sheet almost always means.
    if (month) {
      const lastDay = new Date(Number(monthYear[2]), month, 0).getDate()
      return `${monthYear[2]}-${String(month).padStart(2, '0')}-${lastDay}`
    }
  }
  return null
}

function uniqueHeaders(raw: unknown[]): string[] {
  const seen = new Map<string, number>()
  return Array.from(raw, (cell, index) => {
    let label = String(cell ?? '').trim()
    if (!label) label = `Column ${index + 1}`
    const count = seen.get(label) ?? 0
    seen.set(label, count + 1)
    return count === 0 ? label : `${label} (${count + 1})`
  })
}

export async function parseWorkbook(file: File): Promise<ParsedWorkbook> {
  const buffer = await file.arrayBuffer()
  if (file.name.toLowerCase().endsWith('.csv')) {
    const text = new TextDecoder().decode(buffer)
    return { fileName: file.name, sheets: [parseCsv(text)] }
  }

  const ExcelJS = await loadExcelJs()
  const workbook = new ExcelJS.Workbook()
  await workbook.xlsx.load(buffer)

  const sheets: SheetPreview[] = []
  workbook.eachSheet((worksheet: ExcelJSNamespace.Worksheet) => {
    const matrix: unknown[][] = []
    const sourceRowNumbers: number[] = []
    worksheet.eachRow({ includeEmpty: false }, (row: ExcelJSNamespace.Row, rowNumber: number) => {
      const values = row.values as ExcelJSNamespace.CellValue[]
      // ExcelJS returns a 1-indexed *sparse* array — empty cells are holes, not
      // undefined entries. Array.from fills them in, which matters because a
      // hole survives .map() and would later be read as a missing column.
      const dense = Array.from({ length: Math.max(0, values.length - 1) }, (_, i) =>
        cellToPrimitive(values[i + 1] ?? null),
      )
      matrix.push(dense)
      sourceRowNumbers.push(rowNumber)
    })
    if (matrix.length === 0) {
      sheets.push({
        name: worksheet.name,
        headers: [],
        rows: [],
        rowNumbers: [],
        sections: [],
        impliedDate: dateFromSheetName(worksheet.name),
      })
      return
    }

    const headerIndex = findHeaderRow(matrix)
    const headers = uniqueHeaders(matrix[headerIndex] ?? [])
    sheets.push({
      name: worksheet.name,
      headers,
      ...collectRows(matrix, sourceRowNumbers, headerIndex, headers),
      impliedDate: dateFromSheetName(worksheet.name),
    })
  })

  return { fileName: file.name, sheets }
}


/**
 * Walks the rows below a header, dropping blank rows, subtotal rows and any
 * repeated header, and records where each stacked table starts and ends.
 */
function collectRows(
  matrix: unknown[][],
  sourceRowNumbers: number[],
  headerIndex: number,
  headers: string[],
): Pick<SheetPreview, 'rows' | 'rowNumbers' | 'sections'> {
  const rows: unknown[][] = []
  const rowNumbers: number[] = []
  const sections: SheetPreview['sections'] = []
  let sectionStart = 0

  const closeSection = () => {
    if (rows.length > sectionStart) {
      sections.push({
        label: `Section ${sections.length + 1}`,
        startIndex: sectionStart,
        endIndex: rows.length,
      })
      sectionStart = rows.length
    }
  }

  for (let i = headerIndex + 1; i < matrix.length; i++) {
    const row = matrix[i] ?? []
    const hasContent = row.some((cell) => cell !== null && cell !== undefined && String(cell).trim() !== '')
    if (!hasContent) continue
    if (isTotalRow(row)) continue
    if (looksLikeHeader(row, headers)) {
      // Another table starts here; everything after it is a new section.
      closeSection()
      continue
    }
    rows.push(row)
    rowNumbers.push(sourceRowNumbers[i] ?? i + 1)
  }
  closeSection()

  return { rows, rowNumbers, sections }
}

/** Minimal RFC-4180 CSV reader — handles quoted fields and embedded commas. */
function parseCsv(text: string): SheetPreview {
  const matrix: string[][] = []
  let row: string[] = []
  let field = ''
  let inQuotes = false

  for (let i = 0; i < text.length; i++) {
    const char = text[i]
    if (inQuotes) {
      if (char === '"') {
        if (text[i + 1] === '"') {
          field += '"'
          i++
        } else inQuotes = false
      } else field += char
      continue
    }
    if (char === '"') inQuotes = true
    else if (char === ',') {
      row.push(field)
      field = ''
    } else if (char === '\n') {
      row.push(field)
      matrix.push(row)
      row = []
      field = ''
    } else if (char !== '\r') field += char
  }
  if (field !== '' || row.length > 0) {
    row.push(field)
    matrix.push(row)
  }

  const headerIndex = findHeaderRow(matrix)
  const headers = uniqueHeaders(matrix[headerIndex] ?? [])
  const sourceRowNumbers = matrix.map((_, i) => i + 1)
  return {
    name: 'CSV',
    headers,
    ...collectRows(matrix, sourceRowNumbers, headerIndex, headers),
    impliedDate: null,
  }
}
