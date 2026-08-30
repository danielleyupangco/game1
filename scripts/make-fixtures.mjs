/**
 * Generates synthetic workbooks for the smoke test in scripts/smoke.mjs.
 *
 * These are DELIBERATELY awkward — a title banner above the header row, column
 * names that don't match the app's field names, accounting-style negatives,
 * US-style dates, cancelled bookings — because that is what a real export looks
 * like and the import mapper has to survive it.
 *
 * Nothing here is ever loaded by the app itself. The dashboard shows imported
 * data only; there is no sample data anywhere in src/.
 *
 * Output: scripts/fixtures/*.xlsx (gitignored).
 */
import { createRequire } from 'node:module'
import { fileURLToPath } from 'node:url'
import path from 'node:path'
import fs from 'node:fs'

const require = createRequire(import.meta.url)
const ExcelJS = require('exceljs')

const OUT = path.join(path.dirname(fileURLToPath(import.meta.url)), 'fixtures')
fs.mkdirSync(OUT, { recursive: true })

async function holdings() {
  const wb = new ExcelJS.Workbook()
  const ws = wb.addWorksheet('Notes')
  ws.addRow(['This sheet is not the data'])
  const s = wb.addWorksheet('Positions')
  s.addRow(['MY PORTFOLIO — as of 31 Mar 2026'])
  s.addRow([])
  s.addRow(['Stock Code', 'Security Name', 'Sector', 'Region', 'Curr', 'No. of Shares', 'Mkt Price', 'Market Value', 'Acquisition Cost', 'Broker'])
  const rows = [
    ['SM', 'SM Investments Corp', 'Equity', 'Philippines', 'PHP', 1200, 905.5, 1086600, 940000, 'COL'],
    ['BDO', 'BDO Unibank', 'Equity', 'Philippines', 'PHP', 5000, 152.3, 761500, 700000, 'COL'],
    ['ALI', 'Ayala Land', 'Equity', 'Philippines', 'PHP', 8000, 28.4, 227200, 310000, 'COL'],
    ['VOO', 'Vanguard S&P 500 ETF', 'Equity', 'US', 'USD', 45, 512.8, 23076, 18500, 'IBKR'],
    ['VXUS', 'Vanguard Total Intl', 'Equity', 'Global', 'USD', 60, 64.2, 3852, 3600, 'IBKR'],
    ['RCR', 'RL Commercial REIT', 'REIT', 'Philippines', 'PHP', 30000, 5.55, 166500, 180000, 'COL'],
    ['GS10Y', 'RTB 10-year', 'Fixed Income', 'Philippines', 'PHP', 1, 505000, 505000, 500000, 'Landbank'],
    ['MMF', 'Money Market Fund', 'Cash', 'Philippines', 'PHP', 1, 320000, 320000, 320000, 'BPI'],
    ['BTC', 'Bitcoin', 'Crypto', 'Global', 'USD', 0.12, 84000, 10080, 6200, 'Coins.ph'],
  ]
  rows.forEach((r) => s.addRow(r))
  await wb.xlsx.writeFile(path.join(OUT, 'holdings-mar.xlsx'))

  // A later snapshot with different values (and one new position).
  const wb2 = new ExcelJS.Workbook()
  const s2 = wb2.addWorksheet('Positions')
  s2.addRow(['MY PORTFOLIO — as of 30 Jun 2026'])
  s2.addRow([])
  s2.addRow(['Stock Code', 'Security Name', 'Sector', 'Region', 'Curr', 'No. of Shares', 'Mkt Price', 'Market Value', 'Acquisition Cost', 'Broker'])
  const rows2 = [
    ['SM', 'SM Investments Corp', 'Equity', 'Philippines', 'PHP', 1200, 968.0, 1161600, 940000, 'COL'],
    ['BDO', 'BDO Unibank', 'Equity', 'Philippines', 'PHP', 5000, 161.0, 805000, 700000, 'COL'],
    ['ALI', 'Ayala Land', 'Equity', 'Philippines', 'PHP', 8000, 26.1, 208800, 310000, 'COL'],
    ['VOO', 'Vanguard S&P 500 ETF', 'Equity', 'US', 'USD', 52, 548.0, 28496, 22100, 'IBKR'],
    ['VXUS', 'Vanguard Total Intl', 'Equity', 'Global', 'USD', 60, 66.9, 4014, 3600, 'IBKR'],
    ['RCR', 'RL Commercial REIT', 'REIT', 'Philippines', 'PHP', 30000, 5.9, 177000, 180000, 'COL'],
    ['GS10Y', 'RTB 10-year', 'Fixed Income', 'Philippines', 'PHP', 1, 512000, 512000, 500000, 'Landbank'],
    ['MMF', 'Money Market Fund', 'Cash', 'Philippines', 'PHP', 1, 355000, 355000, 355000, 'BPI'],
    ['BTC', 'Bitcoin', 'Crypto', 'Global', 'USD', 0.12, 91500, 10980, 6200, 'Coins.ph'],
  ]
  rows2.forEach((r) => s2.addRow(r))
  await wb2.xlsx.writeFile(path.join(OUT, 'holdings-jun.xlsx'))
}

