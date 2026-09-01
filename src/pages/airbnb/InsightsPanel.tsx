import { useMemo } from 'react'
import { Bar, BarChart, CartesianGrid, Cell, ReferenceLine, Tooltip, XAxis, YAxis } from 'recharts'
import { useLedger } from '@/state/store'
import { buildInsights } from '@/domain/airbnb/insights'
import { Card, Pill, SectionHeader, cx } from '@/components/ui/primitives'
import { Stat, StatGrid } from '@/components/ui/Stat'
import { DataTable } from '@/components/ui/DataTable'
import { ChartFrame, Legend, tooltipProps } from '@/components/charts/Chart'
import { AXIS, GRID, SERIES, STATUS, TOOLTIP_STYLE } from '@/components/charts/theme'
import { FindingList } from '@/components/ui/FindingList'
import { money, num, pct, shortDate, signedPct } from '@/lib/format'
import { monthName } from '@/lib/dates'

/**
 * The "why" behind the P&L: what changed year on year, how far ahead people
 * book, who they are, how long they stay, and what a night actually has to
 * earn. Alongside the written findings for the property, so the computed
 * signals and the judgements about them sit in one place.
 */
export function InsightsPanel() {
  const { bookings, expenses, settings, dcf, pricing, findings, reports } = useLedger()

  const latestReport = useMemo(
    () => [...reports].sort((a, b) => b.reportedOn.localeCompare(a.reportedOn))[0] ?? null,
    [reports],
  )

  const insights = useMemo(
    () =>
      buildInsights(
        bookings,
        expenses,
        settings.usdPhp,
        dcf.availableNightsPerYear,
        pricing.highSeasonMonths,
      ),
    [bookings, expenses, settings.usdPhp, dcf.availableNightsPerYear, pricing.highSeasonMonths],
  )

  const islandFindings = useMemo(
    () => findings.filter((finding) => finding.section === 'airbnb'),
    [findings],
  )

  const { years, lead, countries, stays, season, pace, costs } = insights
  const latest = years[years.length - 1]
  const prior = years[years.length - 2]

  return (
    <div className="space-y-4">
      {latest && prior ? (
        <StatGrid>
          <Stat
            label={`Nights ${latest.year} vs ${prior.year}`}
            value={`${latest.nights} vs ${prior.nights}`}
            tone={latest.nights >= prior.nights ? 'pos' : 'neg'}
            sub={signedPct(prior.nights > 0 ? latest.nights / prior.nights - 1 : Number.NaN)}
          />
          <Stat
            label="ADR change"
            value={signedPct(prior.adr > 0 ? latest.adr / prior.adr - 1 : Number.NaN)}
            tone={latest.adr >= prior.adr ? 'pos' : 'neg'}
            sub={`${money(prior.adr, 'PHP')} → ${money(latest.adr, 'PHP')}`}
          />
          <Stat
            label="RevPAR change"
            value={signedPct(prior.revpar > 0 ? latest.revpar / prior.revpar - 1 : Number.NaN)}
            tone={latest.revpar >= prior.revpar ? 'pos' : 'neg'}
            sub="Rate and occupancy together — the one that counts"
          />
          <Stat
            label="Break-even"
            value={Number.isFinite(costs.breakEvenNights) ? `${Math.ceil(costs.breakEvenNights)} nights` : '—'}
            sub={
              Number.isFinite(costs.breakEvenOccupancy)
                ? `${pct(costs.breakEvenOccupancy, 0)} occupancy · you sold ${costs.latestNights}`
                : 'Needs cost data'
            }
            tone={costs.latestNights > costs.breakEvenNights ? 'pos' : 'warn'}
          />
        </StatGrid>
      ) : null}

      {latest && prior && latest.revpar < prior.revpar && latest.adr > prior.adr ? (
        <div className="rounded-lg border border-neg/30 bg-neg/[0.06] px-3.5 py-3 text-[12.5px] leading-relaxed text-ink-2">
          <p className="mb-1 font-semibold text-neg">Rate went up, revenue per available night went down.</p>
          <p>
            ADR rose {signedPct(latest.adr / prior.adr - 1)} while RevPAR fell{' '}
            {signedPct(latest.revpar / prior.revpar - 1)}. The higher rate did not pay for the nights it cost. That is
            the clearest single signal in this data, and it points at the Pricing tab rather than at costs.
          </p>
        </div>
      ) : null}

      <Card>
        <SectionHeader
          title="Year on year"
          subtitle="Every year on file, on the measures that matter. Revenue is the room, and margin runs on it."
        />
        <DataTable
          rows={years}
          getKey={(row) => row.year}
          pageSize={0}
          columns={[
            { key: 'year', header: 'Year', render: (r) => <span className="font-medium text-ink">{r.year}</span>, sortValue: (r) => r.year },
            { key: 'nights', header: 'Nights', align: 'right', render: (r) => String(r.nights), sortValue: (r) => r.nights },
            { key: 'occ', header: 'Occupancy', align: 'right', render: (r) => pct(r.occupancy, 1), sortValue: (r) => r.occupancy },
            { key: 'adr', header: 'ADR', align: 'right', render: (r) => money(r.adr, 'PHP'), sortValue: (r) => r.adr },
            { key: 'revpar', header: 'RevPAR', align: 'right', render: (r) => money(r.revpar, 'PHP'), sortValue: (r) => r.revpar },
            { key: 'room', header: 'Revenue', align: 'right', render: (r) => money(r.roomRevenue, 'PHP', true), sortValue: (r) => r.roomRevenue },
            {
              key: 'profit',
              header: 'Profit',
              align: 'right',
              render: (r) => (
                <span className={r.profit >= 0 ? 'text-pos' : 'text-neg'}>{money(r.profit, 'PHP', true)}</span>
              ),
              sortValue: (r) => r.profit,
            },
            { key: 'margin', header: 'Margin', align: 'right', hideOnMobile: true, render: (r) => (r.roomRevenue > 0 ? pct(r.margin, 0) : '—'), sortValue: (r) => r.margin },
          ]}
        />
      </Card>

      {pace ? (
        <Card>
          <ChartFrame
            title={`Pace — ${pace.year} against ${pace.priorYear}`}
            caption="Nights sold in each month, this year versus last. Bars below the line are months running behind. This is the view that tells you where to spend attention, and it needs two years to exist at all."
            right={
              <Legend
                items={[
                  { label: pace.priorYear, color: STATUS.neutral },
                  { label: pace.year, color: SERIES[0] },
                ]}
              />
            }
            height={230}
          >
            <BarChart
              data={pace.rows.map((row) => ({
                label: monthName(Number(row.month)),
                lastYear: row.lastYear,
                thisYear: row.thisYear,
              }))}
              margin={{ top: 8, right: 8, left: 0, bottom: 0 }}
              barGap={2}
            >
              <CartesianGrid {...GRID} />
              <XAxis dataKey="label" {...AXIS} />
              <YAxis {...AXIS} width={32} />
              <Tooltip
                {...TOOLTIP_STYLE}
                {...tooltipProps((value, name) => [
                  `${value} nights`,
                  name === 'lastYear' ? pace.priorYear : pace.year,
                ])}
              />
              <Bar dataKey="lastYear" name="lastYear" fill={STATUS.neutral} radius={[3, 3, 0, 0]} maxBarSize={16} />
              <Bar dataKey="thisYear" name="thisYear" radius={[3, 3, 0, 0]} maxBarSize={16}>
                {pace.rows.map((row) => (
                  <Cell key={row.month} fill={row.delta >= 0 ? SERIES[0] : STATUS.neg} />
                ))}
              </Bar>
            </BarChart>
          </ChartFrame>
          <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-4">
            {(() => {
              const behind = pace.rows.filter((row) => row.delta < 0)
              const ahead = pace.rows.filter((row) => row.delta > 0)
              const worst = [...behind].sort((a, b) => a.delta - b.delta)[0]
              return [
                { label: 'Months behind', value: String(behind.length), tone: behind.length > 6 ? 'neg' : 'warn' },
                { label: 'Months ahead', value: String(ahead.length), tone: 'pos' },
                {
                  label: 'Biggest shortfall',
                  value: worst ? `${monthName(Number(worst.month))} ${worst.delta}` : '—',
                  tone: 'neg',
                },
                {
                  label: 'Net nights',
                  value: String(pace.rows.reduce((sum, row) => sum + row.delta, 0)),
                  tone: pace.rows.reduce((sum, row) => sum + row.delta, 0) >= 0 ? 'pos' : 'neg',
                },
              ].map((tile) => (
                <div key={tile.label} className="rounded-lg border border-line bg-surface-2 px-2.5 py-2">
                  <div className="text-[10px] uppercase tracking-wide text-ink-3">{tile.label}</div>
                  <div
                    className={cx(
                      'num mt-0.5 text-[14px] font-semibold',
                      tile.tone === 'pos' ? 'text-pos' : tile.tone === 'neg' ? 'text-neg' : 'text-warn',
                    )}
                  >
                    {tile.value}
                  </div>
                </div>
              ))
            })()}
          </div>
        </Card>
      ) : null}

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <SectionHeader
            title="How far ahead people book"
            subtitle="A book filling later than it used to is the earliest warning of a demand problem — it shows months before occupancy moves."
          />
          {lead.sample === 0 ? (
            <p className="py-4 text-center text-[12px] text-ink-3">No booking dates recorded.</p>
          ) : (
            <>
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                <MiniStat label="Median lead" value={`${Math.round(lead.median)} days`} />
                <MiniStat label="Within 2 weeks" value={pct(lead.lastMinuteShare, 0)} />
                <MiniStat label="Over 90 days" value={pct(lead.farOutShare, 0)} />
              </div>
              <div className="mt-3 space-y-1.5">
                {lead.byYear.map((row) => (
                  <div key={row.year} className="flex items-center gap-2.5">
                    <span className="num w-10 shrink-0 text-[12px] text-ink-2">{row.year}</span>
                    <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-surface-2">
                      <div
                        className="h-full rounded-full bg-accent/60"
                        style={{ width: `${Math.min(100, (row.median / 180) * 100)}%` }}
                      />
                    </div>
                    <span className="num w-24 shrink-0 text-right text-[11px] text-ink-3">
                      {Math.round(row.median)}d · n={row.sample}
                    </span>
                  </div>
                ))}
              </div>
            </>
          )}
        </Card>

        <Card>
          <SectionHeader
            title="Season concentration"
            subtitle="How much of the year's earning is packed into the dry months. The higher the ratio, the less room there is to be wrong about high season."
          />
          <div className="grid grid-cols-2 gap-2">
            <MiniStat label="High-season RevPAR" value={money(season.highRevpar, 'PHP')} tone="pos" />
            <MiniStat label="Low-season RevPAR" value={money(season.lowRevpar, 'PHP')} />
            <MiniStat label="High-season nights" value={String(season.highNights)} />
            <MiniStat
              label="A high night is worth"
              value={Number.isFinite(season.ratio) ? `${num(season.ratio, 1)}×` : '—'}
              tone={season.ratio > 2 ? 'warn' : 'neutral'}
            />
          </div>
          <p className="mt-3 text-[11.5px] leading-relaxed text-ink-2">
            {Number.isFinite(season.ratio) && season.ratio > 1.5
              ? `A dry-season night earns ${num(season.ratio, 1)}× a wet-season one. Missing a high-season month is not a proportional loss — it is a multiple of one, which is why the pace chart above matters most for November through May.`
              : 'Earning is spread fairly evenly across the year, so no single month is critical.'}
          </p>
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <SectionHeader
            title="Where guests come from"
            subtitle="By revenue. Concentration in one market is a risk; a long tail means the listing is doing the work rather than a single referral source."
          />
          {countries.length === 0 ? (
            <p className="py-4 text-center text-[12px] text-ink-3">No guest country recorded in the imported sheet.</p>
          ) : (
            <div className="space-y-1.5">
              {countries.slice(0, 10).map((row) => (
                <div key={row.key} className="flex items-center gap-2.5">
                  <span className="w-28 shrink-0 truncate text-[12px] text-ink sm:w-36">{row.key}</span>
                  <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-surface-2">
                    <div className="h-full rounded-full bg-accent/60" style={{ width: `${row.share * 100}%` }} />
                  </div>
                  <span className="num w-24 shrink-0 text-right text-[11px] text-ink-3">
                    {row.bookings} · {pct(row.share, 0)}
                  </span>
                </div>
              ))}
            </div>
          )}
        </Card>

        <Card>
          <SectionHeader
            title="Shape of a stay"
            subtitle="Length, party size and who comes back. The stay you actually sell, rather than the one the listing describes."
          />
          <div className="grid grid-cols-2 gap-2">
            <MiniStat label="Median nights" value={Number.isFinite(stays.medianNights) ? num(stays.medianNights, 1) : '—'} />
            <MiniStat label="Median party" value={Number.isFinite(stays.medianParty) ? num(stays.medianParty, 0) : '—'} />
            <MiniStat label="Revenue from 6+ guests" value={pct(stays.largePartyShare, 0)} tone={stays.largePartyShare > 0.5 ? 'pos' : 'neutral'} />
            <MiniStat label="Repeat guests" value={String(stays.repeatGuests.length)} tone={stays.repeatGuests.length > 0 ? 'pos' : 'neutral'} />
          </div>
          {stays.nights.length > 0 ? (
            <ChartFrame title="" height={140}>
              <BarChart
                data={stays.nights.map((row) => ({ label: `${row.nights}n`, bookings: row.bookings }))}
                margin={{ top: 12, right: 4, left: 0, bottom: 0 }}
              >
                <CartesianGrid {...GRID} />
                <XAxis dataKey="label" {...AXIS} />
                <YAxis {...AXIS} width={26} />
                <Tooltip {...TOOLTIP_STYLE} {...tooltipProps((value) => [`${value} bookings`, 'Count'])} />
                <ReferenceLine y={0} stroke={AXIS.stroke} />
                <Bar dataKey="bookings" fill={SERIES[0]} radius={[3, 3, 0, 0]} maxBarSize={26} />
              </BarChart>
            </ChartFrame>
          ) : null}
          {stays.repeatGuests.length > 0 ? (
            <p className="mt-2 text-[11.5px] leading-relaxed text-ink-2">
              Returning:{' '}
              <span className="text-ink">
                {stays.repeatGuests.slice(0, 4).map((guest) => `${guest.name} (${guest.stays})`).join(', ')}
              </span>
              . At this size a repeat guest is worth more than a rate rise.
            </p>
          ) : null}
        </Card>
      </div>

      <Card>
        <SectionHeader
          title="What a night has to earn"
          subtitle="Fixed costs run whether or not anyone books. Everything above break-even is close to pure margin, which is why nights matter more here than rate."
        />
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          <MiniStat label="Fixed costs / year" value={money(costs.fixedPerYear, 'PHP', true)} />
          <MiniStat label="Variable / night" value={money(costs.variablePerNight, 'PHP')} />
          <MiniStat label="Contribution / night" value={money(costs.contributionPerNight, 'PHP')} tone="pos" />
          <MiniStat
            label="Break-even"
            value={Number.isFinite(costs.breakEvenNights) ? `${Math.ceil(costs.breakEvenNights)} nights` : '—'}
            tone="warn"
          />
        </div>
      </Card>

      <MarketWatch report={latestReport} />

      <div>
        <SectionHeader
          title="Written findings"
          subtitle="Judgements about this property, each with its evidence and one next step. Work them through here or on the Analysis tab — it's the same list."
          right={
            <Pill tone={islandFindings.some((f) => f.status === 'open' && f.severity === 'critical') ? 'neg' : 'warn'}>
              {islandFindings.filter((f) => f.status === 'open' || f.status === 'doing').length} open
            </Pill>
          }
        />
        <FindingList findings={islandFindings} />
      </div>
    </div>
  )
}

