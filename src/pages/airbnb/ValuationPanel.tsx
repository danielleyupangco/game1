import { useMemo, useState } from 'react'
import { Bar, BarChart, CartesianGrid, ReferenceLine, Tooltip, XAxis, YAxis } from 'recharts'
import { useLedger } from '@/state/store'
import { aggregate, trailing, type MonthMetrics } from '@/domain/airbnb/metrics'
import { DEFAULT_TORNADO, evaluateProject, runDcf, sensitivity, tornado } from '@/domain/airbnb/dcf'
import { ASSUMPTION_NOTES } from '@/state/defaults'
import { Button, Card, Pill, SectionHeader, TextInput, cx } from '@/components/ui/primitives'
import { AssumptionInput } from '@/components/ui/AssumptionInput'
import { Stat, StatGrid } from '@/components/ui/Stat'
import { DataTable } from '@/components/ui/DataTable'
import { ExportButton } from '@/components/ui/ExportButton'
import { ChartFrame } from '@/components/charts/Chart'
import { AXIS, DIVERGING, GRID, SEQUENTIAL, TOOLTIP_STYLE } from '@/components/charts/theme'
import { money, num, pct, signedPct } from '@/lib/format'
import { exportTable, MONEY_FMT, PCT_FMT } from '@/lib/export'
import { uid } from '@/lib/id'
import type { CapitalProject, DcfAssumptions } from '@/types'

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

      <CapitalAllocation dcfEquity={result.equityValue} discountRate={dcf.discountRate} />
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

