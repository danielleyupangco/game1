import type { ReactNode } from 'react'
import { NavLink, useLocation } from 'react-router-dom'
import { cx } from '@/components/ui/primitives'
import { useLedger } from '@/state/store'

const NAV = [
  { to: '/', label: 'Home', short: 'Home', icon: '◇' },
  { to: '/investments', label: 'Investments', short: 'Invest', icon: '◈' },
  { to: '/airbnb', label: 'Island T', short: 'Island', icon: '◉' },
  { to: '/data', label: 'Data', short: 'Data', icon: '⇪' },
  { to: '/settings', label: 'Settings', short: 'Setup', icon: '⚙' },
]

export function Shell({ children }: { children: ReactNode }) {
  const { ready } = useLedger()
  const location = useLocation()

  return (
    <div className="min-h-full bg-bg">
      <header className="no-print sticky top-0 z-30 border-b border-line bg-bg/85 backdrop-blur-md">
        <div className="mx-auto flex max-w-[1180px] items-center gap-4 px-4 py-2.5">
          <div className="flex items-center gap-2">
            <span className="flex h-6 w-6 items-center justify-center rounded-md bg-accent/15 text-[12px] text-accent">
              ₱
            </span>
            <span className="text-[13px] font-semibold tracking-tight text-ink">Ledger</span>
          </div>

          <nav className="ml-2 hidden items-center gap-0.5 sm:flex">
            {NAV.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.to === '/'}
                className={({ isActive }) =>
                  cx(
                    'rounded-lg px-2.5 py-1.5 text-[13px] font-medium transition-colors',
                    isActive ? 'bg-surface-2 text-ink' : 'text-ink-2 hover:text-ink',
                  )
                }
              >
                {item.label}
              </NavLink>
            ))}
          </nav>

          <div className="ml-auto text-[11px] text-ink-3">
            {ready ? 'Local · this device only' : 'Loading…'}
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
