import { openDB, type DBSchema, type IDBPDatabase } from 'idb'
import type {
  AddOnQuote,
  BenchmarkPoint,
  CapitalSpend,
  CompetitorListing,
  CompetitorObservation,
  CostModel,
  DividendPayout,
  Finding,
  ForecastAssumptions,
  Booking,
  CapitalProject,
  DcfAssumptions,
  Expense,
  Holding,
  ImportBatch,
  PricingAssumptions,
  Settings,
  Resolution,
  Snapshot,
  Transaction,
} from '@/types'

/**
 * All state lives in the browser. Nothing leaves the device — there is no
 * server and no network call in this app beyond loading the page itself.
 */
interface LedgerDB extends DBSchema {
  holdings: { key: string; value: Holding; indexes: { snapshotId: string } }
  snapshots: { key: string; value: Snapshot; indexes: { asOf: string } }
  transactions: { key: string; value: Transaction; indexes: { date: string } }
  benchmark: { key: string; value: BenchmarkPoint; indexes: { date: string } }
  bookings: { key: string; value: Booking; indexes: { checkIn: string } }
  expenses: { key: string; value: Expense; indexes: { date: string } }
  imports: { key: string; value: ImportBatch; indexes: { dataset: string } }
  findings: { key: string; value: Finding; indexes: { status: string } }
  capitalSpend: { key: string; value: CapitalSpend; indexes: { projectId: string } }
  resolutions: { key: string; value: Resolution; indexes: { confirmationCode: string } }
  addons: { key: string; value: AddOnQuote; indexes: { checkIn: string } }
  dividends: { key: string; value: DividendPayout; indexes: { date: string } }
  competitors: { key: string; value: CompetitorListing }
  observations: { key: string; value: CompetitorObservation; indexes: { listingId: string } }
  kv: { key: string; value: unknown }
}

const DB_NAME = 'ledger'
const DB_VERSION = 6

let dbPromise: Promise<IDBPDatabase<LedgerDB>> | null = null

function db() {
  if (!dbPromise) {
    dbPromise = openDB<LedgerDB>(DB_NAME, DB_VERSION, {
      upgrade(database, oldVersion) {
        // Later versions only add stores; existing data is left untouched.
        if (oldVersion >= 1) {
          if (!database.objectStoreNames.contains('findings')) {
            const store = database.createObjectStore('findings', { keyPath: 'id' })
            store.createIndex('status', 'status')
          }
          if (!database.objectStoreNames.contains('capitalSpend')) {
            const store = database.createObjectStore('capitalSpend', { keyPath: 'id' })
            store.createIndex('projectId', 'projectId')
          }
          if (!database.objectStoreNames.contains('resolutions')) {
            const store = database.createObjectStore('resolutions', { keyPath: 'id' })
            store.createIndex('confirmationCode', 'confirmationCode')
          }
          if (!database.objectStoreNames.contains('addons')) {
            const store = database.createObjectStore('addons', { keyPath: 'id' })
            store.createIndex('checkIn', 'checkIn')
          }
          if (!database.objectStoreNames.contains('dividends')) {
            const store = database.createObjectStore('dividends', { keyPath: 'id' })
            store.createIndex('date', 'date')
          }
          if (!database.objectStoreNames.contains('competitors')) {
            database.createObjectStore('competitors', { keyPath: 'id' })
          }
          if (!database.objectStoreNames.contains('observations')) {
            const store = database.createObjectStore('observations', { keyPath: 'id' })
            store.createIndex('listingId', 'listingId')
          }
          return
        }

        const holdings = database.createObjectStore('holdings', { keyPath: 'id' })
        holdings.createIndex('snapshotId', 'snapshotId')

        const snapshots = database.createObjectStore('snapshots', { keyPath: 'id' })
        snapshots.createIndex('asOf', 'asOf')

        const transactions = database.createObjectStore('transactions', { keyPath: 'id' })
        transactions.createIndex('date', 'date')

        const benchmark = database.createObjectStore('benchmark', { keyPath: 'id' })
        benchmark.createIndex('date', 'date')

        const bookings = database.createObjectStore('bookings', { keyPath: 'id' })
        bookings.createIndex('checkIn', 'checkIn')

        const expenses = database.createObjectStore('expenses', { keyPath: 'id' })
        expenses.createIndex('date', 'date')

        const imports = database.createObjectStore('imports', { keyPath: 'id' })
        imports.createIndex('dataset', 'dataset')

        const findings = database.createObjectStore('findings', { keyPath: 'id' })
        findings.createIndex('status', 'status')

        const capitalSpend = database.createObjectStore('capitalSpend', { keyPath: 'id' })
        capitalSpend.createIndex('projectId', 'projectId')

        const resolutions = database.createObjectStore('resolutions', { keyPath: 'id' })
        resolutions.createIndex('confirmationCode', 'confirmationCode')

        const addons = database.createObjectStore('addons', { keyPath: 'id' })
        addons.createIndex('checkIn', 'checkIn')

        const dividends = database.createObjectStore('dividends', { keyPath: 'id' })
        dividends.createIndex('date', 'date')

        database.createObjectStore('competitors', { keyPath: 'id' })
        const observations = database.createObjectStore('observations', { keyPath: 'id' })
        observations.createIndex('listingId', 'listingId')

        database.createObjectStore('kv')
      },
    })
  }
  return dbPromise
}

