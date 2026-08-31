import { useMemo, useState } from 'react'
import { Bar, BarChart, CartesianGrid, Cell, Tooltip, XAxis, YAxis } from 'recharts'
import { useLedger } from '@/state/store'
import { capexProgress } from '@/domain/airbnb/pricefloor'
import { evaluateProject } from '@/domain/airbnb/dcf'
import { Button, Card, Pill, SectionHeader, cx } from '@/components/ui/primitives'
import { AssumptionInput } from '@/components/ui/AssumptionInput'
import { Stat, StatGrid } from '@/components/ui/Stat'
import { DataTable } from '@/components/ui/DataTable'
import { QuickAdd } from '@/components/entry/QuickAdd'
import { ChartFrame, tooltipProps } from '@/components/charts/Chart'
import { AXIS, GRID, SERIES, STATUS, TOOLTIP_STYLE } from '@/components/charts/theme'
import { useProvenance, provFormats } from '@/components/ui/Provenance'
import { money, num, pct, shortDate } from '@/lib/format'
import type { CapitalProject } from '@/types'

/**
 * Capital: what you have bought, what it was budgeted at, and what is left.
 *
 * Kept apart from the P&L on purpose. Capital spend buys something that lasts,
 * so it leaves the bank without reducing the year's profit — folding the two
 * together is what makes a good year with a big build look like a bad one.
 */
