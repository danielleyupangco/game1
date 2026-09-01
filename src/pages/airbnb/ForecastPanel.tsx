import { useMemo } from 'react'
import {
  Area,
  Bar,
  CartesianGrid,
  ComposedChart,
  Line,
  LineChart,
  ReferenceLine,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { useLedger } from '@/state/store'
import { aggregate, monthlyMetrics, trailing } from '@/domain/airbnb/metrics'
import { businessCash } from '@/domain/investments/ownership'
import { latestSnapshot } from '@/domain/investments/portfolio'
import { buildCashForecast, buildForecast } from '@/domain/airbnb/forecast'
import { Card, Pill, SectionHeader, Tabs } from '@/components/ui/primitives'
import { AssumptionInput } from '@/components/ui/AssumptionInput'
import { Stat, StatGrid } from '@/components/ui/Stat'
import { DataTable } from '@/components/ui/DataTable'
import { EmptyState } from '@/components/ui/EmptyState'
import { ChartFrame, Legend, tooltipProps } from '@/components/charts/Chart'
import { AXIS, GRID, SERIES, STATUS, TOOLTIP_STYLE } from '@/components/charts/theme'
import { money, monthLabel, pct } from '@/lib/format'

/**
 * What the next twelve months look like.
 *
 * Built by separating what is already reserved from what history says will
 * still arrive, rather than by extending a line through last year. The pickup
 * half comes from your own booking dates: how much of a month is usually on
 * the books this far out.
 */
export function ForecastPanel() {
  const {
    bookings,
    expenses,
    settings,
    dcf,
    costModel,
    forecast: assumptions,
    saveForecast,
    projects,
    capitalSpend,
    holdings,
    snapshots,
  } = useLedger()

  /**
   * The starting balance, taken from the bank rather than typed in.
   *
   * The Island T operating account is already in the holdings, so the runway
   * should start from it instead of from a number someone has to remember to
   * update. A figure entered by hand still wins — this is a default, not a
   * lock.
   */
  const snapshot = useMemo(() => latestSnapshot(snapshots), [snapshots])
  const bankBalance = useMemo(
    () => businessCash(snapshot ? holdings.filter((h) => h.snapshotId === snapshot.id) : [], snapshot?.usdPhp ?? settings.usdPhp),
    [holdings, snapshot, settings.usdPhp],
  )
  const openingCash = assumptions.openingCash > 0 ? assumptions.openingCash : bankBalance

  const series = useMemo(
    () =>
      monthlyMetrics({
        bookings,
        expenses,
        capitalSpend,
        usdPhp: settings.usdPhp,
        availableNightsPerYear: dcf.availableNightsPerYear,
      }),
    [bookings, expenses, capitalSpend, settings.usdPhp, dcf.availableNightsPerYear],
  )

  const forecast = useMemo(
    () =>
      buildForecast({
        bookings,
        series,
        assumptions,
        availableNightsPerYear: dcf.availableNightsPerYear,
      }),
    [bookings, series, assumptions, dcf.availableNightsPerYear],
  )

  const actual = useMemo(() => (series.length > 0 ? aggregate(trailing(series, 12)) : null), [series])
  void actual
  // The forecast projects the room business. Add-ons are the crew's trade and
  // are forecast nowhere — see the Add-ons tab for what flows through them.
  const addOnPerNight = 0

  // Unspent budget on active projects, treated as cash that will leave the
  // account. Spread evenly over the horizon: nobody knows the real timing, and
  // pretending otherwise would make the runway look precise when it isn't.
  const plannedCapex = useMemo(() => {
    const outstanding = projects
      .filter((project) => project.status !== 'done' && project.capex > 0)
      .map((project) => {
        const spent = capitalSpend
          .filter((row) => row.projectId === project.id)
          .reduce((sum, row) => sum + row.amount, 0)
        return Math.max(0, project.capex - spent)
      })
      .reduce((sum, amount) => sum + amount, 0)
    if (outstanding === 0 || !assumptions.includeCapex) return []
    const perMonth = outstanding / Math.max(1, forecast.months.length)
    return forecast.months.map((month) => ({ month: month.month, amount: perMonth }))
  }, [projects, capitalSpend, forecast.months, assumptions.includeCapex])

  const outstandingCapex = useMemo(
    () =>
      projects
        .filter((project) => project.status !== 'done' && project.capex > 0)
        .reduce((sum, project) => {
          const spent = capitalSpend
            .filter((row) => row.projectId === project.id)
            .reduce((total, row) => total + row.amount, 0)
          return sum + Math.max(0, project.capex - spent)
        }, 0),
    [projects, capitalSpend],
  )

  const cash = useMemo(
    () => buildCashForecast(forecast, costModel, openingCash, addOnPerNight, plannedCapex),
    [forecast, costModel, openingCash, addOnPerNight, plannedCapex],
  )

  if (bookings.length === 0) {
    return (
      <EmptyState
        title="Nothing to forecast from"
        body="A forecast needs history to learn how far ahead people book, and reservations to build on. Import or add bookings and this fills in."
        dataset="bookings"
      />
    )
  }

  const totalRevenue = forecast.months.reduce((sum, m) => sum + m.expectedRevenue + m.expected * addOnPerNight, 0)
  const lowRevenue = forecast.months.reduce((sum, m) => sum + m.lowRevenue + m.low * addOnPerNight, 0)
  const highRevenue = forecast.months.reduce((sum, m) => sum + m.highRevenue + m.high * addOnPerNight, 0)
  const capacity = forecast.months.reduce((sum, m) => sum + m.availableNights, 0)

  const chartData = forecast.months.map((month) => ({
    month: month.month,
    booked: month.booked,
    pickup: Math.max(0, month.expected - month.booked),
    low: month.low,
    high: month.high,
  }))

  return (
    <div className="space-y-4">
      <Card className="border-accent/25 bg-accent/[0.04]">
        <div className="flex gap-3">
          <span className="mt-0.5 text-[14px] text-accent">◷</span>
          <div>
            <h3 className="text-[13px] font-semibold text-ink">How this is worked out</h3>
            <p className="mt-1 max-w-3xl text-[12px] leading-relaxed text-ink-2">
              Not by drawing a line through last year. Each month is{' '}
              <span className="text-ink">what is already reserved</span> plus{' '}
              <span className="text-ink">what history says will still come in</span> — measured from your own booking
              dates, which show a month is typically{' '}
              {Number.isFinite(forecast.curve.medianLead) ? (
                <>
                  half-sold about{' '}
                  <span className="num text-ink">{Math.round(forecast.curve.medianLead)} days</span> before arrival
                </>
              ) : (
                'sold well in advance'
              )}
              . A month can never be forecast below what is already booked, or above what you can physically sell.
            </p>
          </div>
        </div>
      </Card>

      {forecast.thin ? (
        <div className="rounded-lg border border-warn/30 bg-warn/5 px-3 py-2.5 text-[12px] leading-relaxed text-warn">
          The booking curve rests on {forecast.curve.sample} past reservations. That is enough to see the shape but not
          enough to be precise — treat the range as the answer and the middle number as a guess within it.
        </div>
      ) : null}

      <StatGrid>
        <Stat
          label="Already booked"
          value={`${forecast.totals.booked} nights`}
          sub={`${pct(forecast.totals.booked / Math.max(1, capacity), 0)} of the next ${forecast.months.length} months`}
        />
        <Stat
          label="Expected to sell"
          value={`${Math.round(forecast.totals.expected)} nights`}
          tone={forecast.totals.expected > forecast.totals.booked ? 'pos' : 'neutral'}
          sub={`between ${Math.round(forecast.totals.low)} and ${Math.round(forecast.totals.high)}`}
        />
        <Stat
          label="Expected revenue"
          value={money(totalRevenue, 'PHP', true)}
          sub={`${money(lowRevenue, 'PHP', true)} – ${money(highRevenue, 'PHP', true)} · rooms only`}
        />
        <Stat
          label="Cash at the end"
          value={money(cash.months[cash.months.length - 1]?.closing ?? 0, 'PHP', true)}
          tone={cash.runsOutIn !== null ? 'neg' : 'pos'}
          sub={
            openingCash === 0
              ? 'Starting balance not set yet'
              : cash.runsOutIn !== null
                ? `Runs short in ${monthLabel(cash.months[cash.runsOutIn].month)}`
                : `Lowest point ${money(cash.lowest?.closing ?? 0, 'PHP', true)}`
          }
          hint={
            assumptions.includeCapex && outstandingCapex > 0
              ? 'Includes the building work still budgeted. The Cash section below lets you see operations on their own.'
              : 'Running costs and revenue only — no building work counted.'
          }
        />
      </StatGrid>

      <Card>
        <ChartFrame
          title="Nights, month by month"
          caption="Solid is what is already reserved. The lighter block on top is what history says will still be booked. The line is the cautious case — where you land if pickup disappoints."
          right={
            <Legend
              items={[
                { label: 'Booked', color: SERIES[0] },
                { label: 'Expected pickup', color: SERIES[2] },
                { label: 'Cautious', color: STATUS.warn },
              ]}
            />
          }
          height={260}
        >
          <ComposedChart data={chartData} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
            <CartesianGrid {...GRID} />
            <XAxis dataKey="month" {...AXIS} tickFormatter={monthLabel} minTickGap={12} />
            <YAxis {...AXIS} width={32} />
            <Tooltip
              {...TOOLTIP_STYLE}
              {...tooltipProps(
                (value, name) => [
                  `${Math.round(value)} nights`,
                  name === 'booked' ? 'Already booked' : name === 'pickup' ? 'Expected pickup' : 'Cautious case',
                ],
                (label) => monthLabel(label),
              )}
            />
            <Bar dataKey="booked" name="booked" stackId="n" fill={SERIES[0]} maxBarSize={30} />
            <Bar dataKey="pickup" name="pickup" stackId="n" fill={SERIES[2]} fillOpacity={0.55} radius={[4, 4, 0, 0]} maxBarSize={30} />
            <Line type="monotone" dataKey="low" name="low" stroke={STATUS.warn} strokeWidth={2} dot={false} />
          </ComposedChart>
        </ChartFrame>
      </Card>

      <Card>
        <SectionHeader
          title="Month by month"
          subtitle="A month with no comparable history says so rather than inventing a number. “Typically booked by now” is the share of a month's final business that is usually on the books this far out."
        />
        <DataTable
          rows={forecast.months}
          getKey={(row) => row.month}
          pageSize={0}
          columns={[
            { key: 'month', header: 'Month', render: (r) => <span className="font-medium text-ink">{monthLabel(r.month)}</span>, sortValue: (r) => r.month },
            { key: 'booked', header: 'Booked', align: 'right', render: (r) => String(r.booked), sortValue: (r) => r.booked },
            {
              key: 'share',
              header: 'Typically booked by now',
              align: 'right',
              hideOnMobile: true,
              render: (r) =>
                Number.isFinite(r.shareTypicallyBooked) ? (
                  <span className={r.booked / Math.max(1, r.expected) < r.shareTypicallyBooked * 0.7 ? 'text-warn' : 'text-ink-2'}>
                    {pct(r.shareTypicallyBooked, 0)}
                  </span>
                ) : (
                  <span className="text-ink-3">—</span>
                ),
            },
            {
              key: 'expected',
              header: 'Expected',
              align: 'right',
              render: (r) => (
                <span className="text-ink">
                  {Math.round(r.expected)}
                  <span className="ml-1 text-[11px] text-ink-3">
                    ({Math.round(r.low)}–{Math.round(r.high)})
                  </span>
                </span>
              ),
              sortValue: (r) => r.expected,
            },
            { key: 'occ', header: 'Occupancy', align: 'right', hideOnMobile: true, render: (r) => pct(r.expected / Math.max(1, r.availableNights), 0), sortValue: (r) => r.expected / r.availableNights },
            { key: 'adr', header: 'Rate', align: 'right', hideOnMobile: true, render: (r) => money(r.adr, 'PHP'), sortValue: (r) => r.adr },
            { key: 'revenue', header: 'Revenue', align: 'right', render: (r) => money(r.expectedRevenue + r.expected * addOnPerNight, 'PHP', true), sortValue: (r) => r.expectedRevenue },
            {
              key: 'basis',
              header: 'Based on',
              hideOnMobile: true,
              render: (r) =>
                r.capped ? (
                  <Pill tone="pos">full</Pill>
                ) : r.history === 0 ? (
                  <Pill tone="warn">no history</Pill>
                ) : (
                  <span className="text-[11px] text-ink-3">
                    {r.history} past year{r.history === 1 ? '' : 's'}
                  </span>
                ),
            },
          ]}
        />
      </Card>

      <Card>
        <SectionHeader
          title="Cash"
          subtitle="Profit and cash are not the same thing. Capital spend leaves the bank without touching the P&L, which is exactly how a profitable business runs out of money."
        />
        {openingCash === 0 ? (
          <p className="mb-3 rounded-lg border border-warn/25 bg-warn/[0.06] px-3 py-2 text-[12px] leading-relaxed text-ink-2">
            The starting balance is still zero, so this line begins from nothing and will show a shortfall almost
            immediately. Put today's actual business account balance in below and the rest of the picture becomes real.
          </p>
        ) : assumptions.openingCash === 0 ? (
          <p className="mb-3 rounded-lg border border-line bg-surface-2 px-3 py-2 text-[12px] leading-relaxed text-ink-2">
            Starting from {money(bankBalance, 'PHP', true)} — the Island T operating account as it stands in the
            holdings, so this stays current on its own. Type a figure below to override it.
          </p>
        ) : null}
        <div className="mb-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <AssumptionInput
            label="Cash in the account now"
            value={openingCash}
            kind="money"
            step={50000}
            onChange={(next) => void saveForecast({ openingCash: next })}
            note={
              assumptions.openingCash === 0 && bankBalance > 0
                ? 'Linked to the Island T operating account in the holdings. Type over it to use your own figure.'
                : 'The business account balance today.'
            }
          />
          <AssumptionInput
            label="Rate growth a year"
            value={assumptions.adrGrowth}
            kind="percent"
            onChange={(next) => void saveForecast({ adrGrowth: next })}
            note="Applied to expected rates as the forecast runs forward."
          />
          <AssumptionInput
            label="Cautious pickup"
            value={assumptions.lowFactor}
            kind="number"
            step={0.05}
            suffix="×"
            onChange={(next) => void saveForecast({ lowFactor: Math.max(0, next) })}
            note="Share of the usual pickup that still arrives in the bad case."
          />
          <AssumptionInput
            label="Hopeful pickup"
            value={assumptions.highFactor}
            kind="number"
            step={0.05}
            suffix="×"
            onChange={(next) => void saveForecast({ highFactor: Math.max(1, next) })}
            note="Applies only to nights not yet booked."
          />
        </div>

        {outstandingCapex > 0 ? (
          <div className="mb-3 rounded-lg border border-line bg-surface-2 p-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="text-[12px] font-medium text-ink">
                Building work still budgeted: {money(outstandingCapex, 'PHP', true)}
              </span>
              <Tabs
                value={assumptions.includeCapex ? 'with' : 'without'}
                onChange={(next) => void saveForecast({ includeCapex: next === 'with' })}
                options={[
                  { value: 'with', label: 'Count it' },
                  { value: 'without', label: 'Operations only' },
                ]}
              />
            </div>
            <p className="mt-2 text-[11.5px] leading-relaxed text-ink-2">
              {assumptions.includeCapex
                ? 'Spread evenly across the horizon, because nobody knows the real timing and pretending otherwise would make the runway look more precise than it is. It is the bigger half of the cash picture, so switch to operations only to see whether the business itself covers its costs — and mark a project done on the Capital tab to take it out for good.'
                : 'Left out, so this line shows whether the business covers its own running costs before any building work. The money is still committed — switch back to count it before deciding what the account can take.'}
            </p>
          </div>
        ) : null}

        <ChartFrame
          title=""
          caption="Where the bank balance goes, month by month. Below the line means you would need to put money in."
          height={220}
        >
          <LineChart
            data={cash.months.map((month) => ({ month: month.month, closing: month.closing }))}
            margin={{ top: 8, right: 8, left: 0, bottom: 0 }}
          >
            <CartesianGrid {...GRID} />
            <XAxis dataKey="month" {...AXIS} tickFormatter={monthLabel} minTickGap={12} />
            <YAxis {...AXIS} width={56} tickFormatter={(value: number) => money(value, 'PHP', true)} />
            <Tooltip
              {...TOOLTIP_STYLE}
              {...tooltipProps((value) => [money(value, 'PHP'), 'Cash at month end'], (label) => monthLabel(label))}
            />
            <ReferenceLine y={0} stroke={STATUS.neg} strokeDasharray="4 3" />
            <Line type="monotone" dataKey="closing" stroke={SERIES[0]} strokeWidth={2} dot={{ r: 2.5, strokeWidth: 0, fill: SERIES[0] }} />
          </LineChart>
        </ChartFrame>

        <div className="mt-3">
          <DataTable
            rows={cash.months}
            getKey={(row) => row.month}
            pageSize={0}
            columns={[
              { key: 'month', header: 'Month', render: (r) => monthLabel(r.month), sortValue: (r) => r.month },
              { key: 'in', header: 'Money in', align: 'right', render: (r) => <span className="text-pos">{money(r.revenue, 'PHP', true)}</span>, sortValue: (r) => r.revenue },
              { key: 'fixed', header: 'Fixed costs', align: 'right', hideOnMobile: true, render: (r) => money(r.fixedCost, 'PHP', true) },
              { key: 'variable', header: 'Guest costs', align: 'right', hideOnMobile: true, render: (r) => money(r.variableCost, 'PHP', true) },
              { key: 'capex', header: 'Property spend', align: 'right', hideOnMobile: true, render: (r) => (r.capex > 0 ? money(r.capex, 'PHP', true) : <span className="text-ink-3">—</span>) },
              { key: 'net', header: 'Net', align: 'right', render: (r) => <span className={r.net >= 0 ? 'text-pos' : 'text-neg'}>{money(r.net, 'PHP', true)}</span>, sortValue: (r) => r.net },
              {
                key: 'closing',
                header: 'In the bank',
                align: 'right',
                render: (r) => <span className={r.short ? 'text-neg' : 'text-ink'}>{money(r.closing, 'PHP', true)}</span>,
                sortValue: (r) => r.closing,
              },
            ]}
          />
        </div>
      </Card>

      <Card>
        <SectionHeader
          title="The booking curve"
          subtitle="Share of a month's eventual nights that are usually on the books, by how far out you are. This is what turns today's reservations into a forecast."
        />
        <ChartFrame title="" height={200}>
          <ComposedChart
            data={[...forecast.curve.points].reverse().map((point) => ({
              daysOut: point.daysOut,
              share: Number.isFinite(point.share) ? point.share * 100 : null,
            }))}
            margin={{ top: 8, right: 8, left: 0, bottom: 0 }}
          >
            <CartesianGrid {...GRID} />
            <XAxis
              dataKey="daysOut"
              {...AXIS}
              tickFormatter={(value: number) => (value === 0 ? 'start' : `${value}d`)}
              reversed
            />
            <YAxis {...AXIS} width={38} tickFormatter={(value: number) => `${value}%`} domain={[0, 100]} />
            <Tooltip
              {...TOOLTIP_STYLE}
              {...tooltipProps(
                (value) => [`${Math.round(value)}% on the books`, 'Typically'],
                (label) => (Number(label) === 0 ? 'month start' : `${label} days before`),
              )}
            />
            <Area type="monotone" dataKey="share" stroke={SERIES[2]} fill={SERIES[2]} fillOpacity={0.15} strokeWidth={2} />
          </ComposedChart>
        </ChartFrame>
        <p className="mt-2 text-[11.5px] leading-relaxed text-ink-2">
          Read it right to left. Built from {forecast.curve.sample} past reservations across{' '}
          {new Set(bookings.map((b) => b.checkIn.slice(0, 7))).size} months. A month sitting well below this line for
          its horizon is behind — and that is visible months before it shows up in revenue.
        </p>
      </Card>
    </div>
  )
}
