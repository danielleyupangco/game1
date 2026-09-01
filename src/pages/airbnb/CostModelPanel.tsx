import { useMemo, useState } from 'react'
import { CartesianGrid, Line, LineChart, ReferenceLine, Tooltip, XAxis, YAxis } from 'recharts'
import { useLedger } from '@/state/store'
import { buildFloors, floorAt, summariseCosts } from '@/domain/airbnb/pricefloor'
import { aggregate, monthlyMetrics, trailing } from '@/domain/airbnb/metrics'
import { Button, Card, SectionHeader, cx, inputClass } from '@/components/ui/primitives'
import { Stat, StatGrid } from '@/components/ui/Stat'
import { ChartFrame, tooltipProps } from '@/components/charts/Chart'
import { AXIS, GRID, SERIES, STATUS, TOOLTIP_STYLE } from '@/components/charts/theme'
import { money, num, pct } from '@/lib/format'
import { uid } from '@/lib/id'
import type { CostLineItem, CostModel } from '@/types'

/**
 * The cost model, and the floor it implies.
 *
 * Three questions an owner actually asks: what do I pay every month whatever
 * happens, what does one more night cost me, and how low can a rate go before
 * the booking is losing money. The answer to the third is a floor — never a
 * price. What a guest will pay is set by what else they could book.
 */
