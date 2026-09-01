import { describe, expect, it } from 'vitest'
import { seedFingerprint } from '@/lib/db'
import type { Backup } from '@/lib/db'

const base = (): Backup =>
  ({
    version: 6,
    exportedAt: '2026-09-01T00:00:00.000Z',
    holdings: [],
    snapshots: [],
    transactions: [],
    benchmark: [],
    bookings: [],
    expenses: [],
    imports: [],
    findings: [],
    capitalSpend: [],
    resolutions: [],
    addons: [],
    dividends: [],
    competitors: [],
    observations: [],
    settings: null,
    dcf: null,
    pricing: null,
    projects: [],
    costModel: null,
    forecast: null,
  }) as unknown as Backup

describe('knowing when a seed has changed', () => {
  it('gives the same payload the same fingerprint', () => {
    expect(seedFingerprint(base())).toBe(seedFingerprint(base()))
  })

  it('changes when a single figure changes', () => {
    const before = base()
    const after = base()
    ;(after as unknown as { bookings: unknown[] }).bookings = [{ id: 'b1', addOnRevenue: -130800 }]
    expect(seedFingerprint(before)).not.toBe(seedFingerprint(after))
  })

  it('changes when a correction flips one number', () => {
    const a = base()
    const b = base()
    ;(a as unknown as { bookings: unknown[] }).bookings = [{ id: 'b1', addOnRevenue: -130800 }]
    ;(b as unknown as { bookings: unknown[] }).bookings = [{ id: 'b1', addOnRevenue: 27200 }]
    expect(seedFingerprint(a)).not.toBe(seedFingerprint(b))
  })

  it('is stable across calls, so a reload does not re-import needlessly', () => {
    const seed = base()
    const first = seedFingerprint(seed)
    for (let i = 0; i < 5; i += 1) expect(seedFingerprint(seed)).toBe(first)
  })
})
