import { useMemo, useState } from 'react'
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Line,
  LineChart,
  ReferenceLine,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { useLedger } from '@/state/store'
import {
  allocationBy,
  buildPositions,
  latestSnapshot,
  riskView,
  targetsFor,
  totalCost,
  totalValue,
  type AllocationDimension,
  type PositionView,
} from '@/domain/investments/portfolio'
import {
  buildPerformance,
  compareToBenchmark,
  drawdownSeries,
  maxDrawdown,
  moneyWeightedReturn,
  trailingReturn,
  volatility,
  yearToDateReturn,
} from '@/domain/investments/performance'
import { proposeMoves, TRANSACTION_COST_RATE, type Move } from '@/domain/investments/rebalance'
import { Card, Pill, SectionHeader, Tabs, cx } from '@/components/ui/primitives'
import { Stat, StatGrid } from '@/components/ui/Stat'
import { DataTable } from '@/components/ui/DataTable'
import { EmptyState } from '@/components/ui/EmptyState'
import { ExportButton } from '@/components/ui/ExportButton'
import { Freshness } from '@/components/ui/Freshness'
import { ChartFrame, Legend, tooltipProps } from '@/components/charts/Chart'
import { AXIS, GRID, SERIES, STATUS, TOOLTIP_STYLE } from '@/components/charts/theme'
import { useProvenance } from '@/components/ui/Provenance'
import { money, num, pct, pp, shortDate, signedPct } from '@/lib/format'
import { exportTable, MONEY_FMT, PCT_FMT } from '@/lib/export'

type View = 'holdings' | 'performance' | 'allocation' | 'risk' | 'moves'

