import { useMemo } from 'react'
import { Bar, BarChart, CartesianGrid, ReferenceLine, Tooltip, XAxis, YAxis } from 'recharts'
import { useLedger } from '@/state/store'
import { aggregate, trailing, type MonthMetrics } from '@/domain/airbnb/metrics'
import { DEFAULT_TORNADO, runDcf, sensitivity, tornado } from '@/domain/airbnb/dcf'
import { ASSUMPTION_NOTES } from '@/state/defaults'
import { Button, Card, SectionHeader, cx } from '@/components/ui/primitives'
import { AssumptionInput } from '@/components/ui/AssumptionInput'
import { Stat, StatGrid } from '@/components/ui/Stat'
import { DataTable } from '@/components/ui/DataTable'
import { ExportButton } from '@/components/ui/ExportButton'
import { ChartFrame } from '@/components/charts/Chart'
import { AXIS, DIVERGING, GRID, SEQUENTIAL, TOOLTIP_STYLE } from '@/components/charts/theme'
import { money, num, pct, signedPct } from '@/lib/format'
import { exportTable, MONEY_FMT, PCT_FMT } from '@/lib/export'
import type { DcfAssumptions } from '@/types'

export function ValuationPanel({ series }: { series: MonthMetrics[] }) {
  const { dcf, saveDcf } = useLedger()
  const result = useMemo(() => runDcf(dcf), [dcf])
  const actuals = useMemo(() => aggregate(trailing(series, 12)), [series])

  const bars = useMemo(() => tornado(dcf), [dcf])
  const grid = useMemo(
    () =>
      sensitivity(
        dcf,
        'discountRate',
        [dcf.discountRate - 0.04, dcf.discountRate - 0.02, dcf.discountRate, dcf.discountRate + 0.02, dcf.discountRate + 0.04],
        'terminalOccupancy',
        [
          Math.max(0.05, dcf.terminalOccupancy - 0.15),
          Math.max(0.05, dcf.terminalOccupancy - 0.075),
          dcf.terminalOccupancy,
          Math.min(1, dcf.terminalOccupancy + 0.075),
          Math.min(1, dcf.terminalOccupancy + 0.15),
        ],
      ),
    [dcf],
  )

  const hasActuals = actuals.nightsSold > 0

  return (
    <div className="space-y-4">
      <Card className="border-accent/25 bg-accent/[0.04]">
        <div className="flex gap-3">
          <span className="mt-0.5 text-[14px] text-accent">◉</span>
          <div>
            <h3 className="text-[13px] font-semibold text-ink">This is a model, and it shows its work</h3>
            <p className="mt-1 max-w-3xl text-[12px] leading-relaxed text-ink-2">
              Every assumption below is editable and every year of the projection is laid out in full. A DCF on a
              single illiquid property is a way of stating what you'd have to believe for a price to make sense — not a
              price. Watch the terminal-value share: when most of the value comes from a growth rate after year{' '}
              {dcf.projectionYears}, the answer is an opinion about the far future wearing a number's clothes.
            </p>
          </div>
        </div>
      </Card>

      {result.invalid ? (
        <div className="rounded-lg border border-neg/30 bg-neg/10 px-3 py-2 text-[12px] text-neg">
          Terminal growth ({pct(dcf.terminalGrowth)}) is at or above the discount rate ({pct(dcf.discountRate)}). The
          Gordon growth formula divides by their difference, so the valuation is undefined. Lower the growth rate or
          raise the discount rate.
        </div>
      ) : (
        <StatGrid>
          <Stat label="Equity value" value={money(result.equityValue, 'PHP', true)} sub={`Enterprise ${money(result.enterpriseValue, 'PHP', true)} less ${money(dcf.netDebt, 'PHP', true)} net debt`} />
          <Stat label="Explicit period" value={money(result.pvExplicit, 'PHP', true)} sub={`PV of years 1–${dcf.projectionYears}`} />
          <Stat label="Terminal value" value={money(result.pvTerminal, 'PHP', true)} sub={`Discounted from year ${dcf.projectionYears}`} />
          <Stat
            label="Terminal share"
            value={pct(result.terminalShare, 0)}
            tone={result.terminalShare > 0.7 ? 'warn' : 'neutral'}
            sub={result.terminalShare > 0.7 ? 'Most of the value rests on assumptions, not cashflows' : 'Reasonable balance'}
          />
        </StatGrid>
      )}

      <Card>
        <SectionHeader
          title="Assumptions"
          subtitle="Change anything here and every number on this tab moves with it. Nothing is hard-coded."
          right={
            hasActuals ? (
              <Button
                size="sm"
                variant="primary"
                onClick={() =>
                  void saveDcf({
                    startOccupancy: actuals.occupancy,
                    adr: actuals.adr,
                    variableCostPerNight: actuals.variableCostPerNight,
                    fixedCostPerYear: actuals.fixedCost,
                  })
                }
                title="Overwrite the operating assumptions with your trailing-12-month actuals"
              >
                Load from actuals
              </Button>
            ) : null
          }
        />
        {hasActuals ? (
          <p className="mb-3 text-[11px] leading-relaxed text-ink-2">
            Your trailing 12 months: {pct(actuals.occupancy)} occupancy, {money(actuals.adr, 'PHP')} ADR,{' '}
            {money(actuals.variableCostPerNight, 'PHP')} variable cost per night, {money(actuals.fixedCost, 'PHP', true)} fixed
            costs. "Load from actuals" replaces the year-1 assumptions with these.
          </p>
        ) : null}

        <div className="grid gap-x-4 gap-y-3 sm:grid-cols-2 lg:grid-cols-3">
          <AssumptionGroup title="Demand">
            <Input k="availableNightsPerYear" label="Available nights / year" kind="number" dcf={dcf} save={saveDcf} step={5} suffix="nts" />
            <Input k="startOccupancy" label="Year 1 occupancy" kind="percent" dcf={dcf} save={saveDcf} />
            <Input k="terminalOccupancy" label="Terminal occupancy" kind="percent" dcf={dcf} save={saveDcf} />
            <Input k="occupancyRampYears" label="Ramp years" kind="number" dcf={dcf} save={saveDcf} step={1} suffix="yr" />
          </AssumptionGroup>

          <AssumptionGroup title="Rate and cost">
            <Input k="adr" label="Year 1 ADR" kind="money" dcf={dcf} save={saveDcf} />
            <Input k="adrGrowth" label="ADR growth / year" kind="percent" dcf={dcf} save={saveDcf} />
            <Input k="variableCostPerNight" label="Variable cost / night" kind="money" dcf={dcf} save={saveDcf} step={500} />
            <Input k="fixedCostPerYear" label="Fixed cost / year" kind="money" dcf={dcf} save={saveDcf} step={50000} />
            <Input k="costInflation" label="Cost inflation" kind="percent" dcf={dcf} save={saveDcf} />
          </AssumptionGroup>

          <AssumptionGroup title="Capital">
            <Input k="taxRate" label="Effective tax rate" kind="percent" dcf={dcf} save={saveDcf} />
            <Input k="maintenanceCapexPerYear" label="Maintenance capex / year" kind="money" dcf={dcf} save={saveDcf} step={50000} />
            <Input k="discountRate" label="Discount rate" kind="percent" dcf={dcf} save={saveDcf} />
            <Input k="terminalGrowth" label="Terminal growth" kind="percent" dcf={dcf} save={saveDcf} step={0.25} />
            <Input k="projectionYears" label="Projection years" kind="number" dcf={dcf} save={saveDcf} step={1} suffix="yr" />
            <Input k="netDebt" label="Net debt" kind="money" dcf={dcf} save={saveDcf} step={100000} />
          </AssumptionGroup>
        </div>
      </Card>

      {!result.invalid ? (
        <>
          <Card>
            <SectionHeader
              title="Projection"
              subtitle="The model, year by year. Free cash flow is EBITDA less tax and maintenance capex; present value applies the discount factor in the last column."
              right={
                <ExportButton
                    run={() =>
                      exportTable(
                      result.years,
                      [
                        { header: 'Year', value: (y) => y.year },
                        { header: 'Occupancy', value: (y) => y.occupancy, numFmt: PCT_FMT },
                        { header: 'Nights sold', value: (y) => y.nightsSold, numFmt: '#,##0' },
                        { header: 'ADR', value: (y) => y.adr, numFmt: MONEY_FMT },
                        { header: 'Revenue', value: (y) => y.revenue, numFmt: MONEY_FMT },
                        { header: 'Variable cost', value: (y) => y.variableCost, numFmt: MONEY_FMT },
                        { header: 'Fixed cost', value: (y) => y.fixedCost, numFmt: MONEY_FMT },
                        { header: 'EBITDA', value: (y) => y.ebitda, numFmt: MONEY_FMT },
                        { header: 'Tax', value: (y) => y.tax, numFmt: MONEY_FMT },
                        { header: 'Capex', value: (y) => y.capex, numFmt: MONEY_FMT },
                        { header: 'Free cash flow', value: (y) => y.freeCashFlow, numFmt: MONEY_FMT },
                        { header: 'Discount factor', value: (y) => y.discountFactor, numFmt: '0.0000' },
                        { header: 'Present value', value: (y) => y.presentValue, numFmt: MONEY_FMT },
                      ],
                      'island-t-dcf',
                      'DCF',
                      [
                        `Discount rate ${pct(dcf.discountRate)} · terminal growth ${pct(dcf.terminalGrowth)}`,
                        `Equity value ${money(result.equityValue, 'PHP')} · terminal share ${pct(result.terminalShare, 0)}`,
                      ],
                      )
                  }
                />
              }
            />
            <DataTable
              rows={result.years}
              getKey={(year) => String(year.year)}
              columns={[
                { key: 'year', header: 'Year', render: (y) => <span className="font-medium text-ink">{y.year}</span> },
                { key: 'occ', header: 'Occ.', align: 'right', render: (y) => pct(y.occupancy, 0) },
                { key: 'nights', header: 'Nights', align: 'right', hideOnMobile: true, render: (y) => num(y.nightsSold, 0) },
                { key: 'adr', header: 'ADR', align: 'right', hideOnMobile: true, render: (y) => money(y.adr, 'PHP') },
                { key: 'revenue', header: 'Revenue', align: 'right', render: (y) => money(y.revenue, 'PHP', true) },
                { key: 'costs', header: 'Costs', align: 'right', hideOnMobile: true, render: (y) => money(y.variableCost + y.fixedCost, 'PHP', true) },
                { key: 'ebitda', header: 'EBITDA', align: 'right', hideOnMobile: true, render: (y) => <span className={y.ebitda >= 0 ? 'text-ink' : 'text-neg'}>{money(y.ebitda, 'PHP', true)}</span> },
                { key: 'fcf', header: 'Free cash flow', align: 'right', render: (y) => <span className={y.freeCashFlow >= 0 ? 'text-pos' : 'text-neg'}>{money(y.freeCashFlow, 'PHP', true)}</span> },
                { key: 'pv', header: 'PV', align: 'right', render: (y) => <span className="text-ink-2">{money(y.presentValue, 'PHP', true)}</span> },
              ]}
            />
          </Card>

          <Card>
            <ChartFrame
              title="What moves the answer"
              caption={`Each assumption flexed alone, everything else held. Bars show the swing in equity value. Rate assumptions move by a fixed amount; peso assumptions by ±15%, since ±2 pp on an ADR would mean nothing.`}
              height={Math.max(200, bars.length * 34)}
            >
              <BarChart
                data={bars.map((bar) => ({
                  label: bar.label,
                  // Centred on the base case so the bar reads as a swing, not a level.
                  low: bar.low - result.equityValue,
                  high: bar.high - result.equityValue,
                }))}
                layout="vertical"
                margin={{ top: 4, right: 16, left: 4, bottom: 4 }}
                stackOffset="sign"
              >
                <CartesianGrid {...GRID} horizontal={false} vertical />
                <XAxis type="number" {...AXIS} tickFormatter={(value: number) => money(value, 'PHP', true)} />
                <YAxis type="category" dataKey="label" {...AXIS} width={128} />
                <Tooltip
                  {...TOOLTIP_STYLE}
                  formatter={((value: unknown, name: unknown) => [
                    money(Number(value) + result.equityValue, 'PHP', true),
                    name === 'low' ? 'Downside' : 'Upside',
                  ]) as never}
                />
                <ReferenceLine x={0} stroke={AXIS.stroke} />
                <Bar dataKey="low" name="low" fill={DIVERGING.low} radius={4} barSize={13} />
                <Bar dataKey="high" name="high" fill={DIVERGING.high} radius={4} barSize={13} />
              </BarChart>
            </ChartFrame>
            <div className="mt-2 flex flex-wrap items-center gap-3 text-[11px] text-ink-2">
              <span className="flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-full" style={{ background: DIVERGING.low }} />
                Low case
              </span>
              <span className="flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-full" style={{ background: DIVERGING.high }} />
                High case
              </span>
              <span className="text-ink-3">Base case: {money(result.equityValue, 'PHP', true)}</span>
            </div>
            <ul className="mt-2.5 space-y-1">
              {bars.slice(0, 3).map((bar, index) => (
                <li key={bar.key} className="text-[11.5px] leading-relaxed text-ink-2">
                  <span className="text-ink-3">{index + 1}.</span>{' '}
                  <span className="text-ink">{bar.label}</span> — {DEFAULT_TORNADO.find((s) => s.key === bar.key)?.delta ? '' : ''}
                  moving it between {formatAssumption(bar.key, bar.lowInput)} and {formatAssumption(bar.key, bar.highInput)} swings
                  equity value by {money(bar.swing, 'PHP', true)} ({pct(bar.swing / Math.abs(result.equityValue), 0)} of the base case).
                </li>
              ))}
            </ul>
          </Card>

          <Card>
            <SectionHeader
              title="Sensitivity: discount rate × terminal occupancy"
              subtitle="Equity value across the two assumptions that matter most. Read across a row to see how much occupancy has to make up for a higher required return."
            />
            <SensitivityTable grid={grid} base={result.equityValue} />
          </Card>
        </>
      ) : null}

      <Card>
        <SectionHeader
          title="Thinking about spending on the property?"
          subtitle="Budgets, what's been spent against them, and whether a project earns its keep all live on the Capital tab."
        />
        <p className="text-[12.5px] leading-relaxed text-ink-2">
          Capital spend is kept out of this valuation and out of the P&amp;L on purpose: it buys something that lasts,
          so it leaves the bank without reducing the year's profit.
        </p>
      </Card>
    </div>
  )
}

