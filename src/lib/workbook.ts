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

function uniqueHeaders(raw: unknown[]): string[] {
  const seen = new Map<string, number>()
  return raw.map((cell, index) => {
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
      // ExcelJS row.values is 1-indexed with a leading hole.
      matrix.push(values.slice(1).map(cellToPrimitive))
      sourceRowNumbers.push(rowNumber)
    })
    if (matrix.length === 0) {
      sheets.push({ name: worksheet.name, headers: [], rows: [], rowNumbers: [] })
      return
    }

    const headerIndex = findHeaderRow(matrix)
    const headers = uniqueHeaders(matrix[headerIndex] ?? [])
    const rows: unknown[][] = []
    const rowNumbers: number[] = []
    for (let i = headerIndex + 1; i < matrix.length; i++) {
      const row = matrix[i]
      const hasContent = row.some((cell) => cell !== null && cell !== undefined && String(cell).trim() !== '')
      if (!hasContent) continue
      rows.push(row)
      rowNumbers.push(sourceRowNumbers[i])
    }
    sheets.push({ name: worksheet.name, headers, rows, rowNumbers })
  })

  return { fileName: file.name, sheets }
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
  const rows: unknown[][] = []
  const rowNumbers: number[] = []
  for (let i = headerIndex + 1; i < matrix.length; i++) {
    if (!matrix[i].some((cell) => cell.trim() !== '')) continue
    rows.push(matrix[i])
    rowNumbers.push(i + 1)
  }
  return { name: 'CSV', headers, rows, rowNumbers }
}