export function InvestmentsPage() {
  const { holdings, snapshots, transactions, benchmark, settings, freshness } = useLedger()
  const [view, setView] = useState<View>('holdings')

  const snapshot = useMemo(() => latestSnapshot(snapshots), [snapshots])
  const positions = useMemo(() => buildPositions(holdings, snapshot), [holdings, snapshot])

  if (holdings.length === 0) {
    return (
      <div className="space-y-4">
        <SectionHeader title="Investments" />
        <EmptyState
          title="No portfolio imported yet"
          body="Import a holdings sheet and this fills in: positions, weights, unrealised gain, allocation drift and the rebalancing engine. Import it again next month and the return series starts building itself."
          dataset="holdings"
        />
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <SectionHeader
        title="Investments"
        subtitle={
          snapshot
            ? `Valued ${shortDate(snapshot.asOf)} · ${snapshot.label} · USD converted at ₱${num(snapshot.usdPhp, 2)}`
            : undefined
        }
        right={<Freshness timestamp={freshness.holdings} />}
      />

      <div className="no-print overflow-x-auto">
        <Tabs
          value={view}
          onChange={setView}
          options={[
            { value: 'holdings', label: 'Holdings' },
            { value: 'performance', label: 'Performance' },
            { value: 'allocation', label: 'Allocation' },
            { value: 'risk', label: 'Risk' },
            { value: 'moves', label: 'What to invest in' },
          ]}
        />
      </div>

      {view === 'holdings' ? <HoldingsView positions={positions} /> : null}
      {view === 'performance' ? (
        <PerformanceView
          positions={positions}
          holdings={holdings}
          snapshots={snapshots}
          transactions={transactions}
          benchmark={benchmark}
          benchmarkName={settings.benchmarkName}
          usdPhp={settings.usdPhp}
        />
      ) : null}
      {view === 'allocation' ? <AllocationView positions={positions} /> : null}
      {view === 'risk' ? <RiskViewPanel positions={positions} holdings={holdings} snapshots={snapshots} transactions={transactions} usdPhp={settings.usdPhp} /> : null}
      {view === 'moves' ? <MovesView positions={positions} /> : null}
    </div>
  )
}

// --- Holdings --------------------------------------------------------------

function HoldingsView({ positions }: { positions: PositionView[] }) {
  const { trace } = useProvenance()
  const value = totalValue(positions)
  const cost = totalCost(positions)
  const gain = value - cost
  const withCost = positions.filter((p) => p.costBasis > 0)

  return (
    <div className="space-y-4">
      <StatGrid>
        <Stat
          label="Portfolio value"
          value={money(value, 'PHP', true)}
          sub={`${positions.length} positions`}
          onTrace={() =>
            trace({
              title: 'Portfolio value',
              description: 'Sum of every holding row in the latest snapshot, USD converted at the snapshot rate.',
              rows: positions.flatMap((p) => p.sources),
              columns: [
                { key: 'ticker', label: 'Ticker' },
                { key: 'quantity', label: 'Qty' },
                { key: 'price', label: 'Price' },
                { key: 'value', label: 'Value' },
                { key: 'currency', label: 'Ccy' },
              ],
            })
          }
        />
        <Stat
          label="Cost basis"
          value={cost > 0 ? money(cost, 'PHP', true) : '—'}
          sub={cost > 0 ? `${withCost.length} of ${positions.length} positions have cost data` : 'Not in the imported sheet'}
        />
        <Stat
          label="Unrealised gain"
          value={cost > 0 ? money(gain, 'PHP', true) : '—'}
          tone={cost > 0 ? (gain >= 0 ? 'pos' : 'neg') : 'neutral'}
          sub={cost > 0 ? signedPct(gain / cost) : 'Needs a cost basis column'}
        />
        <Stat
          label="Largest position"
          value={positions[0] ? pct(positions[0].weight) : '—'}
          sub={positions[0]?.ticker}
          tone={positions[0] && positions[0].weight > 0.25 ? 'warn' : 'neutral'}
        />
      </StatGrid>

      <Card>
        <SectionHeader
          title="Holdings"
          subtitle="Positions are grouped by ticker and currency. Click any row to see the source spreadsheet rows behind it."
          right={
            <ExportButton
                run={() =>
                  exportTable(
                  positions,
                  [
                    { header: 'Ticker', value: (p) => p.ticker },
                    { header: 'Name', value: (p) => p.name, width: 28 },
                    { header: 'Asset class', value: (p) => p.assetClass },
                    { header: 'Geography', value: (p) => p.geography },
                    { header: 'Currency', value: (p) => p.currency },
                    { header: 'Quantity', value: (p) => p.quantity, numFmt: '#,##0.0000' },
                    { header: 'Price', value: (p) => p.price, numFmt: '#,##0.00' },
                    { header: 'Value (native)', value: (p) => p.valueNative, numFmt: MONEY_FMT },
                    { header: 'Value (PHP)', value: (p) => p.value, numFmt: MONEY_FMT },
                    { header: 'Cost basis (PHP)', value: (p) => p.costBasis, numFmt: MONEY_FMT },
                    { header: 'Gain (PHP)', value: (p) => p.gain, numFmt: MONEY_FMT },
                    { header: 'Weight', value: (p) => p.weight, numFmt: PCT_FMT },
                  ],
                  'holdings',
                  'Holdings',
                  [`Ledger export · ${new Date().toLocaleString()}`, 'Values converted to PHP at the snapshot FX rate.'],
                  )
              }
            />
          }
        />
        <DataTable
          rows={positions}
          getKey={(p) => `${p.ticker}-${p.currency}`}
          initialSort={{ key: 'value', dir: 'desc' }}
          onRowClick={(p) =>
            trace({
              title: `${p.ticker} — ${p.name}`,
              description: `${p.sources.length} source row${p.sources.length === 1 ? '' : 's'} roll${p.sources.length === 1 ? 's' : ''} into this position.`,
              rows: p.sources,
              columns: [
                { key: 'ticker', label: 'Ticker' },
                { key: 'account', label: 'Account' },
                { key: 'quantity', label: 'Qty' },
                { key: 'price', label: 'Price' },
                { key: 'value', label: 'Value' },
                { key: 'costBasis', label: 'Cost' },
                { key: 'currency', label: 'Ccy' },
              ],
            })
          }
          columns={[
            {
              key: 'ticker',
              header: 'Position',
              render: (p) => (
                <div className="max-w-[180px]">
                  <div className="font-medium text-ink">{p.ticker}</div>
                  <div className="truncate text-[11px] text-ink-3">{p.name}</div>
                </div>
              ),
              sortValue: (p) => p.ticker,
            },
            {
              key: 'class',
              header: 'Class',
              hideOnMobile: true,
              render: (p) => <span className="text-ink-2">{p.assetClass}</span>,
              sortValue: (p) => p.assetClass,
            },
            {
              key: 'qty',
              header: 'Quantity',
              align: 'right',
              hideOnMobile: true,
              render: (p) => num(p.quantity, p.quantity % 1 === 0 ? 0 : 4),
              sortValue: (p) => p.quantity,
            },
            {
              key: 'price',
              header: 'Price',
              align: 'right',
              hideOnMobile: true,
              render: (p) => <span className="text-ink-2">{money(p.price, p.currency)}</span>,
              sortValue: (p) => p.price,
            },
            {
              key: 'value',
              header: 'Value',
              align: 'right',
              render: (p) => (
                <div>
                  <div className="text-ink">{money(p.value, 'PHP', true)}</div>
                  {p.currency !== 'PHP' ? (
                    <div className="text-[11px] text-ink-3">{money(p.valueNative, p.currency, true)}</div>
                  ) : null}
                </div>
              ),
              sortValue: (p) => p.value,
            },
            {
              key: 'weight',
              header: 'Weight',
              align: 'right',
              render: (p) => (
                <div className="flex items-center justify-end gap-2">
                  <div className="hidden h-1 w-12 overflow-hidden rounded-full bg-surface-2 sm:block">
                    <div className="h-full rounded-full bg-accent/60" style={{ width: `${p.weight * 100}%` }} />
                  </div>
                  <span className={p.weight > 0.25 ? 'text-warn' : 'text-ink'}>{pct(p.weight)}</span>
                </div>
              ),
              sortValue: (p) => p.weight,
            },
            {
              key: 'gain',
              header: 'Gain / loss',
              align: 'right',
              render: (p) =>
                p.costBasis > 0 ? (
                  <div>
                    <div className={p.gain >= 0 ? 'text-pos' : 'text-neg'}>{money(p.gain, 'PHP', true)}</div>
                    <div className="text-[11px] text-ink-3">{signedPct(p.gainPct)}</div>
                  </div>
                ) : (
                  <span className="text-ink-3">no cost data</span>
                ),
              sortValue: (p) => p.gain,
            },
          ]}
          footer={
            <tr>
              <td className="px-2.5 py-2 font-medium text-ink">Total</td>
              <td className="hidden sm:table-cell" />
              <td className="hidden sm:table-cell" />
              <td className="hidden sm:table-cell" />
              <td className="num px-2.5 py-2 text-right font-medium text-ink">{money(totalValue(positions), 'PHP', true)}</td>
              <td className="num px-2.5 py-2 text-right text-ink-2">100%</td>
              <td className="num px-2.5 py-2 text-right font-medium">
                {totalCost(positions) > 0 ? (
                  <span className={totalValue(positions) - totalCost(positions) >= 0 ? 'text-pos' : 'text-neg'}>
                    {money(totalValue(positions) - totalCost(positions), 'PHP', true)}
                  </span>
                ) : (
                  <span className="text-ink-3">—</span>
                )}
              </td>
            </tr>
          }
        />
      </Card>
    </div>
  )
}

// --- Performance -----------------------------------------------------------

function PerformanceView({
  positions,
  holdings,
  snapshots,
  transactions,
  benchmark,
  benchmarkName,
  usdPhp,
}: {
  positions: PositionView[]
  holdings: import('@/types').Holding[]
  snapshots: import('@/types').Snapshot[]
  transactions: import('@/types').Transaction[]
  benchmark: import('@/types').BenchmarkPoint[]
  benchmarkName: string
  usdPhp: number
}) {
  const series = useMemo(
    () => buildPerformance(holdings, snapshots, transactions, usdPhp),
    [holdings, snapshots, transactions, usdPhp],
  )
  const mwr = useMemo(
    () => moneyWeightedReturn(holdings, snapshots, transactions, usdPhp),
    [holdings, snapshots, transactions, usdPhp],
  )
  const comparison = useMemo(() => compareToBenchmark(series, benchmark), [series, benchmark])

  if (snapshots.length < 2) {
    return (
      <div className="space-y-4">
        <StatGrid cols={2}>
          <Stat label="Portfolio value" value={money(totalValue(positions), 'PHP', true)} sub={`${positions.length} positions`} />
          <Stat label="Snapshots on file" value={String(snapshots.length)} sub="Two or more are needed for a return" />
        </StatGrid>
        <EmptyState
          title="One snapshot isn't a return"
          body="A return needs a start and an end. Import your holdings sheet again at a later date — the app keeps each import as its own dated snapshot and chain-links the periods between them. Importing your deposits and withdrawals as transactions makes the return net of contributions rather than inflated by them."
          dataset="holdings"
        />
      </div>
    )
  }

  const chartData = comparison.length > 0 ? comparison : series.index.map((p) => ({ date: p.date, portfolio: p.value, benchmark: Number.NaN }))
  const hasBenchmark = comparison.length > 0

  return (
    <div className="space-y-4">
      {!series.contributionsKnown ? (
        <div className="rounded-lg border border-warn/40 bg-warn/[0.07] px-3.5 py-3 text-[12.5px] leading-relaxed text-ink-2">
          <p className="mb-1.5 font-semibold text-warn">These are value changes, not returns.</p>
          <p>
            No deposits or withdrawals have been imported, so the app cannot tell money you added from money you made —
            every peso that arrived in the portfolio is being counted as a gain. At least{' '}
            <span className="num font-medium text-ink">{money(series.estimatedNewMoney, 'PHP', true)}</span> of the
            change came in as positions that simply appeared between snapshots, and that is a floor, not a total: it
            cannot see cash added to a holding you already owned.
          </p>
          <p className="mt-1.5">
            Import a transactions sheet with your deposits and withdrawals under{' '}
            <a href="#/data?dataset=transactions" className="text-accent hover:underline">
              Data → Transactions
            </a>{' '}
            and every figure on this tab becomes a real return.
          </p>
        </div>
      ) : null}

      <StatGrid>
        <Stat
          label={series.contributionsKnown ? 'Since inception' : 'Value change'}
          value={signedPct(series.sinceInception)}
          tone={series.contributionsKnown ? (series.sinceInception >= 0 ? 'pos' : 'neg') : 'warn'}
          sub={
            series.contributionsKnown
              ? `${num(series.years, 1)} years, time-weighted`
              : `${num(series.years, 1)} years — includes contributions`
          }
        />
        <Stat
          label={series.contributionsKnown ? 'Annualised' : 'Annualised change'}
          value={Number.isFinite(series.annualised) ? signedPct(series.annualised) : '—'}
          tone={series.contributionsKnown ? (series.annualised >= 0 ? 'pos' : 'neg') : 'warn'}
          sub={
            series.contributionsKnown
              ? 'Compound annual, contributions stripped out'
              : 'Not a return — contributions are not separated'
          }
        />
        <Stat
          label={series.contributionsKnown ? 'Year to date' : 'Value change YTD'}
          value={Number.isFinite(yearToDateReturn(series)) ? signedPct(yearToDateReturn(series)) : '—'}
          tone={series.contributionsKnown ? (yearToDateReturn(series) >= 0 ? 'pos' : 'neg') : 'warn'}
          sub={
            series.contributionsKnown
              ? 'Chain-linked from the first snapshot this year'
              : 'Includes anything added this year'
          }
        />
        <Stat
          label="Money-weighted"
          value={series.contributionsKnown && Number.isFinite(mwr) ? signedPct(mwr) : '—'}
          sub={
            series.contributionsKnown
              ? 'What your money earned, timing included'
              : 'Needs deposit and withdrawal records'
          }
          hint="IRR of actual cashflows. Differs from time-weighted when large contributions land before a good or bad stretch."
        />
      </StatGrid>

      {series.lowConfidence ? (
        <div className="rounded-lg border border-warn/25 bg-warn/5 px-3 py-2 text-[12px] leading-relaxed text-warn">
          At least one period carried deposits or withdrawals worth more than 20% of the portfolio. Returns between
          snapshots are estimated with Modified Dietz, which assumes flows are spread evenly through the period — with
          flows this large, treat those periods as approximate and take more frequent snapshots if you can.
        </div>
      ) : null}

      <Card>
        <ChartFrame
          title={
            series.contributionsKnown
              ? hasBenchmark
                ? `Growth of ₱1 vs ${benchmarkName}`
                : 'Growth of ₱1'
              : 'Portfolio value, indexed'
          }
          caption={
            !series.contributionsKnown
              ? 'Indexed to 1 at your first snapshot. Because deposits are not imported, this line rises when you add money as well as when markets do — it is not comparable to a benchmark, which is why none is drawn.'
              : hasBenchmark
                ? `Both lines start at 1 on your first snapshot date, so the gap is relative performance. The portfolio line is time-weighted — it measures your selections, not the size of your contributions.`
                : `Time-weighted growth of the portfolio, indexed to 1 at the first snapshot. Import ${benchmarkName} index levels under Data to overlay a benchmark.`
          }
          right={<Legend items={hasBenchmark ? [{ label: 'Portfolio', color: SERIES[0] }, { label: benchmarkName, color: SERIES[1] }] : [{ label: 'Portfolio', color: SERIES[0] }]} />}
          height={260}
        >
          <LineChart data={chartData} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
            <CartesianGrid {...GRID} />
            <XAxis dataKey="date" {...AXIS} tickFormatter={(value: string) => value.slice(2, 7)} minTickGap={24} />
            <YAxis {...AXIS} tickFormatter={(value: number) => value.toFixed(2)} width={44} domain={['auto', 'auto']} />
            <Tooltip
              {...TOOLTIP_STYLE}
              {...tooltipProps(
                (value, name) => [`${value.toFixed(3)}× (${signedPct(value - 1)})`, name],
                (label) => shortDate(label),
              )}
            />
            <ReferenceLine y={1} stroke={STATUS.neutral} strokeDasharray="3 3" />
            <Line type="monotone" dataKey="portfolio" name="Portfolio" stroke={SERIES[0]} strokeWidth={2} dot={{ r: 3, strokeWidth: 0, fill: SERIES[0] }} />
            {hasBenchmark ? (
              <Line type="monotone" dataKey="benchmark" name={benchmarkName} stroke={SERIES[1]} strokeWidth={2} dot={false} />
            ) : null}
          </LineChart>
        </ChartFrame>
      </Card>

      <Card>
        <SectionHeader
          title="Rolling returns"
          subtitle="Each window is chain-linked from the sub-period returns between snapshots. A window shows a dash when your snapshot history doesn't reach back far enough to fill it honestly."
        />
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          {[
            { label: '1 month', months: 1 },
            { label: '3 months', months: 3 },
            { label: '12 months', months: 12 },
            { label: 'Since inception', months: 0 },
          ].map((window) => {
            const value = window.months === 0 ? series.sinceInception : trailingReturn(series, window.months)
            return (
              <div key={window.label} className="rounded-lg border border-line bg-surface-2 px-3 py-2.5">
                <div className="text-[10px] uppercase tracking-wide text-ink-3">{window.label}</div>
                <div
                  className={cx(
                    'num mt-1 text-[17px] font-semibold',
                    !Number.isFinite(value) ? 'text-ink-3' : value >= 0 ? 'text-pos' : 'text-neg',
                  )}
                >
                  {Number.isFinite(value) ? signedPct(value) : '—'}
                </div>
              </div>
            )
          })}
        </div>
      </Card>

      <Card>
        <SectionHeader
          title="Period detail"
          subtitle={
            series.contributionsKnown
              ? 'The building blocks of the return above. Modified Dietz weights each cashflow by the fraction of the period it was invested.'
              : 'Change in value between consecutive snapshots. With no cashflow records, a period that jumps because you added money is indistinguishable here from one that rose on markets — look for the large, sudden ones.'
          }
        />
        <DataTable
          rows={series.periods}
          getKey={(period) => period.endDate}
          columns={[
            { key: 'period', header: 'Period', render: (p) => `${shortDate(p.startDate)} → ${shortDate(p.endDate)}`, sortValue: (p) => p.startDate },
            { key: 'start', header: 'Start value', align: 'right', hideOnMobile: true, render: (p) => money(p.startValue, 'PHP', true), sortValue: (p) => p.startValue },
            { key: 'flow', header: 'Net flow', align: 'right', hideOnMobile: true, render: (p) => (p.netFlow === 0 ? <span className="text-ink-3">—</span> : <span className={p.netFlow > 0 ? 'text-info' : 'text-ink-2'}>{money(p.netFlow, 'PHP', true)}</span>), sortValue: (p) => p.netFlow },
            { key: 'end', header: 'End value', align: 'right', render: (p) => money(p.endValue, 'PHP', true), sortValue: (p) => p.endValue },
            {
              key: 'ret',
              header: 'Return',
              align: 'right',
              render: (p) => (
                <span className={p.ret >= 0 ? 'text-pos' : 'text-neg'}>
                  {signedPct(p.ret)}
                  {p.flowRatio > 0.2 ? <span className="ml-1 text-warn" title="Large flow relative to portfolio — estimate is approximate">≈</span> : null}
                </span>
              ),
              sortValue: (p) => p.ret,
            },
          ]}
          initialSort={{ key: 'period', dir: 'desc' }}
        />
      </Card>
    </div>
  )
}

// --- Allocation ------------------------------------------------------------

function AllocationView({ positions }: { positions: PositionView[] }) {
  const { settings } = useLedger()
  const { trace } = useProvenance()
  const [dimension, setDimension] = useState<AllocationDimension>('assetClass')

  const targets = targetsFor(settings, dimension)
  const rows = useMemo(
    () => allocationBy(positions, dimension, targets, settings.driftBandPct),
    [positions, dimension, targets, settings.driftBandPct],
  )

  const chartData = rows.map((row) => ({
    key: row.key,
    actual: row.actual * 100,
    target: row.target === null ? null : row.target * 100,
  }))

  const offTarget = rows.filter((row) => row.status === 'over' || row.status === 'under')

  return (
    <div className="space-y-4">
      <div className="no-print flex flex-wrap items-center justify-between gap-2">
        <Tabs
          value={dimension}
          onChange={setDimension}
          options={[
            { value: 'assetClass', label: 'Asset class' },
            { value: 'geography', label: 'Geography' },
            { value: 'currency', label: 'Currency' },
          ]}
        />
        <Pill tone={offTarget.length === 0 ? 'pos' : 'warn'}>
          {targets.length === 0
            ? 'no targets set'
            : offTarget.length === 0
              ? 'all buckets within band'
              : `${offTarget.length} off target`}
        </Pill>
      </div>

      {targets.length === 0 ? (
        <Card>
          <p className="py-4 text-center text-[13px] text-ink-2">
            No targets set for this dimension.{' '}
            <a href="#/settings" className="text-accent hover:underline">
              Set them in Settings
            </a>{' '}
            and drift flags appear here and on the Home page.
          </p>
        </Card>
      ) : rows.filter((row) => row.value > 0).length <= 1 ? (
        <div className="rounded-lg border border-warn/30 bg-warn/5 px-3 py-2.5 text-[12px] leading-relaxed text-warn">
          Every holding falls into a single bucket on this dimension, so there is nothing to rebalance between and the
          drift against your target is not meaningful. This almost always means the imported sheet had no column for it
          — map one under <span className="text-ink">Data → Portfolio holdings</span>, or clear the targets for this
          dimension in Settings so it stops raising a flag.
        </div>
      ) : null}

      <Card>
        <ChartFrame
          title="Actual vs target"
          caption="Bars are what you hold; the tick marks are your targets. The gap is the drift the rebalancing engine works from."
          right={<Legend items={[{ label: 'Actual', color: SERIES[0] }, { label: 'Target', color: SERIES[1] }]} />}
          height={Math.max(200, rows.length * 42)}
        >
          <BarChart data={chartData} layout="vertical" margin={{ top: 4, right: 40, left: 4, bottom: 4 }} barCategoryGap={10}>
            <CartesianGrid {...GRID} horizontal={false} vertical />
            <XAxis type="number" {...AXIS} tickFormatter={(value: number) => `${value.toFixed(0)}%`} />
            <YAxis type="category" dataKey="key" {...AXIS} width={110} />
            <Tooltip
              {...TOOLTIP_STYLE}
              {...tooltipProps((value, name) => [
                Number.isFinite(value) ? `${value.toFixed(1)}%` : '—',
                name === 'actual' ? 'Actual' : 'Target',
              ])}
            />
            <Bar dataKey="actual" name="actual" fill={SERIES[0]} radius={[0, 4, 4, 0]} barSize={14} />
            <Bar dataKey="target" name="target" fill={SERIES[1]} radius={[0, 4, 4, 0]} barSize={5} />
          </BarChart>
        </ChartFrame>
      </Card>

      <Card>
        <SectionHeader
          title="Drift detail"
          subtitle={`Flagged when a bucket sits more than ${pct(settings.driftBandPct, 0)} of the portfolio away from its target. "Gap" is the peso amount that would need to move to close it exactly.`}
          right={
            <ExportButton
                run={() =>
                  exportTable(
                  rows,
                  [
                    { header: 'Bucket', value: (r) => r.key, width: 22 },
                    { header: 'Value (PHP)', value: (r) => r.value, numFmt: MONEY_FMT },
                    { header: 'Actual', value: (r) => r.actual, numFmt: PCT_FMT },
                    { header: 'Target', value: (r) => r.target, numFmt: PCT_FMT },
                    { header: 'Drift', value: (r) => r.drift, numFmt: PCT_FMT },
                    { header: 'Gap to target (PHP)', value: (r) => r.gap, numFmt: MONEY_FMT },
                    { header: 'Status', value: (r) => r.status },
                  ],
                  `allocation-${dimension}`,
                  'Allocation',
                  [`Drift band: ${pct(settings.driftBandPct, 0)} of portfolio`],
                  )
              }
            />
          }
        />
        <DataTable
          rows={rows}
          getKey={(row) => row.key}
          onRowClick={(row) => {
            const inBucket = positions.filter((p) => String(p[dimension] || 'Unspecified') === row.key)
            trace({
              title: `${row.key} — ${pct(row.actual)} of portfolio`,
              description: `${inBucket.length} position${inBucket.length === 1 ? '' : 's'} make up this bucket.`,
              rows: inBucket.flatMap((p) => p.sources),
              columns: [
                { key: 'ticker', label: 'Ticker' },
                { key: 'assetClass', label: 'Class' },
                { key: 'geography', label: 'Geography' },
                { key: 'value', label: 'Value' },
                { key: 'currency', label: 'Ccy' },
              ],
            })
          }}
          columns={[
            { key: 'key', header: 'Bucket', render: (row) => <span className="font-medium text-ink">{row.key}</span>, sortValue: (row) => row.key },
            { key: 'value', header: 'Value', align: 'right', render: (row) => money(row.value, 'PHP', true), sortValue: (row) => row.value },
            { key: 'actual', header: 'Actual', align: 'right', render: (row) => pct(row.actual), sortValue: (row) => row.actual },
            { key: 'target', header: 'Target', align: 'right', render: (row) => (row.target === null ? <span className="text-ink-3">—</span> : pct(row.target)), sortValue: (row) => row.target ?? -1 },
            {
              key: 'drift',
              header: 'Drift',
              align: 'right',
              render: (row) =>
                row.drift === null ? (
                  <span className="text-ink-3">untargeted</span>
                ) : (
                  <span className={row.status === 'on-target' ? 'text-ink-2' : row.status === 'over' ? 'text-warn' : 'text-info'}>
                    {pp(row.drift)}
                  </span>
                ),
              sortValue: (row) => Math.abs(row.drift ?? 0),
            },
            {
              key: 'gap',
              header: 'Gap to target',
              align: 'right',
              render: (row) =>
                row.gap === null ? (
                  <span className="text-ink-3">—</span>
                ) : (
                  <span className={row.status === 'on-target' ? 'text-ink-2' : 'text-ink'}>
                    {row.gap > 0 ? 'buy ' : 'trim '}
                    {money(Math.abs(row.gap), 'PHP', true)}
                  </span>
                ),
              sortValue: (row) => Math.abs(row.gap ?? 0),
            },
          ]}
          initialSort={{ key: 'value', dir: 'desc' }}
        />
      </Card>
    </div>
  )
}

// --- Risk ------------------------------------------------------------------

function RiskViewPanel({
  positions,
  holdings,
  snapshots,
  transactions,
  usdPhp,
}: {
  positions: PositionView[]
  holdings: import('@/types').Holding[]
  snapshots: import('@/types').Snapshot[]
  transactions: import('@/types').Transaction[]
  usdPhp: number
}) {
  const risk = useMemo(() => riskView(positions), [positions])
  const series = useMemo(
    () => buildPerformance(holdings, snapshots, transactions, usdPhp),
    [holdings, snapshots, transactions, usdPhp],
  )
  const vol = volatility(series)
  const drawdown = maxDrawdown(series)
  const drawdowns = useMemo(() => drawdownSeries(series), [series])
  const top5 = positions.slice(0, 5)

  return (
    <div className="space-y-4">
      <StatGrid>
        <Stat
          label="Top 5 concentration"
          value={pct(risk.top5Weight)}
          tone={risk.top5Weight > 0.6 ? 'warn' : 'neutral'}
          sub={top5.map((p) => p.ticker).join(', ')}
        />
        <Stat
          label="Effective positions"
          value={num(risk.effectivePositions, 1)}
          sub={`${risk.positionCount} actual — the gap is how lopsided the weights are`}
          hint="1 / Herfindahl index. If ten positions behave like three, the other seven are rounding error."
        />
        <Stat
          label="Volatility (annualised)"
          value={Number.isFinite(vol) ? pct(vol) : '—'}
          sub={Number.isFinite(vol) ? `From ${series.periods.length} snapshot periods` : 'Needs 3+ snapshots'}
          tone="neutral"
        />
        <Stat
          label="Max drawdown"
          value={Number.isFinite(drawdown) && drawdown < 0 ? pct(drawdown) : '—'}
          tone={drawdown < -0.2 ? 'neg' : 'neutral'}
          sub={Number.isFinite(drawdown) ? 'Worst peak-to-trough on record' : 'Needs more snapshots'}
        />
      </StatGrid>

      {snapshots.length < 3 ? (
        <div className="rounded-lg border border-line bg-surface-2 px-3 py-2 text-[12px] leading-relaxed text-ink-2">
          Volatility and drawdown are computed from the gaps between snapshots. With {snapshots.length} snapshot
          {snapshots.length === 1 ? '' : 's'} on file there isn't enough history for a meaningful number — they fill in
          as you import more. Monthly snapshots give a usable read after about a year.
        </div>
      ) : null}

      <Card>
        <ChartFrame
          title="Concentration"
          caption="Position weights, largest first. The 25% line is where a single name starts driving portfolio outcomes more than your allocation does."
          height={Math.max(180, Math.min(positions.length, 12) * 30)}
        >
          <BarChart data={positions.slice(0, 12).map((p) => ({ ticker: p.ticker, weight: p.weight * 100 }))} layout="vertical" margin={{ top: 4, right: 40, left: 4, bottom: 4 }}>
            <CartesianGrid {...GRID} horizontal={false} vertical />
            <XAxis type="number" {...AXIS} tickFormatter={(value: number) => `${value.toFixed(0)}%`} />
            <YAxis type="category" dataKey="ticker" {...AXIS} width={70} />
            <Tooltip {...TOOLTIP_STYLE} {...tooltipProps((value) => [`${value.toFixed(1)}%`, 'Weight'])} />
            <ReferenceLine x={25} stroke={STATUS.warn} strokeDasharray="4 3" />
            <Bar dataKey="weight" radius={[0, 4, 4, 0]} barSize={14}>
              {positions.slice(0, 12).map((p) => (
                <Cell key={p.ticker} fill={p.weight > 0.25 ? STATUS.warn : SERIES[0]} />
              ))}
            </Bar>
          </BarChart>
        </ChartFrame>
      </Card>

      {drawdowns.length > 2 ? (
        <Card>
          <ChartFrame
            title="Drawdown from peak"
            caption="How far below its best-ever level the portfolio sat at each snapshot. This is the number that tests whether you can hold a strategy, not the average return."
            height={200}
          >
            <LineChart data={drawdowns.map((d) => ({ date: d.date, drawdown: d.drawdown * 100 }))} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
              <CartesianGrid {...GRID} />
              <XAxis dataKey="date" {...AXIS} tickFormatter={(value: string) => value.slice(2, 7)} minTickGap={24} />
              <YAxis {...AXIS} tickFormatter={(value: number) => `${value.toFixed(0)}%`} width={44} />
              <Tooltip
                {...TOOLTIP_STYLE}
                {...tooltipProps(
                  (value) => [`${value.toFixed(1)}%`, 'Drawdown'],
                  (label) => shortDate(label),
                )}
              />
              <ReferenceLine y={0} stroke={STATUS.neutral} />
              <Line type="monotone" dataKey="drawdown" stroke={STATUS.neg} strokeWidth={2} dot={false} />
            </LineChart>
          </ChartFrame>
        </Card>
      ) : null}
    </div>
  )
}

// --- What to invest in -----------------------------------------------------

function MovesView({ positions }: { positions: PositionView[] }) {
  const { settings } = useLedger()
  const [dimension, setDimension] = useState<AllocationDimension>('assetClass')
  const [cash, setCash] = useState('')

  const { moves, totalDrift } = useMemo(
    () => proposeMoves(positions, settings, dimension, undefined, {}, Number(cash) || 0),
    [positions, settings, dimension, cash],
  )

  return (
    <div className="space-y-4">
      <Card className="border-accent/25 bg-accent/[0.04]">
        <div className="flex gap-3">
          <span className="mt-0.5 text-[14px] text-accent">◈</span>
          <div>
            <h3 className="text-[13px] font-semibold text-ink">Decision support, not advice</h3>
            <p className="mt-1 max-w-3xl text-[12px] leading-relaxed text-ink-2">
              Every suggestion below is scored from your own imported data and the targets you set — nothing here knows
              anything about markets, and no move is placed for you. The score and each of its four components are shown
              on every card so you can disagree with the ranking rather than accept it. Weights:{' '}
              <span className="text-ink">45% gap closure, 25% tax/cost efficiency, 20% concentration, 10% valuation.</span>
            </p>
          </div>
        </div>
      </Card>

      <div className="no-print flex flex-wrap items-end justify-between gap-3">
        <Tabs
          value={dimension}
          onChange={setDimension}
          options={[
            { value: 'assetClass', label: 'Asset class' },
            { value: 'geography', label: 'Geography' },
            { value: 'currency', label: 'Currency' },
          ]}
        />
        <label className="block">
          <span className="mb-1 block text-[11px] font-medium text-ink-2">New cash to deploy (₱)</span>
          <input
            type="number"
            value={cash}
            onChange={(event) => setCash(event.target.value)}
            placeholder="0"
            className="num w-44 rounded-lg border border-line bg-surface-2 px-2.5 py-1.5 text-[13px] text-ink outline-none focus:border-accent/60"
          />
        </label>
      </div>

      <StatGrid cols={3}>
        <Stat label="Total drift" value={pct(totalDrift)} tone={totalDrift > settings.driftBandPct ? 'warn' : 'pos'} sub="Half the sum of absolute bucket drifts" />
        <Stat label="Moves suggested" value={String(moves.length)} sub={moves.length === 0 ? 'Everything within band' : 'Ranked by score'} />
        <Stat label="Transaction cost assumed" value={pct(TRANSACTION_COST_RATE, 2)} sub="PH stock transaction tax on gross proceeds" />
      </StatGrid>

      {moves.length === 0 ? (
        <Card>
          <p className="py-6 text-center text-[13px] text-ink-2">
            Nothing is outside its drift band. The engine has no move to suggest — which is itself the answer.
          </p>
        </Card>
      ) : (
        <div className="space-y-2.5">
          {moves.map((move, index) => (
            <MoveCard key={move.id} move={move} rank={index + 1} />
          ))}
        </div>
      )}
    </div>
  )
}

function MoveCard({ move, rank }: { move: Move; rank: number }) {
  const [open, setOpen] = useState(rank === 1)
  const components = [
    { key: 'gapClosure', label: 'Gap closure', weight: 0.45 },
    { key: 'taxEfficiency', label: 'Tax / cost', weight: 0.25 },
    { key: 'concentration', label: 'Concentration', weight: 0.2 },
    { key: 'valuation', label: 'Valuation', weight: 0.1 },
  ] as const

  return (
    <Card padded={false} className="overflow-hidden">
      <button type="button" onClick={() => setOpen((prev) => !prev)} className="flex w-full items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-surface-2">
        <span className="num flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-surface-2 text-[11px] text-ink-2">{rank}</span>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <Pill tone={move.kind === 'buy' ? 'info' : 'warn'}>{move.kind === 'buy' ? 'Buy' : 'Trim'}</Pill>
            <span className="text-[13px] font-medium text-ink">
              {move.ticker ?? move.bucket}
              {move.ticker && move.bucket !== move.ticker ? <span className="text-ink-3"> · {move.bucket}</span> : null}
            </span>
          </div>
          <div className="num mt-0.5 text-[12px] text-ink-2">{money(move.amount, 'PHP', true)}</div>
        </div>
        <div className="shrink-0 text-right">
          <div className="num text-[15px] font-semibold text-ink">{move.score.toFixed(2)}</div>
          <div className="text-[10px] uppercase tracking-wide text-ink-3">score</div>
        </div>
        <span className="shrink-0 text-[11px] text-ink-3">{open ? '▾' : '▸'}</span>
      </button>

      {open ? (
        <div className="border-t border-line px-4 py-3">
          <ul className="mb-3 space-y-1.5">
            {move.rationale.map((line) => (
              <li key={line} className="flex gap-2 text-[12px] leading-relaxed text-ink-2">
                <span className="mt-[6px] h-1 w-1 shrink-0 rounded-full bg-ink-3" />
                {line}
              </li>
            ))}
          </ul>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            {components.map((component) => {
              const raw = move.components[component.key]
              return (
                <div key={component.key} className="rounded-lg border border-line bg-surface-2 px-2.5 py-2">
                  <div className="flex items-baseline justify-between">
                    <span className="text-[10px] uppercase tracking-wide text-ink-3">{component.label}</span>
                    <span className="text-[10px] text-ink-3">×{component.weight}</span>
                  </div>
                  <div className="num mt-1 text-[14px] font-semibold text-ink">{raw.toFixed(2)}</div>
                  <div className="mt-1 h-1 overflow-hidden rounded-full bg-surface-3">
                    <div className="h-full rounded-full bg-accent/60" style={{ width: `${raw * 100}%` }} />
                  </div>
                </div>
              )
            })}
          </div>
          {move.realisedGain > 0 ? (
            <p className="mt-2.5 text-[11px] text-warn">
              Crystallises roughly {money(move.realisedGain, 'PHP', true)} of unrealised gain. Listed PH equities carry no
              capital gains tax, but check how this interacts with anything held offshore.
            </p>
          ) : null}
        </div>
      ) : null}
    </Card>
  )
}
