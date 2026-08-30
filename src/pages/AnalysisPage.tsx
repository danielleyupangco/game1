import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { useLedger } from '@/state/store'
import { Card, Pill, SectionHeader, Tabs, cx } from '@/components/ui/primitives'
import { EmptyState } from '@/components/ui/EmptyState'
import { relativeTime } from '@/lib/format'
import type { Finding, FindingSeverity, FindingStatus } from '@/types'

const SEVERITY_TONE: Record<FindingSeverity, 'neg' | 'warn' | 'info' | 'pos'> = {
  critical: 'neg',
  warning: 'warn',
  info: 'info',
  positive: 'pos',
}

const SEVERITY_LABEL: Record<FindingSeverity, string> = {
  critical: 'Act now',
  warning: 'Look into',
  info: 'Context',
  positive: 'Working',
}

const STATUS_ORDER: FindingStatus[] = ['open', 'doing', 'done', 'dismissed']

const STATUS_LABEL: Record<FindingStatus, string> = {
  open: 'Open',
  doing: 'In progress',
  done: 'Done',
  dismissed: 'Dismissed',
}

/**
 * The written analysis, kept as data rather than prose in a chat window.
 *
 * Each finding carries the numbers it rests on, so it can be argued with; each
 * has one next step, so it can be worked through; and each can be closed off,
 * so the dashboard reflects what is actually outstanding rather than a snapshot
 * of somebody's opinion on one particular day.
 */
