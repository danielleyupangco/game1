import { useMemo, useState } from 'react'
import { useLedger } from '@/state/store'
import { Button, Card, Field, Pill, SectionHeader, TextInput, inputClass } from '@/components/ui/primitives'
import { AssumptionInput } from '@/components/ui/AssumptionInput'
import { buildPositions, latestSnapshot } from '@/domain/investments/portfolio'
import { ASSET_CLASSES, type AllocationTarget } from '@/types'
import { pct } from '@/lib/format'

export function SettingsPage() {
  const { settings, saveSettings, holdings, snapshots } = useLedger()

  const positions = useMemo(
    () => buildPositions(holdings, latestSnapshot(snapshots)),
    [holdings, snapshots],
  )

  const heldGeographies = useMemo(
    () => [...new Set(positions.map((p) => p.geography))].sort(),
    [positions],
  )

  return (
    <div className="space-y-5">
      <SectionHeader
        title="Settings"
        subtitle="Currency, benchmark and allocation targets. These feed the drift flags and the rebalancing engine — nothing here is buried in code."
      />

      <Card>
        <SectionHeader title="Currency and benchmark" />
        <div className="grid gap-3 sm:grid-cols-3">
          <Field
            label="USD → PHP rate"
            hint="Used for USD positions in the current view. Past snapshots keep the rate they were imported with."
          >
            <input
              type="number"
              value={settings.usdPhp}
              onChange={(event) => void saveSettings({ usdPhp: Number(event.target.value) || 0 })}
              className={inputClass}
            />
          </Field>
          <Field label="Benchmark name" hint="Label for the index you import under Data → Benchmark index levels.">
            <TextInput value={settings.benchmarkName} onChange={(value) => void saveSettings({ benchmarkName: value })} />
          </Field>
          <Field
            label="Cash outside the brokerage (₱)"
            hint="Counted in net worth on the Home page. Not part of portfolio return."
          >
            <input
              type="number"
              value={settings.cashOnHand}
              onChange={(event) => void saveSettings({ cashOnHand: Number(event.target.value) || 0 })}
              className={inputClass}
            />
          </Field>
        </div>
      </Card>

      <Card>
        <SectionHeader
          title="Rebalancing band"
          subtitle="How far a bucket may drift from target before it's flagged. A tight band means more trading; a wide one means more drift."
        />
        <div className="max-w-xs">
          <AssumptionInput
            label="Drift tolerance"
            value={settings.driftBandPct}
            kind="percent"
            step={0.5}
            onChange={(next) => void saveSettings({ driftBandPct: next })}
            note="Percentage points of the whole portfolio, not of the bucket."
          />
        </div>
      </Card>

      <TargetEditor
        title="Target allocation — by asset class"
        subtitle="Weights should total 100%. Anything you hold that isn't listed here shows as untargeted rather than being forced into a bucket."
        targets={settings.targetsByAssetClass}
        suggestions={ASSET_CLASSES}
        onChange={(next) => void saveSettings({ targetsByAssetClass: next })}
      />

      <TargetEditor
        title="Target allocation — by currency"
        subtitle="Your PHP/USD split. Currency drift is the one most people miss: a strong dollar moves this without you trading anything."
        targets={settings.targetsByCurrency}
        suggestions={['PHP', 'USD']}
        onChange={(next) => void saveSettings({ targetsByCurrency: next })}
      />

      <TargetEditor
        title="Target allocation — by geography"
        subtitle="Optional. Leave empty to skip geographic drift flags entirely."
        targets={settings.targetsByGeography}
        suggestions={heldGeographies.length > 0 ? heldGeographies : ['Philippines', 'US', 'Global']}
        onChange={(next) => void saveSettings({ targetsByGeography: next })}
      />
    </div>
  )
}

function TargetEditor({
  title,
  subtitle,
  targets,
  suggestions,
  onChange,
}: {
  title: string
  subtitle: string
  targets: AllocationTarget[]
  suggestions: readonly string[]
  onChange: (next: AllocationTarget[]) => void
}) {
  const [newKey, setNewKey] = useState('')
  const total = targets.reduce((sum, target) => sum + target.weight, 0)
  const unused = suggestions.filter((key) => !targets.some((target) => target.key === key))

  return (
    <Card>
      <SectionHeader
        title={title}
        subtitle={subtitle}
        right={
          <Pill tone={targets.length === 0 ? 'neutral' : Math.abs(total - 1) < 0.005 ? 'pos' : 'warn'}>
            {targets.length === 0 ? 'no targets set' : `totals ${pct(total, 0)}`}
          </Pill>
        }
      />

      <div className="space-y-1.5">
        {targets.map((target, index) => (
          <div key={target.key} className="flex items-center gap-2">
            <span className="w-32 shrink-0 truncate text-[13px] text-ink sm:w-44">{target.key}</span>
            <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-surface-2">
              <div
                className="h-full rounded-full bg-accent/60"
                style={{ width: `${Math.min(100, target.weight * 100)}%` }}
              />
            </div>
            <input
              type="number"
              step={1}
              value={Number((target.weight * 100).toFixed(2))}
              onChange={(event) => {
                const next = [...targets]
                next[index] = { ...target, weight: (Number(event.target.value) || 0) / 100 }
                onChange(next)
              }}
              className="num w-20 rounded-lg border border-line bg-surface-2 px-2 py-1 text-right text-[13px] text-ink outline-none focus:border-accent/60"
            />
            <span className="w-4 text-[12px] text-ink-3">%</span>
            <button
              type="button"
              onClick={() => onChange(targets.filter((_, i) => i !== index))}
              className="text-[11px] text-ink-3 transition-colors hover:text-neg"
            >
              ✕
            </button>
          </div>
        ))}
        {targets.length === 0 ? (
          <p className="py-2 text-[12px] text-ink-3">No targets yet — add one below.</p>
        ) : null}
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-2 border-t border-line pt-3">
        {unused.slice(0, 8).map((key) => (
          <button
            key={key}
            type="button"
            onClick={() => onChange([...targets, { key, weight: 0 }])}
            className="rounded-md border border-line bg-surface-2 px-2 py-1 text-[11px] text-ink-2 transition-colors hover:border-accent/40 hover:text-accent"
          >
            + {key}
          </button>
        ))}
        <div className="flex items-center gap-1.5">
          <input
            value={newKey}
            onChange={(event) => setNewKey(event.target.value)}
            placeholder="Custom…"
            className="w-28 rounded-md border border-line bg-surface-2 px-2 py-1 text-[11px] text-ink outline-none focus:border-accent/60"
          />
          <Button
            size="sm"
            variant="ghost"
            disabled={!newKey.trim() || targets.some((t) => t.key === newKey.trim())}
            onClick={() => {
              onChange([...targets, { key: newKey.trim(), weight: 0 }])
              setNewKey('')
            }}
          >
            Add
          </Button>
        </div>
      </div>
    </Card>
  )
}
