import { useMemo } from 'react'
import { Link } from 'react-router-dom'
import { Area, AreaChart, CartesianGrid, Tooltip, XAxis, YAxis } from 'recharts'
import { useLedger } from '@/state/store'
import { buildPositions, latestSnapshot, sortedSnapshots, totalValue } from '@/domain/investments/portfolio'
import { buildPerformance, yearToDateReturn } from '@/domain/investments/performance'
import { aggregate, monthlyMetrics, trailing, yearToDate } from '@/domain/airbnb/metrics'
import { businessCash, personalHoldings } from '@/domain/investments/ownership'
import { runDcf } from '@/domain/airbnb/dcf'
import { buildActions, type ActionItem } from '@/domain/actions'
import { Card, Pill, SectionHeader, cx } from '@/components/ui/primitives'
import { Stat, StatGrid } from '@/components/ui/Stat'
import { Freshness } from '@/components/ui/Freshness'
import { ChartFrame, tooltipProps } from '@/components/charts/Chart'
import { AXIS, GRID, SERIES, TOOLTIP_STYLE } from '@/components/charts/theme'
import { useProvenance } from '@/components/ui/Provenance'
import { money, monthLabel, num, pct, shortDate, signedPct } from '@/lib/format'

export function HomePage() {
  const ledger = useLedger()
  const { holdings, snapshots, transactions, bookings, expenses, capitalSpend, settings, dcf, freshness, ready } = ledger
  const { trace } = useProvenance()

  const snapshot = useMemo(() => latestSnapshot(snapshots), [snapshots])
  /**
   * The Island T operating account is in the holdings sheet but it is not hers
   * to spend — it is the business's float, and it is already counted inside
   * what the business is worth. So it is taken out here and added back once,
   * through the valuation.
   */
  const personal = useMemo(() => personalHoldings(holdings), [holdings])
  const positions = useMemo(() => buildPositions(personal, snapshot), [personal, snapshot])
  const liquid = totalValue(positions)
  const businessFloat = useMemo(
    () => businessCash(snapshot ? holdings.filter((h) => h.snapshotId === snapshot.id) : [], snapshot?.usdPhp ?? settings.usdPhp),
    [holdings, snapshot, settings.usdPhp],
  )

  const performance = useMemo(
    () => (snapshots.length >= 2 ? buildPerformance(holdings, snapshots, transactions, settings.usdPhp) : null),
    [holdings, snapshots, transactions, settings.usdPhp],
  )

  const airbnbSeries = useMemo(
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
  const t12 = useMemo(() => (airbnbSeries.length > 0 ? aggregate(trailing(airbnbSeries, 12)) : null), [airbnbSeries])
  const ytd = useMemo(
    () => (airbnbSeries.length > 0 ? aggregate(yearToDate(airbnbSeries, String(new Date().getFullYear()))) : null),
    [airbnbSeries],
  )

  // The property is only counted at DCF value once there is real data behind
  // the assumptions — otherwise it would be a default number dressed as net worth.
  const hasAirbnbData = bookings.length > 0 && expenses.length > 0
  const dcfResult = useMemo(() => runDcf(dcf, businessFloat), [dcf, businessFloat])
  const propertyValue = hasAirbnbData && Number.isFinite(dcfResult.equityValue) ? dcfResult.equityValue : 0

  const netWorth = liquid + propertyValue + settings.cashOnHand

  const netWorthSeries = useMemo(() => {
    const ordered = sortedSnapshots(snapshots)
    return ordered.map((snap) => ({
      date: snap.asOf,
      liquid: totalValue(buildPositions(personal, snap)),
    }))
  }, [snapshots, holdings])

  const monthOverMonth = useMemo(() => {
    if (netWorthSeries.length < 2) return null
    const last = netWorthSeries[netWorthSeries.length - 1].liquid
    const previous = netWorthSeries[netWorthSeries.length - 2].liquid
    return previous > 0 ? { change: last - previous, pct: last / previous - 1 } : null
  }, [netWorthSeries])

  const actions = useMemo(
    () =>
      buildActions({
        positions,
        settings,
        performance,
        airbnbSeries,
        airbnbT12: t12,
        freshness,
        hasHoldings: holdings.length > 0,
        hasBookings: bookings.length > 0,
        hasExpenses: expenses.length > 0,
        snapshotCount: snapshots.length,
      }),
    [positions, settings, performance, airbnbSeries, t12, freshness, holdings.length, bookings.length, expenses.length, snapshots.length],
  )

  const openFindings = useMemo(
    () =>
      [...ledger.findings]
        .filter((finding) => finding.status === 'open' || finding.status === 'doing')
        .sort((a, b) => b.priority - a.priority),
    [ledger.findings],
  )
  const criticalFindings = openFindings.filter((finding) => finding.severity === 'critical').length

  const nothingImported = holdings.length === 0 && bookings.length === 0 && expenses.length === 0

  if (!ready) {
    return <p className="py-16 text-center text-[13px] text-ink-3">Loading your data…</p>
  }

  if (nothingImported) {
    return (
      <div className="space-y-4">
        <SectionHeader title="Main" />
        <Card className="px-6 py-12 text-center">
          <h2 className="text-[18px] font-semibold tracking-tight text-ink">Nothing imported yet</h2>
          <p className="mx-auto mt-2 max-w-lg text-[13px] leading-relaxed text-ink-2">
            This dashboard shows your numbers and only your numbers — there are no sample figures anywhere in it. Start
            by importing a spreadsheet and the sections fill in as the data arrives.
          </p>
          <div className="mt-5 flex flex-wrap justify-center gap-2">
            <Link
              to="/data?dataset=holdings"
              className="rounded-lg border border-accent/40 bg-accent/15 px-3.5 py-2 text-[13px] font-medium text-accent transition-colors hover:bg-accent/25"
            >
              Import portfolio holdings
            </Link>
            <Link
              to="/data?dataset=bookings"
              className="rounded-lg border border-line bg-surface-2 px-3.5 py-2 text-[13px] font-medium text-ink transition-colors hover:bg-surface-3"
            >
              Import Island T bookings
            </Link>
          </div>
          <p className="mx-auto mt-5 max-w-lg text-[11.5px] leading-relaxed text-ink-3">
            Files are read in your browser and stored on this device only. Nothing is uploaded. The importer shows you
            every column it matched before anything is saved.
          </p>
        </Card>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <SectionHeader
        title="Main"
        subtitle={snapshot ? `Portfolio valued ${shortDate(snapshot.asOf)}` : 'No portfolio snapshot yet'}
        right={
          <div className="flex flex-wrap items-center gap-1.5">
            <Freshness timestamp={freshness.holdings} label="portfolio" />
            <Freshness timestamp={freshness.bookings} label="bookings" />
          </div>
        }
      />

      {openFindings.length > 0 ? (
        <Link
          to="/analysis"
          className="no-print flex items-center gap-3 rounded-xl border border-accent/30 bg-accent/[0.06] px-4 py-3 transition-colors hover:bg-accent/[0.1]"
        >
          <span className="text-[14px] text-accent">✦</span>
          <div className="min-w-0 flex-1">
            <div className="text-[13px] font-semibold text-ink">
              {openFindings.length} written finding{openFindings.length === 1 ? '' : 's'} outstanding
              {criticalFindings > 0 ? (
                <span className="ml-1.5 font-normal text-neg">· {criticalFindings} to act on now</span>
              ) : null}
            </div>
            <p className="mt-0.5 truncate text-[12px] text-ink-2">{openFindings[0].title}</p>
          </div>
          <span className="shrink-0 text-[11px] text-accent">Open analysis →</span>
        </Link>
      ) : null}

      {actions.length > 0 ? <AlertStrip actions={actions} /> : null}

      <StatGrid>
        <Stat
          label="Net worth"
          value={money(netWorth, 'PHP', true)}
          tone="neutral"
          sub={
            monthOverMonth ? (
              <span className={monthOverMonth.change >= 0 ? 'text-pos' : 'text-neg'}>
                {signedPct(monthOverMonth.pct)} on liquid since last snapshot
              </span>
            ) : (
              'Needs two snapshots for a trend'
            )
          }
          onTrace={() =>
            trace({
              title: 'Net worth',
              description: `Liquid investments ${money(liquid, 'PHP')} + Island T at DCF equity value ${money(propertyValue, 'PHP')} + cash on hand ${money(settings.cashOnHand, 'PHP')}. Property is only counted once bookings and expenses are both imported. The Island T bank balance of ${money(businessFloat, 'PHP')} is inside the property's value and deliberately not in the liquid figure — it is the business's working capital, counted once.`,
              rows: positions.flatMap((p) => p.sources),
              columns: [
                { key: 'ticker', label: 'Ticker' },
                { key: 'value', label: 'Value' },
                { key: 'currency', label: 'Ccy' },
              ],
            })
          }
        />
        <Stat
          label="Liquid investments"
          value={holdings.length > 0 ? money(liquid, 'PHP', true) : '—'}
          sub={holdings.length > 0 ? `${positions.length} positions` : 'No holdings imported'}
        />
        <Stat
          label="Island T (DCF)"
          value={hasAirbnbData ? money(propertyValue, 'PHP', true) : '—'}
          sub={
            hasAirbnbData ? (
              <Link to="/airbnb" className="text-accent hover:underline">
                {pct(dcfResult.terminalShare, 0)} from terminal value
              </Link>
            ) : (
              'Excluded until bookings and expenses are imported'
            )
          }
        />
        <Stat
          label="Cash on hand"
          value={money(settings.cashOnHand, 'PHP', true)}
          sub={
            <Link to="/settings" className="text-accent hover:underline">
              Set in Settings
            </Link>
          }
        />
      </StatGrid>

      <div className="grid gap-4 lg:grid-cols-2">
        <SectionCard
          title="Investments"
          to="/investments"
          empty={holdings.length === 0}
          emptyBody="No holdings imported. The portfolio section stays empty rather than showing a placeholder."
          emptyLink="/data?dataset=holdings"
          emptyCta="Import holdings"
          status={
            !performance
              ? `${positions.length} positions worth ${money(liquid, 'PHP', true)} · import again later for a return`
              : performance.contributionsKnown
                ? `Return YTD ${Number.isFinite(yearToDateReturn(performance)) ? signedPct(yearToDateReturn(performance)) : 'not enough history'} · since inception ${signedPct(performance.sinceInception)}`
                : `Value up ${signedPct(performance.sinceInception)} over ${num(performance.years, 1)} years — but contributions aren't separated, so this is not a return`
          }
          statusTone={
            !performance ? 'neutral' : !performance.contributionsKnown ? 'neutral' : performance.sinceInception >= 0 ? 'pos' : 'neg'
          }
        >
          {netWorthSeries.length >= 2 ? (
            <ChartFrame
              title=""
              caption="Portfolio value at each snapshot. Contributions move this line as much as returns do — the Investments tab separates the two."
              height={150}
            >
              <AreaChart data={netWorthSeries} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="liquidFill" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={SERIES[0]} stopOpacity={0.35} />
                    <stop offset="100%" stopColor={SERIES[0]} stopOpacity={0.02} />
                  </linearGradient>
                </defs>
                <CartesianGrid {...GRID} />
                <XAxis dataKey="date" {...AXIS} tickFormatter={(value: string) => value.slice(2, 7)} minTickGap={24} />
                <YAxis {...AXIS} tickFormatter={(value: number) => money(value, 'PHP', true)} width={52} />
                <Tooltip
                  {...TOOLTIP_STYLE}
                  {...tooltipProps((value) => [money(value, 'PHP'), 'Portfolio'], (label) => shortDate(label))}
                />
                <Area type="monotone" dataKey="liquid" stroke={SERIES[0]} strokeWidth={2} fill="url(#liquidFill)" />
              </AreaChart>
            </ChartFrame>
          ) : holdings.length > 0 ? (
            <p className="py-4 text-center text-[12px] leading-relaxed text-ink-2">
              One snapshot on file. Import your holdings sheet again at a later date and this becomes a value and return
              history.
            </p>
          ) : null}
        </SectionCard>

        <SectionCard
          title="Island T"
          to="/airbnb"
          empty={bookings.length === 0 && expenses.length === 0}
          emptyBody="No bookings or expenses imported yet."
          emptyLink="/data?dataset=bookings"
          emptyCta="Import bookings"
          status={
            ytd && ytd.revenue > 0
              ? expenses.length > 0
                ? `Net margin YTD ${pct(ytd.netMargin)} on ${money(ytd.revenue, 'PHP', true)} revenue · ${pct(ytd.occupancy)} occupancy`
                : `${money(ytd.revenue, 'PHP', true)} revenue YTD at ${pct(ytd.occupancy)} occupancy · costs not yet imported`
              : 'No revenue recorded this year'
          }
          statusTone={ytd && expenses.length > 0 ? (ytd.netMargin >= 0 ? 'pos' : 'neg') : 'neutral'}
        >
          {airbnbSeries.length >= 2 ? (
            <ChartFrame
              title=""
              caption={
                expenses.length > 0
                  ? 'Monthly net profit. Months below zero are months the island was subsidised.'
                  : 'Monthly revenue. Import expenses to see this as profit.'
              }
              height={150}
            >
              <AreaChart
                data={airbnbSeries.map((month) => ({
                  month: month.month,
                  value: expenses.length > 0 ? month.netProfit : month.revenue,
                }))}
                margin={{ top: 4, right: 4, left: 0, bottom: 0 }}
              >
                <defs>
                  <linearGradient id="airbnbFill" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={SERIES[2]} stopOpacity={0.35} />
                    <stop offset="100%" stopColor={SERIES[2]} stopOpacity={0.02} />
                  </linearGradient>
                </defs>
                <CartesianGrid {...GRID} />
                <XAxis dataKey="month" {...AXIS} tickFormatter={monthLabel} minTickGap={24} />
                <YAxis {...AXIS} tickFormatter={(value: number) => money(value, 'PHP', true)} width={52} />
                <Tooltip
                  {...TOOLTIP_STYLE}
                  {...tooltipProps(
                    (value) => [money(value, 'PHP'), expenses.length > 0 ? 'Net profit' : 'Revenue'],
                    (label) => monthLabel(label),
                  )}
                />
                <Area type="monotone" dataKey="value" stroke={SERIES[2]} strokeWidth={2} fill="url(#airbnbFill)" />
              </AreaChart>
            </ChartFrame>
          ) : null}
        </SectionCard>
      </div>

      {t12 && t12.revenue > 0 ? (
        <Card>
          <SectionHeader
            title="Upcoming cash needs"
            subtitle="Fixed costs run whether or not the island is booked. This is what has to be covered over the next quarter at your current cost base."
          />
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            <MiniStat label="Fixed costs / quarter" value={money(t12.fixedCost / 4, 'PHP', true)} />
            <MiniStat
              label="Typical quarterly revenue"
              value={money(t12.revenue / 4, 'PHP', true)}
              tone={t12.revenue / 4 > t12.fixedCost / 4 ? 'pos' : 'warn'}
            />
            <MiniStat
              label="Gap if nothing books"
              value={money(t12.fixedCost / 4, 'PHP', true)}
              tone="warn"
            />
            <MiniStat
              label="Nights to cover fixed"
              value={
                t12.adr - t12.variableCostPerNight > 0
                  ? `${Math.ceil(t12.fixedCost / 4 / (t12.adr - t12.variableCostPerNight))} / qtr`
                  : '—'
              }
            />
          </div>
        </Card>
      ) : null}
    </div>
  )
}

function AlertStrip({ actions }: { actions: ActionItem[] }) {
  const top = actions.slice(0, 3)
  const rest = actions.slice(3)

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between gap-2">
        <h2 className="text-[11px] font-semibold uppercase tracking-widest text-ink-3">Needs your attention</h2>
        {rest.length > 0 ? <span className="text-[11px] text-ink-3">+{rest.length} more below</span> : null}
      </div>

      <div className="grid gap-2 lg:grid-cols-3">
        {top.map((action) => (
          <ActionCard key={action.id} action={action} />
        ))}
      </div>

      {rest.length > 0 ? (
        <div className="flex flex-wrap gap-1.5">
          {rest.map((action) => (
            <Link
              key={action.id}
              to={action.link}
              title={action.detail}
              className={cx(
                'rounded-md border px-2 py-1 text-[11px] font-medium transition-colors',
                action.severity === 'critical'
                  ? 'border-neg/25 bg-neg/10 text-neg hover:bg-neg/20'
                  : action.severity === 'warning'
                    ? 'border-warn/25 bg-warn/10 text-warn hover:bg-warn/20'
                    : 'border-line bg-surface-2 text-ink-2 hover:text-ink',
              )}
            >
              {action.title}
            </Link>
          ))}
        </div>
      ) : null}
    </div>
  )
}

function ActionCard({ action }: { action: ActionItem }) {
  const tone =
    action.severity === 'critical'
      ? 'border-neg/30 bg-neg/[0.06]'
      : action.severity === 'warning'
        ? 'border-warn/30 bg-warn/[0.05]'
        : 'border-line bg-surface'

  return (
    <Link to={action.link} className={cx('block rounded-xl border p-3 transition-colors hover:bg-surface-2', tone)}>
      <div className="flex items-start justify-between gap-2">
        <h3 className="text-[13px] font-semibold leading-snug text-ink">{action.title}</h3>
        <Pill tone={action.severity === 'critical' ? 'neg' : action.severity === 'warning' ? 'warn' : 'neutral'}>
          {action.section === 'investments' ? 'Invest' : action.section === 'airbnb' ? 'Island' : 'Data'}
        </Pill>
      </div>
      <p className="mt-1.5 text-[11.5px] leading-relaxed text-ink-2">{action.detail}</p>
    </Link>
  )
}

function SectionCard({
  title,
  to,
  status,
  statusTone,
  empty,
  emptyBody,
  emptyLink,
  emptyCta,
  children,
}: {
  title: string
  to: string
  status: string
  statusTone: 'pos' | 'neg' | 'neutral'
  empty: boolean
  emptyBody: string
  emptyLink: string
  emptyCta: string
  children?: React.ReactNode
}) {
  return (
    <Card>
      <div className="mb-2 flex items-center justify-between gap-2">
        <h2 className="text-[14px] font-semibold tracking-tight text-ink">{title}</h2>
        <Link to={to} className="no-print text-[11px] text-accent transition-opacity hover:opacity-80">
          Open →
        </Link>
      </div>

      {empty ? (
        <div className="py-6 text-center">
          <p className="text-[12px] leading-relaxed text-ink-2">{emptyBody}</p>
          <Link
            to={emptyLink}
            className="mt-3 inline-block rounded-lg border border-line bg-surface-2 px-3 py-1.5 text-[12px] font-medium text-ink transition-colors hover:bg-surface-3"
          >
            {emptyCta}
          </Link>
        </div>
      ) : (
        <>
          <p
            className={cx(
              'text-[12.5px] leading-relaxed',
              statusTone === 'pos' ? 'text-pos' : statusTone === 'neg' ? 'text-neg' : 'text-ink-2',
            )}
          >
            {status}
          </p>
          {children}
        </>
      )}
    </Card>
  )
}

function MiniStat({ label, value, tone = 'neutral' }: { label: string; value: string; tone?: 'pos' | 'warn' | 'neutral' }) {
  const tones = { pos: 'text-pos', warn: 'text-warn', neutral: 'text-ink' }
  return (
    <div className="rounded-lg border border-line bg-surface-2 px-2.5 py-2">
      <div className="text-[10px] uppercase tracking-wide text-ink-3">{label}</div>
      <div className={cx('num mt-0.5 text-[14px] font-semibold', tones[tone])}>{value}</div>
    </div>
  )
}
