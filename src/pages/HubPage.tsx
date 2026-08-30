import { useEffect, useMemo, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { useLedger } from '@/state/store'
import { buildPositions, latestSnapshot, totalValue } from '@/domain/investments/portfolio'
import { buildPerformance } from '@/domain/investments/performance'
import { aggregate, monthlyMetrics, trailing } from '@/domain/airbnb/metrics'
import { runDcf } from '@/domain/airbnb/dcf'
import { HubCanvas } from '@/components/hub/HubCanvas'
import { cx } from '@/components/ui/primitives'
import { money, pct, relativeTime, shortDate, signedPct } from '@/lib/format'

type Satellite = {
  id: string
  eyebrow: string
  title: string
  to: string
  /** accent colour for the card's border and eyebrow */
  hue: string
  /** the two or three figures the card exists to show */
  lines: { label: string; value: string; tone?: 'pos' | 'neg' | 'warn' }[]
  /** ring position, as a percentage of the stage */
  x: number
  y: number
  empty?: boolean
}

/**
 * The hub.
 *
 * One screen that answers "where do I stand" before you have clicked anything:
 * a node per part of the operation, each carrying the two or three numbers that
 * decide whether it needs you today. Everything here is read from imported
 * data — a node with nothing behind it says so rather than showing a zero.
 */
export function HubPage() {
  const ledger = useLedger()
  const { holdings, snapshots, transactions, bookings, expenses, settings, dcf, findings, imports, ready } = ledger

  const [now, setNow] = useState(() => new Date())
  useEffect(() => {
    const timer = window.setInterval(() => setNow(new Date()), 1000)
    return () => window.clearInterval(timer)
  }, [])

  const snapshot = useMemo(() => latestSnapshot(snapshots), [snapshots])
  const positions = useMemo(() => buildPositions(holdings, snapshot), [holdings, snapshot])
  const liquid = totalValue(positions)

  const performance = useMemo(
    () => (snapshots.length >= 2 ? buildPerformance(holdings, snapshots, transactions, settings.usdPhp) : null),
    [holdings, snapshots, transactions, settings.usdPhp],
  )

  const airbnbSeries = useMemo(
    () =>
      monthlyMetrics({
        bookings,
        expenses,
        usdPhp: settings.usdPhp,
        availableNightsPerYear: dcf.availableNightsPerYear,
      }),
    [bookings, expenses, settings.usdPhp, dcf.availableNightsPerYear],
  )
  const t12 = useMemo(() => (airbnbSeries.length > 0 ? aggregate(trailing(airbnbSeries, 12)) : null), [airbnbSeries])

  const hasAirbnb = bookings.length > 0 && expenses.length > 0
  const dcfResult = useMemo(() => runDcf(dcf), [dcf])
  const propertyValue = hasAirbnb && Number.isFinite(dcfResult.equityValue) ? dcfResult.equityValue : 0
  const netWorth = liquid + propertyValue + settings.cashOnHand

  const openFindings = findings.filter((f) => f.status === 'open' || f.status === 'doing')
  const criticalFindings = openFindings.filter((f) => f.severity === 'critical').length

  const byGeography = useMemo(() => {
    const buckets = new Map<string, number>()
    for (const position of positions) {
      const key = position.geography || 'Unspecified'
      buckets.set(key, (buckets.get(key) ?? 0) + position.value)
    }
    return buckets
  }, [positions])

  const byClass = useMemo(() => {
    const buckets = new Map<string, number>()
    for (const position of positions) buckets.set(position.assetClass, (buckets.get(position.assetClass) ?? 0) + position.value)
    return buckets
  }, [positions])

  const lastImport = useMemo(
    () => [...imports].sort((a, b) => (a.importedAt < b.importedAt ? 1 : -1))[0] ?? null,
    [imports],
  )

  const satellites: Satellite[] = useMemo(() => {
    const geo = (key: string) => byGeography.get(key) ?? 0
    const cls = (key: string) => byClass.get(key) ?? 0
    const withValue = (value: number, of: number) => (of > 0 ? pct(value / of) : '—')
    return [
      {
        id: 'ph',
        eyebrow: 'PH EQUITIES',
        title: 'PH PORTFOLIO',
        to: '/investments',
        hue: '#34d399',
        x: 38,
        y: 11,
        empty: holdings.length === 0,
        lines: [
          { label: 'Value', value: money(geo('PH'), 'PHP', true) },
          { label: 'Of portfolio', value: withValue(geo('PH'), liquid) },
        ],
      },
      {
        id: 'us',
        eyebrow: 'US & GLOBAL',
        title: 'OFFSHORE',
        to: '/investments',
        hue: '#3987e5',
        x: 62,
        y: 11,
        empty: holdings.length === 0,
        lines: [
          { label: 'Value', value: money(geo('US') + geo('Global'), 'PHP', true) },
          { label: 'Of portfolio', value: withValue(geo('US') + geo('Global'), liquid) },
        ],
      },
      {
        id: 'cash',
        eyebrow: 'CASH & DEPOSITS',
        title: 'DRY POWDER',
        to: '/investments',
        hue: '#fbbf24',
        x: 17,
        y: 31,
        empty: holdings.length === 0,
        lines: [
          { label: 'Idle', value: money(cls('Cash'), 'PHP', true), tone: cls('Cash') / Math.max(liquid, 1) > 0.25 ? 'warn' : undefined },
          { label: 'Of portfolio', value: withValue(cls('Cash'), liquid), tone: cls('Cash') / Math.max(liquid, 1) > 0.25 ? 'warn' : undefined },
        ],
      },
      {
        id: 'bonds',
        eyebrow: 'FIXED INCOME',
        title: 'BOND BOOK',
        to: '/investments',
        hue: '#9085e9',
        x: 83,
        y: 31,
        empty: holdings.length === 0,
        lines: [
          { label: 'Value', value: money(cls('Fixed Income'), 'PHP', true) },
          { label: 'Of portfolio', value: withValue(cls('Fixed Income'), liquid) },
        ],
      },
      {
        id: 'performance',
        eyebrow: performance ? `${snapshots.length} SNAPSHOTS` : 'NEEDS A SECOND SNAPSHOT',
        title: 'PERFORMANCE',
        to: '/investments',
        hue: '#2dd4bf',
        x: 13,
        y: 55,
        empty: !performance,
        lines: performance
          ? [
              {
                label: performance.contributionsKnown ? 'Since inception' : 'Value change',
                value: signedPct(performance.sinceInception),
                tone: performance.contributionsKnown ? (performance.sinceInception >= 0 ? 'pos' : 'neg') : 'warn',
              },
              {
                label: performance.contributionsKnown ? 'Basis' : 'Caveat',
                value: performance.contributionsKnown ? 'net of flows' : 'incl. deposits',
                tone: performance.contributionsKnown ? undefined : 'warn',
              },
            ]
          : [{ label: 'Snapshots', value: String(snapshots.length) }],
      },
      {
        id: 'island',
        eyebrow: 'CULION · PALAWAN',
        title: 'ISLAND T',
        to: '/airbnb',
        hue: '#f472b6',
        x: 87,
        y: 55,
        empty: bookings.length === 0,
        lines: t12
          ? [
              { label: 'Revenue T12M', value: money(t12.totalRevenue, 'PHP', true) },
              { label: 'Occupancy', value: pct(t12.occupancy, 0), tone: t12.occupancy < 0.35 ? 'warn' : 'pos' },
              { label: 'Margin', value: expenses.length > 0 ? pct(t12.netMargin, 0) : '—' },
            ]
          : [{ label: 'Bookings', value: '0' }],
      },
      {
        id: 'valuation',
        eyebrow: 'DCF · EQUITY VALUE',
        title: 'VALUATION',
        to: '/airbnb',
        hue: '#d95926',
        x: 25,
        y: 78,
        empty: !hasAirbnb,
        lines: hasAirbnb
          ? [
              { label: 'Equity value', value: money(dcfResult.equityValue, 'PHP', true) },
              {
                label: 'From terminal',
                value: pct(dcfResult.terminalShare, 0),
                tone: dcfResult.terminalShare > 0.7 ? 'warn' : undefined,
              },
            ]
          : [{ label: 'Needs', value: 'bookings + costs' }],
      },
      {
        id: 'analysis',
        eyebrow: criticalFindings > 0 ? `${criticalFindings} TO ACT ON` : 'FINDINGS',
        title: 'ANALYSIS',
        to: '/analysis',
        hue: criticalFindings > 0 ? '#f87171' : '#60a5fa',
        x: 75,
        y: 78,
        empty: findings.length === 0,
        lines: [
          { label: 'Open', value: String(openFindings.length), tone: criticalFindings > 0 ? 'neg' : undefined },
          { label: 'Closed', value: String(findings.filter((f) => f.status === 'done').length), tone: 'pos' },
        ],
      },
      {
        id: 'data',
        eyebrow: 'IMPORTS',
        title: 'DATA',
        to: '/data',
        hue: '#5f6874',
        x: 50,
        y: 90,
        empty: imports.length === 0,
        lines: [
          { label: 'Batches', value: String(imports.length) },
          { label: 'Last', value: lastImport ? relativeTime(lastImport.importedAt) : '—' },
        ],
      },
    ]
  }, [
    holdings.length, liquid, byGeography, byClass, performance, snapshots.length, bookings.length,
    expenses.length, t12, hasAirbnb, dcfResult, findings, openFindings.length, criticalFindings,
    imports, lastImport,
  ])

  if (!ready) {
    return <p className="py-24 text-center text-[13px] text-ink-3">Waking up…</p>
  }

  const nothingImported = holdings.length === 0 && bookings.length === 0 && expenses.length === 0

  return (
    <div className="space-y-4">
      <HubHeader
        now={now}
        netWorth={netWorth}
        nothingImported={nothingImported}
        criticalFindings={criticalFindings}
      />
      <Stage satellites={satellites} nothingImported={nothingImported} netWorth={netWorth} snapshot={snapshot?.asOf} />
    </div>
  )
}

function HubHeader({
  now,
  netWorth,
  nothingImported,
  criticalFindings,
}: {
  now: Date
  netWorth: number
  nothingImported: boolean
  criticalFindings: number
}) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-3">
      <div>
        <h1 className="text-[13px] font-semibold uppercase tracking-[0.32em] text-ink">Hub</h1>
        <p className="mt-1 text-[12px] text-ink-2">
          {nothingImported ? 'Nothing imported yet' : `Everything, at ${money(netWorth, 'PHP', true)}`}
          {criticalFindings > 0 ? (
            <span className="text-neg"> · {criticalFindings} needing action</span>
          ) : null}
        </p>
      </div>
      <div className="flex items-center gap-2 text-[10.5px] uppercase tracking-widest text-ink-3">
        <span className="flex h-1.5 w-1.5 rounded-full bg-pos shadow-[0_0_8px_currentColor]" />
        <span className="num">
          Updated {now.toLocaleTimeString('en-US', { hour12: false })}
        </span>
      </div>
    </div>
  )
}

