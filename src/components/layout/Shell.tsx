import { useEffect, useState, type ReactNode } from 'react'
import { NavLink, useLocation } from 'react-router-dom'
import { cx } from '@/components/ui/primitives'
import { QuickAdd } from '@/components/entry/QuickAdd'
import { useLedger } from '@/state/store'
import { usePrivacy } from '@/state/privacy'

/**
 * Says so when this visit pulled in corrected data.
 *
 * Without it a figure quietly changes between two visits and there is no way to
 * tell a correction from a bug — which is exactly the confusion that made this
 * necessary in the first place.
 */
/** A standing reminder, so masked figures are never mistaken for real ones. */
function PrivacyBanner() {
  const { hidden, toggle, locked } = usePrivacy()
  if (!hidden) return null
  return (
    <div className="mb-4 flex flex-wrap items-center justify-between gap-2 rounded-xl border border-warn/30 bg-warn/[0.07] px-3 py-2">
      <p className="text-[12px] leading-relaxed text-ink-2">
        <span className="font-semibold text-warn">Figures are hidden.</span> Every amount, percentage and count on the
        page is masked — the structure, the charts and the written analysis are all still here.{' '}
        {locked ? 'This copy is a demo: there is no switch to turn them back on.' : 'Nothing has changed in your data.'}
      </p>
      {locked ? null : (
        <button
          type="button"
          onClick={toggle}
          className="shrink-0 rounded-lg border border-warn/40 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.1em] text-warn transition-colors hover:bg-warn/15"
        >
          Show figures
        </button>
      )}
    </div>
  )
}

/**
 * The demo-mode switch.
 *
 * Deliberately loud when it is on. The failure mode that matters is not
 * forgetting to turn it on — you notice that immediately — it is leaving it on
 * and quietly reading masked figures yourself, so the button changes colour and
 * the page carries a banner until it is turned off again.
 */
function PrivacyToggle() {
  const { hidden, toggle, locked } = usePrivacy()
  // A demo build says what it is and offers nothing to press. Rendering a
  // disabled button instead would still read as "there is a way back".
  if (locked) {
    return (
      <span
        title="This is a demo copy. Every figure is masked and cannot be shown."
        className="rounded-lg border border-warn/50 bg-warn/20 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.1em] text-warn"
      >
        Demo copy
      </span>
    )
  }
  return (
    <button
      type="button"
      onClick={toggle}
      aria-pressed={hidden}
      title={
        hidden
          ? 'Figures are hidden. Click to show them again.'
          : 'Hide every figure so you can show someone how this works'
      }
      className={cx(
        'rounded-lg border px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.1em] transition-colors',
        hidden
          ? 'border-warn/50 bg-warn/20 text-warn hover:bg-warn/30'
          : 'border-line bg-surface-2 text-ink-2 hover:text-ink',
      )}
    >
      {hidden ? 'Figures hidden' : 'Hide figures'}
    </button>
  )
}

function RefreshNotice() {
  const { refreshNote, dismissRefreshNote } = useLedger()
  if (!refreshNote) return null
  return (
    <div className="no-print mb-4 flex flex-wrap items-start justify-between gap-3 rounded-xl border border-accent/30 bg-accent/[0.06] px-4 py-3">
      <p className="max-w-3xl text-[12px] leading-relaxed text-ink-2">
        <span className="font-semibold text-ink">Data refreshed.</span> This copy was carrying an older version of the
        imported records, so it has been brought up to date — some figures will have moved.
        {refreshNote.keptManual > 0 ? (
          <>
            {' '}
            The <span className="num text-ink">{refreshNote.keptManual}</span> row
            {refreshNote.keptManual === 1 ? '' : 's'} you entered by hand
            {refreshNote.keptFindingStates > 0
              ? `, and ${refreshNote.keptFindingStates} finding${refreshNote.keptFindingStates === 1 ? '' : 's'} you had started or closed,`
              : ''}{' '}
            were kept.
          </>
        ) : refreshNote.keptFindingStates > 0 ? (
          <>
            {' '}
            The <span className="num text-ink">{refreshNote.keptFindingStates}</span> finding
            {refreshNote.keptFindingStates === 1 ? '' : 's'} you had started or closed were kept.
          </>
        ) : null}
      </p>
      <button
        type="button"
        onClick={dismissRefreshNote}
        className="shrink-0 rounded-lg border border-line bg-surface-2 px-2.5 py-1 text-[12px] text-ink hover:bg-surface-3"
      >
        Got it
      </button>
    </div>
  )
}

/**
 * Two groups, as the hub design intends: where you stand, then what you run.
 * The divider is meaningful — everything after it is a business.
 */