export function CapitalPanel() {
  const { projects, saveProjects, capitalSpend, removeCapitalSpend, dcf } = useLedger()
  const { trace } = useProvenance()
  const [adding, setAdding] = useState(false)

  const unassigned = useMemo(() => capitalSpend.filter((row) => !row.projectId), [capitalSpend])
  const totalSpent = capitalSpend.reduce((sum, row) => sum + row.amount, 0)
  const totalBudget = projects.reduce((sum, project) => sum + project.capex, 0)
  const budgetedSpend = capitalSpend
    .filter((row) => projects.some((project) => project.id === row.projectId && project.capex > 0))
    .reduce((sum, row) => sum + row.amount, 0)

  const byCategory = useMemo(() => {
    const buckets = new Map<string, number>()
    for (const row of capitalSpend) buckets.set(row.category, (buckets.get(row.category) ?? 0) + row.amount)
    return [...buckets.entries()]
      .map(([category, amount]) => ({ category, amount }))
      .sort((a, b) => b.amount - a.amount)
  }, [capitalSpend])

  const thisYear = String(new Date().getFullYear())
  const spentThisYear = capitalSpend
    .filter((row) => row.date.startsWith(thisYear))
    .reduce((sum, row) => sum + row.amount, 0)

  return (
    <div className="space-y-4">
      <QuickAdd open={adding} onClose={() => setAdding(false)} initialKind="capital" />

      <Card className="border-info/25 bg-info/[0.04]">
        <div className="flex gap-3">
          <span className="mt-0.5 text-[14px] text-info">◫</span>
          <div>
            <h3 className="text-[13px] font-semibold text-ink">Capital is cash, not cost</h3>
            <p className="mt-1 max-w-3xl text-[12px] leading-relaxed text-ink-2">
              Diesel is a cost — it is gone the moment you burn it, and it reduces this year's profit. A generator is
              capital: the money leaves the bank, but you still own a generator. That is why nothing on this page
              appears in the P&amp;L, and why a year with a big build can be profitable and cash-poor at the same time.
            </p>
          </div>
        </div>
      </Card>

      <StatGrid>
        <Stat
          label="Spent all time"
          value={money(totalSpent, 'PHP', true)}
          sub={`${capitalSpend.length} item${capitalSpend.length === 1 ? '' : 's'}`}
          onTrace={() =>
            trace({
              title: 'Capital spend',
              description: 'Every capital item recorded, whether imported or entered by hand.',
              rows: capitalSpend,
              columns: [
                { key: 'date', label: 'Date', format: provFormats.date },
                { key: 'item', label: 'Item' },
                { key: 'category', label: 'Type' },
                { key: 'amount', label: 'Amount', format: provFormats.money },
              ],
            })
          }
        />
        <Stat label={`Spent in ${thisYear}`} value={money(spentThisYear, 'PHP', true)} />
        <Stat
          label="Budgeted across projects"
          value={money(totalBudget, 'PHP', true)}
          sub={`${projects.length} project${projects.length === 1 ? '' : 's'}`}
        />
        <Stat
          label="Still to spend"
          value={money(Math.max(0, totalBudget - budgetedSpend), 'PHP', true)}
          tone={totalBudget > 0 && budgetedSpend > totalBudget ? 'neg' : 'neutral'}
          sub={
            totalBudget > 0
              ? `${pct(Math.min(1, budgetedSpend / totalBudget), 0)} of budgeted work done`
              : 'No budgets set yet'
          }
        />
      </StatGrid>

      <div className="flex flex-wrap items-center justify-between gap-2">
        <SectionHeader
          title="Projects"
          subtitle="A budget, what has gone against it, and what is left. Add a project the first time you record spend for it."
        />
        <Button variant="primary" size="sm" onClick={() => setAdding(true)}>
          + Add capital spend
        </Button>
      </div>

      {projects.length === 0 ? (
        <Card>
          <p className="py-6 text-center text-[13px] text-ink-2">
            No projects yet. Add a capital spend and you can start a project from inside the form.
          </p>
        </Card>
      ) : (
        <div className="space-y-2.5">
          {projects.map((project) => (
            <ProjectCard
              key={project.id}
              project={project}
              spend={capitalSpend.filter((row) => row.projectId === project.id)}
              discountRate={dcf.discountRate}
              onChange={(patch) =>
                void saveProjects(projects.map((p) => (p.id === project.id ? { ...p, ...patch } : p)))
              }
              onRemove={() => void saveProjects(projects.filter((p) => p.id !== project.id))}
              onRemoveSpend={(id) => void removeCapitalSpend(id)}
            />
          ))}
        </div>
      )}

      {byCategory.length > 0 ? (
        <Card>
          <ChartFrame
            title="Where the capital went"
            caption="Every capital item grouped by type. Repairs recurring at this scale year after year are really a running cost wearing a capital label."
            height={Math.max(160, byCategory.length * 34)}
          >
            <BarChart data={byCategory} layout="vertical" margin={{ top: 4, right: 40, left: 4, bottom: 4 }}>
              <CartesianGrid {...GRID} horizontal={false} vertical />
              <XAxis type="number" {...AXIS} tickFormatter={(value: number) => money(value, 'PHP', true)} />
              <YAxis type="category" dataKey="category" {...AXIS} width={140} />
              <Tooltip {...TOOLTIP_STYLE} {...tooltipProps((value) => [money(value, 'PHP'), 'Spent'])} />
              <Bar dataKey="amount" radius={[0, 4, 4, 0]} barSize={15}>
                {byCategory.map((row) => (
                  <Cell key={row.category} fill={/repair/i.test(row.category) ? STATUS.warn : SERIES[0]} />
                ))}
              </Bar>
            </BarChart>
          </ChartFrame>
        </Card>
      ) : null}

      {unassigned.length > 0 ? (
        <Card>
          <SectionHeader title="One-off spend" subtitle="Capital items not attached to any project." />
          <SpendTable rows={unassigned} onRemove={(id) => void removeCapitalSpend(id)} />
        </Card>
      ) : null}
    </div>
  )
}