function formatAssumption(key: keyof DcfAssumptions, value: number): string {
  const rateKeys: (keyof DcfAssumptions)[] = ['discountRate', 'terminalGrowth', 'terminalOccupancy', 'startOccupancy', 'costInflation', 'adrGrowth', 'taxRate']
  return rateKeys.includes(key) ? pct(value) : money(value, 'PHP', true)
}

function AssumptionGroup({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="space-y-2.5">
      <h4 className="text-[10px] font-semibold uppercase tracking-widest text-ink-3">{title}</h4>
      {children}
    </div>
  )
}

function Input({
  k,
  label,
  kind,
  dcf,
  save,
  step,
  suffix,
}: {
  k: keyof DcfAssumptions
  label: string
  kind: 'money' | 'percent' | 'number'
  dcf: DcfAssumptions
  save: (patch: Partial<DcfAssumptions>) => Promise<void>
  step?: number
  suffix?: string
}) {
  return (
    <AssumptionInput
      label={label}
      value={dcf[k]}
      kind={kind}
      step={step}
      suffix={suffix}
      note={ASSUMPTION_NOTES[k]}
      onChange={(next) => void save({ [k]: next } as Partial<DcfAssumptions>)}
    />
  )
}

function SensitivityTable({
  grid,
  base,
}: {
  grid: ReturnType<typeof sensitivity>
  base: number
}) {
  const flat = grid.values.flat().filter(Number.isFinite)
  const min = Math.min(...flat)
  const max = Math.max(...flat)

  return (
    <div className="-mx-1 overflow-x-auto px-1">
      <table className="w-full min-w-max text-[12px]">
        <thead>
          <tr>
            <th className="px-2 py-1.5 text-left text-[10px] uppercase tracking-wide text-ink-3">
              Discount ↓ / Occ. →
            </th>
            {grid.colValues.map((value) => (
              <th key={value} className="num px-2 py-1.5 text-right text-[11px] font-medium text-ink-2">
                {pct(value, 0)}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {grid.rowValues.map((rowValue, rowIndex) => (
            <tr key={rowValue}>
              <td className="num px-2 py-1.5 text-left text-[11px] font-medium text-ink-2">{pct(rowValue)}</td>
              {grid.values[rowIndex].map((value, colIndex) => {
                const t = max > min ? (value - min) / (max - min) : 0.5
                const shade = SEQUENTIAL[Math.round(t * (SEQUENTIAL.length - 1))]
                const isBase = rowIndex === 2 && colIndex === 2
                return (
                  <td key={colIndex} className="p-0.5">
                    <div
                      className={cx(
                        'num rounded px-2 py-1.5 text-right text-[11.5px] tabular-nums',
                        t > 0.55 ? 'text-white' : 'text-[#0b0d10]',
                        isBase && 'ring-2 ring-accent ring-offset-1 ring-offset-[#14171c]',
                      )}
                      style={{ background: shade }}
                      title={`${signedPct(value / base - 1)} vs base case`}
                    >
                      {money(value, 'PHP', true)}
                    </div>
                  </td>
                )
              })}
            </tr>
          ))}
        </tbody>
      </table>
      <p className="mt-2 text-[11px] text-ink-2">
        Darker is higher. The ringed cell is your base case. Values are equity value in PHP.
      </p>
    </div>
  )
}

// --- Capital allocation ----------------------------------------------------
