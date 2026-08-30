/**
 * End-to-end smoke test: drives the built app in a real browser through the
 * whole path a first run takes — empty state, five imports with column mapping,
 * every tab, provenance, xlsx export, and a phone-sized viewport.
 *
 * Run with:  npm run build && npm run smoke
 * (Fixtures come from scripts/make-fixtures.mjs and are synthetic — the app
 * itself never ships sample data.)
 */
import { chromium } from 'playwright'
import { spawn } from 'node:child_process'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import fs from 'node:fs'

const HERE = path.dirname(fileURLToPath(import.meta.url))
const FIXTURES = path.join(HERE, 'fixtures')
const PORT = Number(process.env.SMOKE_PORT ?? 4173)
const BASE = `http://127.0.0.1:${PORT}/`

if (!fs.existsSync(path.join(FIXTURES, 'holdings-mar.xlsx'))) {
  console.error('Fixtures missing. Run: node scripts/make-fixtures.mjs')
  process.exit(1)
}

const server = spawn('npx', ['vite', 'preview', '--port', String(PORT), '--host', '127.0.0.1'], {
  cwd: path.join(HERE, '..'),
  stdio: 'ignore',
})
const stop = () => {
  try {
    server.kill()
  } catch {
    /* already gone */
  }
}
process.on('exit', stop)

async function waitForServer() {
  for (let i = 0; i < 40; i++) {
    try {
      const response = await fetch(BASE)
      if (response.ok) return
    } catch {
      /* not up yet */
    }
    await new Promise((resolve) => setTimeout(resolve, 250))
  }
  throw new Error('preview server did not start')
}
await waitForServer()

const failures = []
const errors = []
const check = (label, ok, detail = '') => {
  console.log(`  ${ok ? '✓' : '✗'} ${label}${detail ? ` — ${detail}` : ''}`)
  if (!ok) failures.push(label)
}

const browser = await chromium.launch({
  executablePath: process.env.CHROMIUM_PATH || undefined,
})
const context = await browser.newContext({ viewport: { width: 1280, height: 900 }, acceptDownloads: true })
const page = await context.newPage()
page.on('console', (message) => {
  if (message.type() === 'error') errors.push(message.text())
})
page.on('pageerror', (error) => errors.push(error.message))

async function importFile(dataset, file, asOf = null) {
  await page.goto(`${BASE}#/data?dataset=${dataset}`)
  await page.waitForSelector('text=Drop an .xlsx', { timeout: 15000 })
  await page.setInputFiles('input[type=file]', path.join(FIXTURES, file))
  await page.waitForTimeout(800)
  if (await page.locator('button:has-text("fields matched")').first().isVisible().catch(() => false)) {
    await page.locator('button:has-text("fields matched")').first().click()
    await page.waitForTimeout(400)
  }
  await page.waitForSelector('button:has-text("Preview")', { timeout: 15000 })
  await page.locator('button:has-text("Preview")').click()
  await page.waitForSelector('button:has-text("Import ")', { timeout: 15000 })
  if (asOf) {
    await page.locator('input[type=date]').fill(asOf)
    await page.waitForTimeout(300)
  }
  const ready = Number(await page.locator('text=Rows ready').locator('..').locator('.num').textContent())
  const rejected = Number(await page.locator('text=Rows rejected').locator('..').locator('.num').textContent())
  await page.locator('button:has-text("Import ")').click()
  await page.waitForSelector('text=Import complete', { timeout: 20000 })
  await page.waitForTimeout(500)
  return { ready, rejected }
}

console.log('\nEmpty state')
await page.goto(BASE)
await page.waitForSelector('text=Nothing imported yet', { timeout: 15000 })
check('home shows an empty state rather than placeholder numbers', true)

console.log('\nImports (awkward sheets, auto-mapped columns)')
for (const [dataset, file, asOf, expected] of [
  ['holdings', 'holdings-mar.xlsx', '2026-03-31', 9],
  ['transactions', 'transactions.xlsx', null, 6],
  ['benchmark', 'psei.xlsx', null, 130],
  ['bookings', 'bookings.xlsx', null, 91],
  ['expenses', 'expenses.xlsx', null, 160],
  ['holdings', 'holdings-jun.xlsx', '2026-06-30', 9],
]) {
  const { ready, rejected } = await importFile(dataset, file, asOf)
  check(`${file}`, ready === expected && rejected === 0, `${ready} rows, ${rejected} rejected`)
}

