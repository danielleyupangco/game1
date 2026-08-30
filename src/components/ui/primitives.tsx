import type { ReactNode } from 'react'

export function cx(...parts: (string | false | null | undefined)[]): string {
  return parts.filter(Boolean).join(' ')
}

export function Card({
  children,
  className,
  padded = true,
}: {
  children: ReactNode
  className?: string
  padded?: boolean
}) {
  return (
    <div
      className={cx(
        'rounded-xl border border-line bg-surface',
        padded && 'p-4 sm:p-5',
        className,
      )}
    >
      {children}
    </div>
  )
}

export function SectionHeader({
  title,
  subtitle,
  right,
}: {
  title: string
  subtitle?: ReactNode
  right?: ReactNode
}) {
  return (
    <div className="mb-3 flex flex-wrap items-start justify-between gap-3">
      <div className="min-w-0">
        <h2 className="text-[15px] font-semibold tracking-tight text-ink">{title}</h2>
        {subtitle ? <p className="mt-0.5 max-w-2xl text-[12px] leading-relaxed text-ink-2">{subtitle}</p> : null}
      </div>
      {right ? <div className="shrink-0">{right}</div> : null}
    </div>
  )
}

export function Pill({
  children,
  tone = 'neutral',
  title,
}: {
  children: ReactNode
  tone?: 'neutral' | 'pos' | 'neg' | 'warn' | 'info' | 'accent'
  title?: string
}) {
  const tones: Record<string, string> = {
    neutral: 'bg-surface-2 text-ink-2 border-line',
    pos: 'bg-pos/10 text-pos border-pos/25',
    neg: 'bg-neg/10 text-neg border-neg/25',
    warn: 'bg-warn/10 text-warn border-warn/25',
    info: 'bg-info/10 text-info border-info/25',
    accent: 'bg-accent/10 text-accent border-accent/25',
  }
  return (
    <span
      title={title}
      className={cx(
        'inline-flex items-center gap-1 rounded-md border px-1.5 py-0.5 text-[11px] font-medium leading-4',
        tones[tone],
      )}
    >
      {children}
    </span>
  )
}

export function Button({
  children,
  onClick,
  variant = 'default',
  size = 'md',
  disabled,
  type = 'button',
  className,
  title,
}: {
  children: ReactNode
  onClick?: () => void
  variant?: 'default' | 'primary' | 'ghost' | 'danger'
  size?: 'sm' | 'md'
  disabled?: boolean
  type?: 'button' | 'submit'
  className?: string
  title?: string
}) {
  const variants: Record<string, string> = {
    default: 'border-line bg-surface-2 text-ink hover:bg-surface-3',
    primary: 'border-accent/40 bg-accent/15 text-accent hover:bg-accent/25',
    ghost: 'border-transparent bg-transparent text-ink-2 hover:bg-surface-2 hover:text-ink',
    danger: 'border-neg/30 bg-neg/10 text-neg hover:bg-neg/20',
  }
  return (
    <button
      type={type}
      title={title}
      disabled={disabled}
      onClick={onClick}
      className={cx(
        'inline-flex items-center justify-center gap-1.5 rounded-lg border font-medium transition-colors',
        size === 'sm' ? 'px-2.5 py-1 text-[12px]' : 'px-3 py-1.5 text-[13px]',
        variants[variant],
        disabled && 'cursor-not-allowed opacity-40',
        className,
      )}
    >
      {children}
    </button>
  )
}

export function Field({
  label,
  hint,
  children,
}: {
  label: string
  hint?: ReactNode
  children: ReactNode
}) {
  return (
    <label className="block">
      <span className="mb-1 block text-[11px] font-medium uppercase tracking-wide text-ink-2">{label}</span>
      {children}
      {hint ? <span className="mt-1 block text-[11px] leading-relaxed text-ink-3">{hint}</span> : null}
    </label>
  )
}

export const inputClass =
  'w-full rounded-lg border border-line bg-surface-2 px-2.5 py-1.5 text-[13px] text-ink outline-none transition-colors focus:border-accent/60 focus:bg-surface-3'

export function TextInput({
  value,
  onChange,
  placeholder,
  type = 'text',
}: {
  value: string
  onChange: (value: string) => void
  placeholder?: string
  type?: string
}) {
  return (
    <input
      type={type}
      value={value}
      placeholder={placeholder}
      onChange={(event) => onChange(event.target.value)}
      className={inputClass}
    />
  )
}

export function Select({
  value,
  onChange,
  options,
}: {
  value: string
  onChange: (value: string) => void
  options: { value: string; label: string }[]
}) {
  return (
    <select value={value} onChange={(event) => onChange(event.target.value)} className={inputClass}>
      {options.map((option) => (
        <option key={option.value} value={option.value}>
          {option.label}
        </option>
      ))}
    </select>
  )
}

export function Tabs<T extends string>({
  value,
  onChange,
  options,
}: {
  value: T
  onChange: (value: T) => void
  options: { value: T; label: string }[]
}) {
  return (
    <div className="inline-flex gap-0.5 rounded-lg border border-line bg-surface-2 p-0.5">
      {options.map((option) => (
        <button
          key={option.value}
          type="button"
          onClick={() => onChange(option.value)}
          className={cx(
            'rounded-md px-2.5 py-1 text-[12px] font-medium transition-colors',
            value === option.value ? 'bg-surface-3 text-ink' : 'text-ink-2 hover:text-ink',
          )}
        >
          {option.label}
        </button>
      ))}
    </div>
  )
}
