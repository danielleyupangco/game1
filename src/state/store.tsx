import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import * as db from '@/lib/db'
import { KV } from '@/lib/db'
import { DEFAULT_DCF, DEFAULT_PRICING, DEFAULT_SETTINGS } from '@/state/defaults'
import type {
  BenchmarkPoint,
  Booking,
  CapitalProject,
  DatasetKey,
  DcfAssumptions,
  Expense,
  Holding,
  ImportBatch,
  PricingAssumptions,
  Settings,
  Snapshot,
  Transaction,
} from '@/types'

export type LedgerData = {
  holdings: Holding[]
  snapshots: Snapshot[]
  transactions: Transaction[]
  benchmark: BenchmarkPoint[]
  bookings: Booking[]
  expenses: Expense[]
  imports: ImportBatch[]
}

type Ctx = LedgerData & {
  ready: boolean
  settings: Settings
  dcf: DcfAssumptions
  pricing: PricingAssumptions
  projects: CapitalProject[]
  reload: () => Promise<void>
  saveSettings: (patch: Partial<Settings>) => Promise<void>
  saveDcf: (patch: Partial<DcfAssumptions>) => Promise<void>
  savePricing: (patch: Partial<PricingAssumptions>) => Promise<void>
  saveProjects: (next: CapitalProject[]) => Promise<void>
  removeImport: (importId: string) => Promise<void>
  /** most recent import timestamp per dataset, for the freshness indicators */
  freshness: Partial<Record<DatasetKey, string>>
}

const LedgerContext = createContext<Ctx | null>(null)

const EMPTY: LedgerData = {
  holdings: [],
  snapshots: [],
  transactions: [],
  benchmark: [],
  bookings: [],
  expenses: [],
  imports: [],
}

export function LedgerProvider({ children }: { children: ReactNode }) {
  const [data, setData] = useState<LedgerData>(EMPTY)
  const [settings, setSettings] = useState<Settings>(DEFAULT_SETTINGS)
  const [dcf, setDcf] = useState<DcfAssumptions>(DEFAULT_DCF)
  const [pricing, setPricing] = useState<PricingAssumptions>(DEFAULT_PRICING)
  const [projects, setProjects] = useState<CapitalProject[]>([])
  const [ready, setReady] = useState(false)

  const reload = useCallback(async () => {
    const [holdings, snapshots, transactions, benchmark, bookings, expenses, imports] = await Promise.all([
      db.getAll('holdings'),
      db.getAll('snapshots'),
      db.getAll('transactions'),
      db.getAll('benchmark'),
      db.getAll('bookings'),
      db.getAll('expenses'),
      db.getAll('imports'),
    ])
    setData({ holdings, snapshots, transactions, benchmark, bookings, expenses, imports })

    // Merge stored values over defaults so a schema addition doesn't strand
    // an existing database on a missing key.
    setSettings({ ...DEFAULT_SETTINGS, ...(await db.getKV<Partial<Settings>>(KV.settings, {})) })
    setDcf({ ...DEFAULT_DCF, ...(await db.getKV<Partial<DcfAssumptions>>(KV.dcf, {})) })
    setPricing({ ...DEFAULT_PRICING, ...(await db.getKV<Partial<PricingAssumptions>>(KV.pricing, {})) })
    setProjects(await db.getKV<CapitalProject[]>(KV.projects, []))
    setReady(true)
  }, [])

  useEffect(() => {
    // Loading from IndexedDB is the "subscribe to an external system" case the
    // rule is written around; it just happens to be async, so the setState lands
    // in the promise rather than a callback.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void reload()
  }, [reload])

  const saveSettings = useCallback(
    async (patch: Partial<Settings>) => {
      setSettings((prev) => {
        const next = { ...prev, ...patch }
        void db.setKV(KV.settings, next)
        return next
      })
    },
    [],
  )

  const saveDcf = useCallback(async (patch: Partial<DcfAssumptions>) => {
    setDcf((prev) => {
      const next = { ...prev, ...patch }
      void db.setKV(KV.dcf, next)
      return next
    })
  }, [])

  const savePricing = useCallback(async (patch: Partial<PricingAssumptions>) => {
    setPricing((prev) => {
      const next = { ...prev, ...patch }
      void db.setKV(KV.pricing, next)
      return next
    })
  }, [])

  const saveProjects = useCallback(async (next: CapitalProject[]) => {
    setProjects(next)
    await db.setKV(KV.projects, next)
  }, [])

  const removeImport = useCallback(
    async (importId: string) => {
      await db.deleteImport(importId)
      await reload()
    },
    [reload],
  )

  const freshness = useMemo(() => {
    const out: Partial<Record<DatasetKey, string>> = {}
    for (const batch of data.imports) {
      const current = out[batch.dataset]
      if (!current || batch.importedAt > current) out[batch.dataset] = batch.importedAt
    }
    return out
  }, [data.imports])

  const value = useMemo<Ctx>(
    () => ({
      ...data,
      ready,
      settings,
      dcf,
      pricing,
      projects,
      reload,
      saveSettings,
      saveDcf,
      savePricing,
      saveProjects,
      removeImport,
      freshness,
    }),
    [data, ready, settings, dcf, pricing, projects, reload, saveSettings, saveDcf, savePricing, saveProjects, removeImport, freshness],
  )

  return <LedgerContext.Provider value={value}>{children}</LedgerContext.Provider>
}

export function useLedger(): Ctx {
  const ctx = useContext(LedgerContext)
  if (!ctx) throw new Error('useLedger must be used inside <LedgerProvider>')
  return ctx
}