/**
 * What the market watch is saying, on the same page as everything else.
 *
 * The competitor report is a separate document arriving on its own cadence,
 * and left on its own tab it becomes something read once and forgotten. The
 * parts of it that are conclusions rather than prices belong next to the
 * property's own signals — that is where they get acted on. This fills itself
 * from whatever the most recent report said, so a new one flows through here
 * without anyone rewriting anything.
 */
function MarketWatch({ report }: { report: import('@/types').MarketReport | null }) {
  if (!report) return null
  const lines = [
    ...report.changes.map((text) => ({ text, kind: 'changed' as const })),
    ...report.takeaways.map((text) => ({ text, kind: 'means' as const })),
  ]
  if (lines.length === 0 && report.triggers.length === 0) return null

  return (
    <div>
      <SectionHeader
        title="From the market watch"
        subtitle={`The ${shortDate(report.reportedOn)} competitor report, in its own words. Rates and the full report live on the Competitors tab; what is here is the part that changes what to do.`}
        right={
          report.supplyCount !== null && report.supplyPrevious !== null ? (
            <Pill tone={report.supplyCount > report.supplyPrevious ? 'warn' : 'info'}>
              {report.supplyPrevious} → {report.supplyCount} homes nearby
            </Pill>
          ) : null
        }
      />
      <Card>
        {report.bottomLine ? (
          <p className="mb-3 max-w-3xl border-l-2 border-accent/40 pl-3 text-[12px] leading-relaxed text-ink-2">
            {report.bottomLine}
          </p>
        ) : null}
        <ul className="space-y-2">
          {lines.map((line) => (
            <li key={line.text} className="flex gap-2 text-[12px] leading-relaxed text-ink-2">
              <span
                className={cx(
                  'mt-[6px] h-1 w-1 shrink-0 rounded-full',
                  line.kind === 'changed' ? 'bg-accent' : 'bg-ink-3',
                )}
              />
              <span>{line.text}</span>
            </li>
          ))}
        </ul>
        {report.triggers.length > 0 ? (
          <div className="mt-3 rounded-lg border border-warn/25 bg-warn/[0.05] px-3 py-2">
            <p className="text-[11.5px] font-semibold text-warn">Act fast if these happen</p>
            <ul className="mt-1 space-y-1">
              {report.triggers.map((line) => (
                <li key={line} className="text-[11.5px] leading-relaxed text-ink-2">
                  {line}
                </li>
              ))}
            </ul>
          </div>
        ) : null}
      </Card>
    </div>
  )
}

function MiniStat({
  label,
  value,
  tone = 'neutral',
}: {
  label: string
  value: string
  tone?: 'pos' | 'neg' | 'warn' | 'neutral'
}) {
  const tones = { pos: 'text-pos', neg: 'text-neg', warn: 'text-warn', neutral: 'text-ink' }
  return (
    <div className="rounded-lg border border-line bg-surface-2 px-2.5 py-2">
      <div className="text-[10px] uppercase tracking-wide text-ink-3">{label}</div>
      <div className={cx('num mt-0.5 text-[14px] font-semibold', tones[tone])}>{value}</div>
    </div>
  )
}
