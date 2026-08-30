// Loaded on demand — see the note in lib/workbook.ts.
type ExcelJSModule = typeof import('exceljs')
async function loadExcelJs(): Promise<ExcelJSModule> {
  const module = await import('exceljs')
  return ((module as { default?: ExcelJSModule }).default ?? module) as ExcelJSModule
}

export type ExportColumn<T> = {
  header: string
  /** cell value; numbers stay numbers so Excel can sum them */
  value: (row: T) => string | number | null
  width?: number
  numFmt?: string
}

function download(blob: Blob, fileName: string): void {
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = fileName
  document.body.appendChild(anchor)
  anchor.click()
  anchor.remove()
  // Revoking immediately can cancel the download in some browsers.
  setTimeout(() => URL.revokeObjectURL(url), 2000)
}

export async function exportTable<T>(
  rows: T[],
  columns: ExportColumn<T>[],
  fileName: string,
  sheetName = 'Data',
  /** printed above the table so an archived file explains itself */
  notes: string[] = [],
): Promise<void> {
  const ExcelJS = await loadExcelJs()
  const workbook = new ExcelJS.Workbook()
  workbook.creator = 'Ledger'
  workbook.created = new Date()
  // Excel rejects sheet names over 31 chars or containing []*?/\:
  const sheet = workbook.addWorksheet(sheetName.replace(/[[\]*?/\\:]/g, '-').slice(0, 31))

  let cursor = 1
  for (const note of notes) {
    sheet.getCell(cursor, 1).value = note
    sheet.getCell(cursor, 1).font = { italic: true, size: 9, color: { argb: 'FF666666' } }
    cursor++
  }
  if (notes.length > 0) cursor++

  const headerRow = sheet.getRow(cursor)
  columns.forEach((column, index) => {
    const cell = headerRow.getCell(index + 1)
    cell.value = column.header
    cell.font = { bold: true }
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFEFEFEF' } }
    cell.border = { bottom: { style: 'thin', color: { argb: 'FFBBBBBB' } } }
    sheet.getColumn(index + 1).width = column.width ?? Math.max(12, column.header.length + 4)
  })
  headerRow.commit()
  cursor++

  for (const row of rows) {
    const excelRow = sheet.getRow(cursor)
    columns.forEach((column, index) => {
      const cell = excelRow.getCell(index + 1)
      cell.value = column.value(row)
      if (column.numFmt) cell.numFmt = column.numFmt
    })
    excelRow.commit()
    cursor++
  }

  sheet.views = [{ state: 'frozen', ySplit: cursor - rows.length - 1 }]

  const buffer = await workbook.xlsx.writeBuffer()
  download(
    new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }),
    fileName.endsWith('.xlsx') ? fileName : `${fileName}.xlsx`,
  )
}

export function exportJson(data: unknown, fileName: string): void {
  download(
    new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' }),
    fileName.endsWith('.json') ? fileName : `${fileName}.json`,
  )
}

export const MONEY_FMT = '#,##0'
export const MONEY_FMT_2 = '#,##0.00'
export const PCT_FMT = '0.0%'

/** PDF via the browser's own print pipeline — no extra dependency, and it
 *  respects the print stylesheet so navigation and controls drop out. */
export function printToPdf(): void {
  window.print()
}