type RecordStore =
  | 'holdings'
  | 'snapshots'
  | 'transactions'
  | 'benchmark'
  | 'bookings'
  | 'expenses'
  | 'imports'
  | 'findings'
  | 'capitalSpend'
  | 'resolutions'
  | 'addons'
  | 'dividends'
  | 'competitors'
  | 'observations'

export async function getAll<K extends RecordStore>(store: K): Promise<LedgerDB[K]['value'][]> {
  return (await db()).getAll(store)
}

export async function putMany<K extends RecordStore>(
  store: K,
  rows: LedgerDB[K]['value'][],
): Promise<void> {
  const database = await db()
  const tx = database.transaction(store, 'readwrite')
  await Promise.all([...rows.map((row) => tx.store.put(row as never)), tx.done])
}

export async function putOne<K extends RecordStore>(store: K, row: LedgerDB[K]['value']): Promise<void> {
  await (await db()).put(store, row as never)
}

export async function deleteOne(store: RecordStore, key: string): Promise<void> {
  await (await db()).delete(store, key)
}

export async function clearStore(store: RecordStore): Promise<void> {
  await (await db()).clear(store)
}

/**
 * Removes every row that arrived in a given import, plus the import record.
 * Undoing a bad import should leave nothing behind.
 */
export async function deleteImport(importId: string): Promise<void> {
  const database = await db()
  const batch = await database.get('imports', importId)
  if (!batch) return

  const rowStores: RecordStore[] = ['holdings', 'transactions', 'benchmark', 'bookings', 'expenses']
  for (const store of rowStores) {
    const rows = (await database.getAll(store)) as { id: string; prov?: { importId: string } }[]
    const doomed = rows.filter((row) => row.prov?.importId === importId)
    if (doomed.length === 0) continue
    const tx = database.transaction(store, 'readwrite')
    await Promise.all([...doomed.map((row) => tx.store.delete(row.id)), tx.done])
  }

  if (batch.snapshotId) {
    const remaining = await database.getAllFromIndex('holdings', 'snapshotId', batch.snapshotId)
    if (remaining.length === 0) await database.delete('snapshots', batch.snapshotId)
  }

  await database.delete('imports', importId)
}

export async function getKV<T>(key: string, fallback: T): Promise<T> {
  const value = await (await db()).get('kv', key)
  return value === undefined ? fallback : (value as T)
}

export async function setKV<T>(key: string, value: T): Promise<void> {
  await (await db()).put('kv', value, key)
}

export const KV = {
  settings: 'settings',
  dcf: 'dcfAssumptions',
  pricing: 'pricingAssumptions',
  projects: 'capitalProjects',
  mappingPresets: 'mappingPresets',
  costModel: 'costModel',
  forecast: 'forecastAssumptions',
} as const

