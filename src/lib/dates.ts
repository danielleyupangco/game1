/** ISO date helpers. Everything internal is a plain 'YYYY-MM-DD' string. */

export function toISODate(value: Date): string {
  const y = value.getFullYear()
  const m = String(value.getMonth() + 1).padStart(2, '0')
  const d = String(value.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

export function today(): string {
  return toISODate(new Date())
}

export function monthKey(iso: string): string {
  return iso.slice(0, 7)
}

export function addMonths(ym: string, delta: number): string {
  const [y, m] = ym.split('-').map(Number)
  const d = new Date(y, m - 1 + delta, 1)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
}

/** Inclusive list of YYYY-MM between two month keys. */
export function monthRange(startYm: string, endYm: string): string[] {
  const out: string[] = []
  let cur = startYm
  let guard = 0
  while (cur <= endYm && guard++ < 600) {
    out.push(cur)
    cur = addMonths(cur, 1)
  }
  return out
}

export function daysBetween(startIso: string, endIso: string): number {
  const a = new Date(`${startIso}T00:00:00`).getTime()
  const b = new Date(`${endIso}T00:00:00`).getTime()
  if (Number.isNaN(a) || Number.isNaN(b)) return 0
  return Math.round((b - a) / 86400000)
}

export function daysInMonth(ym: string): number {
  const [y, m] = ym.split('-').map(Number)
  return new Date(y, m, 0).getDate()
}

/**
 * Splits a stay across the months it touches, so a Mar 29 → Apr 2 booking
 * contributes 3 nights to March and 1 to April rather than 4 to whichever
 * month you happened to key on.
 */
export function nightsByMonth(checkIn: string, checkOut: string): Record<string, number> {
  const out: Record<string, number> = {}
  const start = new Date(`${checkIn}T00:00:00`)
  const end = new Date(`${checkOut}T00:00:00`)
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) return out
  const cursor = new Date(start)
  let guard = 0
  while (cursor < end && guard++ < 3650) {
    const key = `${cursor.getFullYear()}-${String(cursor.getMonth() + 1).padStart(2, '0')}`
    out[key] = (out[key] ?? 0) + 1
    cursor.setDate(cursor.getDate() + 1)
  }
  return out
}

export function monthName(monthIndex1: number): string {
  return new Date(2000, monthIndex1 - 1, 1).toLocaleDateString('en-US', { month: 'short' })
}