const NAV = [
  { to: '/', label: 'Hub', short: 'Hub', icon: '◇', group: 'a' },
  { to: '/summary', label: 'Main', short: 'Main', icon: '◈', group: 'a' },
  { to: '/analysis', label: 'Intel', short: 'Intel', icon: '✦', group: 'a' },
  { to: '/data', label: 'Ops', short: 'Data', icon: '⇪', group: 'a' },
  { to: '/investments', label: 'Markets', short: 'Invest', icon: '▲', group: 'b' },
  { to: '/airbnb', label: 'Island T', short: 'Island', icon: '◉', group: 'b' },
  { to: '/settings', label: 'Setup', short: 'Setup', icon: '⚙', group: 'b' },
]

export function Shell({ children }: { children: ReactNode }) {
  const { hidden } = usePrivacy()
  const { ready } = useLedger()
  const location = useLocation()
  const [clock, setClock] = useState(() => new Date())
  const [adding, setAdding] = useState(false)

  useEffect(() => {
    const timer = window.setInterval(() => setClock(new Date()), 30000)
    return () => window.clearInterval(timer)
  }, [])

  return (
    <div className="min-h-full bg-bg">
      <QuickAdd open={adding} onClose={() => setAdding(false)} />
      <header className="no-print sticky top-0 z-30 border-b border-line bg-bg/90 backdrop-blur-md">
        <div className="mx-auto flex max-w-[1180px] flex-wrap items-center gap-x-4 gap-y-2 px-4 py-2.5">
          <div className="flex items-baseline gap-2.5">
            <span className="text-[15px] font-semibold leading-none tracking-[0.3em] text-ink">BUDDY</span>
            <span className="hidden text-[9px] uppercase leading-none tracking-[0.16em] text-ink-3 lg:inline">
              Portfolio · Property · Decisions
            </span>
          </div>

          <span className="flex items-center gap-1.5 rounded-full border border-pos/30 bg-pos/10 px-2 py-0.5 text-[10px] font-medium uppercase tracking-widest text-pos">
            <span className="h-1.5 w-1.5 rounded-full bg-pos" />
            {ready ? 'Local' : 'Loading'}
          </span>

          <nav className="ml-1 hidden items-center gap-0.5 sm:flex">
            {NAV.map((item, index) => (
              <span key={item.to} className="flex items-center">
                {index > 0 && NAV[index - 1].group !== item.group ? (
                  <span className="mx-2 h-3.5 w-px bg-line" />
                ) : null}
                <NavLink
                  to={item.to}
                  end={item.to === '/'}
                  className={({ isActive }) =>
                    cx(
                      'rounded-md px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.12em] transition-colors',
                      isActive
                        ? 'bg-accent/12 text-accent ring-1 ring-inset ring-accent/40'
                        : 'text-ink-2 hover:text-ink',
                    )
                  }
                >
                  {item.label}
                </NavLink>
              </span>
            ))}
          </nav>

          {/* One right-hand group, so adding the toggle does not wrap the row. */}
          <div className="ml-auto flex items-center gap-2">
            <PrivacyToggle />

            <button
              type="button"
              onClick={() => setAdding(true)}
              title="Record a cost, a booking or something you bought"
              className="rounded-lg border border-accent/40 bg-accent/15 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.1em] text-accent transition-colors hover:bg-accent/25"
            >
              + Add
            </button>

            <div className="num hidden text-[11px] tracking-wide text-ink-3 sm:block">
              {clock.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
              <span className="ml-1.5 text-ink-3/70">
                {clock.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
              </span>
            </div>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-[1180px] px-4 pb-24 pt-4 sm:pb-10">
        <PrivacyBanner />
        {/*
          Remounting the whole page on toggle, rather than threading the flag
          into every memo below it. Half the figures on this dashboard are
          formatted inside a useMemo whose dependencies are the data, not the
          display setting — so without this the tiles keep their cached strings
          and a net worth stays on screen after the switch says it is hidden.
          Losing which tab you were on is a fair price for that being airtight.
        */}
        <div key={hidden ? 'figures-hidden' : 'figures-shown'}>{children}</div>
        <RefreshNotice />
        <div key={location.pathname} className="animate-in">
        </div>
      </main>

      {/* Bottom bar on phones — Home and the two business sections stay reachable
          with a thumb, which is how this gets checked on the road. */}
      <nav className="no-print fixed inset-x-0 bottom-0 z-30 border-t border-line bg-bg/95 backdrop-blur-md sm:hidden">
        <div className="flex" style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}>
          {NAV.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.to === '/'}
              className={({ isActive }) =>
                cx(
                  'flex flex-1 flex-col items-center gap-0.5 py-2 text-[10px] font-medium transition-colors',
                  isActive ? 'text-accent' : 'text-ink-3',
                )
              }
            >
              <span className="text-[15px] leading-none">{item.icon}</span>
              {item.short}
            </NavLink>
          ))}
        </div>
      </nav>
    </div>
  )
}
