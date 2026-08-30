import { useMemo, useState } from 'react'
import { CartesianGrid, Line, LineChart, ReferenceDot, ReferenceLine, Tooltip, XAxis, YAxis } from 'recharts'
import { useLedger } from '@/state/store'
import { aggregate, seasonality, trailing, type MonthMetrics } from '@/domain/airbnb/metrics'
import { pricingHeadline, suggestByMonth, weekdayDemand, type MonthSuggestion } from '@/domain/airbnb/pricing'
import { Card, Pill, SectionHeader, cx } from '@/components/ui/primitives'
import { AssumptionInput } from '@/components/ui/AssumptionInput'
import { Stat, StatGrid } from '@/components/ui/Stat'
import { EmptyState } from '@/components/ui/EmptyState'
import { ExportButton } from '@/components/ui/ExportButton'
import { ChartFrame, Legend, tooltipProps } from '@/components/charts/Chart'
import { AXIS, GRID, SERIES, STATUS, TOOLTIP_STYLE } from '@/components/charts/theme'
import { money, num, pct, signedPct } from '@/lib/format'
import { exportTable, MONEY_FMT, PCT_FMT } from '@/lib/export'
import { monthName } from '@/lib/dates'

export function PricingPanel({ series }: { series: MonthMetrics[] }) {
  const { bookings, pricing, savePricing } = useLedger()
  const [selected, setSelected] = useState<number | null>(null)

  const t12 = useMemo(() => aggregate(trailing(series, 12)), [series])
  const season = useMemo(() => seasonality(series), [series])
  const suggestions = useMemo(
    () => suggestByMonth(season, pricing, t12.adr),
    [season, pricing, t12.adr],
  )
  const headline = useMemo(() => pricingHeadline(suggestions, series), [suggestions, series])
  const weekdays = useMemo(() => weekdayDemand(bookings, pricing), [bookings, pricing])

  if (bookings.length === 0) {
    return (
      <EmptyState
        title="Pricing needs booking history"
        body="The engine works from what actually sold: occupancy and rate by month, and nights by day of week. Without bookings there is nothing to reason from — and guessing would be worse than saying so."
        dataset="bookings"
      />
    )
  }

  const active = selected !== null ? suggestions.find((s) => s.monthIndex === selected) : null
  const weekendEvidence = weekdays.some((day) => day.suggestedUplift > 0)
  const capBoundCount = suggestions.filter((s) => s.capBound).length
  const inelastic = Math.abs(pricing.priceElasticity) < 1

  return (
    <div className="space-y-4">
      <Card className="border-accent/25 bg-accent/[0.04]">
        <div className="flex gap-3">
          <span className="mt-0.5 text-[14px] text-accent">◈</span>
          <div>
            <h3 className="text-[13px] font-semibold text-ink">The trade-off, not the slogan</h3>
            <p className="mt-1 max-w-3xl text-[12px] leading-relaxed text-ink-2">
              A higher rate sells fewer nights. This engine only suggests a move when RevPAR — revenue per{' '}
              <em>available</em> night — improves after that loss, using an elasticity you set below. Every month shows
              the whole curve, so you can see how much of the gain is real and how much depends on demand behaving.
              Months with thin history are labelled as such rather than dressed up.
            </p>
          </div>
        </div>
      </Card>

      {inelastic && capBoundCount >= suggestions.length - 1 ? (
        <div className="rounded-lg border border-warn/30 bg-warn/5 px-3 py-2.5 text-[12px] leading-relaxed text-warn">
          <span className="font-semibold">Your elasticity has no optimum to find.</span> At{' '}
          {pricing.priceElasticity}, demand falls more slowly than price rises, so revenue increases at every price the
          model can test — and it simply recommends your {pct(pricing.maxRateChangePct, 0)} cap in{' '}
          {capBoundCount === 12 ? 'every month' : `${capBoundCount} of 12 months`}. That is arithmetic, not a finding.
          The useful reading is "there is headroom", and the real question is where demand actually breaks. Set
          elasticity below −1 to see the model choose a rate on its own, or test a rise in one month and feed the result
          back in.
        </div>
      ) : null}

      <StatGrid>
        <Stat
          label="Annual revenue uplift"
          value={money(headline.annualUplift, 'PHP', true)}
          tone={headline.annualUplift > 0 ? 'pos' : 'neutral'}
          sub={`${signedPct(headline.annualUpliftPct)} if every suggestion were adopted`}
        />
        <Stat label="Raise" value={String(headline.raiseCount)} sub="months where a higher rate wins" />
        <Stat label="Cut" value={String(headline.cutCount)} sub="months where filling nights wins" />
        <Stat
          label="Biggest single move"
          value={headline.strongest ? `${headline.strongest.label} ${signedPct(headline.strongest.rateChange, 0)}` : '—'}
          sub={headline.strongest ? `${signedPct(headline.strongest.revparUplift)} RevPAR` : 'No month improves'}
        />
      </StatGrid>

      <Card>
        <SectionHeader
          title="Model inputs"
          subtitle="Elasticity is the assumption doing the most work. −0.6 means a 10% price rise costs about 6% of occupancy; a private island with no substitute nearby is usually less elastic than a city apartment."
        />
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <AssumptionInput
            label="Price elasticity"
            value={pricing.priceElasticity}
            kind="number"
            step={0.1}
            suffix=""
            note="Negative. Closer to zero = demand barely reacts to price."
            onChange={(next) => void savePricing({ priceElasticity: Math.min(-0.05, next) })}
          />
          <AssumptionInput
            label="Target occupancy"
            value={pricing.targetOccupancy}
            kind="percent"
            note="Used to flag months that are structurally under-booked rather than mispriced."
            onChange={(next) => void savePricing({ targetOccupancy: next })}
          />
          <AssumptionInput
            label="Max rate change"
            value={pricing.maxRateChangePct}
            kind="percent"
            note="Caps any single suggestion. Guests notice a rate that jumps 40% between visits."
            onChange={(next) => void savePricing({ maxRateChangePct: next })}
          />
          <AssumptionInput
            label="Weekend uplift"
            value={pricing.weekendUpliftPct}
            kind="percent"
            note="Only applied to Fri/Sat where your own data shows above-average demand."
            onChange={(next) => void savePricing({ weekendUpliftPct: next })}
          />
        </div>

        <div className="mt-3 border-t border-line pt-3">
          <span className="mb-1.5 block text-[11px] font-medium text-ink-2">High season months (Palawan dry season)</span>
          <div className="flex flex-wrap gap-1">
            {Array.from({ length: 12 }, (_, index) => index + 1).map((month) => {
              const on = pricing.highSeasonMonths.includes(month)
              return (
                <button
                  key={month}
                  type="button"
                  onClick={() =>
                    void savePricing({
                      highSeasonMonths: on
                        ? pricing.highSeasonMonths.filter((m) => m !== month)
                        : [...pricing.highSeasonMonths, month].sort((a, b) => a - b),
                    })
                  }
                  className={cx(
                    'rounded-md border px-2 py-1 text-[11px] font-medium transition-colors',
                    on ? 'border-accent/40 bg-accent/15 text-accent' : 'border-line bg-surface-2 text-ink-3 hover:text-ink',
                  )}
                >
                  {monthName(month)}
                </button>
              )
            })}
          </div>
        </div>
      </Card>

      <Card>
        <SectionHeader
          title="Suggested rates by month"
          subtitle="Click a month to see its full revenue-vs-occupancy curve."
          right={
            <ExportButton
                run={() =>
                  exportTable(
                  suggestions,
                  [
                    { header: 'Month', value: (s) => s.label },
                    { header: 'Season', value: (s) => s.season },
                    { header: 'Years of data', value: (s) => s.observations },
                    { header: 'Current ADR', value: (s) => s.currentAdr, numFmt: MONEY_FMT },
                    { header: 'Current occupancy', value: (s) => s.currentOccupancy, numFmt: PCT_FMT },
                    { header: 'Current RevPAR', value: (s) => s.currentRevpar, numFmt: MONEY_FMT },
                    { header: 'Suggested ADR', value: (s) => s.suggestedAdr, numFmt: MONEY_FMT },
                    { header: 'Rate change', value: (s) => s.rateChange, numFmt: PCT_FMT },
                    { header: 'Projected occupancy', value: (s) => s.projectedOccupancy, numFmt: PCT_FMT },
                    { header: 'Projected RevPAR', value: (s) => s.projectedRevpar, numFmt: MONEY_FMT },
                    { header: 'RevPAR uplift', value: (s) => s.revparUplift, numFmt: PCT_FMT },
                    { header: 'Confidence', value: (s) => s.confidence },
                  ],
                  'island-t-pricing',
                  'Pricing',
                  [
                    `Elasticity ${pricing.priceElasticity} · max change ${pct(pricing.maxRateChangePct, 0)}`,
                    'Decision support from your own booking history. Not a forecast.',
                  ],
                  )
              }
            />
          }
        />

        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {suggestions.map((suggestion) => (
            <button
              key={suggestion.monthIndex}
              type="button"
              onClick={() => setSelected(selected === suggestion.monthIndex ? null : suggestion.monthIndex)}
              className={cx(
                'rounded-lg border p-2.5 text-left transition-colors',
                selected === suggestion.monthIndex ? 'border-accent/50 bg-surface-3' : 'border-line bg-surface-2 hover:border-line hover:bg-surface-3',
              )}
            >
              <div className="flex items-center justify-between gap-2">
                <span className="text-[13px] font-semibold text-ink">{suggestion.label}</span>
                <div className="flex items-center gap-1">
                  <Pill tone={suggestion.season === 'high' ? 'accent' : 'neutral'}>{suggestion.season}</Pill>
                  <Pill tone={suggestion.confidence === 'high' ? 'pos' : suggestion.confidence === 'medium' ? 'warn' : 'neg'}>
                    {suggestion.observations === 0 ? 'no data' : `${suggestion.observations}y`}
                  </Pill>
                </div>
              </div>
              <div className="mt-2 flex items-baseline gap-2">
                <span className="num text-[15px] font-semibold text-ink">{money(suggestion.suggestedAdr, 'PHP')}</span>
                <span className={cx('num text-[12px] font-medium', suggestion.rateChange > 0 ? 'text-pos' : suggestion.rateChange < 0 ? 'text-warn' : 'text-ink-3')}>
                  {suggestion.rateChange === 0 ? 'hold' : signedPct(suggestion.rateChange, 0)}
                </span>
                {suggestion.capBound ? (
                  <span className="text-[10px] text-ink-3" title="At your maximum allowed rate change, not an interior optimum">
                    at cap
                  </span>
                ) : null}
              </div>
              <div className="mt-1 text-[11px] text-ink-2">
                from {money(suggestion.currentAdr, 'PHP')} · occ {pct(suggestion.currentOccupancy, 0)} →{' '}
                {pct(suggestion.projectedOccupancy, 0)}
              </div>
              <div className="mt-1.5 flex items-center gap-1.5">
                <div className="h-1 flex-1 overflow-hidden rounded-full bg-surface-3">
                  <div
                    className="h-full rounded-full"
                    style={{
                      width: `${Math.min(100, Math.abs(suggestion.revparUplift) * 400)}%`,
                      background: suggestion.revparUplift > 0 ? STATUS.pos : STATUS.neutral,
                    }}
                  />
                </div>
                <span className="num text-[10.5px] text-ink-3">{signedPct(suggestion.revparUplift)} RevPAR</span>
              </div>
            </button>
          ))}
        </div>
      </Card>

      {active ? <CurveDetail suggestion={active} /> : null}

      <Card>
        <SectionHeader
          title="Demand by day of week"
          subtitle={
            weekendEvidence
              ? 'Friday and Saturday sell above your weekly average, which is what justifies a weekend premium.'
              : 'Your bookings do not show weekend nights selling above average. A weekend premium here would price out midweek guests without capturing extra demand — the uplift is left at zero for that reason.'
          }
        />
        <div className="grid grid-cols-7 gap-1.5">
          {weekdays.map((day) => {
            const maxNights = Math.max(...weekdays.map((d) => d.nights), 1)
            return (
              <div key={day.day} className="text-center">
                <div className="flex h-20 items-end justify-center">
                  <div
                    className="w-full rounded-t"
                    style={{
                      height: `${(day.nights / maxNights) * 100}%`,
                      background: day.suggestedUplift > 0 ? SERIES[0] : '#252a33',
                      minHeight: 2,
                    }}
                  />
                </div>
                <div className="mt-1 text-[10.5px] text-ink-2">{day.label}</div>
                <div className="num text-[10px] text-ink-3">{day.nights}</div>
                {day.suggestedUplift > 0 ? (
                  <div className="num text-[10px] text-pos">+{(day.suggestedUplift * 100).toFixed(0)}%</div>
                ) : null}
              </div>
            )
          })}
        </div>
      </Card>
    </div>
  )
}