console.log('\nPages')
for (const [name, hash, marker] of [
  ['Home', '#/', 'Net worth'],
  ['Investments', '#/investments', 'Portfolio value'],
  ['Island T', '#/airbnb', 'Revenue (T12M)'],
  ['Settings', '#/settings', 'Target allocation'],
  ['Data', '#/data', 'Import history'],
]) {
  await page.goto(BASE + hash)
  const ok = await page
    .waitForSelector(`text=${marker}`, { timeout: 15000 })
    .then(() => true)
    .catch(() => false)
  check(name, ok)
}

console.log('\nTabs')
for (const [hash, tabs] of [
  ['#/investments', ['Performance', 'Allocation', 'Risk', 'What to invest in']],
  ['#/airbnb', ['Costs', 'P&L', 'Valuation', 'Pricing']],
]) {
  await page.goto(BASE + '#/')
  await page.waitForTimeout(300)
  await page.goto(BASE + hash)
  await page.waitForTimeout(700)
  for (const tab of tabs) {
    await page.locator(`button:has-text("${tab}")`).first().click()
    await page.waitForTimeout(900)
    const rendered = (await page.locator('main').innerText()).length > 400
    check(`${hash} → ${tab}`, rendered)
  }
}

console.log('\nDerived numbers')
await page.goto(BASE + '#/')
await page.waitForTimeout(300)
await page.goto(BASE + '#/investments')
await page.waitForSelector('text=Portfolio value')
await page.locator('button:has-text("Performance")').first().click()
await page.waitForTimeout(900)
const perf = await page.locator('main').innerText()
check('two snapshots produce a non-zero return', /SINCE INCEPTION[\s\S]{0,40}[+-]\d/.test(perf.toUpperCase()))

console.log('\nProvenance')
await page.goto(BASE + '#/')
await page.waitForTimeout(300)
await page.goto(BASE + '#/investments')
await page.waitForSelector('text=Portfolio value')
await page.locator('td:has-text("SM")').first().click()
const drawer = await page
  .waitForSelector('text=Source data', { timeout: 8000 })
  .then(() => page.locator('aside').innerText())
  .catch(() => '')
check('clicking a holding shows its source file, sheet and row', /\.xlsx/.test(drawer) && /#\d+/.test(drawer))
await page.locator('aside button:has-text("Close")').click()

console.log('\nExport')
const pending = page.waitForEvent('download', { timeout: 25000 })
await page.locator('button:has-text("Export xlsx")').first().click()
const download = await pending.catch(() => null)
check('holdings table exports to xlsx', download !== null, download?.suggestedFilename() ?? 'no download')

console.log('\nMobile (390 × 844)')
const mobile = await context.newPage()
await mobile.setViewportSize({ width: 390, height: 844 })
for (const [name, hash, marker] of [
  ['home', '#/', 'Net worth'],
  ['island', '#/airbnb', 'Revenue (T12M)'],
]) {
  await mobile.goto(BASE + hash)
  await mobile.waitForSelector(`text=${marker}`, { timeout: 15000 })
  await mobile.waitForTimeout(1200)
  const overflow = await mobile.evaluate(
    () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
  )
  const chartWidths = await mobile.evaluate(() =>
    [...document.querySelectorAll('.recharts-wrapper')].map((el) => Math.round(el.getBoundingClientRect().width)),
  )
  check(`${name}: no horizontal overflow`, overflow <= 0, `${overflow}px`)
  check(`${name}: charts sized to viewport`, chartWidths.every((w) => w > 200 && w < 390), chartWidths.join(', '))
}

console.log('\nConsole')
check('no page or console errors', errors.length === 0, errors.slice(0, 3).join(' | '))

await browser.close()
stop()

console.log(failures.length === 0 ? '\nAll smoke checks passed.\n' : `\n${failures.length} check(s) failed.\n`)
process.exit(failures.length === 0 ? 0 : 1)