export function AnalysisPage() {
  const { findings, saveFinding, holdings } = useLedger()
  const [filter, setFilter] = useState<'live' | 'all'>('live')

  const visible = useMemo(() => {
    const list = filter === 'live' ? findings.filter((f) => f.status === 'open' || f.status === 'doing') : findings
    return [...list].sort((a, b) => {
      const statusGap = STATUS_ORDER.indexOf(a.status) - STATUS_ORDER.indexOf(b.status)
      return statusGap !== 0 ? statusGap : b.priority - a.priority
    })
  }, [findings, filter])

  const themes = useMemo(() => [...new Set(visible.map((f) => f.theme))], [visible])

  const counts = useMemo(
    () => ({
      open: findings.filter((f) => f.status === 'open').length,
      doing: findings.filter((f) => f.status === 'doing').length,
      done: findings.filter((f) => f.status === 'done').length,
      critical: findings.filter((f) => f.status === 'open' && f.severity === 'critical').length,
    }),
    [findings],
  )

  if (findings.length === 0) {
    return (
      <div className="space-y-4">
        <SectionHeader title="Analysis" />
        <EmptyState
          title="No findings yet"
          body="This page holds written analysis of the portfolio and the property — each finding with the numbers behind it and one next step. Findings arrive with a backup file, or you can restore one under Data."
          dataset="holdings"
        />
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <SectionHeader
        title="Analysis"
        subtitle="Written findings, each carrying its own evidence and one next step. Distinct from the Home alerts, which are rules that recompute on every visit — these are judgements you can work through and close off."
        right={
          <div className="flex items-center gap-1.5">
            {counts.critical > 0 ? <Pill tone="neg">{counts.critical} to act on</Pill> : null}
            <Pill tone={counts.open > 0 ? 'warn' : 'pos'}>{counts.open} open</Pill>
            {counts.done > 0 ? <Pill tone="pos">{counts.done} done</Pill> : null}
          </div>
        }
      />

      <div className="no-print flex flex-wrap items-center justify-between gap-2">
        <Tabs
          value={filter}
          onChange={setFilter}
          options={[
            { value: 'live', label: `Outstanding (${counts.open + counts.doing})` },
            { value: 'all', label: `Everything (${findings.length})` },
          ]}
        />
      </div>

      {themes.map((theme) => (
        <section key={theme}>
          <h2 className="mb-2 text-[11px] font-semibold uppercase tracking-widest text-ink-3">{theme}</h2>
          <div className="space-y-2.5">
            {visible
              .filter((finding) => finding.theme === theme)
              .map((finding) => (
                <FindingCard
                  key={finding.id}
                  finding={finding}
                  holdingNames={holdings.map((h) => h.ticker)}
                  onStatus={(status) => void saveFinding({ ...finding, status })}
                />
              ))}
          </div>
        </section>
      ))}

      {visible.length === 0 ? (
        <Card>
          <p className="py-6 text-center text-[13px] text-ink-2">
            Nothing outstanding. Switch to “Everything” to see what's been closed off.
          </p>
        </Card>
      ) : null}
    </div>
  )
}

function FindingCard({
  finding,
  holdingNames,
  onStatus,
}: {
  finding: Finding
  holdingNames: string[]
  onStatus: (status: FindingStatus) => void
}) {
  const [open, setOpen] = useState(finding.severity === 'critical' && finding.status === 'open')
  const closed = finding.status === 'done' || finding.status === 'dismissed'

  const known = useMemo(
    () => finding.related.filter((name) => holdingNames.includes(name)),
    [finding.related, holdingNames],
  )

  return (
    <Card padded={false} className={cx('overflow-hidden', closed && 'opacity-55')}>
      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        className="flex w-full items-start gap-3 px-4 py-3 text-left transition-colors hover:bg-surface-2"
      >
        <span className="mt-0.5 shrink-0">
          <Pill tone={SEVERITY_TONE[finding.severity]}>{SEVERITY_LABEL[finding.severity]}</Pill>
        </span>
        <div className="min-w-0 flex-1">
          <h3 className={cx('text-[13.5px] font-semibold leading-snug text-ink', closed && 'line-through')}>
            {finding.title}
          </h3>
          <p className="mt-1 line-clamp-2 text-[12px] leading-relaxed text-ink-2">{finding.body[0]}</p>
        </div>
        <span className="shrink-0 text-[11px] text-ink-3">{open ? '▾' : '▸'}</span>
      </button>

      {open ? (
        <div className="border-t border-line px-4 py-3">
          {finding.body.slice(1).map((paragraph, index) => (
            <p key={index} className="mb-2 text-[12.5px] leading-relaxed text-ink-2">
              {paragraph}
            </p>
          ))}

          {finding.evidence.length > 0 ? (
            <div className="my-3 overflow-x-auto rounded-lg border border-line">
              <table className="w-full min-w-max text-left text-[12px]">
                <tbody>
                  {finding.evidence.map((row) => (
                    <tr key={row.label} className="border-b border-line-soft last:border-0">
                      <td className="px-2.5 py-1.5 text-ink-2">{row.label}</td>
                      <td className="num px-2.5 py-1.5 text-right font-medium text-ink">{row.value}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : null}

          {finding.action ? (
            <div className="mb-3 rounded-lg border border-accent/30 bg-accent/[0.07] px-3 py-2">
              <span className="text-[10px] font-semibold uppercase tracking-widest text-accent">Next step</span>
              <p className="mt-1 text-[12.5px] leading-relaxed text-ink">{finding.action}</p>
            </div>
          ) : null}

          {known.length > 0 ? (
            <div className="mb-3 flex flex-wrap items-center gap-1.5">
              <span className="text-[11px] text-ink-3">Bears on:</span>
              {known.map((name) => (
                <Link
                  key={name}
                  to="/investments"
                  className="rounded border border-line bg-surface-2 px-1.5 py-0.5 text-[11px] text-ink-2 transition-colors hover:text-accent"
                >
                  {name}
                </Link>
              ))}
            </div>
          ) : null}

          <div className="flex flex-wrap items-center justify-between gap-2 border-t border-line pt-2.5">
            <span className="text-[11px] text-ink-3">
              {finding.author} · {relativeTime(finding.createdAt)}
            </span>
            <div className="no-print flex items-center gap-1">
              {STATUS_ORDER.map((status) => (
                <button
                  key={status}
                  type="button"
                  onClick={() => onStatus(status)}
                  className={cx(
                    'rounded-md border px-2 py-1 text-[11px] font-medium transition-colors',
                    finding.status === status
                      ? 'border-accent/40 bg-accent/15 text-accent'
                      : 'border-line bg-surface-2 text-ink-3 hover:text-ink',
                  )}
                >
                  {STATUS_LABEL[status]}
                </button>
              ))}
            </div>
          </div>
        </div>
      ) : null}
    </Card>
  )
}
