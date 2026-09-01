import { describe, expect, it } from 'vitest'
import { aggregate, monthlyMetrics, trailing } from '@/domain/airbnb/metrics'
import { buildInsights } from '@/domain/airbnb/insights'
import { buildAddOnStays } from '@/domain/airbnb/addons'
import { buildPositions, latestSnapshot, totalValue } from '@/domain/investments/portfolio'
import { businessCash, personalHoldings } from '@/domain/investments/ownership'
import { positionDrift } from '@/domain/investments/drift'
import { DEFAULT_PRICING } from '@/state/defaults'
import type { Finding } from '@/types'

/**
 * The findings quote numbers. The app computes them. These have to agree.
 *
 * Every written finding on this dashboard cites figures — nights sold, a rate,
 * a position's weight — and those figures are typed into the finding rather
 * than derived, because a finding is an argument and an argument needs the
 * number it was made about. The cost is that when the underlying data is
 * refreshed, the prose keeps asserting the old number and nobody notices. That
 * has now happened twice: once when the metrics tab was re-imported and once
 * when the joint funds moved.
 *
 * So this recomputes the headline figures from the seed and checks the findings
 * still say them. It is deliberately a small set — the numbers a reader would
 * actually check — rather than every value in every evidence row, because a
 * test nobody can maintain gets deleted the first time it fails.
 *
 * Skipped when there is no seed, which is the ordinary case for anyone who has
 * not been handed one.
 */

type Seed = {
  findings: Finding[]
  bookings: Parameters<typeof monthlyMetrics>[0]['bookings']
  expenses: Parameters<typeof monthlyMetrics>[0]['expenses']
  capitalSpend: NonNullable<Parameters<typeof monthlyMetrics>[0]['capitalSpend']>
  addons: Parameters<typeof buildAddOnStays>[0]['quotes']
  resolutions: Parameters<typeof buildAddOnStays>[0]['resolutions']
  holdings: Parameters<typeof buildPositions>[0]
  snapshots: Parameters<typeof latestSnapshot>[0]
  settings: { usdPhp: number } | null
  dcf: { availableNightsPerYear: number } | null
}

const modules = import.meta.glob<{ default: Seed }>('../../seed/data.json', { eager: true })
const seed = (Object.values(modules)[0]?.default ?? null) as Seed | null

/** Reads one evidence row off a finding, so a failure names what is wrong. */
function evidence(findings: Finding[], id: string, label: string): string {
  const finding = findings.find((row) => row.id === id)
  if (!finding) throw new Error(`no finding "${id}"`)
  const row = finding.evidence.find((item) => item.label === label)
  if (!row) {
    throw new Error(`finding "${id}" has no evidence labelled "${label}" — it has: ${finding.evidence.map((e) => e.label).join(', ')}`)
  }
  return row.value
}

/** The digits in a value, so "₱2,373,587" and "17.3% of your money" both compare. */
function numbersIn(value: string): number[] {
  return (value.replace(/,/g, '').match(/-?\d+(?:\.\d+)?/g) ?? []).map(Number)
}

function expectFigure(actual: number, quoted: string, tolerance = 0.01) {
  const found = numbersIn(quoted)
  const near = found.some((n) => (actual === 0 ? n === 0 : Math.abs(n - actual) / Math.abs(actual) <= tolerance))
  expect(near, `expected one of [${found.join(', ')}] to be within ${tolerance * 100}% of ${actual}`).toBe(true)
}

