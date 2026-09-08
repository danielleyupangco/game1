import type { Currency } from '@/types'

const SYMBOL: Record<Currency, string> = { PHP: '₱', USD: '$' }

/**
 * Demo mode: every figure hidden, the structure left intact.
 *
 * Kept as a module flag rather than passed through a hook because these
 * formatters are pure functions called from a hundred render paths, and
 * threading a prop through all of them would guarantee one gets missed — which
 * on this feature means a number on screen in front of someone who should not
 * see it. `PrivacyProvider` sets it during its own render, before any child
 * renders, so a toggle takes effect on the same paint.
 *
 * The symbol survives the mask: "₱•••" still reads as money, which is the
 * point — the shape of the dashboard is what is being shown.
 */
let hidden = false

export function setPrivateMode(on: boolean): void {
  hidden = on
}

export function isPrivateMode(): boolean {
  return hidden
}

const MASK = '•••'

/**
 * Blanks the digits in free prose, which the formatters never see.
 *
 * The written findings argue in sentences — "nights fell from 177 to 132" —
 * so masking only the formatted tiles would leave the whole analysis readable.
 * Four-digit years are kept, because a finding that loses its dates stops being
 * followable and a year discloses nothing.
 */
export function maskNumbers<T extends string | null | undefined>(text: T): T {
  if (!hidden || !text) return text
  return text.replace(/\d[\d,.]*/g, (match) => (/^(19|20)\d{2}$/.test(match) ? match : MASK)) as T
}

/**
 * Replaces a person's name with a stable alias while figures are hidden.
 *
 * Masking the numbers is not enough to hand the screen to someone. The guest
 * tables name real people who booked a stay, and those names are not yours to
 * show — so in demo mode they become "Guest 1", "Guest 2" and so on.
 *
 * Stable rather than blank: the same person keeps the same alias everywhere in
 * a session, so the repeat-guest rows, the add-on rows and the stay list still
 * line up and the structure being demonstrated still makes sense.
 */
const aliases = new Map<string, string>()

export function maskName<T extends string | null | undefined>(name: T): T {
  if (!hidden || !name) return name
  const key = name.trim().toLowerCase()
  if (!key) return name
  let alias = aliases.get(key)
  if (!alias) {
    alias = `Guest ${aliases.size + 1}`
    aliases.set(key, alias)
  }
  return alias as T
}

/** Compact money for tiles: ₱13.1M, $482K. Falls back to full digits under 1000. */
export function money(value: number, currency: Currency = 'PHP', compact = false): string {
  if (!Number.isFinite(value)) return '—'
  const sym = SYMBOL[currency]
  if (hidden) return `${sym}${MASK}`
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
  if (hidden) return `${MASK}%`
  return `${(fraction * 100).toFixed(digits)}%`
}

/** Percentage-point delta, always signed — for "vs target" style readouts. */
export function pp(fraction: number, digits = 1): string {
  if (!Number.isFinite(fraction)) return '—'
  if (hidden) return `${MASK} pp`
  const v = fraction * 100
  return `${v >= 0 ? '+' : ''}${v.toFixed(digits)} pp`
}

export function signedPct(fraction: number, digits = 1): string {
  if (!Number.isFinite(fraction)) return '—'
  if (hidden) return `${MASK}%`
  return `${fraction >= 0 ? '+' : ''}${(fraction * 100).toFixed(digits)}%`
}

export function num(value: number, digits = 2): string {
  if (!Number.isFinite(value)) return '—'
  if (hidden) return MASK
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
