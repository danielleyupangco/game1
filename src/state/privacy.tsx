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
 *
 * A build made with `DEMO=1` goes further: it starts masked and has no switch
 * at all. That is the copy you hand to someone else, where the risk is not
 * forgetting to turn masking on but the other person turning it off.
 */

const KEY = 'buddy.privateMode'

/** A demo build cannot be unmasked. Fixed at build time, not a setting. */
export const LOCKED = __DEMO__

type Privacy = {
  hidden: boolean
  toggle: () => void
  /** True when this copy is a demo build, so the UI offers no way back. */
  locked: boolean
}

const Ctx = createContext<Privacy>({ hidden: LOCKED, toggle: () => {}, locked: LOCKED })

function readStored(): boolean {
  if (LOCKED) return true
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
  setPrivateMode(LOCKED || hidden)

  const toggle = useCallback(() => {
    if (LOCKED) return
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

  const value = useMemo(() => ({ hidden: LOCKED || hidden, toggle, locked: LOCKED }), [hidden, toggle])
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>
}

export function usePrivacy(): Privacy {
  return useContext(Ctx)
}
