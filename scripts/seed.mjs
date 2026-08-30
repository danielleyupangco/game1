/**
 * Bakes a backup file into the build as a pre-loaded dataset.
 *
 *   node scripts/seed.mjs path/to/ledger-backup.json
 *   node scripts/seed.mjs --clear
 *
 * The written file (src/seed/data.json) is gitignored: it is somebody's actual
 * financial data and does not belong in version control. Without it the build
 * produces the ordinary empty app.
 */
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const HERE = path.dirname(fileURLToPath(import.meta.url))
const TARGET = path.join(HERE, '..', 'src', 'seed', 'data.json')
const input = process.argv[2]

if (!input) {
  console.error('usage: node scripts/seed.mjs <backup.json> | --clear')
  process.exit(1)
}

if (input === '--clear') {
  if (fs.existsSync(TARGET)) fs.unlinkSync(TARGET)
  console.log('seed cleared — the next build will be the empty app')
  process.exit(0)
}

const backup = JSON.parse(fs.readFileSync(input, 'utf8'))
const counts = ['holdings', 'snapshots', 'transactions', 'bookings', 'expenses', 'findings']
  .map((key) => `${(backup[key] ?? []).length} ${key}`)
  .join(', ')

fs.writeFileSync(TARGET, JSON.stringify(backup))
console.log(`seeded ${path.relative(process.cwd(), TARGET)} — ${counts}`)
