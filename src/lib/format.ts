import type { Currency } from '@/types'

const SYMBOL: Record<Currency, string> = { PHP: '₱', USD: '$' }

/** Compact money for tiles: ₱13.1M, $482K. Falls back to full digits under 1000. */
export function money(value: number, currency: Currency = 'PHP', compact = false): string {
  if (!Number.isFinite(value)) return '—'
  const sym = SYMBOL[currency]
  const abs = Math.abs(value)
  const sign = value < 0 ? '-' : ''
  if (compact && abs >= 1000) {
    const units: [number, string][] = [
      [1e12, 'T'],
      [1e9, 'B'],
      [1e6, 'M'],
      [1e3, 'K'],
    ]
    for (const [size, suffix] of units) {
      if (abs >= size) {
        const scaled = abs / size
        return `${sign}${sym}${scaled.toFixed(scaled >= 100 ? 0 : 1)}${suffix}`
      }
    }
  }
  return `${sign}${sym}${abs.toLocaleString('en-US', {
    minimumFractionDigits: abs < 100 ? 2 : 0,
    maximumFractionDigits: abs < 100 ? 2 : 0,
  })}`
}

export function pct(fraction: number, digits = 1): string {
  if (!Number.isFinite(fraction)) return '—'
  return `${(fraction * 100).toFixed(digits)}%`
}

/** Percentage-point delta, always signed — for "vs target" style readouts. */
export function pp(fraction: number, digits = 1): string {
  if (!Number.isFinite(fraction)) return '—'
  const v = fraction * 100
  return `${v >= 0 ? '+' : ''}${v.toFixed(digits)} pp`
}

export function signedPct(fraction: number, digits = 1): string {
  if (!Number.isFinite(fraction)) return '—'
  return `${fraction >= 0 ? '+' : ''}${(fraction * 100).toFixed(digits)}%`
}

export function num(value: number, digits = 2): string {
  if (!Number.isFinite(value)) return '—'
  return value.toLocaleString('en-US', {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  })
}

export function shortDate(iso: string): string {
  if (!iso) return '—'
  const d = new Date(`${iso}T00:00:00`)
  if (Number.isNaN(d.getTime())) return iso
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

export function monthLabel(ym: string): string {
  const [y, m] = ym.split('-').map(Number)
  if (!y || !m) return ym
  return new Date(y, m - 1, 1).toLocaleDateString('en-US', { month: 'short', year: '2-digit' })
}

/** "3 days ago" / "just now" — used by the freshness indicators. */
export function relativeTime(isoTimestamp: string): string {
  const then = new Date(isoTimestamp).getTime()
  if (Number.isNaN(then)) return 'unknown'
  const mins = Math.floor((Date.now() - then) / 60000)
  if (mins < 1) return 'just now'
  if (mins < 60) return `${mins}m ago`
  const hours = Math.floor(mins / 60)
  if (hours < 24) return `${hours}h ago`
  const days = Math.floor(hours / 24)
  if (days < 30) return `${days}d ago`
  const months = Math.floor(days / 30)
  return months < 12 ? `${months}mo ago` : `${Math.floor(months / 12)}y ago`
}