function ProjectCard({
  project,
  spend,
  discountRate,
  onChange,
  onRemove,
  onRemoveSpend,
}: {
  project: CapitalProject
  spend: { id: string; date: string; item: string; category: string; amount: number; vendor: string }[]
  discountRate: number
  onChange: (patch: Partial<CapitalProject>) => void
  onRemove: () => void
  onRemoveSpend: (id: string) => void
}) {
  const [open, setOpen] = useState(false)
  const progress = useMemo(() => capexProgress(project.capex, spend), [project.capex, spend])
  const returns = useMemo(
    () => (project.annualCashflow > 0 ? evaluateProject(project, discountRate, 0.1) : null),
    [project, discountRate],
  )

  const budgeted = project.capex > 0
  const barTone = progress.over ? 'bg-neg' : progress.usedShare > 0.85 ? 'bg-warn' : 'bg-accent'

  return (
    <Card padded={false} className="overflow-hidden">
      <div className="px-4 py-3">
        <div className="mb-2.5 flex flex-wrap items-center justify-between gap-2">
          <input
            value={project.name}
            onChange={(event) => onChange({ name: event.target.value })}
            className="min-w-0 flex-1 border-0 bg-transparent text-[13.5px] font-semibold text-ink outline-none"
          />
          <div className="flex items-center gap-2">
            {!budgeted ? (
              <Pill tone="neutral">no budget set</Pill>
            ) : progress.over ? (
              <Pill tone="neg">over by {money(progress.spent - progress.budget, 'PHP', true)}</Pill>
            ) : (
              <Pill tone={progress.usedShare > 0.85 ? 'warn' : 'neutral'}>
                {pct(progress.usedShare, 0)} used
              </Pill>
            )}
            <button
              type="button"
              onClick={onRemove}
              className="text-[11px] text-ink-3 transition-colors hover:text-neg"
              title="Remove project"
            >
              ✕
            </button>
          </div>
        </div>

        {budgeted ? (
          <div className="mb-2 h-2 overflow-hidden rounded-full bg-surface-2">
            <div
              className={cx('h-full rounded-full transition-all', barTone)}
              style={{ width: `${Math.min(100, progress.usedShare * 100)}%` }}
            />
          </div>
        ) : null}

        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          <Cell2 label="Budget" value={budgeted ? money(progress.budget, 'PHP', true) : 'not set'} />
          <Cell2 label="Spent" value={money(progress.spent, 'PHP', true)} />
          <Cell2
            label={!budgeted ? 'Left' : progress.over ? 'Over budget' : 'Left'}
            value={budgeted ? money(Math.abs(progress.remaining), 'PHP', true) : '—'}
            tone={budgeted ? (progress.over ? 'neg' : progress.remaining > 0 ? 'pos' : 'neutral') : 'neutral'}
          />
          <Cell2 label="Items" value={String(spend.length)} />
        </div>

        {!budgeted ? (
          <p className="mt-2 text-[11.5px] leading-relaxed text-ink-2">
            Spend is being tracked, but with no budget there is nothing to track it against. Open the detail below and
            put in what you expect the whole thing to cost.
          </p>
        ) : null}

        {progress.byCategory.length > 0 ? (
          <div className="mt-2.5 flex flex-wrap gap-1.5">
            {progress.byCategory.map((row) => (
              <span
                key={row.category}
                className="rounded border border-line bg-surface-2 px-1.5 py-0.5 text-[10.5px] text-ink-2"
              >
                {row.category} <span className="num text-ink">{money(row.amount, 'PHP', true)}</span>
              </span>
            ))}
          </div>
        ) : null}

        <button
          type="button"
          onClick={() => setOpen((prev) => !prev)}
          className="mt-2.5 text-[11.5px] text-accent transition-opacity hover:opacity-80"
        >
          {open ? 'Hide detail' : 'Budget, returns and items'}
        </button>
      </div>

      {open ? (
        <div className="border-t border-line px-4 py-3">
          <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-5">
            <AssumptionInput
              label="Budget"
              value={project.capex}
              kind="money"
              step={50000}
              onChange={(next) => onChange({ capex: next })}
              note="What you expect the whole thing to cost."
            />
            <AssumptionInput
              label="Extra cash a year"
              value={project.annualCashflow}
              kind="money"
              step={25000}
              onChange={(next) => onChange({ annualCashflow: next })}
              note="Leave at zero if it earns nothing directly — a roof repair usually doesn't."
            />
            <AssumptionInput
              label="Years to ramp"
              value={project.rampYears}
              kind="number"
              step={1}
              suffix="yr"
              onChange={(next) => onChange({ rampYears: next })}
            />
            <AssumptionInput
              label="How long it lasts"
              value={project.lifeYears}
              kind="number"
              step={1}
              suffix="yr"
              onChange={(next) => onChange({ lifeYears: next })}
            />
            <AssumptionInput
              label="Worth at the end"
              value={project.terminalValue}
              kind="money"
              step={100000}
              onChange={(next) => onChange({ terminalValue: next })}
            />
          </div>

          {returns ? (
            <div className="mt-3 grid grid-cols-2 gap-2 border-t border-line pt-3 sm:grid-cols-3">
              <Cell2
                label="Pays back in"
                value={Number.isFinite(returns.payback) ? `${num(returns.payback, 1)} yrs` : 'never'}
                tone={Number.isFinite(returns.payback) && returns.payback < 6 ? 'pos' : 'warn'}
              />
              <Cell2
                label="Return a year"
                value={Number.isFinite(returns.irr) ? pct(returns.irr) : '—'}
                tone={returns.irr > 0.1 ? 'pos' : 'warn'}
              />
              <Cell2
                label="Worth doing?"
                value={returns.npv > 0 ? 'Yes, on these numbers' : 'Not on these numbers'}
                tone={returns.npv > 0 ? 'pos' : 'neg'}
              />
            </div>
          ) : (
            <p className="mt-3 border-t border-line pt-3 text-[11.5px] leading-relaxed text-ink-2">
              No earnings entered, so this is tracked as spend only. That is the right answer for most repairs — they
              keep the place working rather than earning more.
            </p>
          )}

          <div className="mt-3 border-t border-line pt-3">
            <SpendTable rows={spend} onRemove={onRemoveSpend} />
          </div>
        </div>
      ) : null}
    </Card>
  )
}

