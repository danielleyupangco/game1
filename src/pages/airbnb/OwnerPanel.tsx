import { useMemo } from 'react'
import { Link } from 'react-router-dom'
import { Bar, BarChart, CartesianGrid, Cell, Tooltip, XAxis, YAxis } from 'recharts'
import { useLedger } from '@/state/store'
import { aggregate, monthlyMetrics, trailing } from '@/domain/airbnb/metrics'
import { summariseCosts } from '@/domain/airbnb/pricefloor'
import { Card, cx } from '@/components/ui/primitives'
import { EmptyState } from '@/components/ui/EmptyState'
import { ChartFrame, tooltipProps } from '@/components/charts/Chart'
import { AXIS, GRID, SERIES, STATUS, TOOLTIP_STYLE } from '@/components/charts/theme'
import { money, monthLabel } from '@/lib/format'
import { monthKey, today } from '@/lib/dates'

/**
 * The plain-language view.
 *
 * Same numbers as everywhere else, said the way an owner would say them: money
 * in, money out, what's left, what's booked ahead. No ratios, no acronyms, no
 * measures that need a finance background to read. It exists because a business
 * with two owners is only being run by both of them if both can see it.
 */
export function OwnerPanel() {
  const { bookings, expenses, capitalSpend, settings, dcf, costModel, findings } = useLedger()

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

  const t12 = useMemo(() => (series.length > 0 ? aggregate(trailing(series, 12)) : null), [series])
  const costs = useMemo(() => summariseCosts(costModel), [costModel])

  const ahead = useMemo(() => {
    const from = today()
    const future = bookings.filter((booking) => booking.checkIn >= from && !/cancel/i.test(booking.status))
    const byMonth = new Map<string, { nights: number; money: number }>()
    for (const booking of future) {
      const key = monthKey(booking.checkIn)
      const bucket = byMonth.get(key) ?? { nights: 0, money: 0 }
      bucket.nights += booking.nights
      bucket.money += booking.netRevenue + booking.addOnRevenue
      byMonth.set(key, bucket)
    }
    return {
      count: future.length,
      nights: future.reduce((sum, booking) => sum + booking.nights, 0),
      money: future.reduce((sum, booking) => sum + booking.netRevenue + booking.addOnRevenue, 0),
      months: [...byMonth.entries()].sort().map(([month, bucket]) => ({ month, ...bucket })),
    }
  }, [bookings])

  const capitalThisYear = useMemo(() => {
    const year = String(new Date().getFullYear())
    return capitalSpend.filter((row) => row.date.startsWith(year)).reduce((sum, row) => sum + row.amount, 0)
  }, [capitalSpend])

  const urgent = findings
    .filter((f) => f.section === 'airbnb' && f.status === 'open' && f.severity === 'critical')
    .sort((a, b) => b.priority - a.priority)

  if (!t12 || bookings.length === 0) {
    return (
      <EmptyState
        title="Nothing to report yet"
        body="Once bookings and costs are in, this page explains how the island is doing in plain words — money in, money out, and what's left."
        dataset="bookings"
      />
    )
  }

  const kept = t12.revenue - t12.totalCost
  const keptShare = t12.revenue > 0 ? kept / t12.revenue : 0
  const nightsPerMonth = t12.nightsSold / 12
  const recent = series.slice(-12)

  return (
    <div className="space-y-4">
      <Card className="bg-surface/60">
        <p className="text-[15px] leading-relaxed text-ink">
          Over the last twelve months the island earned{' '}
          <strong className="num font-semibold">{money(t12.revenue, 'PHP')}</strong> from{' '}
          <strong className="num font-semibold">{t12.bookings}</strong> stays. Running it cost{' '}
          <strong className="num font-semibold">{money(t12.totalCost, 'PHP')}</strong>, which left{' '}
          <strong className={cx('num font-semibold', kept >= 0 ? 'text-pos' : 'text-neg')}>
            {money(kept, 'PHP')}
          </strong>
          .
        </p>
        <p className="mt-2.5 text-[13px] leading-relaxed text-ink-2">
          Put another way: for every ₱100 a guest paid,{' '}
          <span className="num text-ink">₱{Math.round(keptShare * 100)}</span> stayed in the business and{' '}
          <span className="num text-ink">₱{Math.round((1 - keptShare) * 100)}</span> went on wages, food, fuel and
          upkeep. Guests stayed about {Math.round(nightsPerMonth)} nights a month on average.
        </p>
      </Card>

      <div className="grid gap-2.5 sm:grid-cols-2 lg:grid-cols-4">
        <PlainStat
          label="Money coming in"
          value={money(t12.revenue, 'PHP', true)}
          detail={`${t12.nightsSold} nights sold across ${t12.bookings} stays`}
          tone="pos"
        />
        <PlainStat
          label="Money going out"
          value={money(t12.totalCost, 'PHP', true)}
          detail={`${money(t12.fixedCost, 'PHP', true)} we pay no matter what, ${money(t12.variableCost, 'PHP', true)} only when guests come`}
          tone="neg"
        />
        <PlainStat
          label="What's left"
          value={money(kept, 'PHP', true)}
          detail={`${Math.round(keptShare * 100)} pesos of every 100 taken`}
          tone={kept >= 0 ? 'pos' : 'neg'}
        />
        <PlainStat
          label="Spent on the property"
          value={money(capitalThisYear, 'PHP', true)}
          detail="Repairs and equipment this year. This is separate from the running costs above."
        />
      </div>

      <Card>
        <h3 className="text-[14px] font-semibold text-ink">How full the island was</h3>
        <p className="mt-1 text-[12.5px] leading-relaxed text-ink-2">
          There are {costModel.availableNightsPerYear} nights we could sell in a year. We sold{' '}
          <span className="num text-ink">{t12.nightsSold}</span> of them — about{' '}
          <span className="num text-ink">{Math.round(t12.occupancy * 100)} out of every 100</span>. We need roughly{' '}
          <span className="num text-ink">
            {Math.ceil(costs.fixedPerYear / Math.max(1, t12.adr - costs.variablePerNight))}
          </span>{' '}
          nights a year just to cover the bills that arrive whether anyone comes or not.
        </p>
        <div className="mt-3">
          <ChartFrame
            title=""
            caption="Each bar is a month. Taller means busier. Grey months are ones where we did not cover our costs."
            height={200}
          >
            <BarChart
              data={recent.map((month) => ({
                month: month.month,
                nights: month.nightsSold,
                profit: month.netProfit,
              }))}
              margin={{ top: 8, right: 8, left: 0, bottom: 0 }}
            >
              <CartesianGrid {...GRID} />
              <XAxis dataKey="month" {...AXIS} tickFormatter={monthLabel} minTickGap={12} />
              <YAxis {...AXIS} width={30} />
              <Tooltip
                {...TOOLTIP_STYLE}
                {...tooltipProps((value) => [`${value} nights`, 'Sold'], (label) => monthLabel(label))}
              />
              <Bar dataKey="nights" radius={[4, 4, 0, 0]} maxBarSize={32}>
                {recent.map((month) => (
                  <Cell key={month.month} fill={month.netProfit >= 0 ? SERIES[0] : STATUS.neutral} />
                ))}
              </Bar>
            </BarChart>
          </ChartFrame>
        </div>
      </Card>

      <Card>
        <h3 className="text-[14px] font-semibold text-ink">What's booked from today</h3>
        {ahead.count === 0 ? (
          <p className="mt-1.5 text-[12.5px] leading-relaxed text-warn">
            Nothing is booked from today onwards. That is the most important thing on this page — every month that
            passes without bookings is a month of wages and upkeep with nothing coming in against it.
          </p>
        ) : (
          <>
            <p className="mt-1 text-[12.5px] leading-relaxed text-ink-2">
              <span className="num text-ink">{ahead.count}</span> stays are booked, worth{' '}
              <span className="num text-ink">{money(ahead.money, 'PHP')}</span> across{' '}
              <span className="num text-ink">{ahead.nights}</span> nights. Against fixed costs of{' '}
              <span className="num text-ink">{money(costs.fixedPerMonth, 'PHP')}</span> a month, that covers about{' '}
              <span className="num text-ink">
                {(ahead.money / Math.max(1, costs.fixedPerMonth)).toFixed(1)}
              </span>{' '}
              months of bills.
            </p>
            <div className="mt-3 space-y-1.5">
              {ahead.months.map((row) => (
                <div key={row.month} className="flex items-center gap-2.5">
                  <span className="w-20 shrink-0 text-[12px] text-ink">{monthLabel(row.month)}</span>
                  <div className="h-2 flex-1 overflow-hidden rounded-full bg-surface-2">
                    <div
                      className="h-full rounded-full bg-accent/60"
                      style={{ width: `${Math.min(100, (row.nights / 20) * 100)}%` }}
                    />
                  </div>
                  <span className="num w-32 shrink-0 text-right text-[11.5px] text-ink-2">
                    {row.nights} nights · {money(row.money, 'PHP', true)}
                  </span>
                </div>
              ))}
            </div>
          </>
        )}
      </Card>

      {urgent.length > 0 ? (
        <Card className="border-neg/30 bg-neg/[0.05]">
          <h3 className="text-[14px] font-semibold text-ink">What needs a decision</h3>
          <div className="mt-2 space-y-2.5">
            {urgent.slice(0, 3).map((finding) => (
              <div key={finding.id}>
                <div className="text-[13px] font-medium text-ink">{finding.title}</div>
                <p className="mt-0.5 text-[12px] leading-relaxed text-ink-2">{finding.body[0]}</p>
                {finding.action ? (
                  <p className="mt-1 text-[12px] leading-relaxed text-accent">→ {finding.action}</p>
                ) : null}
              </div>
            ))}
          </div>
          <Link to="/analysis" className="mt-3 inline-block text-[12px] text-accent hover:underline">
            See everything we're tracking →
          </Link>
        </Card>
      ) : null}

      <Card>
        <h3 className="text-[14px] font-semibold text-ink">A few words that come up a lot</h3>
        <dl className="mt-2 grid gap-x-6 gap-y-2.5 sm:grid-cols-2">
          {[
            ['Occupancy', 'How full we were. 40% means we sold 40 nights out of every 100 we could have.'],
            ['ADR', 'The average price a guest pays for one night on the island.'],
            ['RevPAR', 'What every available night earned on average — including the empty ones. It falls if we sell fewer nights even at a higher price.'],
            ['Fixed cost', 'Wages, internet, upkeep. Arrives whether or not anyone books.'],
            ['Variable cost', 'Food, fuel, laundry. Only happens when a guest comes.'],
            ['Capital spend', "Buying something that lasts — a generator, a bridge. Money leaves the bank but we still own the thing, so it isn't counted as a cost against profit."],
          ].map(([term, meaning]) => (
            <div key={term}>
              <dt className="text-[12px] font-semibold text-ink">{term}</dt>
              <dd className="mt-0.5 text-[12px] leading-relaxed text-ink-2">{meaning}</dd>
            </div>
          ))}
        </dl>
      </Card>

      <p className="px-1 text-[11px] text-ink-3">
        Covers the twelve months to {monthLabel(new Date().toISOString().slice(0, 7))}. Bookings for later months are
        counted under “what's booked”, not as money already earned. Every figure comes from the bookings and costs
        recorded in this app.
      </p>
    </div>
  )
}

function PlainStat({
  label,
  value,
  detail,
  tone = 'neutral',
}: {
  label: string
  value: string
  detail: string
  tone?: 'pos' | 'neg' | 'neutral'
}) {
  const tones = { pos: 'text-pos', neg: 'text-neg', neutral: 'text-ink' }
  return (
    <div className="rounded-xl border border-line bg-surface p-3.5">
      <div className="text-[12px] font-medium text-ink-2">{label}</div>
      <div className={cx('num mt-1 text-[22px] font-semibold leading-none', tones[tone])}>{value}</div>
      <div className="mt-2 text-[11.5px] leading-relaxed text-ink-3">{detail}</div>
    </div>
  )
}
