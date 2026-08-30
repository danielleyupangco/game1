import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { useLedger } from '@/state/store'
import { Card, Pill, cx } from '@/components/ui/primitives'
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
 * Renders a set of findings grouped by theme. Shared so the Analysis page and
 * the property's own Insights tab show the same cards, in the same state —
 * closing one on either surface closes it everywhere.
 */
export function FindingList({ findings }: { findings: Finding[] }) {
  const { saveFinding, holdings } = useLedger()

  const visible = useMemo(
    () =>
      [...findings].sort((a, b) => {
        const gap = STATUS_ORDER.indexOf(a.status) - STATUS_ORDER.indexOf(b.status)
        return gap !== 0 ? gap : b.priority - a.priority
      }),
    [findings],
  )
  const themes = useMemo(() => [...new Set(visible.map((f) => f.theme))], [visible])

  if (findings.length === 0) {
    return (
      <Card>
        <p className="py-6 text-center text-[13px] text-ink-2">Nothing written up yet.</p>
      </Card>
    )
  }

  return (
    <div className="space-y-4">
      {themes.map((theme) => (
        <section key={theme}>
          <h3 className="mb-2 text-[11px] font-semibold uppercase tracking-widest text-ink-3">{theme}</h3>
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
    </div>
  )
}

export { SEVERITY_TONE, SEVERITY_LABEL, STATUS_ORDER, STATUS_LABEL }

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
