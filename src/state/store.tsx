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
import { SEED } from '@/seed'
import { KV } from '@/lib/db'
import { DEFAULT_COST_MODEL, DEFAULT_DCF, DEFAULT_PRICING, DEFAULT_SETTINGS } from '@/state/defaults'
import type {
  BenchmarkPoint,
  Booking,
  CapitalProject,
  CapitalSpend,
  CostModel,
  DatasetKey,
  DcfAssumptions,
  Expense,
  Finding,
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
  findings: Finding[]
  capitalSpend: CapitalSpend[]
}

type Ctx = LedgerData & {
  ready: boolean
  settings: Settings
  dcf: DcfAssumptions
  pricing: PricingAssumptions
  projects: CapitalProject[]
  costModel: CostModel
  reload: () => Promise<void>
  saveSettings: (patch: Partial<Settings>) => Promise<void>
  saveDcf: (patch: Partial<DcfAssumptions>) => Promise<void>
  savePricing: (patch: Partial<PricingAssumptions>) => Promise<void>
  saveProjects: (next: CapitalProject[]) => Promise<void>
  removeImport: (importId: string) => Promise<void>
  saveFinding: (finding: Finding) => Promise<void>
  removeFinding: (id: string) => Promise<void>
  saveCostModel: (patch: Partial<CostModel>) => Promise<void>
  addCapitalSpend: (spend: CapitalSpend) => Promise<void>
  removeCapitalSpend: (id: string) => Promise<void>
  /** append hand-entered rows to a dataset and refresh */
  addRecords: <K extends 'expenses' | 'bookings'>(store: K, rows: LedgerData[K]) => Promise<void>
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
  findings: [],
  capitalSpend: [],
}

export function LedgerProvider({ children }: { children: ReactNode }) {
  const [data, setData] = useState<LedgerData>(EMPTY)
  const [settings, setSettings] = useState<Settings>(DEFAULT_SETTINGS)
  const [dcf, setDcf] = useState<DcfAssumptions>(DEFAULT_DCF)
  const [pricing, setPricing] = useState<PricingAssumptions>(DEFAULT_PRICING)
  const [projects, setProjects] = useState<CapitalProject[]>([])
  const [costModel, setCostModel] = useState<CostModel>(DEFAULT_COST_MODEL)
  const [ready, setReady] = useState(false)

  const reload = useCallback(async () => {
    // A build can carry a pre-loaded dataset. Load it once, and only into a
    // database that has never held anything — never over the top of real work.
    if (SEED) {
      const seeded = await db.getKV<boolean>('seedLoaded', false)
      if (!seeded) {
        const existing = await db.getAll('imports')
        if (existing.length === 0) await db.importBackup(SEED)
        await db.setKV('seedLoaded', true)
      }
    }

    const [holdings, snapshots, transactions, benchmark, bookings, expenses, imports, findings, capitalSpend] =
      await Promise.all([
        db.getAll('holdings'),
        db.getAll('snapshots'),
        db.getAll('transactions'),
        db.getAll('benchmark'),
        db.getAll('bookings'),
        db.getAll('expenses'),
        db.getAll('imports'),
        db.getAll('findings'),
        db.getAll('capitalSpend'),
      ])
    setData({ holdings, snapshots, transactions, benchmark, bookings, expenses, imports, findings, capitalSpend })

    // Merge stored values over defaults so a schema addition doesn't strand
    // an existing database on a missing key.
    setSettings({ ...DEFAULT_SETTINGS, ...(await db.getKV<Partial<Settings>>(KV.settings, {})) })
    setDcf({ ...DEFAULT_DCF, ...(await db.getKV<Partial<DcfAssumptions>>(KV.dcf, {})) })
    setPricing({ ...DEFAULT_PRICING, ...(await db.getKV<Partial<PricingAssumptions>>(KV.pricing, {})) })
    setProjects(await db.getKV<CapitalProject[]>(KV.projects, []))
    setCostModel({ ...DEFAULT_COST_MODEL, ...(await db.getKV<Partial<CostModel>>(KV.costModel, {})) })
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

  const saveFinding = useCallback(async (finding: Finding) => {
    await db.putOne('findings', finding)
    setData((prev) => ({
      ...prev,
      findings: prev.findings.some((f) => f.id === finding.id)
        ? prev.findings.map((f) => (f.id === finding.id ? finding : f))
        : [...prev.findings, finding],
    }))
  }, [])

  const removeFinding = useCallback(async (id: string) => {
    await db.deleteOne('findings', id)
    setData((prev) => ({ ...prev, findings: prev.findings.filter((f) => f.id !== id) }))
  }, [])

  const saveCostModel = useCallback(async (patch: Partial<CostModel>) => {
    setCostModel((prev) => {
      const next = { ...prev, ...patch }
      void db.setKV(KV.costModel, next)
      return next
    })
  }, [])

  const addCapitalSpend = useCallback(async (spend: CapitalSpend) => {
    await db.putOne('capitalSpend', spend)
    setData((prev) => ({
      ...prev,
      capitalSpend: prev.capitalSpend.some((row) => row.id === spend.id)
        ? prev.capitalSpend.map((row) => (row.id === spend.id ? spend : row))
        : [...prev.capitalSpend, spend],
    }))
  }, [])

  const removeCapitalSpend = useCallback(async (id: string) => {
    await db.deleteOne('capitalSpend', id)
    setData((prev) => ({ ...prev, capitalSpend: prev.capitalSpend.filter((row) => row.id !== id) }))
  }, [])

  const addRecords = useCallback(
    async <K extends 'expenses' | 'bookings'>(store: K, rows: LedgerData[K]) => {
      if (rows.length === 0) return
      await db.putMany(store, rows as never[])
      setData((prev) => ({ ...prev, [store]: [...prev[store], ...rows] }) as LedgerData)
    },
    [],
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
      costModel,
      reload,
      saveSettings,
      saveDcf,
      savePricing,
      saveProjects,
      removeImport,
      saveFinding,
      removeFinding,
      saveCostModel,
      addCapitalSpend,
      removeCapitalSpend,
      addRecords,
      freshness,
    }),
    [data, ready, settings, dcf, pricing, projects, costModel, reload, saveSettings, saveDcf, savePricing, saveProjects, removeImport, saveFinding, removeFinding, saveCostModel, addCapitalSpend, removeCapitalSpend, addRecords, freshness],
  )

  return <LedgerContext.Provider value={value}>{children}</LedgerContext.Provider>
}

export function useLedger(): Ctx {
  const ctx = useContext(LedgerContext)
  if (!ctx) throw new Error('useLedger must be used inside <LedgerProvider>')
  return ctx
}
