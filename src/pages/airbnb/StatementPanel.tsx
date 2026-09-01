import { useMemo, useState } from 'react'
import { useLedger } from '@/state/store'
import {
  buildActualCash,
  buildStatement,
  expenseMatrix,
  summariseDividends,
  totalStatement,
  type StatementMonth,
} from '@/domain/airbnb/statement'
import { buildDepreciation } from '@/domain/airbnb/depreciation'
import type { MonthMetrics } from '@/domain/airbnb/metrics'
import { Button, Card, Field, SectionHeader, Tabs, TextInput, cx, inputClass } from '@/components/ui/primitives'
import { Stat, StatGrid } from '@/components/ui/Stat'
import { EmptyState } from '@/components/ui/EmptyState'
import { money, monthLabel, num, pct, shortDate } from '@/lib/format'
import { uid } from '@/lib/id'
import { today } from '@/lib/dates'
import type { DividendPayout } from '@/types'

type View = 'income' | 'cash' | 'expenses' | 'dividends'

/**
 * The statements, in the shape the owner already reads them.
 *
 * Deliberately line-by-line rather than summarised: this is the page she shows
 * her mother, and a number nobody can trace back to a line is a number nobody
 * argues with.
 */
export function StatementPanel({ series }: { series: MonthMetrics[] }) {
  const { expenses, capitalSpend, dividends } = useLedger()
  const [view, setView] = useState<View>('income')
  const [year, setYear] = useState<string>('all')

  /**
   * Depreciation comes from the capital ledger, not from the sheet's flat
   * monthly figure — so the generator, the bridge, and every guest comfort
   * purchase are all carried into the cost of running the place.
   */
  const lastMonth = series.length > 0 ? series[series.length - 1].month : undefined
  const depreciation = useMemo(() => buildDepreciation(capitalSpend, lastMonth), [capitalSpend, lastMonth])
  const depreciationByMonth = capitalSpend.length > 0 ? depreciation.byMonth : undefined

  const full = useMemo(
    () => buildStatement({ series, expenses, depreciationByMonth }),
    [series, expenses, depreciationByMonth],
  )

  const years = useMemo(() => [...new Set(full.map((month) => month.month.slice(0, 4)))].sort(), [full])
  const months = useMemo(
    () => (year === 'all' ? full : full.filter((month) => month.month.startsWith(year))),
    [full, year],
  )
  const total = useMemo(() => totalStatement(months), [months])

  const capitalByMonth = useMemo(() => {
    const out: Record<string, number> = {}
    for (const row of capitalSpend) out[row.date.slice(0, 7)] = (out[row.date.slice(0, 7)] ?? 0) + row.amount
    return out
  }, [capitalSpend])

  const cash = useMemo(() => buildActualCash(months, capitalByMonth, dividends), [months, capitalByMonth, dividends])

  if (series.length === 0) {
    return (
      <EmptyState
        title="Nothing to report on yet"
        body="The statements are built from bookings and expenses. Import either and they fill in."
        dataset="bookings"
      />
    )
  }

  return (
    <div className="space-y-4">
      <p className="max-w-3xl text-[12px] leading-relaxed text-ink-2">
        Revenue here is the room, and only the room. Food, boats and tours are Kuya Allan's business — they have their
        own tab, where the whole flow is laid out.
      </p>

      <div className="flex flex-wrap items-center gap-2">
        <Tabs
          value={view}
          onChange={setView}
          options={[
            { value: 'income', label: 'Income statement' },
            { value: 'cash', label: 'Cash flow' },
            { value: 'expenses', label: 'Expense summary' },
            { value: 'dividends', label: `Dividends (${dividends.length})` },
          ]}
        />
        <Tabs
          value={year}
          onChange={setYear}
          options={[{ value: 'all', label: 'All' }, ...years.map((y) => ({ value: y, label: y }))]}
        />
      </div>

      {view === 'income' ? <IncomeStatement months={months} total={total} depreciation={depreciation} /> : null}
      {view === 'cash' ? <CashFlow months={months} cash={cash} /> : null}
      {view === 'expenses' ? <ExpenseSummary months={months} depreciationByMonth={depreciationByMonth} /> : null}
      {view === 'dividends' ? <Dividends /> : null}
    </div>
  )
}

