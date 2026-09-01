import { useEffect, useMemo, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { useLedger } from '@/state/store'
import { buildPositions, latestSnapshot, totalValue } from '@/domain/investments/portfolio'
import {
  businessCash,
  cashShare,
  equityShare,
  ownerOfHolding,
  personalHoldings,
  splitByOwner,
} from '@/domain/investments/ownership'
import { aggregate, monthlyMetrics, trailing } from '@/domain/airbnb/metrics'
import { runDcf } from '@/domain/airbnb/dcf'
import { HubCanvas } from '@/components/hub/HubCanvas'
import { cx } from '@/components/ui/primitives'
import { money, pct, shortDate } from '@/lib/format'
import type { Finding } from '@/types'

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
  const { holdings, snapshots, bookings, expenses, capitalSpend, settings, dcf, findings, saveFinding, ready } = ledger

  const [now, setNow] = useState(() => new Date())
  useEffect(() => {
    const timer = window.setInterval(() => setNow(new Date()), 1000)
    return () => window.clearInterval(timer)
  }, [])

  const snapshot = useMemo(() => latestSnapshot(snapshots), [snapshots])
  // Business float out of the personal book — see HomePage for why.
  const personal = useMemo(() => personalHoldings(holdings), [holdings])
  const positions = useMemo(() => buildPositions(personal, snapshot), [personal, snapshot])
  const liquid = totalValue(positions)
  const businessFloat = useMemo(
    () => businessCash(snapshot ? holdings.filter((h) => h.snapshotId === snapshot.id) : [], snapshot?.usdPhp ?? settings.usdPhp),
    [holdings, snapshot, settings.usdPhp],
  )


  const airbnbSeries = useMemo(
    () =>
      monthlyMetrics({
        bookings,
        expenses,
        capitalSpend,
        usdPhp: settings.usdPhp,
        availableNightsPerYear: dcf.availableNightsPerYear,
      }),
    [bookings, expenses, capitalSpend, settings.usdPhp, dcf.availableNightsPerYear],
  )
  const t12 = useMemo(() => (airbnbSeries.length > 0 ? aggregate(trailing(airbnbSeries, 12)) : null), [airbnbSeries])

  const hasAirbnb = bookings.length > 0 && expenses.length > 0
  const dcfResult = useMemo(() => runDcf(dcf, businessFloat), [dcf, businessFloat])
  const propertyValue = hasAirbnb && Number.isFinite(dcfResult.equityValue) ? dcfResult.equityValue : 0
  const netWorth = liquid + propertyValue + settings.cashOnHand

  // The rows behind the latest snapshot, split by whose money it is.
  const snapshotHoldings = useMemo(
    () => (snapshot ? holdings.filter((holding) => holding.snapshotId === snapshot.id) : []),
    [holdings, snapshot],
  )
  const splits = useMemo(
    () => splitByOwner(snapshotHoldings, snapshot?.usdPhp ?? settings.usdPhp),
    [snapshotHoldings, snapshot, settings.usdPhp],
  )
  const daniSplit = splits.find((split) => split.owner === 'dani') ?? null
  const jointSplit = splits.find((split) => split.owner === 'joint') ?? null
  const daniCash = useMemo(
    () => cashShare(snapshotHoldings.filter((h) => ownerOfHolding(h) === 'dani'), snapshot?.usdPhp ?? settings.usdPhp),
    [snapshotHoldings, snapshot, settings.usdPhp],
  )
  const jointEquity = useMemo(
    () => equityShare(snapshotHoldings.filter((h) => ownerOfHolding(h) === 'joint'), snapshot?.usdPhp ?? settings.usdPhp),
    [snapshotHoldings, snapshot, settings.usdPhp],
  )

  const openFindings = findings.filter((f) => f.status === 'open' || f.status === 'doing')
  const criticalFindings = openFindings.filter((f) => f.severity === 'critical').length

  /**
   * Three hubs, because there are three things she actually owns and decides
   * about: the island, her own money, and the money she and Nicolo hold
   * together. Everything else — allocation, valuation, performance — is a view
   * inside one of those, not a peer of them.
   */
  const satellites: Satellite[] = useMemo(() => {
    const share = (value: number, of: number) => (of > 0 ? pct(value / of) : '—')
    return [
      {
        id: 'island',
        eyebrow: 'CULION · PALAWAN',
        title: 'ISLAND T',
        to: '/airbnb',
        hue: '#f472b6',
        x: 50,
        y: 13,
        empty: bookings.length === 0,
        lines: t12
          ? [
              { label: 'Room revenue T12M', value: money(t12.revenue, 'PHP', true) },
              { label: 'Occupancy', value: pct(t12.occupancy, 0), tone: t12.occupancy < 0.35 ? 'warn' : 'pos' },
              {
                label: 'Worth',
                value: hasAirbnb ? money(dcfResult.equityValue, 'PHP', true) : '—',
              },
            ]
          : [{ label: 'Bookings', value: '0' }],
      },
      {
        id: 'dani',
        eyebrow: `${daniSplit?.holdings ?? 0} HOLDINGS`,
        title: 'DANI INVESTMENTS',
        to: '/investments?owner=dani',
        hue: '#34d399',
        x: 17,
        y: 66,
        empty: !daniSplit,
        lines: daniSplit
          ? [
              { label: 'Value', value: money(daniSplit.value, 'PHP', true) },
              { label: 'Of the book', value: share(daniSplit.value, liquid) },
              {
                label: 'In cash',
                value: pct(daniCash.share, 0),
                tone: daniCash.share > 0.3 ? 'warn' : undefined,
              },
            ]
          : [{ label: 'Holdings', value: '0' }],
      },
      {
        id: 'joint',
        eyebrow: 'WEDDING GIFTS',
        title: 'DANI & NICOLO',
        to: '/investments?owner=joint',
        hue: '#9085e9',
        x: 83,
        y: 66,
        empty: !jointSplit,
        lines: jointSplit
          ? [
              { label: 'Value', value: money(jointSplit.value, 'PHP', true) },
              { label: 'Of the book', value: share(jointSplit.value, liquid) },
              // Cash share was the right question while ₱3.39M sat in a savings
              // account. It is not any more: the money went into a 140-day
              // deposit, so "1% in cash" would read as fully invested when
              // nearly three quarters of the pot is parked until January. How
              // much is actually in the market is the honest measure, and it is
              // just as precisely defined.
              {
                label: 'In the market',
                value: pct(jointEquity.share, 0),
                tone: jointEquity.share < 0.4 ? 'warn' : undefined,
              },
            ]
          : [{ label: 'Holdings', value: '0' }],
      },
    ]
  }, [bookings.length, t12, hasAirbnb, dcfResult, daniSplit, jointSplit, daniCash, jointEquity, liquid])

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
      <ActOnAnalysis findings={openFindings} onAdvance={saveFinding} />
    </div>
  )
}