function Stage({
  satellites,
  nothingImported,
  netWorth,
  snapshot,
}: {
  satellites: Satellite[]
  nothingImported: boolean
  netWorth: number
  snapshot?: string
}) {
  const stageRef = useRef<HTMLDivElement>(null)
  const [lines, setLines] = useState<{ id: string; x1: number; y1: number; x2: number; y2: number }[]>([])
  const [size, setSize] = useState({ width: 0, height: 0 })

  // Connectors are drawn from measured card edges rather than assumed
  // positions, so they stay attached when the layout reflows.
  useEffect(() => {
    const stage = stageRef.current
    if (!stage) return

    const measure = () => {
      const rect = stage.getBoundingClientRect()
      setSize({ width: rect.width, height: rect.height })
      const cx = rect.width / 2
      const cy = rect.height / 2
      const next: { id: string; x1: number; y1: number; x2: number; y2: number }[] = []
      for (const satellite of satellites) {
        const node = stage.querySelector<HTMLElement>(`[data-node="${satellite.id}"]`)
        if (!node) continue
        const box = node.getBoundingClientRect()
        const nx = box.left - rect.left + box.width / 2
        const ny = box.top - rect.top + box.height / 2
        const angle = Math.atan2(ny - cy, nx - cx)
        // Start outside the brain, end at the card's edge rather than its centre.
        // Push the start further out for nodes below the hub, so their line
        // begins under the wordmark instead of running through it.
        const downward = Math.max(0, Math.sin(angle))
        const inner = Math.min(rect.width, rect.height) * (0.19 + 0.11 * downward)
        const edge = Math.min(box.width, box.height) / 2 + 6
        next.push({
          id: satellite.id,
          x1: cx + Math.cos(angle) * inner,
          y1: cy + Math.sin(angle) * inner,
          x2: nx - Math.cos(angle) * edge,
          y2: ny - Math.sin(angle) * edge,
        })
      }
      setLines(next)
    }

    measure()
    const observer = new ResizeObserver(measure)
    observer.observe(stage)
    return () => observer.disconnect()
  }, [satellites])

  return (
    <>
      {/* Phone: a plain list. A radial diagram on a 390px screen is decoration. */}
      <div className="grid gap-2.5 sm:hidden">
        {satellites.map((satellite) => (
          <NodeCard key={satellite.id} satellite={satellite} compact />
        ))}
      </div>

      <div
        ref={stageRef}
        className="relative hidden overflow-hidden rounded-2xl border border-line bg-[radial-gradient(ellipse_at_center,rgba(45,212,191,0.07),transparent_62%)] sm:block"
        style={{ height: 'clamp(560px, 74vh, 760px)' }}
      >
        <svg
          className="pointer-events-none absolute inset-0"
          width={size.width}
          height={size.height}
          aria-hidden="true"
        >
          {lines.map((line) => (
            <line
              key={line.id}
              x1={line.x1}
              y1={line.y1}
              x2={line.x2}
              y2={line.y2}
              stroke="rgba(45,212,191,0.28)"
              strokeWidth={1}
              strokeDasharray="3 6"
            />
          ))}
        </svg>

        <div className="pointer-events-none absolute left-1/2 top-1/2 h-[54%] w-[34%] -translate-x-1/2 -translate-y-[78%]">
          <HubCanvas className="h-full w-full" />
        </div>

        <div className="pointer-events-none absolute left-1/2 top-1/2 w-full -translate-x-1/2 translate-y-[26%] text-center">
          <div className="text-[26px] font-semibold tracking-[0.34em] text-accent drop-shadow-[0_0_18px_rgba(45,212,191,0.55)]">
            BUDDY
          </div>
          <div className="mt-1.5 text-[10px] uppercase tracking-[0.28em] text-ink-3">
            Portfolio · Property · Decisions
          </div>
          <div className="num mt-3 text-[13px] text-ink-2">
            {nothingImported ? 'Import a sheet to begin' : money(netWorth, 'PHP', true)}
            {snapshot ? <span className="text-ink-3"> · valued {shortDate(snapshot)}</span> : null}
          </div>
        </div>

        {satellites.map((satellite) => (
          <div
            key={satellite.id}
            data-node={satellite.id}
            className="absolute w-[178px] -translate-x-1/2 -translate-y-1/2"
            style={{ left: `${satellite.x}%`, top: `${satellite.y}%` }}
          >
            <NodeCard satellite={satellite} />
          </div>
        ))}
      </div>
    </>
  )
}

