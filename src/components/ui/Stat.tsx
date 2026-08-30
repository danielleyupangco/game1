import type { ReactNode } from 'react'
import { cx } from '@/components/ui/primitives'

/**
 * A KPI tile. `sub` carries the comparison; `onTrace` wires the tile to its
 * source rows so every headline number is one click from its provenance.
 */
export function Stat({
  label,
  value,
  sub,
  tone = 'neutral',
  onTrace,
  hint,
}: {
  label: string
  value: ReactNode
  sub?: ReactNode
  tone?: 'neutral' | 'pos' | 'neg' | 'warn'
  onTrace?: () => void
  hint?: string
}) {
  const tones: Record<string, string> = {
    neutral: 'text-ink',
    pos: 'text-pos',
    neg: 'text-neg',
    warn: 'text-warn',
  }
  return (
    <div className="group relative rounded-xl border border-line bg-surface p-3.5" title={hint}>
      <div className="flex items-start justify-between gap-2">
        <span className="text-[11px] font-medium uppercase tracking-wide text-ink-2">{label}</span>
        {onTrace ? (
          <button
            type="button"
            onClick={onTrace}
            title="Show the source rows behind this number"
            className="no-print shrink-0 rounded border border-transparent px-1 text-[10px] text-ink-3 opacity-0 transition-opacity hover:text-accent group-hover:opacity-100 focus:opacity-100"
          >
            source
          </button>
        ) : null}
      </div>
      <div className={cx('num mt-1.5 text-[22px] font-semibold leading-none tracking-tight', tones[tone])}>
        {value}
      </div>
      {sub ? <div className="mt-1.5 text-[12px] leading-snug text-ink-2">{sub}</div> : null}
    </div>
  )
}

export function StatGrid({ children, cols = 4 }: { children: ReactNode; cols?: 2 | 3 | 4 }) {
  const map = {
    2: 'grid-cols-2',
    3: 'grid-cols-2 lg:grid-cols-3',
    4: 'grid-cols-2 lg:grid-cols-4',
  }
  return <div className={cx('grid gap-2.5', map[cols])}>{children}</div>
}

export function Delta({ value, digits = 1, suffix = '%' }: { value: number; digits?: number; suffix?: string }) {
  if (!Number.isFinite(value)) return <span className="text-ink-3">—</span>
  const positive = value >= 0
  return (
    <span className={cx('num font-medium', positive ? 'text-pos' : 'text-neg')}>
      {positive ? '▲' : '▼'} {Math.abs(value * 100).toFixed(digits)}
      {suffix}
    </span>
  )
}