export type Backup = {
  version: number
  exportedAt: string
  holdings: Holding[]
  snapshots: Snapshot[]
  transactions: Transaction[]
  benchmark: BenchmarkPoint[]
  bookings: Booking[]
  expenses: Expense[]
  imports: ImportBatch[]
  findings: Finding[]
  capitalSpend: CapitalSpend[]
  resolutions: Resolution[]
  addons: AddOnQuote[]
  dividends: DividendPayout[]
  competitors: CompetitorListing[]
  observations: CompetitorObservation[]
  settings: Settings | null
  dcf: DcfAssumptions | null
  pricing: PricingAssumptions | null
  projects: CapitalProject[]
  costModel: CostModel | null
  forecast: ForecastAssumptions | null
}

/** Whole-database JSON dump — the way to move data between laptop and phone. */
export async function exportBackup(): Promise<Backup> {
  return {
    version: DB_VERSION,
    exportedAt: new Date().toISOString(),
    holdings: await getAll('holdings'),
    snapshots: await getAll('snapshots'),
    transactions: await getAll('transactions'),
    benchmark: await getAll('benchmark'),
    bookings: await getAll('bookings'),
    expenses: await getAll('expenses'),
    imports: await getAll('imports'),
    findings: await getAll('findings'),
    capitalSpend: await getAll('capitalSpend'),
    resolutions: await getAll('resolutions'),
    addons: await getAll('addons'),
    dividends: await getAll('dividends'),
    competitors: await getAll('competitors'),
    observations: await getAll('observations'),
    settings: await getKV<Settings | null>(KV.settings, null),
    dcf: await getKV<DcfAssumptions | null>(KV.dcf, null),
    pricing: await getKV<PricingAssumptions | null>(KV.pricing, null),
    projects: await getKV<CapitalProject[]>(KV.projects, []),
    costModel: await getKV<CostModel | null>(KV.costModel, null),
    forecast: await getKV<ForecastAssumptions | null>(KV.forecast, null),
  }
}

export async function importBackup(backup: Backup): Promise<void> {
  const stores: RecordStore[] = [
    'holdings',
    'snapshots',
    'transactions',
    'benchmark',
    'bookings',
    'expenses',
    'imports',
    'findings',
    'capitalSpend',
    'resolutions',
    'addons',
    'dividends',
    'competitors',
    'observations',
  ]
  for (const store of stores) await clearStore(store)

  await putMany('holdings', backup.holdings ?? [])
  await putMany('snapshots', backup.snapshots ?? [])
  await putMany('transactions', backup.transactions ?? [])
  await putMany('benchmark', backup.benchmark ?? [])
  await putMany('bookings', backup.bookings ?? [])
  await putMany('expenses', backup.expenses ?? [])
  await putMany('imports', backup.imports ?? [])
  await putMany('findings', backup.findings ?? [])
  await putMany('capitalSpend', backup.capitalSpend ?? [])
  await putMany('resolutions', backup.resolutions ?? [])
  await putMany('addons', backup.addons ?? [])
  await putMany('dividends', backup.dividends ?? [])
  await putMany('competitors', backup.competitors ?? [])
  await putMany('observations', backup.observations ?? [])

  if (backup.settings) await setKV(KV.settings, backup.settings)
  if (backup.dcf) await setKV(KV.dcf, backup.dcf)
  if (backup.pricing) await setKV(KV.pricing, backup.pricing)
  if (backup.projects) await setKV(KV.projects, backup.projects)
  if (backup.costModel) await setKV(KV.costModel, backup.costModel)
  if (backup.forecast) await setKV(KV.forecast, backup.forecast)
}

export async function wipeEverything(): Promise<void> {
  const database = await db()
  const stores: RecordStore[] = [
    'holdings',
    'snapshots',
    'transactions',
    'benchmark',
    'bookings',
    'expenses',
    'imports',
    'findings',
    'capitalSpend',
  ]
  for (const store of stores) await database.clear(store)
  await database.clear('kv')
}