/**
 * The findings, as things to do rather than things to read.
 *
 * The hub is where she lands, so the open judgements belong here — but only the
 * ones with a next step attached, and each with the button that moves it on.
 * A finding nobody can act on from the page it appears on is a note, not a
 * finding.
 */
function ActOnAnalysis({
  findings,
  onAdvance,
}: {
  findings: Finding[]
  onAdvance: (finding: Finding) => Promise<void>
}) {
  const ranked = [...findings]
    .filter((finding) => finding.action)
    .sort((a, b) => b.priority - a.priority || SEVERITY_RANK[a.severity] - SEVERITY_RANK[b.severity])
    .slice(0, 5)

  if (ranked.length === 0) return null

  return (
    <div className="rounded-xl border border-line bg-surface p-4 sm:p-5">
      <div className="mb-3 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="text-[13px] font-semibold uppercase tracking-[0.28em] text-ink">Act on this</h2>
          <p className="mt-1 text-[12px] text-ink-2">
            The open findings that carry a next step, most pressing first. Marking one done keeps the list honest.
          </p>
        </div>
        <Link to="/analysis" className="text-[12px] text-accent hover:underline">
          All findings →
        </Link>
      </div>

      <div className="space-y-2">
        {ranked.map((finding) => (
          <div
            key={finding.id}
            className={cx(
              'rounded-lg border p-3',
              finding.severity === 'critical' ? 'border-neg/30 bg-neg/[0.04]' : 'border-line bg-surface-2',
            )}
          >
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <span
                    className={cx(
                      'rounded border px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wide',
                      finding.severity === 'critical'
                        ? 'border-neg/30 bg-neg/10 text-neg'
                        : finding.severity === 'warning'
                          ? 'border-warn/30 bg-warn/10 text-warn'
                          : 'border-line bg-surface-3 text-ink-2',
                    )}
                  >
                    {finding.theme}
                  </span>
                  <h3 className="text-[13px] font-semibold text-ink">{finding.title}</h3>
                </div>
                <p className="mt-1 max-w-3xl text-[12px] leading-relaxed text-ink-2">{finding.action}</p>
              </div>
              <div className="flex shrink-0 gap-1.5">
                {finding.status === 'open' ? (
                  <button
                    type="button"
                    onClick={() => void onAdvance({ ...finding, status: 'doing' })}
                    className="rounded-lg border border-line bg-surface-3 px-2.5 py-1 text-[12px] text-ink hover:bg-surface-2"
                  >
                    Start
                  </button>
                ) : (
                  <span className="rounded-lg border border-accent/30 bg-accent/10 px-2.5 py-1 text-[12px] text-accent">
                    In progress
                  </span>
                )}
                <button
                  type="button"
                  onClick={() => void onAdvance({ ...finding, status: 'done' })}
                  className="rounded-lg border border-pos/30 bg-pos/10 px-2.5 py-1 text-[12px] text-pos hover:bg-pos/20"
                >
                  Done
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

const SEVERITY_RANK: Record<Finding['severity'], number> = {
  critical: 0,
  warning: 1,
  info: 2,
  positive: 3,
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
        style={{ height: 'clamp(420px, 52vh, 560px)' }}
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

        <div className="pointer-events-none absolute left-1/2 top-1/2 h-[58%] w-[36%] -translate-x-1/2 -translate-y-[72%]">
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
