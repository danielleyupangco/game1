import type { ReactNode } from 'react'
import { ResponsiveContainer } from 'recharts'

/**
 * Wraps every chart with a title, an optional caption that says what the chart
 * is claiming, and a fixed-height responsive container.
 */
export function ChartFrame({
  title,
  caption,
  right,
  height = 240,
  children,
}: {
  title: string
  caption?: ReactNode
  right?: ReactNode
  height?: number
  children: ReactNode
}) {
  return (
    <div>
      <div className="mb-2 flex flex-wrap items-baseline justify-between gap-2">
        <h3 className="text-[13px] font-semibold text-ink">{title}</h3>
        {right}
      </div>
      {caption ? <p className="mb-2.5 text-[11px] leading-relaxed text-ink-2">{caption}</p> : null}
      <div style={{ height }}>
        <ResponsiveContainer width="100%" height="100%">
          {children as never}
        </ResponsiveContainer>
      </div>
    </div>
  )
}

export function Legend({ items }: { items: { label: string; color: string }[] }) {
  return (
    <div className="flex flex-wrap items-center gap-3">
      {items.map((item) => (
        <span key={item.label} className="flex items-center gap-1.5 text-[11px] text-ink-2">
          <span className="h-2 w-2 rounded-full" style={{ background: item.color }} />
          {item.label}
        </span>
      ))}
    </div>
  )
}

/**
 * Recharts types its formatter callbacks against a loose union that assumes
 * every payload could be a string, an array or undefined. Our data is always
 * numeric, so this wrapper narrows once here rather than at every call site.
 */
export type ValueFormatter = (value: number, name: string) => [string, string]
export type LabelFormatter = (label: string) => string

export function tooltipProps(
  valueFormatter?: ValueFormatter,
  labelFormatter?: LabelFormatter,
): Record<string, unknown> {
  const props: Record<string, unknown> = {}
  if (valueFormatter) {
    props.formatter = (value: unknown, name: unknown) => valueFormatter(Number(value), String(name ?? ''))
  }
  if (labelFormatter) {
    props.labelFormatter = (label: unknown) => labelFormatter(String(label ?? ''))
  }
  return props
}