function CurveDetail({ suggestion }: { suggestion: MonthSuggestion }) {
  const data = suggestion.curve.map((point) => ({
    change: point.rateChange * 100,
    revpar: point.revpar,
    occupancy: point.occupancy * 100,
    adr: point.adr,
  }))
  const best = data.find((point) => Math.abs(point.change - suggestion.rateChange * 100) < 0.01)

  return (
    <Card>
      <SectionHeader
        title={`${suggestion.label} — the whole curve`}
        subtitle="Every rate change on the x-axis, RevPAR on the y. The peak is the suggestion; how flat the curve is around it tells you how much the answer actually matters."
        right={<Legend items={[{ label: 'RevPAR', color: SERIES[0] }]} />}
      />

      <div className="grid gap-4 lg:grid-cols-[1.4fr_1fr]">
        <ChartFrame title="" height={220}>
          <LineChart data={data} margin={{ top: 8, right: 12, left: 0, bottom: 4 }}>
            <CartesianGrid {...GRID} />
            <XAxis dataKey="change" {...AXIS} tickFormatter={(value: number) => `${value > 0 ? '+' : ''}${value.toFixed(0)}%`} />
            <YAxis {...AXIS} tickFormatter={(value: number) => money(value, 'PHP', true)} width={52} domain={['auto', 'auto']} />
            <Tooltip
              {...TOOLTIP_STYLE}
              {...tooltipProps(
                (value) => [money(value, 'PHP'), 'RevPAR'],
                (label) => `Rate ${Number(label) > 0 ? '+' : ''}${Number(label).toFixed(0)}%`,
              )}
            />
            <ReferenceLine x={0} stroke={STATUS.neutral} strokeDasharray="3 3" />
            <Line type="monotone" dataKey="revpar" stroke={SERIES[0]} strokeWidth={2} dot={{ r: 3, strokeWidth: 0, fill: SERIES[0] }} />
            {best ? <ReferenceDot x={best.change} y={best.revpar} r={5} fill={STATUS.pos} stroke="#0b0d10" strokeWidth={2} /> : null}
          </LineChart>
        </ChartFrame>

        <div>
          <div className="mb-3 grid grid-cols-2 gap-2">
            <Detail label="Rate" from={money(suggestion.currentAdr, 'PHP')} to={money(suggestion.suggestedAdr, 'PHP')} />
            <Detail label="Occupancy" from={pct(suggestion.currentOccupancy, 0)} to={pct(suggestion.projectedOccupancy, 0)} />
            <Detail label="RevPAR" from={money(suggestion.currentRevpar, 'PHP')} to={money(suggestion.projectedRevpar, 'PHP')} />
            <Detail
              label="Nights sold"
              from={`${num(suggestion.currentOccupancy * 30, 0)}/mo`}
              to={`${num(suggestion.projectedOccupancy * 30, 0)}/mo`}
            />
          </div>
          <ul className="space-y-1.5">
            {suggestion.reasoning.map((line) => (
              <li key={line} className="flex gap-2 text-[12px] leading-relaxed text-ink-2">
                <span className="mt-[6px] h-1 w-1 shrink-0 rounded-full bg-ink-3" />
                {line}
              </li>
            ))}
          </ul>
        </div>
      </div>
    </Card>
  )
}

function Detail({ label, from, to }: { label: string; from: string; to: string }) {
  return (
    <div className="rounded-lg border border-line bg-surface-2 px-2.5 py-2">
      <div className="text-[10px] uppercase tracking-wide text-ink-3">{label}</div>
      <div className="num mt-0.5 flex items-baseline gap-1.5 text-[12px]">
        <span className="text-ink-3 line-through">{from}</span>
        <span className="text-ink-3">→</span>
        <span className="font-semibold text-ink">{to}</span>
      </div>
    </div>
  )
}
