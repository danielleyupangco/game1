import { useMemo, useState } from 'react'
import {
  Bar,
  BarChart,
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
import {
  aggregate,
  channelBreakdown,
  costBreakdown,
  isActive,
  monthlyMetrics,
  seasonality,
  trailing,
  type MonthMetrics,
} from '@/domain/airbnb/metrics'
import { Card, Pill, SectionHeader, Tabs, cx } from '@/components/ui/primitives'
import { Stat, StatGrid } from '@/components/ui/Stat'
import { DataTable } from '@/components/ui/DataTable'
import { EmptyState } from '@/components/ui/EmptyState'
import { ExportButton } from '@/components/ui/ExportButton'
import { Freshness } from '@/components/ui/Freshness'
import { ChartFrame, Legend, tooltipProps } from '@/components/charts/Chart'
import { AXIS, GRID, SERIES, STATUS, TOOLTIP_STYLE } from '@/components/charts/theme'
import { useProvenance, provFormats } from '@/components/ui/Provenance'
import { money, monthLabel, pct, shortDate } from '@/lib/format'
import { monthName } from '@/lib/dates'
import { exportTable, MONEY_FMT, PCT_FMT } from '@/lib/export'
import { ValuationPanel } from '@/pages/airbnb/ValuationPanel'
import { PricingPanel } from '@/pages/airbnb/PricingPanel'

type View = 'revenue' | 'costs' | 'pnl' | 'valuation' | 'pricing'

export function AirbnbPage() {
  const { bookings, expenses, settings, dcf, freshness } = useLedger()
  const [view, setView] = useState<View>('revenue')

  const series = useMemo(
    () =>
      monthlyMetrics({
        bookings,
        expenses,
        usdPhp: settings.usdPhp,
        availableNightsPerYear: dcf.availableNightsPerYear,
      }),
    [bookings, expenses, settings.usdPhp, dcf.availableNightsPerYear],
  )

  if (bookings.length === 0 && expenses.length === 0) {
    return (
      <div className="space-y-4">
        <SectionHeader title="Island T" subtitle="3BR/3BA private island retreat · Culion, Palawan" />
        <EmptyState
          title="No booking or expense data yet"
          body="Import a bookings sheet and this fills in: ADR, occupancy, RevPAR and seasonality. Add expenses and it extends into P&L, cost per available night, a DCF valuation and pricing suggestions built on your own numbers rather than assumed ones."
          dataset="bookings"
        />
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <SectionHeader
        title="Island T"
        subtitle="3BR/3BA private island retreat · Culion, Palawan"
        right={
          <div className="flex items-center gap-1.5">
            <Freshness timestamp={freshness.bookings} label="bookings" />
            <Freshness timestamp={freshness.expenses} label="expenses" />
          </div>
        }
      />

      <div className="no-print overflow-x-auto">
        <Tabs
          value={view}
          onChange={setView}
          options={[
            { value: 'revenue', label: 'Revenue' },
            { value: 'costs', label: 'Costs' },
            { value: 'pnl', label: 'P&L' },
            { value: 'valuation', label: 'Valuation' },
            { value: 'pricing', label: 'Pricing' },
          ]}
        />
      </div>

      {view === 'revenue' ? <RevenueView series={series} /> : null}
      {view === 'costs' ? <CostView series={series} /> : null}
      {view === 'pnl' ? <PnlView series={series} /> : null}
      {view === 'valuation' ? <ValuationPanel series={series} /> : null}
      {view === 'pricing' ? <PricingPanel series={series} /> : null}
    </div>
  )
}

// --- Revenue ---------------------------------------------------------------

function RevenueView({ series }: { series: MonthMetrics[] }) {
  const { bookings, settings } = useLedger()
  const { trace } = useProvenance()

  const t12 = useMemo(() => aggregate(trailing(series, 12)), [series])
  const season = useMemo(() => seasonality(series), [series])
  const channels = useMemo(() => channelBreakdown(bookings, settings.usdPhp), [bookings, settings.usdPhp])
  const active = useMemo(() => bookings.filter(isActive), [bookings])

  if (bookings.length === 0) {
    return (
      <EmptyState
        title="No bookings imported"
        body="Revenue, ADR, occupancy and RevPAR all come from the bookings sheet. Costs alone can't produce them."
        dataset="bookings"
      />
    )
  }

  const monthData = series.map((month) => ({
    month: month.month,
    revenue: month.revenue,
    addOns: month.addOnRevenue,
    occupancy: month.occupancy * 100,
    adr: month.adr,
    revpar: month.revpar,
  }))
  const hasAddOns = series.some((month) => month.addOnRevenue > 0)

  return (
    <div className="space-y-4">
      <StatGrid>
        <Stat
          label="Revenue (T12M)"
          value={money(t12.totalRevenue, 'PHP', true)}
          sub={
            t12.addOnRevenue > 0
              ? `${money(t12.revenue, 'PHP', true)} rooms + ${money(t12.addOnRevenue, 'PHP', true)} add-ons · ${t12.bookings} bookings`
              : `${t12.bookings} bookings · ${t12.nightsSold} nights sold`
          }
          onTrace={() =>
            trace({
              title: 'Trailing-12-month revenue',
              description:
                'Net payout from every non-cancelled booking, apportioned across the months each stay actually covers.',
              rows: active,
              columns: [
                { key: 'confirmationCode', label: 'Code' },
                { key: 'checkIn', label: 'Check-in', format: provFormats.date },
                { key: 'nights', label: 'Nights' },
                { key: 'netRevenue', label: 'Net', format: provFormats.money },
                { key: 'channel', label: 'Channel' },
              ],
            })
          }
        />
        <Stat label="ADR" value={money(t12.adr, 'PHP')} sub="Revenue ÷ nights sold" />
        <Stat
          label="Occupancy"
          value={pct(t12.occupancy)}
          sub={`${t12.nightsSold} of ${t12.availableNights} available nights`}
          tone={t12.occupancy < 0.3 ? 'warn' : 'neutral'}
        />
        <Stat
          label="RevPAR"
          value={money(t12.revpar, 'PHP')}
          sub="Revenue ÷ available nights — catches a great rate on an empty house"
        />
      </StatGrid>

      <Card>
        <ChartFrame
          title="Monthly revenue"
          caption={
            hasAddOns
              ? 'Room payout recognised over the nights stayed, with the share of catering, boat and tour revenue you keep stacked on top. A stay spanning month-end reports on both sides rather than spiking one month.'
              : 'Net payout recognised over the nights stayed, so a stay spanning month-end reports on both sides rather than spiking one month.'
          }
          right={
            hasAddOns ? (
              <Legend items={[{ label: 'Rooms', color: SERIES[0] }, { label: 'Add-ons kept', color: SERIES[2] }]} />
            ) : undefined
          }
          height={230}
        >
          <BarChart data={monthData} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
            <CartesianGrid {...GRID} />
            <XAxis dataKey="month" {...AXIS} tickFormatter={monthLabel} minTickGap={16} />
            <YAxis {...AXIS} tickFormatter={(value: number) => money(value, 'PHP', true)} width={56} />
            <Tooltip
              {...TOOLTIP_STYLE}
              {...tooltipProps(
                (value, name) => [money(value, 'PHP'), name === 'addOns' ? 'Add-ons kept' : 'Rooms'],
                (label) => monthLabel(label),
              )}
            />
            <Bar dataKey="revenue" name="revenue" stackId="rev" fill={SERIES[0]} maxBarSize={34} />
            {hasAddOns ? (
              <Bar dataKey="addOns" name="addOns" stackId="rev" fill={SERIES[2]} radius={[4, 4, 0, 0]} maxBarSize={34} />
            ) : null}
          </BarChart>
        </ChartFrame>
      </Card>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <ChartFrame
            title="Occupancy by month"
            caption="Share of available nights sold. Read this against the revenue chart above — the two move together only when rate is holding."
            height={210}
          >
            <LineChart data={monthData} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
              <CartesianGrid {...GRID} />
              <XAxis dataKey="month" {...AXIS} tickFormatter={monthLabel} minTickGap={20} />
              <YAxis {...AXIS} tickFormatter={(value: number) => `${value.toFixed(0)}%`} width={40} domain={[0, 100]} />
              <Tooltip
                {...TOOLTIP_STYLE}
                {...tooltipProps((value) => [`${value.toFixed(1)}%`, 'Occupancy'], (label) => monthLabel(label))}
              />
              <Line type="monotone" dataKey="occupancy" stroke={SERIES[2]} strokeWidth={2} dot={{ r: 2.5, strokeWidth: 0, fill: SERIES[2] }} />
            </LineChart>
          </ChartFrame>
        </Card>

        <Card>
          <ChartFrame
            title="Seasonality"
            caption="Each calendar month averaged across every year on file. Culion's dry season runs roughly November to May — this is where you find out whether your bookings agree."
            right={<Legend items={[{ label: 'RevPAR', color: SERIES[0] }, { label: 'Occupancy', color: SERIES[2] }]} />}
            height={210}
          >
            <ComposedChart
              data={season.map((point) => ({
                label: monthName(point.monthIndex),
                revpar: point.revpar,
                occupancy: point.occupancy * 100,
                years: point.years,
              }))}
              margin={{ top: 8, right: 8, left: 0, bottom: 0 }}
            >
              <CartesianGrid {...GRID} />
              <XAxis dataKey="label" {...AXIS} />
              <YAxis {...AXIS} tickFormatter={(value: number) => money(value, 'PHP', true)} width={52} />
              <Tooltip
                {...TOOLTIP_STYLE}
                {...tooltipProps((value, name) =>
                  name === 'occupancy' ? [`${value.toFixed(0)}%`, 'Occupancy'] : [money(value, 'PHP'), 'RevPAR'],
                )}
              />
              <Bar dataKey="revpar" name="revpar" fill={SERIES[0]} radius={[4, 4, 0, 0]} maxBarSize={22} />
              <Line type="monotone" dataKey="occupancy" name="occupancy" stroke={SERIES[2]} strokeWidth={2} dot={false} yAxisId={0} hide />
            </ComposedChart>
          </ChartFrame>
          <div className="mt-2 grid grid-cols-6 gap-1 sm:grid-cols-12">
            {season.map((point) => (
              <div key={point.monthIndex} className="text-center" title={`${point.years} year(s) of data`}>
                <div className="text-[9px] text-ink-3">{monthName(point.monthIndex)}</div>
                <div className={cx('num text-[10px]', point.years === 0 ? 'text-ink-3' : 'text-ink-2')}>
                  {point.years === 0 ? '—' : `${(point.occupancy * 100).toFixed(0)}%`}
                </div>
              </div>
            ))}
          </div>
        </Card>
      </div>

      {channels.length > 1 ? (
        <Card>
          <SectionHeader title="By channel" subtitle="Where the bookings come from and what each channel actually pays after fees." />
          <DataTable
            rows={channels}
            getKey={(row) => row.channel}
            initialSort={{ key: 'revenue', dir: 'desc' }}
            columns={[
              { key: 'channel', header: 'Channel', render: (row) => <span className="font-medium text-ink">{row.channel}</span>, sortValue: (row) => row.channel },
              { key: 'bookings', header: 'Bookings', align: 'right', render: (row) => String(row.bookings), sortValue: (row) => row.bookings },
              { key: 'nights', header: 'Nights', align: 'right', hideOnMobile: true, render: (row) => String(row.nights), sortValue: (row) => row.nights },
              { key: 'adr', header: 'ADR', align: 'right', render: (row) => money(row.adr, 'PHP'), sortValue: (row) => row.adr },
              { key: 'revenue', header: 'Revenue', align: 'right', render: (row) => money(row.revenue, 'PHP', true), sortValue: (row) => row.revenue },
              { key: 'share', header: 'Share', align: 'right', render: (row) => pct(row.share), sortValue: (row) => row.share },
            ]}
          />
        </Card>
      ) : null}

      <Card>
        <SectionHeader
          title="Bookings"
          subtitle="Every reservation on file. Cancelled rows are kept for the record and excluded from revenue."
          right={
            <ExportButton
                run={() =>
                  exportTable(
                  bookings,
                  [
                    { header: 'Code', value: (b) => b.confirmationCode },
                    { header: 'Guest', value: (b) => b.guestName },
                    { header: 'Channel', value: (b) => b.channel },
                    { header: 'Check-in', value: (b) => b.checkIn },
                    { header: 'Check-out', value: (b) => b.checkOut },
                    { header: 'Nights', value: (b) => b.nights },
                    { header: 'Guests', value: (b) => b.guests },
                    { header: 'Gross', value: (b) => b.grossRevenue, numFmt: MONEY_FMT },
                    { header: 'Fees', value: (b) => b.fees, numFmt: MONEY_FMT },
                    { header: 'Net', value: (b) => b.netRevenue, numFmt: MONEY_FMT },
                    { header: 'Currency', value: (b) => b.currency },
                    { header: 'Status', value: (b) => b.status },
                    { header: 'Source file', value: (b) => b.prov.fileName, width: 24 },
                    { header: 'Source row', value: (b) => b.prov.rowNumber },
                  ],
                  'bookings',
                  'Bookings',
                  ['Ledger export · source file and row retained for every record.'],
                  )
              }
            />
          }
        />
        <DataTable
          rows={bookings}
          getKey={(b) => b.id}
          initialSort={{ key: 'checkIn', dir: 'desc' }}
          onRowClick={(b) =>
            trace({
              title: `${b.confirmationCode} — ${b.nights} nights`,
              description: `Imported from ${b.prov.fileName}, sheet "${b.prov.sheetName}", row ${b.prov.rowNumber}.`,
              rows: [b],
              columns: [
                { key: 'guestName', label: 'Guest' },
                { key: 'checkIn', label: 'In', format: provFormats.date },
                { key: 'checkOut', label: 'Out', format: provFormats.date },
                { key: 'nights', label: 'Nights' },
                { key: 'grossRevenue', label: 'Gross', format: provFormats.money },
                { key: 'fees', label: 'Fees', format: provFormats.money },
                { key: 'netRevenue', label: 'Net', format: provFormats.money },
              ],
            })
          }
          columns={[
            {
              key: 'checkIn',
              header: 'Stay',
              render: (b) => (
                <div>
                  <div className={cx('text-ink', !isActive(b) && 'line-through opacity-50')}>{shortDate(b.checkIn)}</div>
                  <div className="text-[11px] text-ink-3">{b.nights} nights · {b.guests} guests</div>
                </div>
              ),
              sortValue: (b) => b.checkIn,
            },
            { key: 'guest', header: 'Guest', hideOnMobile: true, render: (b) => <span className="text-ink-2">{b.guestName || '—'}</span>, sortValue: (b) => b.guestName },
            { key: 'channel', header: 'Channel', hideOnMobile: true, render: (b) => <Pill>{b.channel}</Pill>, sortValue: (b) => b.channel },
            { key: 'adr', header: 'ADR', align: 'right', hideOnMobile: true, render: (b) => money(b.netRevenue / Math.max(1, b.nights), b.currency), sortValue: (b) => b.netRevenue / Math.max(1, b.nights) },
            {
              key: 'net',
              header: 'Net',
              align: 'right',
              render: (b) =>
                isActive(b) ? (
                  <span className="text-ink">{money(b.netRevenue, b.currency, true)}</span>
                ) : (
                  <span className="text-ink-3">cancelled</span>
                ),
              sortValue: (b) => b.netRevenue,
            },
          ]}
        />
      </Card>
    </div>
  )
}

// --- Costs -----------------------------------------------------------------

function CostView({ series }: { series: MonthMetrics[] }) {
  const { expenses, settings } = useLedger()
  const { trace } = useProvenance()

  const t12 = useMemo(() => aggregate(trailing(series, 12)), [series])
  const lines = useMemo(() => costBreakdown(expenses, settings.usdPhp), [expenses, settings.usdPhp])

  if (expenses.length === 0) {
    return (
      <EmptyState
        title="No expenses imported"
        body="Cost per booking, cost per available night and the whole P&L need an expense sheet. The importer classifies each line as fixed or variable — you can override that with a column in your sheet."
        dataset="expenses"
      />
    )
  }

  const fixed = lines.filter((line) => line.nature === 'fixed')
  const variable = lines.filter((line) => line.nature === 'variable')
  const fixedTotal = fixed.reduce((sum, line) => sum + line.amount, 0)
  const variableTotal = variable.reduce((sum, line) => sum + line.amount, 0)

  return (
    <div className="space-y-4">
      <StatGrid>
        <Stat
          label="Total cost (T12M)"
          value={money(t12.totalCost, 'PHP', true)}
          onTrace={() =>
            trace({
              title: 'Trailing-12-month costs',
              rows: expenses,
              columns: [
                { key: 'date', label: 'Date', format: provFormats.date },
                { key: 'category', label: 'Category' },
                { key: 'nature', label: 'Type' },
                { key: 'amount', label: 'Amount', format: provFormats.money },
                { key: 'vendor', label: 'Vendor' },
              ],
            })
          }
          sub={`${pct(t12.totalCost > 0 ? t12.fixedCost / t12.totalCost : 0, 0)} fixed`}
        />
        <Stat
          label="Cost per booking"
          value={t12.bookings > 0 ? money(t12.costPerBooking, 'PHP') : '—'}
          sub={t12.bookings > 0 ? `${t12.bookings} bookings in the window` : 'Needs booking data'}
        />
        <Stat
          label="Cost per available night"
          value={money(t12.costPerAvailableNight, 'PHP')}
          sub="What the island costs to hold open, occupied or not"
          hint="Total cost ÷ available nights. Compare against RevPAR: if this is higher, the property loses money at current occupancy."
        />
        <Stat
          label="Variable cost per night sold"
          value={t12.nightsSold > 0 ? money(t12.variableCostPerNight, 'PHP') : '—'}
          sub="Catering, fuel, cleaning — the cost of saying yes to one more night"
        />
      </StatGrid>

      <div className="rounded-lg border border-line bg-surface-2 px-3 py-2.5 text-[12px] leading-relaxed text-ink-2">
        <span className="font-medium text-ink">Break-even.</span> At {money(t12.adr, 'PHP')} ADR and{' '}
        {money(t12.variableCostPerNight, 'PHP')} variable cost per night, each night sold contributes{' '}
        <span className="num text-ink">{money(t12.adr - t12.variableCostPerNight, 'PHP')}</span> toward fixed costs of{' '}
        {money(t12.fixedCost, 'PHP', true)} a year — so the property needs{' '}
        <span className="num text-ink">
          {t12.adr - t12.variableCostPerNight > 0
            ? Math.ceil(t12.fixedCost / (t12.adr - t12.variableCostPerNight))
            : '∞'}
        </span>{' '}
        nights a year to break even
        {t12.adr - t12.variableCostPerNight > 0 && t12.availableNights > 0
          ? `, about ${pct(Math.ceil(t12.fixedCost / (t12.adr - t12.variableCostPerNight)) / t12.availableNights, 0)} occupancy.`
          : '.'}
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <SectionHeader
            title="Fixed costs"
            subtitle="Incurred whether or not anyone books. These set the occupancy you must hit."
            right={<span className="num text-[13px] font-semibold text-ink">{money(fixedTotal, 'PHP', true)}</span>}
          />
          <CostList lines={fixed} total={fixedTotal} onTrace={trace} color={SERIES[1]} />
        </Card>

        <Card>
          <SectionHeader
            title="Variable costs"
            subtitle="Scale with stays. These set how much each extra night is actually worth."
            right={<span className="num text-[13px] font-semibold text-ink">{money(variableTotal, 'PHP', true)}</span>}
          />
          <CostList lines={variable} total={variableTotal} onTrace={trace} color={SERIES[3]} />
        </Card>
      </div>

      <Card>
        <ChartFrame
          title="Cost by month"
          caption="Fixed and variable stacked. A rising variable band with flat revenue is the early signal of a margin problem."
          right={<Legend items={[{ label: 'Fixed', color: SERIES[1] }, { label: 'Variable', color: SERIES[3] }]} />}
          height={230}
        >
          <BarChart data={series.map((m) => ({ month: m.month, fixed: m.fixedCost, variable: m.variableCost }))} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
            <CartesianGrid {...GRID} />
            <XAxis dataKey="month" {...AXIS} tickFormatter={monthLabel} minTickGap={16} />
            <YAxis {...AXIS} tickFormatter={(value: number) => money(value, 'PHP', true)} width={56} />
            <Tooltip
              {...TOOLTIP_STYLE}
              {...tooltipProps(
                (value, name) => [money(value, 'PHP'), name === 'fixed' ? 'Fixed' : 'Variable'],
                (label) => monthLabel(label),
              )}
            />
            <Bar dataKey="fixed" name="fixed" stackId="cost" fill={SERIES[1]} maxBarSize={34} />
            <Bar dataKey="variable" name="variable" stackId="cost" fill={SERIES[3]} radius={[4, 4, 0, 0]} maxBarSize={34} />
          </BarChart>
        </ChartFrame>
      </Card>
    </div>
  )
}

function CostList({
  lines,
  total,
  onTrace,
  color,
}: {
  lines: ReturnType<typeof costBreakdown>
  total: number
  onTrace: ReturnType<typeof useProvenance>['trace']
  color: string
}) {
  if (lines.length === 0) return <p className="py-4 text-center text-[12px] text-ink-3">None recorded.</p>
  return (
    <div className="space-y-1.5">
      {lines.map((line) => (
        <button
          key={line.category}
          type="button"
          onClick={() =>
            onTrace({
              title: line.category,
              description: `${line.sources.length} expense row${line.sources.length === 1 ? '' : 's'} in this category.`,
              rows: line.sources,
              columns: [
                { key: 'date', label: 'Date', format: provFormats.date },
                { key: 'amount', label: 'Amount', format: provFormats.money },
                { key: 'vendor', label: 'Vendor' },
                { key: 'note', label: 'Note' },
              ],
            })
          }
          className="flex w-full items-center gap-2.5 rounded-lg px-1 py-1 text-left transition-colors hover:bg-surface-2"
        >
          <span className="w-28 shrink-0 truncate text-[12px] text-ink sm:w-36">{line.category}</span>
          <span className="h-1.5 flex-1 overflow-hidden rounded-full bg-surface-2">
            <span className="block h-full rounded-full" style={{ width: `${(total > 0 ? line.amount / total : 0) * 100}%`, background: color }} />
          </span>
          <span className="num w-20 shrink-0 text-right text-[12px] text-ink-2">{money(line.amount, 'PHP', true)}</span>
        </button>
      ))}
    </div>
  )
}

// --- P&L -------------------------------------------------------------------

function PnlView({ series }: { series: MonthMetrics[] }) {
  const { trace } = useProvenance()
  const [window, setWindow] = useState<'t12' | 'all'>('t12')

  const rows = window === 't12' ? trailing(series, 12) : series
  const totals = useMemo(() => aggregate(rows), [rows])

  const chartData = rows.map((month) => ({
    month: month.month,
    revenue: month.totalRevenue,
    cost: -month.totalCost,
    profit: month.netProfit,
  }))

  return (
    <div className="space-y-4">
      <div className="no-print flex flex-wrap items-center justify-between gap-2">
        <Tabs
          value={window}
          onChange={setWindow}
          options={[
            { value: 't12', label: 'Trailing 12 months' },
            { value: 'all', label: `All ${series.length} months` },
          ]}
        />
        <ExportButton
            run={() =>
              exportTable(
              rows,
              [
                { header: 'Month', value: (m) => m.month },
                { header: 'Nights sold', value: (m) => m.nightsSold },
                { header: 'Available nights', value: (m) => m.availableNights },
                { header: 'Occupancy', value: (m) => m.occupancy, numFmt: PCT_FMT },
                { header: 'ADR', value: (m) => m.adr, numFmt: MONEY_FMT },
                { header: 'RevPAR', value: (m) => m.revpar, numFmt: MONEY_FMT },
                { header: 'Room revenue', value: (m) => m.revenue, numFmt: MONEY_FMT },
                { header: 'Add-on revenue kept', value: (m) => m.addOnRevenue, numFmt: MONEY_FMT },
                { header: 'Total revenue', value: (m) => m.totalRevenue, numFmt: MONEY_FMT },
                { header: 'Fixed cost', value: (m) => m.fixedCost, numFmt: MONEY_FMT },
                { header: 'Variable cost', value: (m) => m.variableCost, numFmt: MONEY_FMT },
                { header: 'Net profit', value: (m) => m.netProfit, numFmt: MONEY_FMT },
                { header: 'Net margin', value: (m) => m.netMargin, numFmt: PCT_FMT },
              ],
              'island-t-pnl',
              'P&L',
              ['Revenue recognised over the nights stayed. Amounts in PHP.'],
              )
          }
        />
      </div>

      <StatGrid>
        <Stat
          label="Revenue"
          value={money(totals.totalRevenue, 'PHP', true)}
          sub={
            totals.addOnRevenue > 0
              ? `${money(totals.revenue, 'PHP', true)} rooms + ${money(totals.addOnRevenue, 'PHP', true)} add-ons`
              : `${totals.months} months`
          }
        />
        <Stat label="Total cost" value={money(totals.totalCost, 'PHP', true)} sub={`${money(totals.fixedCost, 'PHP', true)} fixed`} />
        <Stat
          label="Net profit"
          value={money(totals.netProfit, 'PHP', true)}
          tone={totals.netProfit >= 0 ? 'pos' : 'neg'}
        />
        <Stat
          label="Net margin"
          value={totals.revenue > 0 ? pct(totals.netMargin) : '—'}
          tone={totals.netMargin >= 0.2 ? 'pos' : totals.netMargin >= 0 ? 'neutral' : 'neg'}
        />
      </StatGrid>

      <Card>
        <ChartFrame
          title="Monthly profit and loss"
          caption="Revenue above the line, costs below it, net profit as the line. Months where the line sits under zero are months the island was subsidised."
          right={<Legend items={[{ label: 'Revenue', color: SERIES[0] }, { label: 'Cost', color: SERIES[1] }, { label: 'Net profit', color: SERIES[2] }]} />}
          height={260}
        >
          <ComposedChart data={chartData} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
            <CartesianGrid {...GRID} />
            <XAxis dataKey="month" {...AXIS} tickFormatter={monthLabel} minTickGap={16} />
            <YAxis {...AXIS} tickFormatter={(value: number) => money(value, 'PHP', true)} width={56} />
            <Tooltip
              {...TOOLTIP_STYLE}
              {...tooltipProps(
                (value, name) => [
                  money(Math.abs(value), 'PHP'),
                  name === 'revenue' ? 'Revenue' : name === 'cost' ? 'Cost' : 'Net profit',
                ],
                (label) => monthLabel(label),
              )}
            />
            <ReferenceLine y={0} stroke={STATUS.neutral} />
            <Bar dataKey="revenue" name="revenue" fill={SERIES[0]} radius={[4, 4, 0, 0]} maxBarSize={26} />
            <Bar dataKey="cost" name="cost" fill={SERIES[1]} radius={[0, 0, 4, 4]} maxBarSize={26} />
            <Line type="monotone" dataKey="profit" name="profit" stroke={SERIES[2]} strokeWidth={2} dot={{ r: 2.5, strokeWidth: 0, fill: SERIES[2] }} />
          </ComposedChart>
        </ChartFrame>
      </Card>

      <Card>
        <SectionHeader title="Monthly detail" subtitle="Click a month to see the bookings and expense rows behind it." />
        <DataTable
          rows={rows}
          getKey={(m) => m.month}
          initialSort={{ key: 'month', dir: 'desc' }}
          onRowClick={(m) =>
            trace({
              title: `${monthLabel(m.month)} — ${money(m.revenue, 'PHP')} revenue`,
              description: `${m.sourceBookings.length} bookings and ${m.sourceExpenses.length} expense rows touch this month.`,
              rows: [...m.sourceBookings, ...m.sourceExpenses],
              columns: [
                { key: 'checkIn', label: 'Check-in', format: provFormats.date },
                { key: 'date', label: 'Date', format: provFormats.date },
                { key: 'category', label: 'Category' },
                { key: 'nights', label: 'Nights' },
                { key: 'netRevenue', label: 'Revenue', format: provFormats.money },
                { key: 'amount', label: 'Expense', format: provFormats.money },
              ],
            })
          }
          columns={[
            { key: 'month', header: 'Month', render: (m) => <span className="font-medium text-ink">{monthLabel(m.month)}</span>, sortValue: (m) => m.month },
            { key: 'occ', header: 'Occ.', align: 'right', render: (m) => <span className={m.occupancy < 0.2 ? 'text-warn' : 'text-ink-2'}>{pct(m.occupancy, 0)}</span>, sortValue: (m) => m.occupancy },
            { key: 'adr', header: 'ADR', align: 'right', hideOnMobile: true, render: (m) => (m.adr > 0 ? money(m.adr, 'PHP') : '—'), sortValue: (m) => m.adr },
            { key: 'revpar', header: 'RevPAR', align: 'right', hideOnMobile: true, render: (m) => money(m.revpar, 'PHP'), sortValue: (m) => m.revpar },
            {
              key: 'revenue',
              header: 'Revenue',
              align: 'right',
              render: (m) => (
                <div>
                  <div className="text-ink">{money(m.totalRevenue, 'PHP', true)}</div>
                  {m.addOnRevenue > 0 ? (
                    <div className="text-[11px] text-ink-3">incl. {money(m.addOnRevenue, 'PHP', true)} add-ons</div>
                  ) : null}
                </div>
              ),
              sortValue: (m) => m.totalRevenue,
            },
            { key: 'cost', header: 'Cost', align: 'right', hideOnMobile: true, render: (m) => money(m.totalCost, 'PHP', true), sortValue: (m) => m.totalCost },
            { key: 'profit', header: 'Net', align: 'right', render: (m) => <span className={m.netProfit >= 0 ? 'text-pos' : 'text-neg'}>{money(m.netProfit, 'PHP', true)}</span>, sortValue: (m) => m.netProfit },
            { key: 'margin', header: 'Margin', align: 'right', hideOnMobile: true, render: (m) => (m.revenue > 0 ? <span className={m.netMargin >= 0 ? 'text-ink-2' : 'text-neg'}>{pct(m.netMargin, 0)}</span> : <span className="text-ink-3">—</span>), sortValue: (m) => m.netMargin },
          ]}
          footer={
            <tr>
              <td className="px-2.5 py-2 font-medium text-ink">Total</td>
              <td className="num px-2.5 py-2 text-right text-ink-2">{pct(totals.occupancy, 0)}</td>
              <td className="hidden sm:table-cell" />
              <td className="hidden sm:table-cell" />
              <td className="num px-2.5 py-2 text-right font-medium text-ink">{money(totals.totalRevenue, 'PHP', true)}</td>
              <td className="num hidden px-2.5 py-2 text-right text-ink-2 sm:table-cell">{money(totals.totalCost, 'PHP', true)}</td>
              <td className="num px-2.5 py-2 text-right font-medium">
                <span className={totals.netProfit >= 0 ? 'text-pos' : 'text-neg'}>{money(totals.netProfit, 'PHP', true)}</span>
              </td>
              <td className="num hidden px-2.5 py-2 text-right text-ink-2 sm:table-cell">{pct(totals.netMargin, 0)}</td>
            </tr>
          }
        />
      </Card>
    </div>
  )
}
