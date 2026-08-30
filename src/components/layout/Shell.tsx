import { useEffect, useState, type ReactNode } from 'react'
import { NavLink, useLocation } from 'react-router-dom'
import { cx } from '@/components/ui/primitives'
import { useLedger } from '@/state/store'

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
  const { ready } = useLedger()
  const location = useLocation()
  const [clock, setClock] = useState(() => new Date())

  useEffect(() => {
    const timer = window.setInterval(() => setClock(new Date()), 30000)
    return () => window.clearInterval(timer)
  }, [])

  return (
    <div className="min-h-full bg-bg">
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

          <div className="num ml-auto text-[11px] tracking-wide text-ink-3">
            {clock.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
            <span className="ml-1.5 text-ink-3/70">
              {clock.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
            </span>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-[1180px] px-4 pb-24 pt-4 sm:pb-10">
        <div key={location.pathname} className="animate-in">
          {children}
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