function CapitalAllocation({ dcfEquity, discountRate }: { dcfEquity: number; discountRate: number }) {
  const { projects, saveProjects, holdings, snapshots, transactions, settings } = useLedger()
  const [expected, setExpected] = useState('10')

  const portfolioReturn = (Number(expected) || 0) / 100
  const results = useMemo(
    () => projects.map((project) => evaluateProject(project, discountRate, portfolioReturn)),
    [projects, discountRate, portfolioReturn],
  )

  const addProject = () => {
    const project: CapitalProject = {
      id: uid('prj'),
      name: 'New project',
      capex: 1000000,
      annualCashflow: 300000,
      rampYears: 1,
      lifeYears: 10,
      terminalValue: 0,
      note: '',
    }
    void saveProjects([...projects, project])
  }

  const update = (id: string, patch: Partial<CapitalProject>) => {
    void saveProjects(projects.map((project) => (project.id === id ? { ...project, ...patch } : project)))
  }

  return (
    <Card>
      <SectionHeader
        title="Capital allocation"
        subtitle="Model a reinvestment against the alternative of putting the same cash in your portfolio. A project only earns the money if it beats what the money would do elsewhere."
        right={<Button size="sm" onClick={addProject}>Add project</Button>}
      />

      <div className="mb-3 flex flex-wrap items-end gap-3 rounded-lg border border-line bg-surface-2 p-3">
        <label className="block">
          <span className="mb-1 block text-[11px] font-medium text-ink-2">Portfolio expected return</span>
          <div className="relative w-32">
            <TextInput value={expected} onChange={setExpected} type="number" />
            <span className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-[11px] text-ink-3">%</span>
          </div>
        </label>
        <p className="max-w-xl flex-1 text-[11px] leading-relaxed text-ink-2">
          This is the hurdle. Your own portfolio history is the honest starting point —{' '}
          {snapshots.length >= 2 && holdings.length > 0
            ? 'the Investments tab shows your annualised return; use that rather than a number you like.'
            : 'once you have two or more portfolio snapshots, the Investments tab will show your actual annualised return to use here.'}{' '}
          Projects are discounted at the property's {pct(discountRate)} rate, which is higher because a single island is
          a riskier place for a peso than a diversified portfolio.
          {transactions.length === 0 && settings.cashOnHand === 0 ? '' : ''}
        </p>
      </div>

      {projects.length === 0 ? (
        <p className="py-6 text-center text-[13px] text-ink-2">
          No projects yet. Add one — a fourth room, solar, a boat, a marketing push — and it's ranked against your
          portfolio on NPV, IRR and payback.
        </p>
      ) : (
        <div className="space-y-2.5">
          {results
            .slice()
            .sort((a, b) => b.npv - a.npv)
            .map((result) => (
              <div key={result.project.id} className="rounded-lg border border-line bg-surface-2 p-3">
                <div className="mb-2.5 flex flex-wrap items-center justify-between gap-2">
                  <input
                    value={result.project.name}
                    onChange={(event) => update(result.project.id, { name: event.target.value })}
                    className="min-w-0 flex-1 border-0 bg-transparent text-[13px] font-semibold text-ink outline-none"
                  />
                  <div className="flex items-center gap-2">
                    <Pill tone={result.npv > 0 ? 'pos' : 'neg'}>
                      NPV {money(result.npv, 'PHP', true)}
                    </Pill>
                    <Pill tone={result.spreadVsPortfolio > 0 ? 'pos' : 'warn'}>
                      IRR {Number.isFinite(result.irr) ? pct(result.irr) : '—'}
                    </Pill>
                    <button
                      type="button"
                      onClick={() => void saveProjects(projects.filter((p) => p.id !== result.project.id))}
                      className="text-[11px] text-ink-3 transition-colors hover:text-neg"
                    >
                      ✕
                    </button>
                  </div>
                </div>

                <div className="grid gap-2.5 sm:grid-cols-3 lg:grid-cols-5">
                  <AssumptionInput label="Upfront capex" value={result.project.capex} kind="money" step={100000} onChange={(next) => update(result.project.id, { capex: next })} />
                  <AssumptionInput label="Annual cash inflow" value={result.project.annualCashflow} kind="money" step={50000} onChange={(next) => update(result.project.id, { annualCashflow: next })} />
                  <AssumptionInput label="Ramp years" value={result.project.rampYears} kind="number" step={1} suffix="yr" onChange={(next) => update(result.project.id, { rampYears: next })} />
                  <AssumptionInput label="Life" value={result.project.lifeYears} kind="number" step={1} suffix="yr" onChange={(next) => update(result.project.id, { lifeYears: next })} />
                  <AssumptionInput label="Terminal value" value={result.project.terminalValue} kind="money" step={100000} onChange={(next) => update(result.project.id, { terminalValue: next })} />
                </div>

                <div className="mt-2.5 grid grid-cols-2 gap-2 border-t border-line pt-2.5 sm:grid-cols-4">
                  <MiniStat label="Payback" value={Number.isFinite(result.payback) ? `${num(result.payback, 1)} yrs` : 'never'} tone={Number.isFinite(result.payback) && result.payback < 6 ? 'pos' : 'warn'} />
                  <MiniStat label="Profitability index" value={Number.isFinite(result.profitabilityIndex) ? num(result.profitabilityIndex, 2) : '—'} tone={result.profitabilityIndex > 1 ? 'pos' : 'neg'} />
                  <MiniStat
                    label="vs portfolio"
                    value={Number.isFinite(result.spreadVsPortfolio) ? `${result.spreadVsPortfolio >= 0 ? '+' : ''}${(result.spreadVsPortfolio * 100).toFixed(1)} pp` : '—'}
                    tone={result.spreadVsPortfolio > 0 ? 'pos' : 'neg'}
                  />
                  <MiniStat label="Capex vs island value" value={dcfEquity > 0 ? pct(result.project.capex / dcfEquity, 0) : '—'} tone="neutral" />
                </div>

                <p className="mt-2 text-[11px] leading-relaxed text-ink-2">
                  {result.npv > 0 && result.spreadVsPortfolio > 0
                    ? `Beats the portfolio by ${(result.spreadVsPortfolio * 100).toFixed(1)} pp and returns its capex in ${Number.isFinite(result.payback) ? `${num(result.payback, 1)} years` : 'no finite time'}. The case for doing it rests on the annual cash inflow being real — that is the assumption to stress, not the discount rate.`
                    : result.npv > 0
                      ? `Positive NPV at the property's ${pct(discountRate)} discount rate, but its IRR trails your ${pct(portfolioReturn)} portfolio hurdle. Doing it means accepting a lower return for a less liquid asset.`
                      : `Negative NPV at ${pct(discountRate)}. As modelled, the cash does better in the portfolio.`}
                </p>
              </div>
            ))}
        </div>
      )}
    </Card>
  )
}

function MiniStat({ label, value, tone }: { label: string; value: string; tone: 'pos' | 'neg' | 'warn' | 'neutral' }) {
  const tones = { pos: 'text-pos', neg: 'text-neg', warn: 'text-warn', neutral: 'text-ink' }
  return (
    <div>
      <div className="text-[10px] uppercase tracking-wide text-ink-3">{label}</div>
      <div className={cx('num mt-0.5 text-[13px] font-semibold', tones[tone])}>{value}</div>
    </div>
  )
}