function NodeCard({ satellite, compact }: { satellite: Satellite; compact?: boolean }) {
  return (
    <Link
      to={satellite.to}
      className={cx(
        'group block rounded-lg border bg-surface/90 backdrop-blur-sm transition-all',
        'hover:-translate-y-0.5 hover:bg-surface-2',
        compact ? 'p-3' : 'p-2.5',
        satellite.empty && 'opacity-55',
      )}
      style={{
        borderColor: `${satellite.hue}55`,
        boxShadow: satellite.empty ? undefined : `0 0 0 1px ${satellite.hue}12, 0 6px 22px -12px ${satellite.hue}90`,
      }}
    >
      <div className="truncate text-[9px] font-semibold uppercase tracking-[0.14em]" style={{ color: satellite.hue }}>
        {satellite.eyebrow}
      </div>
      <div className="mt-0.5 truncate text-[13px] font-semibold tracking-tight text-ink">{satellite.title}</div>
      <div className="mt-2 space-y-1">
        {satellite.lines.map((line) => (
          <div key={line.label} className="flex items-baseline justify-between gap-2">
            <span className="truncate text-[10.5px] text-ink-3">{line.label}</span>
            <span
              className={cx(
                'num shrink-0 text-[12px] font-medium',
                line.tone === 'pos' ? 'text-pos' : line.tone === 'neg' ? 'text-neg' : line.tone === 'warn' ? 'text-warn' : 'text-ink',
              )}
            >
              {line.value}
            </span>
          </div>
        ))}
      </div>
    </Link>
  )
}