/** A month column plus a total column, laid out like the sheet it replaces. */
function StatementTable({
  months,
  total,
  rows,
}: {
  months: StatementMonth[]
  total: StatementMonth
  rows: {
    label: string
    value: (month: StatementMonth) => number
    kind?: 'money' | 'pct' | 'count'
    emphasis?: 'head' | 'total' | 'sub'
    hint?: string
  }[]
}) {
  const format = (value: number, kind: 'money' | 'pct' | 'count' = 'money') =>
    kind === 'pct' ? pct(value, 0) : kind === 'count' ? num(value, 0) : value === 0 ? '—' : money(value, 'PHP', true)

  return (
    <div className="overflow-x-auto rounded-xl border border-line">
      <table className="w-full min-w-[720px] border-collapse text-[12px]">
        <thead>
          <tr className="bg-surface-2">
            <th className="sticky left-0 z-10 bg-surface-2 px-3 py-2 text-left font-medium text-ink-2">&nbsp;</th>
            {months.map((month) => (
              <th key={month.month} className="whitespace-nowrap px-3 py-2 text-right font-medium text-ink-2">
                {monthLabel(month.month)}
              </th>
            ))}
            <th className="whitespace-nowrap border-l border-line px-3 py-2 text-right font-semibold text-ink">
              Total
            </th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr
              key={row.label}
              className={cx(
                'border-t border-line',
                row.emphasis === 'head' && 'bg-surface-2/60',
                row.emphasis === 'total' && 'bg-surface-2/40 font-semibold',
              )}
            >
              <td
                title={row.hint}
                className={cx(
                  'sticky left-0 z-10 whitespace-nowrap bg-bg px-3 py-1.5 text-left',
                  row.emphasis === 'head' && 'bg-surface-2/60 font-semibold text-ink',
                  row.emphasis === 'total' && 'bg-surface-2/40 font-semibold text-ink',
                  row.emphasis === 'sub' && 'pl-6 text-ink-2',
                  !row.emphasis && 'text-ink',
                )}
              >
                {row.label}
              </td>
              {months.map((month) => (
                <td key={month.month} className="num whitespace-nowrap px-3 py-1.5 text-right text-ink-2">
                  {format(row.value(month), row.kind)}
                </td>
              ))}
              <td className="num whitespace-nowrap border-l border-line px-3 py-1.5 text-right font-medium text-ink">
                {format(row.value(total), row.kind)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

function IncomeStatement({
  months,
  total,
  depreciation,
}: {
  months: StatementMonth[]
  total: StatementMonth
  depreciation: ReturnType<typeof buildDepreciation>
}) {
  const categories = useMemo(() => {
    const seen = new Set<string>()
    for (const month of months) for (const key of Object.keys(month.byCategory)) seen.add(key)
    return [...seen].filter((key) => key !== 'Depreciation' && !key.startsWith('Per '))
  }, [months])

  return (
    <div className="space-y-4">
      <StatGrid>
        <Stat
          label="Room revenue"
          value={money(total.revenue, 'PHP', true)}
          sub={`${num(total.nightsSold, 0)} nights sold`}
          hint="Room payouts only. Food, boats and tours are on the Add-ons tab."
        />
        <Stat
          label="Nights sold"
          value={num(total.nightsSold, 0)}
          sub={`rate ${money(total.adr, 'PHP', true)} · RevPAR ${money(total.revpar, 'PHP', true)}`}
        />
        <Stat
          label="EBITDA"
          value={money(total.ebitda, 'PHP', true)}
          tone={total.ebitda >= 0 ? 'pos' : 'neg'}
          sub={`${pct(total.ebitdaPct, 0)} of revenue`}
        />
        <Stat
          label="Occupancy"
          value={pct(total.occupancy, 0)}
          sub={`${num(total.stays, 0)} stays · rate ${money(total.adr, 'PHP', true)}`}
        />
      </StatGrid>

      <StatementTable
        months={months}
        total={total}
        rows={[
          { label: 'Nights sold', value: (m) => m.nightsSold, kind: 'count' },
          { label: 'Nights available', value: (m) => m.availableNights, kind: 'count' },
          { label: 'Occupancy', value: (m) => m.occupancy, kind: 'pct' },
          { label: 'Stays', value: (m) => m.stays, kind: 'count' },
          { label: 'ROOM REVENUE', value: (m) => m.revenue, emphasis: 'head' },
          { label: 'Cost of sales', value: (m) => m.cogs, emphasis: 'head' },
          { label: 'as % of revenue', value: (m) => m.cogsPct, kind: 'pct', emphasis: 'sub' },
          { label: 'GROSS PROFIT', value: (m) => m.grossProfit, emphasis: 'total' },
          { label: 'Gross margin', value: (m) => m.grossMargin, kind: 'pct', emphasis: 'sub' },
          { label: 'OPERATING COSTS', value: (m) => m.opex, emphasis: 'head' },
          ...categories.map((category) => ({
            label: category,
            value: (m: StatementMonth) => m.byCategory[category] ?? 0,
            emphasis: 'sub' as const,
          })),
          { label: 'as % of revenue', value: (m) => m.opexPct, kind: 'pct' as const, emphasis: 'sub' as const },
          { label: 'EBITDA', value: (m) => m.ebitda, emphasis: 'total' },
          { label: 'EBITDA margin', value: (m) => m.ebitdaPct, kind: 'pct', emphasis: 'sub' },
          { label: 'Depreciation', value: (m) => m.depreciation },
          { label: 'EBIT', value: (m) => m.ebit, emphasis: 'total' },
          { label: 'EBIT margin', value: (m) => m.ebitPct, kind: 'pct', emphasis: 'sub' },
        ]}
      />
      <p className="text-[11.5px] leading-relaxed text-ink-3">
        Depreciation is the island's equipment wearing out — a real cost, but not money leaving the bank this month,
        which is why EBITDA sits above it. Capital spend and dividends appear nowhere here; both move cash without being
        costs, and they have their own tabs.
      </p>

      <DepreciationDetail depreciation={depreciation} charged={total.depreciation} />

    </div>
  )
}

/**
 * What the depreciation line is actually made of.
 *
 * Worth showing rather than asserting: the charge used to be a flat monthly
 * figure with nothing behind it, and every guest comfort purchase — the bed
 * frame, the sofa cushions, the inflatable pool — was missing from the cost of
 * running the place entirely. Laying the items out means the number can be
 * checked against things she can point at on the island.
 */
function DepreciationDetail({
  depreciation,
  charged,
}: {
  depreciation: ReturnType<typeof buildDepreciation>
  charged: number
}) {
  const [open, setOpen] = useState(false)
  if (depreciation.items.length === 0) return null

  return (
    <Card>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h4 className="text-[13px] font-semibold text-ink">What the depreciation is</h4>
          <p className="mt-1 max-w-2xl text-[11.5px] leading-relaxed text-ink-2">
            {money(charged, 'PHP', true)} charged over these months, worked out from the{' '}
            {depreciation.items.length} things the business has actually bought — {money(depreciation.totalCost, 'PHP', true)}{' '}
            of capital spend, guest comfort included — each written off in equal slices over the years it should last.
            Not a flat figure typed once.
          </p>
        </div>
        <Button variant="ghost" size="sm" onClick={() => setOpen((was) => !was)}>
          {open ? 'Hide the items' : 'Show the items'}
        </Button>
      </div>

      <div className="mt-3 grid gap-3 sm:grid-cols-3">
        <Stat label="Bought, at cost" value={money(depreciation.totalCost, 'PHP', true)} sub={`${depreciation.items.length} items`} />
        <Stat
          label="Written off so far"
          value={money(depreciation.accumulated, 'PHP', true)}
          sub={depreciation.totalCost > 0 ? `${pct(depreciation.accumulated / depreciation.totalCost, 0)} of cost` : ''}
        />
        <Stat
          label="Still on the books"
          value={money(depreciation.netBookValue, 'PHP', true)}
          sub={`running at ${money(depreciation.monthlyRunRate, 'PHP')}/month`}
        />
      </div>

      {open ? (
        <div className="mt-3 overflow-x-auto rounded-xl border border-line">
          <table className="w-full min-w-[640px] text-[12px]">
            <thead className="bg-surface-2 text-ink-2">
              <tr>
                {['Bought', 'Item', 'Category', 'Cost', 'Life', 'Per month', 'Left on books'].map((header) => (
                  <th key={header} className="px-3 py-2 text-left font-medium">
                    {header}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {depreciation.items.map((item) => (
                <tr key={item.id} className="border-t border-line">
                  <td className="num whitespace-nowrap px-3 py-1.5 text-ink-2">{shortDate(item.date)}</td>
                  <td className="px-3 py-1.5 text-ink">{item.item}</td>
                  <td className="px-3 py-1.5 text-ink-3">{item.category}</td>
                  <td className="num whitespace-nowrap px-3 py-1.5 text-ink">{money(item.cost, 'PHP', true)}</td>
                  <td className="num whitespace-nowrap px-3 py-1.5 text-ink-2">{item.lifeYears} yrs</td>
                  <td className="num whitespace-nowrap px-3 py-1.5 text-ink-2">{money(item.monthlyCharge, 'PHP')}</td>
                  <td className="num whitespace-nowrap px-3 py-1.5 text-ink-2">{money(item.netBookValue, 'PHP', true)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : null}
    </Card>
  )
}

function CashFlow({ months, cash }: { months: StatementMonth[]; cash: ReturnType<typeof buildActualCash> }) {
  const totals = cash.reduce(
    (sum, month) => ({
      operating: sum.operating + month.operating,
      operatingCosts: sum.operatingCosts + month.operatingCosts,
      investing: sum.investing + month.investing,
      financing: sum.financing + month.financing,
      net: sum.net + month.net,
    }),
    { operating: 0, operatingCosts: 0, investing: 0, financing: 0, net: 0 },
  )

  return (
    <div className="space-y-4">
      <StatGrid>
        <Stat label="Cash from operations" value={money(totals.operating - totals.operatingCosts, 'PHP', true)} tone="pos" sub="What the business itself threw off" />
        <Stat label="Spent on the island" value={money(-totals.investing, 'PHP', true)} sub="Building work and equipment" />
        <Stat label="Paid out to owners" value={money(-totals.financing, 'PHP', true)} sub="Dividends taken" />
        <Stat
          label="Net movement"
          value={money(totals.net, 'PHP', true)}
          tone={totals.net >= 0 ? 'pos' : 'neg'}
          sub="Across the period shown"
        />
      </StatGrid>

      <div className="overflow-x-auto rounded-xl border border-line">
        <table className="w-full min-w-[720px] border-collapse text-[12px]">
          <thead>
            <tr className="bg-surface-2">
              <th className="sticky left-0 z-10 bg-surface-2 px-3 py-2 text-left font-medium text-ink-2">&nbsp;</th>
              {months.map((month) => (
                <th key={month.month} className="whitespace-nowrap px-3 py-2 text-right font-medium text-ink-2">
                  {monthLabel(month.month)}
                </th>
              ))}
              <th className="border-l border-line px-3 py-2 text-right font-semibold text-ink">Total</th>
            </tr>
          </thead>
          <tbody>
            {(
              [
                ['Money in from guests', (m: (typeof cash)[number]) => m.operating, 'head'],
                ['Running costs paid', (m: (typeof cash)[number]) => -m.operatingCosts, 'sub'],
                ['Cash from operations', (m: (typeof cash)[number]) => m.operating - m.operatingCosts, 'total'],
                ['Building and equipment', (m: (typeof cash)[number]) => -m.investing, 'head'],
                ['Dividends to owners', (m: (typeof cash)[number]) => -m.financing, 'head'],
                ['NET MOVEMENT', (m: (typeof cash)[number]) => m.net, 'total'],
                ['Running balance', (m: (typeof cash)[number]) => m.running, 'sub'],
              ] as [string, (m: (typeof cash)[number]) => number, string][]
            ).map(([label, pick, emphasis]) => (
              <tr
                key={label}
                className={cx(
                  'border-t border-line',
                  emphasis === 'head' && 'bg-surface-2/60',
                  emphasis === 'total' && 'bg-surface-2/40 font-semibold',
                )}
              >
                <td
                  className={cx(
                    'sticky left-0 z-10 whitespace-nowrap bg-bg px-3 py-1.5',
                    emphasis === 'head' && 'bg-surface-2/60 font-semibold text-ink',
                    emphasis === 'total' && 'bg-surface-2/40 font-semibold text-ink',
                    emphasis === 'sub' && 'pl-6 text-ink-2',
                  )}
                >
                  {label}
                </td>
                {cash.map((month) => {
                  const value = pick(month)
                  return (
                    <td
                      key={month.month}
                      className={cx('num whitespace-nowrap px-3 py-1.5 text-right', value < 0 ? 'text-neg' : 'text-ink-2')}
                    >
                      {value === 0 ? '—' : money(value, 'PHP', true)}
                    </td>
                  )
                })}
                <td className="num whitespace-nowrap border-l border-line px-3 py-1.5 text-right font-medium text-ink">
                  {label === 'Running balance'
                    ? money(cash[cash.length - 1]?.running ?? 0, 'PHP', true)
                    : money(cash.reduce((sum, month) => sum + pick(month), 0), 'PHP', true)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="text-[11.5px] leading-relaxed text-ink-3">
        The running balance starts from zero and counts only what this dashboard has recorded — it is the movement, not
        your bank balance. Put your real opening balance into the Forecast tab and the forward-looking version becomes
        an actual runway.
      </p>
    </div>
  )
}

function ExpenseSummary({
  months,
  depreciationByMonth,
}: {
  months: StatementMonth[]
  depreciationByMonth?: Record<string, number>
}) {
  const { expenses } = useLedger()
  const keys = months.map((month) => month.month)
  const rows = useMemo(
    () => expenseMatrix(expenses, keys, depreciationByMonth),
    [expenses, keys.join(','), depreciationByMonth],
  )
  const columnTotal = (month: string) => rows.reduce((sum, row) => sum + (row.byMonth[month] ?? 0), 0)
  const grand = rows.reduce((sum, row) => sum + row.total, 0)

  return (
    <div className="space-y-3">
      <SectionHeader
        title="Every cost, by category and month"
        subtitle="The same layout as your expense summary sheet, built from the rows themselves — so a figure here is one click from the receipt it came from."
      />
      <div className="overflow-x-auto rounded-xl border border-line">
        <table className="w-full min-w-[720px] border-collapse text-[12px]">
          <thead>
            <tr className="bg-surface-2">
              <th className="sticky left-0 z-10 bg-surface-2 px-3 py-2 text-left font-medium text-ink-2">Category</th>
              {keys.map((month) => (
                <th key={month} className="whitespace-nowrap px-3 py-2 text-right font-medium text-ink-2">
                  {monthLabel(month)}
                </th>
              ))}
              <th className="border-l border-line px-3 py-2 text-right font-semibold text-ink">Total</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.category} className="border-t border-line">
                <td className="sticky left-0 z-10 whitespace-nowrap bg-bg px-3 py-1.5 text-ink">{row.category}</td>
                {keys.map((month) => (
                  <td key={month} className="num whitespace-nowrap px-3 py-1.5 text-right text-ink-2">
                    {row.byMonth[month] ? money(row.byMonth[month], 'PHP', true) : '—'}
                  </td>
                ))}
                <td className="num whitespace-nowrap border-l border-line px-3 py-1.5 text-right font-medium text-ink">
                  {money(row.total, 'PHP', true)}
                </td>
              </tr>
            ))}
            <tr className="border-t border-line bg-surface-2/40 font-semibold">
              <td className="sticky left-0 z-10 bg-surface-2/40 px-3 py-1.5 text-ink">Total expenses</td>
              {keys.map((month) => (
                <td key={month} className="num whitespace-nowrap px-3 py-1.5 text-right text-ink">
                  {columnTotal(month) ? money(columnTotal(month), 'PHP', true) : '—'}
                </td>
              ))}
              <td className="num whitespace-nowrap border-l border-line px-3 py-1.5 text-right text-ink">
                {money(grand, 'PHP', true)}
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  )
}

/**
 * Dividends: profit taken out of the business.
 *
 * On its own page because it is neither a cost nor an investment — it is the
 * point of the whole thing, and the two owners need to see their own split.
 */
function Dividends() {
  const { dividends, addDividend, removeDividend, settings } = useLedger()
  const [adding, setAdding] = useState(false)

  const summary = useMemo(() => summariseDividends(dividends), [dividends])
  const { totalPhp: total, totalUsd, byRecipient } = summary

  return (
    <div className="space-y-4">
      <SectionHeader
        title="Money taken out"
        subtitle="A dividend is profit already earned being paid to the owners. It is not a cost, so it never touches the P&L — it only leaves the bank, which is why it lives here and on the cash flow. These were agreed in dollars, so the dollar figure is the record and the peso one is what the transfer converted at."
        right={
          <Button variant="primary" size="sm" onClick={() => setAdding(true)}>
            + Record a payout
          </Button>
        }
      />

      {adding ? <DividendForm onDone={() => setAdding(false)} onSave={addDividend} /> : null}

      <StatGrid>
        <Stat
          label="Paid out all time"
          value={money(totalUsd, 'USD')}
          sub={`${money(total, settings.baseCurrency)} · ${dividends.length} payout${dividends.length === 1 ? '' : 's'}`}
        />
        {byRecipient.slice(0, 3).map((share) => (
          <Stat
            key={share.name}
            label={share.name}
            value={money(share.usd, 'USD')}
            sub={`${money(share.php, settings.baseCurrency)}${totalUsd > 0 ? ` · ${pct(share.usd / totalUsd, 0)} of payouts` : ''}`}
          />
        ))}
      </StatGrid>

      {dividends.length === 0 ? (
        <Card>
          <p className="text-[12px] leading-relaxed text-ink-2">
            Nothing recorded yet. Adding payouts here is what turns "the business made money" into "we took this much
            out and left this much in" — which is the question a second owner actually wants answered.
          </p>
        </Card>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-line">
          <table className="w-full min-w-[560px] text-[12px]">
            <thead className="bg-surface-2 text-ink-2">
              <tr>
                {['Released', 'Amount', 'In pesos', 'Split', 'Approved by', 'Note', ''].map((header) => (
                  <th key={header} className="px-3 py-2 text-left font-medium">
                    {header}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {[...dividends]
                .sort((a, b) => b.date.localeCompare(a.date))
                .map((payout) => (
                  <tr key={payout.id} className="border-t border-line">
                    <td className="num whitespace-nowrap px-3 py-1.5 text-ink">{shortDate(payout.date)}</td>
                    <td className="num whitespace-nowrap px-3 py-1.5 font-medium text-ink">
                      {payout.amountUsd > 0 ? money(payout.amountUsd, 'USD') : '—'}
                    </td>
                    <td className="num whitespace-nowrap px-3 py-1.5 text-ink-2">
                      {money(payout.amount, payout.currency)}
                    </td>
                    <td className="px-3 py-1.5 text-ink-2">
                      {payout.recipients.length > 0
                        ? payout.recipients.map((r) => `${r.name} ${money(r.amountUsd, 'USD')}`).join(' · ')
                        : '—'}
                    </td>
                    <td className="px-3 py-1.5 text-ink-2">{payout.approvedBy || '—'}</td>
                    <td className="px-3 py-1.5 text-ink-3">{payout.note || '—'}</td>
                    <td className="px-3 py-1.5 text-right">
                      <Button variant="ghost" size="sm" onClick={() => void removeDividend(payout.id)}>
                        Remove
                      </Button>
                    </td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

/**
 * Recording a payout.
 *
 * The split is asked for in dollars because that is what the owners agree and
 * remember; the peso figure is whatever the transfer landed at, and it is
 * shared out on the dollar ratio rather than typed twice. That way the two
 * numbers can never drift apart on a row.
 */
function DividendForm({ onDone, onSave }: { onDone: () => void; onSave: (payout: DividendPayout) => Promise<void> }) {
  const [date, setDate] = useState(today())
  const [amount, setAmount] = useState('')
  const [toDani, setToDani] = useState('')
  const [toMom, setToMom] = useState('')
  const [approvedBy, setApprovedBy] = useState('')
  const [note, setNote] = useState('')
  const [busy, setBusy] = useState(false)

  const totalValue = Number(amount) || 0
  const daniUsd = Number(toDani) || 0
  const momUsd = Number(toMom) || 0
  const usdTotal = daniUsd + momUsd
  const valid = totalValue > 0 && usdTotal > 0

  const submit = async () => {
    if (!valid) return
    setBusy(true)
    const recipients = [
      { name: 'Dani', amountUsd: daniUsd },
      { name: 'Mom', amountUsd: momUsd },
    ]
      .filter((r) => r.amountUsd > 0)
      .map((r) => ({ ...r, amount: Math.round(totalValue * (r.amountUsd / usdTotal)) }))
    await onSave({
      id: uid('div'),
      prov: { importId: 'manual', fileName: 'Entered by hand', sheetName: 'Dividends', rowNumber: 0, manual: true },
      date,
      amount: totalValue,
      currency: 'PHP',
      amountUsd: usdTotal,
      recipients,
      approvedBy: approvedBy.trim(),
      note: note.trim(),
    })
    setBusy(false)
    onDone()
  }

  return (
    <Card>
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="Release date">
          <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className={inputClass} />
        </Field>
        <Field label="Total released (₱)">
          <TextInput value={amount} onChange={setAmount} type="number" placeholder="0" />
        </Field>
        <Field label="To Dani ($)" hint="The split as it was agreed — the pesos are worked out from it.">
          <TextInput value={toDani} onChange={setToDani} type="number" placeholder="0" />
        </Field>
        <Field label="To Mom ($)">
          <TextInput value={toMom} onChange={setToMom} type="number" placeholder="0" />
        </Field>
        <Field label="Approved by">
          <TextInput value={approvedBy} onChange={setApprovedBy} placeholder="Optional" />
        </Field>
        <Field label="Note">
          <TextInput value={note} onChange={setNote} placeholder="Optional" />
        </Field>
      </div>
      <div className="mt-3 flex items-center justify-between gap-3 border-t border-line pt-3">
        <span className="text-[12px] text-ink-2">
          {valid ? (
            <>
              Recording {money(usdTotal, 'USD')} ({money(totalValue, 'PHP')}) out of the business — Dani{' '}
              {money(Math.round(totalValue * (daniUsd / usdTotal)), 'PHP')}, Mom{' '}
              {money(Math.round(totalValue * (momUsd / usdTotal)), 'PHP')}.
            </>
          ) : totalValue > 0 ? (
            'Needs the dollar split'
          ) : (
            'Needs the peso amount released'
          )}
        </span>
        <div className="flex gap-2">
          <Button variant="ghost" size="sm" onClick={onDone}>
            Cancel
          </Button>
          <Button variant="primary" size="sm" disabled={busy || !valid} onClick={() => void submit()}>
            {busy ? 'Saving…' : 'Record payout'}
          </Button>
        </div>
      </div>
    </Card>
  )
}
