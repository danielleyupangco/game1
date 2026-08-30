import { useMemo, useState } from 'react'
import { useLedger } from '@/state/store'
import { Card, Pill, SectionHeader, Tabs } from '@/components/ui/primitives'
import { EmptyState } from '@/components/ui/EmptyState'
import { FindingList } from '@/components/ui/FindingList'

/**
 * The written analysis, kept as data rather than prose in a chat window.
 *
 * Each finding carries the numbers it rests on, so it can be argued with; each
 * has one next step, so it can be worked through; and each can be closed off,
 * so the dashboard reflects what is actually outstanding rather than a snapshot
 * of somebody's opinion on one particular day.
 */
export function AnalysisPage() {
  const { findings } = useLedger()
  const [filter, setFilter] = useState<'live' | 'all'>('live')
  const [scope, setScope] = useState<'all' | 'investments' | 'airbnb'>('all')

  const visible = useMemo(() => {
    let list = findings
    if (filter === 'live') list = list.filter((f) => f.status === 'open' || f.status === 'doing')
    if (scope !== 'all') list = list.filter((f) => f.section === scope)
    return list
  }, [findings, filter, scope])

  const counts = useMemo(
    () => ({
      open: findings.filter((f) => f.status === 'open').length,
      doing: findings.filter((f) => f.status === 'doing').length,
      done: findings.filter((f) => f.status === 'done').length,
      critical: findings.filter((f) => f.status === 'open' && f.severity === 'critical').length,
      investments: findings.filter((f) => f.section === 'investments').length,
      airbnb: findings.filter((f) => f.section === 'airbnb').length,
    }),
    [findings],
  )

  if (findings.length === 0) {
    return (
      <div className="space-y-4">
        <SectionHeader title="Analysis" />
        <EmptyState
          title="No findings yet"
          body="This page holds written analysis of the portfolio and the property — each finding with the numbers behind it and one next step. Findings arrive with a backup file, or you can restore one under Data."
          dataset="holdings"
        />
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <SectionHeader
        title="Analysis"
        subtitle="Written findings, each carrying its own evidence and one next step. Distinct from the Home alerts, which are rules that recompute on every visit — these are judgements you can work through and close off."
        right={
          <div className="flex items-center gap-1.5">
            {counts.critical > 0 ? <Pill tone="neg">{counts.critical} to act on</Pill> : null}
            <Pill tone={counts.open > 0 ? 'warn' : 'pos'}>{counts.open} open</Pill>
            {counts.done > 0 ? <Pill tone="pos">{counts.done} done</Pill> : null}
          </div>
        }
      />

      <div className="no-print flex flex-wrap items-center gap-2">
        <Tabs
          value={filter}
          onChange={setFilter}
          options={[
            { value: 'live', label: `Outstanding (${counts.open + counts.doing})` },
            { value: 'all', label: `Everything (${findings.length})` },
          ]}
        />
        <Tabs
          value={scope}
          onChange={setScope}
          options={[
            { value: 'all', label: 'Both' },
            { value: 'investments', label: `Portfolio (${counts.investments})` },
            { value: 'airbnb', label: `Island T (${counts.airbnb})` },
          ]}
        />
      </div>

      {visible.length === 0 ? (
        <Card>
          <p className="py-6 text-center text-[13px] text-ink-2">
            Nothing outstanding here. Switch to “Everything” to see what's been closed off.
          </p>
        </Card>
      ) : (
        <FindingList findings={visible} />
      )}
    </div>
  )
}
