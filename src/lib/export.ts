import { saveFile, saveMode, toCsv } from '@/lib/save'

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


export async function exportTable<T>(
  rows: T[],
  columns: ExportColumn<T>[],
  fileName: string,
  sheetName = 'Data',
  /** printed above the table so an archived file explains itself */
  notes: string[] = [],
): Promise<void> {
  const base = fileName.replace(/\.(xlsx|csv)$/i, '')

  // A published page can only hand over the formats its host allows, and xlsx
  // is not one of them. The same table goes out as csv there — notes included,
  // so an archived file still says what it is.
  if ((await saveMode()) === 'hosted') {
    const matrix: (string | number | null)[][] = [
      ...notes.map((note) => [note]),
      columns.map((column) => column.header),
      ...rows.map((row) => columns.map((column) => column.value(row))),
    ]
    await saveFile(`${base}.csv`, toCsv(matrix))
    return
  }

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
  await saveFile(
    `${base}.xlsx`,
    new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }),
  )
}

export async function exportJson(data: unknown, fileName: string): Promise<void> {
  await saveFile(
    fileName.endsWith('.json') ? fileName : `${fileName}.json`,
    JSON.stringify(data, null, 2),
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