describe.skipIf(!seed)('the findings still say what the data says', () => {
  const data = seed!
  const series = monthlyMetrics({
    bookings: data.bookings,
    expenses: data.expenses,
    capitalSpend: data.capitalSpend,
    usdPhp: data.settings?.usdPhp ?? 58,
    availableNightsPerYear: data.dcf?.availableNightsPerYear ?? 330,
  })
  const findings = data.findings
  const yearOf = (year: string) => aggregate(series.filter((m) => m.month.startsWith(year)))

  it('the two trading years match the occupancy finding', () => {
    const y2025 = yearOf('2025')
    const y2026 = yearOf('2026')
    expectFigure(y2025.nightsSold, evidence(findings, 'occupancy-collapse', '2025 nights'))
    expectFigure(y2026.nightsSold, evidence(findings, 'occupancy-collapse', '2026 nights'))
    expectFigure(Math.round(y2025.adr), evidence(findings, 'occupancy-collapse', '2025 rate'))
    expectFigure(Math.round(y2026.adr), evidence(findings, 'occupancy-collapse', '2026 rate'))
  })

  it('the high season figures match the month the finding names', () => {
    const nights = (month: string) => series.find((m) => m.month === month)?.nightsSold ?? -1
    expectFigure(nights('2025-11'), evidence(findings, 'high-season-empty', 'Nov 2025'))
    expectFigure(nights('2025-12'), evidence(findings, 'high-season-empty', 'Dec 2025'))
    expect(nights('2026-11')).toBe(0)
    expectFigure(nights('2026-12'), evidence(findings, 'high-season-empty', 'Dec 2026'))
  })

  it('the lead times match', () => {
    const insights = buildInsights(
      data.bookings,
      data.expenses,
      data.settings?.usdPhp ?? 58,
      data.dcf?.availableNightsPerYear ?? 330,
      DEFAULT_PRICING.highSeasonMonths,
    )
    const median = (year: string) => insights.lead.byYear.find((row) => row.year === year)?.median ?? -1
    expectFigure(median('2025'), evidence(findings, 'lead-time', '2025 median lead'), 0.02)
    expectFigure(median('2026'), evidence(findings, 'lead-time', '2026 median lead'), 0.02)

    // And the break-even, which is the one that went wrong when the cost window
    // reached into next year's bookings.
    expectFigure(Math.round(insights.costs.fixedPerYear), evidence(findings, 'breakeven', 'Fixed costs / year'))
    expectFigure(Math.round(insights.costs.contributionPerNight), evidence(findings, 'breakeven', 'Contribution / night'))
    expectFigure(Math.round(insights.costs.breakEvenNights), evidence(findings, 'breakeven', 'Break-even'), 0.03)
  })

  it('the trailing rate matches the advertised-versus-collected finding', () => {
    const t12 = aggregate(trailing(series, 12))
    expectFigure(Math.round(t12.adr), evidence(findings, 'list-vs-realised', 'Realised, trailing 12 months'))
    expectFigure(t12.nightsSold, evidence(findings, 'list-vs-realised', 'Nights it applies to'))
    expectFigure(t12.nightsSold, evidence(findings, 'breakeven', 'Nights sold (T12M)'))
  })

  it('the add-on split matches what the form recorded', () => {
    const stays = buildAddOnStays({ bookings: data.bookings, quotes: data.addons, resolutions: data.resolutions })
    const measured = stays.filter(
      (row) => row.source === 'form' && !row.incomplete && row.charged > 0 && row.toAllan > 0 && row.checkIn.startsWith('2026'),
    )
    const charged = measured.reduce((sum, row) => sum + row.charged, 0)
    const toAllan = measured.reduce((sum, row) => sum + row.toAllan, 0)
    expectFigure(Math.round(charged), evidence(findings, 'addon-split', '2026 guests paid'))
    expectFigure(Math.round(toAllan), evidence(findings, 'addon-split', '2026 sent to Allan'))
    expectFigure(Math.round(charged - toAllan), evidence(findings, 'addon-split', '2026 you kept'))
  })

  describe('the portfolio', () => {
    const snapshot = latestSnapshot(data.snapshots)!
    const rows = data.holdings.filter((h) => h.snapshotId === snapshot.id)
    const own = personalHoldings(rows)
    const ownTotal = totalValue(buildPositions(own, snapshot))
    const classValue = (assetClass: string) =>
      own
        .filter((h) => h.assetClass === assetClass)
        .reduce((sum, h) => sum + h.value * (h.currency === 'USD' ? snapshot.usdPhp : 1), 0)

    it('splits the same way the allocation finding says', () => {
      expectFigure(Math.round(classValue('Fixed Income')), evidence(findings, 'equity-low', 'Fixed income'))
      expectFigure(Math.round(classValue('Equity')), evidence(findings, 'equity-low', 'Equity'))
      expectFigure(Math.round(classValue('Cash')), evidence(findings, 'equity-low', 'Cash'))
      // And the percentages in the same rows.
      expectFigure((classValue('Fixed Income') / ownTotal) * 100, evidence(findings, 'equity-low', 'Fixed income'), 0.02)
    })

    it('keeps the business float out of the personal total', () => {
      expect(Math.round(businessCash(rows, snapshot.usdPhp))).toBe(2285107)
      expect(Math.round(ownTotal + businessCash(rows, snapshot.usdPhp))).toBe(
        Math.round(totalValue(buildPositions(rows, snapshot))),
      )
    })

    it('quotes XMLIBF at the value it actually has, and only because it moved smoothly', () => {
      const drift = positionDrift('XMLIBF (Income Builder)', data.holdings, data.snapshots)!
      expect(drift.smooth, 'XMLIBF must be step-free for the finding to call its change a gain').toBe(true)
      expectFigure(Math.round(drift.first.value), evidence(findings, 'xmlibf', 'Aug 2025'))
      expectFigure(Math.round(drift.last.value), evidence(findings, 'xmlibf', 'Aug 2026'))
      expectFigure(drift.totalChange * 100, evidence(findings, 'xmlibf', 'Change'), 0.05)
    })

    /**
     * The guard that matters most: no finding may present a stepped position's
     * value change as performance. That is how "+24.8% a year" got onto a fund
     * whose value had fallen.
     */
    it('never calls a stepped position a return', () => {
      for (const ticker of ['XCOLEIF (PH Equity Index Fund)', 'VOO (S&P 500 ETF)', 'XSLWEIF (World Equity Index)']) {
        const drift = positionDrift(ticker, data.holdings, data.snapshots)
        expect(drift?.smooth, `${ticker} is stepped, so nothing may quote it as a return`).toBe(false)
      }
      const claims = findings.find((f) => f.id === 'index-working')!
      expect(claims.body.join(' ')).toMatch(/contribution|not gains|cannot separate/i)
      expect(claims.evidence.some((row) => /step/i.test(row.value))).toBe(true)
    })
  })
})