async function transactions() {
  const wb = new ExcelJS.Workbook()
  const s = wb.addWorksheet('Ledger')
  s.addRow(['Trade Date', 'Symbol', 'Activity', 'Qty', 'Unit Price', 'Net Amount', 'Charges', 'Currency', 'Platform', 'Remarks'])
  const rows = [
    ['2026-04-15', '', 'Deposit', 0, 0, 150000, 0, 'PHP', 'COL', 'monthly top-up'],
    ['2026-05-02', 'VOO', 'Buy', 7, 520, '(3,640.00)', 5, 'USD', 'IBKR', ''],
    ['2026-05-20', '', 'Deposit', 0, 0, 100000, 0, 'PHP', 'BPI', ''],
    ['2026-06-01', 'MMF', 'Buy', 1, 35000, -35000, 0, 'PHP', 'BPI', ''],
    ['2026-06-10', 'SM', 'Dividend', 0, 0, 12000, 0, 'PHP', 'COL', 'cash div'],
    ['2026-06-18', '', 'Withdrawal', 0, 0, 50000, 0, 'PHP', 'COL', 'personal'],
  ]
  rows.forEach((r) => s.addRow(r))
  await wb.xlsx.writeFile(path.join(OUT, 'transactions.xlsx'))
}

async function benchmark() {
  const wb = new ExcelJS.Workbook()
  const s = wb.addWorksheet('PSEi')
  s.addRow(['Date', 'Close'])
  const start = new Date('2026-03-01')
  let level = 6400
  for (let i = 0; i < 130; i++) {
    const d = new Date(start)
    d.setDate(d.getDate() + i)
    level *= 1 + (Math.sin(i / 9) * 0.004 + 0.0004)
    s.addRow([d.toISOString().slice(0, 10), Math.round(level * 100) / 100])
  }
  await wb.xlsx.writeFile(path.join(OUT, 'psei.xlsx'))
}

async function bookings() {
  const wb = new ExcelJS.Workbook()
  const s = wb.addWorksheet('Reservations')
  s.addRow(['Island T — Reservation log'])
  s.addRow([])
  s.addRow(['Confirmation Code', 'Guest', 'Booked', 'Start date', 'End date', '# of nights', 'Pax', 'Gross Earnings', 'Service fee', 'Payout', 'Listing', 'Status'])
  const seasonal = { 1: 0.7, 2: 0.75, 3: 0.7, 4: 0.65, 5: 0.5, 6: 0.3, 7: 0.25, 8: 0.22, 9: 0.25, 10: 0.35, 11: 0.55, 12: 0.8 }
  let seed = 7
  const rnd = () => { seed = (seed * 1103515245 + 12345) % 2147483648; return seed / 2147483648 }
  let n = 0
  for (const year of [2025, 2026]) {
    for (let month = 1; month <= 12; month++) {
      if (year === 2026 && month > 8) break
      const target = Math.round(30 * seasonal[month])
      let sold = 0
      let day = 1
      while (sold < target && day < 27) {
        const nights = 2 + Math.floor(rnd() * 4)
        const checkIn = new Date(Date.UTC(year, month - 1, day))
        const checkOut = new Date(checkIn); checkOut.setUTCDate(checkOut.getUTCDate() + nights)
        const rate = (month >= 11 || month <= 5 ? 28000 : 21000) * (0.9 + rnd() * 0.25)
        const gross = Math.round(rate * nights)
        const fee = Math.round(gross * 0.03)
        const cancelled = rnd() < 0.06
        n++
        s.addRow([
          `HM${year}${String(month).padStart(2,'0')}${n}`,
          ['J. Reyes','A. Santos','M. Cruz','K. Tan','L. Garcia','R. Villanueva'][Math.floor(rnd()*6)],
          new Date(Date.UTC(year, month - 1, 1)).toISOString().slice(0,10),
          checkIn.toISOString().slice(0, 10),
          checkOut.toISOString().slice(0, 10),
          nights,
          2 + Math.floor(rnd() * 5),
          gross,
          fee,
          gross - fee,
          ['Airbnb','Airbnb','Airbnb','Direct','Booking.com'][Math.floor(rnd()*5)],
          cancelled ? 'Cancelled by guest' : 'Confirmed',
        ])
        if (!cancelled) sold += nights
        day += nights + 1 + Math.floor(rnd() * 3)
      }
    }
  }
  await wb.xlsx.writeFile(path.join(OUT, 'bookings.xlsx'))
}

async function expenses() {
  const wb = new ExcelJS.Workbook()
  const s = wb.addWorksheet('Costs')
  s.addRow(['Date', 'Particulars', 'Paid to', 'Amount (PHP)', 'Notes'])
  for (const year of [2025, 2026]) {
    for (let month = 1; month <= 12; month++) {
      if (year === 2026 && month > 8) break
      const d = `${String(month).padStart(2,'0')}/15/${year}`
      s.addRow([d, 'Crew salaries — Kuya Allan + 2', 'Payroll', 62000, ''])
      s.addRow([d, 'Property tax & permits', 'LGU Culion', 9500, ''])
      s.addRow([d, 'Insurance', 'Pioneer', 7800, ''])
      s.addRow([d, 'Maintenance & repairs', 'Various', 18000 + (month === 7 ? 145000 : 0), month === 7 ? 'typhoon roof repair' : ''])
      s.addRow([d, 'Starlink / connectivity', 'Starlink', 5400, ''])
      s.addRow([d, 'Guest catering', 'Local market', 9000 + month * 900, ''])
      s.addRow([d, 'Boat fuel & transfers', 'Bangka ops', 6500 + month * 400, ''])
      s.addRow([d, 'Cleaning & linen', 'Housekeeping', 4200 + month * 260, ''])
    }
  }
  await wb.xlsx.writeFile(path.join(OUT, 'expenses.xlsx'))
}

await holdings(); await transactions(); await benchmark(); await bookings(); await expenses()
console.log(`fixtures written to ${OUT}`)
