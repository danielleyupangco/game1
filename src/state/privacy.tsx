import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react'
import { setPrivateMode } from '@/lib/format'

/**
 * Demo mode — the dashboard with every figure blanked.
 *
 * There is one reason this exists: showing somebody how the thing works
 * without showing them what you are worth. So the bar is not "most numbers
 * are hidden", it is "no number is visible anywhere" — a single leaked tile
 * makes the whole feature useless, because you cannot un-show a net worth.
 *
 * Everything else stays: tabs, charts, tables, section headings, the written
 * findings and their arguments. What a visitor sees is the shape of the system,
 * which is the part worth showing.
 *
 * The choice is remembered per browser, so leaving it on and handing over a
 * laptop does what you expect. It is deliberately not stored with the data —
 * this is about who is looking at the screen, not about the ledger.
 */

const KEY = 'buddy.privateMode'

type Privacy = { hidden: boolean; toggle: () => void }

const Ctx = createContext<Privacy>({ hidden: false, toggle: () => {} })

function readStored(): boolean {
  try {
    return localStorage.getItem(KEY) === 'on'
  } catch {
    // A browser with site data blocked simply starts visible each time.
    return false
  }
}

export function PrivacyProvider({ children }: { children: ReactNode }) {
  const [hidden, setHidden] = useState(readStored)

  // Set during render rather than in an effect: the formatters read this flag
  // while the children below are rendering, so an effect would leave one paint
  // showing the real figures.
  setPrivateMode(hidden)

  const toggle = useCallback(() => {
    setHidden((was) => {
      const next = !was
      setPrivateMode(next)
      try {
        localStorage.setItem(KEY, next ? 'on' : 'off')
      } catch {
        // Not worth failing the toggle over.
      }
      return next
    })
  }, [])

  const value = useMemo(() => ({ hidden, toggle }), [hidden, toggle])
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>
}

export function usePrivacy(): Privacy {
  return useContext(Ctx)
}
