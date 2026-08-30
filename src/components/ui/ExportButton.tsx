import { useEffect, useState } from 'react'
import { Button } from '@/components/ui/primitives'
import { SaveDeclined, saveMode, type SaveMode } from '@/lib/save'

/**
 * An export control that says what it will actually produce.
 *
 * Format depends on where the page is running — a published page can only hand
 * over the file types its host allows — so the label reads the environment
 * rather than promising xlsx everywhere and quietly delivering csv.
 */
export function ExportButton({ run, label = 'Export' }: { run: () => Promise<void>; label?: string }) {
  const [mode, setMode] = useState<SaveMode | null>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let live = true
    void saveMode().then((value) => {
      if (live) setMode(value)
    })
    return () => {
      live = false
    }
  }, [])

  return (
    <div className="no-print flex items-center gap-2">
      {error ? <span className="text-[11px] text-neg">{error}</span> : null}
      <Button
        size="sm"
        disabled={busy}
        title={mode === 'hosted' ? 'Saved as CSV — this page cannot hand over xlsx' : undefined}
        onClick={() => {
          setBusy(true)
          setError(null)
          void run()
            .catch((caught) => {
              // Cancelling is a choice, not a failure worth reporting back.
              if (caught instanceof SaveDeclined) return
              setError(caught instanceof Error ? caught.message : 'Export failed.')
            })
            .finally(() => setBusy(false))
        }}
      >
        {busy ? 'Preparing…' : mode === 'hosted' ? `${label} csv` : `${label} xlsx`}
      </Button>
    </div>
  )
}