function SpendTable({
  rows,
  onRemove,
}: {
  rows: { id: string; date: string; item: string; category: string; amount: number; vendor: string }[]
  onRemove: (id: string) => void
}) {
  return (
    <DataTable
      rows={rows}
      getKey={(row) => row.id}
      emptyLabel="Nothing recorded against this yet."
      initialSort={{ key: 'date', dir: 'desc' }}
      columns={[
        { key: 'date', header: 'Date', render: (r) => shortDate(r.date), sortValue: (r) => r.date },
        { key: 'item', header: 'Item', render: (r) => <span className="text-ink">{r.item}</span>, sortValue: (r) => r.item },
        { key: 'category', header: 'Type', hideOnMobile: true, render: (r) => <Pill>{r.category}</Pill>, sortValue: (r) => r.category },
        { key: 'vendor', header: 'Paid to', hideOnMobile: true, render: (r) => <span className="text-ink-2">{r.vendor || '—'}</span> },
        { key: 'amount', header: 'Amount', align: 'right', render: (r) => money(r.amount, 'PHP', true), sortValue: (r) => r.amount },
        {
          key: 'remove',
          header: '',
          align: 'right',
          render: (r) => (
            <button
              type="button"
              onClick={() => onRemove(r.id)}
              className="no-print text-[11px] text-ink-3 transition-colors hover:text-neg"
            >
              remove
            </button>
          ),
        },
      ]}
    />
  )
}

function Cell2({ label, value, tone = 'neutral' }: { label: string; value: string; tone?: 'pos' | 'neg' | 'warn' | 'neutral' }) {
  const tones = { pos: 'text-pos', neg: 'text-neg', warn: 'text-warn', neutral: 'text-ink' }
  return (
    <div className="rounded-lg border border-line bg-surface-2 px-2.5 py-2">
      <div className="text-[10px] uppercase tracking-wide text-ink-3">{label}</div>
      <div className={cx('num mt-0.5 text-[13px] font-semibold', tones[tone])}>{value}</div>
    </div>
  )
}
