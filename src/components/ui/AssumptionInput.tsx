import { useState } from 'react'
import { cx, inputClass } from '@/components/ui/primitives'

export type AssumptionKind = 'money' | 'percent' | 'number'

/**
 * A single editable model input. Percentages are shown and typed as percent
 * while stored as fractions, so an assumptions panel reads the way a model
 * does rather than the way the code does.
 */
export function AssumptionInput({
  label,
  value,
  onChange,
  kind = 'number',
  note,
  step,
  suffix,
}: {
  label: string
  value: number
  onChange: (next: number) => void
  kind?: AssumptionKind
  note?: string
  step?: number
  suffix?: string
}) {
  const display = kind === 'percent' ? value * 100 : value
  const formatted = String(Number(display.toFixed(4)))
  const [draft, setDraft] = useState(formatted)

  // The field holds its own text so a half-typed number isn't reformatted under
  // the cursor, but it has to follow the value when something else changes it
  // (loading DCF assumptions from actuals, say). Adjusting during render rather
  // than in an effect avoids rendering one frame of the stale number.
  const [lastValue, setLastValue] = useState(formatted)
  if (formatted !== lastValue) {
    setLastValue(formatted)
    setDraft(formatted)
  }

  const commit = (raw: string) => {
    const parsed = Number(raw)
    if (!Number.isFinite(parsed)) return
    onChange(kind === 'percent' ? parsed / 100 : parsed)
  }

  return (
    <label className="block">
      <span className="mb-1 block text-[11px] font-medium text-ink-2">{label}</span>
      <div className="relative">
        <input
          type="number"
          step={step ?? (kind === 'percent' ? 0.5 : kind === 'money' ? 1000 : 1)}
          value={draft}
          onChange={(event) => {
            setDraft(event.target.value)
            commit(event.target.value)
          }}
          className={cx(inputClass, 'num pr-8')}
        />
        <span className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-[11px] text-ink-3">
          {suffix ?? (kind === 'percent' ? '%' : kind === 'money' ? '₱' : '')}
        </span>
      </div>
      {note ? <span className="mt-1 block text-[10.5px] leading-relaxed text-ink-3">{note}</span> : null}
    </label>
  )
}