export function CostModelPanel() {
  const { costModel, saveCostModel, bookings, expenses, capitalSpend, settings, dcf } = useLedger()

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
  const actual = useMemo(() => (series.length > 0 ? aggregate(trailing(series, 12)) : null), [series])

  const costs = useMemo(() => summariseCosts(costModel), [costModel])
  const floors = useMemo(() => buildFloors(costModel), [costModel])

  const currentRate = actual && actual.adr > 0 ? actual.adr : 20000

  // Your actual position gets its own row rather than being approximated onto
  // the nearest round percentage — the whole point is to see where you sit.
  const yourRow = useMemo(
    () => (actual && actual.nightsSold > 0 ? floorAt(costModel, actual.nightsSold) : null),
    [actual, costModel],
  )
  const rows = useMemo(() => {
    const all = yourRow
      ? [...floors.scenarios, { ...yourRow, label: 'where you are now', mine: true }]
      : floors.scenarios.map((scenario) => ({ ...scenario, mine: false }))
    return all
      .map((row) => ({ ...row, mine: 'mine' in row ? Boolean(row.mine) : false }))
      .sort((a, b) => a.nights - b.nights)
  }, [floors.scenarios, yourRow])
  const breakEvenNights = floors.breakEvenNightsAt(currentRate)
  const contribution = floors.contributionAt(currentRate)

  const curve = useMemo(() => {
    const available = costModel.availableNightsPerYear
    return Array.from({ length: 19 }, (_, index) => {
      const occupancy = 0.05 + index * 0.05
      const nights = Math.max(1, Math.round(available * occupancy))
      const scenario = floors.scenarios[0]
      void scenario
      return {
        occupancy: Math.round(occupancy * 100),
        floor: costs.fixedPerYear / nights + costs.variablePerNight,
      }
    })
  }, [costModel.availableNightsPerYear, costs, floors])

  const update = (patch: Partial<CostModel>) => void saveCostModel(patch)

  return (
    <div className="space-y-4">
      <Card className="border-warn/25 bg-warn/[0.04]">
        <div className="flex gap-3">
          <span className="mt-0.5 text-[14px] text-warn">⚠</span>
          <div>
            <h3 className="text-[13px] font-semibold text-ink">This gives you a floor, not a price</h3>
            <p className="mt-1 max-w-3xl text-[12px] leading-relaxed text-ink-2">
              Costs tell you the rate below which a booking loses money. They cannot tell you what to charge — that is
              set by what a guest could book instead. You currently charge{' '}
              <span className="num text-ink">{money(currentRate, 'PHP')}</span> against a floor of{' '}
              <span className="num text-ink">{money(floors.scenarios[2]?.breakEvenRate ?? 0, 'PHP')}</span> at 35%
              occupancy, and that gap is the value of the property, not an accident. Setting price from cost is how
              operators quietly give it away — use the Pricing tab for what to charge.
            </p>
          </div>
        </div>
      </Card>

      <StatGrid>
        <Stat
          label="Fixed costs a month"
          value={money(costs.fixedPerMonth, 'PHP', true)}
          sub="Paid whether or not anyone books"
        />
        <Stat
          label="Cost of one more night"
          value={money(costs.variablePerNight, 'PHP')}
          sub={`${money(costs.perNight, 'PHP')} per night + ${money(costs.perStay, 'PHP')} per stay ÷ ${num(costModel.nightsPerStay, 1)} nights`}
        />
        <Stat
          label="Each night contributes"
          value={money(contribution, 'PHP')}
          tone={contribution > 0 ? 'pos' : 'neg'}
          sub={`At your ${money(currentRate, 'PHP')} rate, after the ${pct(costModel.platformFeePct, 0)} fee`}
        />
        <Stat
          label="Nights to break even"
          value={Number.isFinite(breakEvenNights) ? `${Math.ceil(breakEvenNights)}` : '—'}
          tone={actual && actual.nightsSold > breakEvenNights ? 'pos' : 'warn'}
          sub={
            Number.isFinite(breakEvenNights)
              ? `${pct(breakEvenNights / costModel.availableNightsPerYear, 0)} full${actual ? ` · you sold ${actual.nightsSold}` : ''}`
              : 'Rate is below variable cost'
          }
        />
      </StatGrid>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <SectionHeader
            title="Paid every month"
            subtitle="Salaries, connectivity, upkeep — the bill that arrives whether the island is full or empty."
            right={<span className="num text-[13px] font-semibold text-ink">{money(costs.fixedPerMonth, 'PHP', true)}</span>}
          />
          <LineEditor
            items={costModel.fixedMonthly}
            suffix="/ month"
            onChange={(fixedMonthly) => update({ fixedMonthly })}
          />
        </Card>

        <div className="space-y-4">
          <Card>
            <SectionHeader
              title="Per night a guest stays"
              subtitle="Generator diesel, power — costs that run only while someone is on the island."
              right={<span className="num text-[13px] font-semibold text-ink">{money(costs.perNight, 'PHP')}</span>}
            />
            <LineEditor items={costModel.perNight} suffix="/ night" onChange={(perNight) => update({ perNight })} />
          </Card>

          <Card>
            <SectionHeader
              title="Per booking"
              subtitle="Laundry, gas, water — paid once per stay however long it is."
              right={<span className="num text-[13px] font-semibold text-ink">{money(costs.perStay, 'PHP')}</span>}
            />
            <LineEditor items={costModel.perStay} suffix="/ stay" onChange={(perStay) => update({ perStay })} />
          </Card>
        </div>
      </div>

      <Card>
        <SectionHeader
          title="Settings behind the maths"
          subtitle="Change these and every figure above moves with them."
          right={
            actual && actual.nightsSold > 0 && actual.bookings > 0 ? (
              <Button
                size="sm"
                onClick={() =>
                  update({
                    nightsPerStay: actual.nightsSold / actual.bookings,
                    availableNightsPerYear: dcf.availableNightsPerYear,
                  })
                }
              >
                Use my actuals
              </Button>
            ) : null
          }
        />
        <div className="grid gap-3 sm:grid-cols-3">
          <SmallField
            label="Platform fee"
            value={costModel.platformFeePct * 100}
            suffix="%"
            step={0.5}
            onChange={(value) => update({ platformFeePct: value / 100 })}
            hint="Taken off the top by Airbnb before you see it."
          />
          <SmallField
            label="Nights in a typical stay"
            value={costModel.nightsPerStay}
            suffix="nts"
            step={0.5}
            onChange={(value) => update({ nightsPerStay: Math.max(1, value) })}
            hint="Spreads per-booking costs across the nights."
          />
          <SmallField
            label="Nights you can sell a year"
            value={costModel.availableNightsPerYear}
            suffix="nts"
            step={5}
            onChange={(value) => update({ availableNightsPerYear: Math.max(1, value) })}
            hint="After owner stays and any closures."
          />
        </div>
      </Card>

      <Card>
        <SectionHeader
          title="The floor at different levels of business"
          subtitle="Fixed costs don't care how busy you are, so the emptier the year, the more each night has to carry. This is why cutting rate to fill an empty calendar can dig the hole deeper."
        />
        <div className="-mx-1 overflow-x-auto px-1">
          <table className="w-full min-w-max text-left text-[12.5px]">
            <thead>
              <tr className="border-b border-line text-[10px] uppercase tracking-wide text-ink-3">
                <th className="px-2.5 py-2 font-medium">If the year is</th>
                <th className="px-2.5 py-2 text-right font-medium">Nights sold</th>
                <th className="px-2.5 py-2 text-right font-medium">Fixed cost each night carries</th>
                <th className="px-2.5 py-2 text-right font-medium">Break-even rate</th>
                <th className="px-2.5 py-2 text-right font-medium">List at least</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((scenario) => {
                return (
                  <tr
                    key={scenario.label}
                    className={cx(
                      'border-b border-line-soft last:border-0',
                      scenario.mine && 'bg-accent/[0.08] font-medium',
                    )}
                  >
                    <td className={cx('px-2.5 py-2', scenario.mine ? 'text-accent' : 'text-ink')}>
                      {scenario.label}
                      {scenario.mine ? (
                        <span className="ml-1.5 num text-[10.5px] text-ink-2">{pct(scenario.occupancy, 0)}</span>
                      ) : null}
                    </td>
                    <td className="num px-2.5 py-2 text-right text-ink-2">{scenario.nights}</td>
                    <td className="num px-2.5 py-2 text-right text-ink-2">{money(scenario.fixedPerNight, 'PHP')}</td>
                    <td className="num px-2.5 py-2 text-right text-ink">{money(scenario.breakEvenRate, 'PHP')}</td>
                    <td className="num px-2.5 py-2 text-right font-medium text-warn">
                      {money(scenario.listedRate, 'PHP')}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>

        <div className="mt-4">
          <ChartFrame
            title=""
            caption="The floor against how full the year is. Your current rate is the flat line — the distance between them at your occupancy is the margin on every night you sell."
            height={210}
          >
            <LineChart data={curve} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
              <CartesianGrid {...GRID} />
              <XAxis dataKey="occupancy" {...AXIS} tickFormatter={(value: number) => `${value}%`} />
              <YAxis
                {...AXIS}
                width={56}
                tickFormatter={(value: number) => money(value, 'PHP', true)}
                domain={[0, Math.max(currentRate * 1.3, 30000)]}
              />
              <Tooltip
                {...TOOLTIP_STYLE}
                {...tooltipProps(
                  (value) => [money(value, 'PHP'), 'Break-even rate'],
                  (label) => `${label}% full`,
                )}
              />
              <ReferenceLine
                y={currentRate}
                stroke={STATUS.pos}
                strokeDasharray="4 4"
                label={{ value: 'your rate', fill: STATUS.pos, fontSize: 10, position: 'insideTopRight' }}
              />
              <Line type="monotone" dataKey="floor" stroke={SERIES[1]} strokeWidth={2} dot={false} />
            </LineChart>
          </ChartFrame>
        </div>
      </Card>
    </div>
  )
}

function LineEditor({
  items,
  suffix,
  onChange,
}: {
  items: CostLineItem[]
  suffix: string
  onChange: (next: CostLineItem[]) => void
}) {
  const [label, setLabel] = useState('')

  return (
    <div className="space-y-1.5">
      {items.map((item, index) => (
        <div key={item.id} className="flex items-center gap-2">
          <input
            value={item.label}
            onChange={(event) => {
              const next = [...items]
              next[index] = { ...item, label: event.target.value }
              onChange(next)
            }}
            className="min-w-0 flex-1 rounded-lg border border-line bg-surface-2 px-2.5 py-1.5 text-[12.5px] text-ink outline-none focus:border-accent/60"
          />
          <div className="relative w-32 shrink-0">
            <input
              type="number"
              value={item.amount}
              onChange={(event) => {
                const next = [...items]
                next[index] = { ...item, amount: Number(event.target.value) || 0 }
                onChange(next)
              }}
              className={cx(inputClass, 'num pr-14 text-right')}
            />
            <span className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-[10px] text-ink-3">
              {suffix}
            </span>
          </div>
          <button
            type="button"
            onClick={() => onChange(items.filter((_, i) => i !== index))}
            className="shrink-0 text-[11px] text-ink-3 transition-colors hover:text-neg"
          >
            ✕
          </button>
        </div>
      ))}

      <div className="flex items-center gap-2 border-t border-line pt-2">
        <input
          value={label}
          onChange={(event) => setLabel(event.target.value)}
          placeholder="Add a cost line…"
          className="min-w-0 flex-1 rounded-lg border border-line bg-surface-2 px-2.5 py-1.5 text-[12.5px] text-ink outline-none focus:border-accent/60"
        />
        <Button
          size="sm"
          variant="ghost"
          disabled={!label.trim()}
          onClick={() => {
            onChange([...items, { id: uid('cost'), label: label.trim(), amount: 0 }])
            setLabel('')
          }}
        >
          Add
        </Button>
      </div>
      {items.length === 0 ? (
        <p className="pt-1 text-[11.5px] text-ink-3">Nothing here yet — add a line above.</p>
      ) : null}
    </div>
  )
}

function SmallField({
  label,
  value,
  suffix,
  step,
  hint,
  onChange,
}: {
  label: string
  value: number
  suffix: string
  step: number
  hint: string
  onChange: (value: number) => void
}) {
  return (
    <label className="block">
      <span className="mb-1 block text-[11px] font-medium text-ink-2">{label}</span>
      <div className="relative">
        <input
          type="number"
          step={step}
          value={Number(value.toFixed(2))}
          onChange={(event) => onChange(Number(event.target.value) || 0)}
          className={cx(inputClass, 'num pr-10')}
        />
        <span className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-[10.5px] text-ink-3">
          {suffix}
        </span>
      </div>
      <span className="mt-1 block text-[10.5px] leading-relaxed text-ink-3">{hint}</span>
    </label>
  )
}
