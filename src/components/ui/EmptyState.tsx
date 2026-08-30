import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { Card } from '@/components/ui/primitives'

/**
 * Shown wherever a section has no imported data. The app never invents
 * placeholder numbers — an empty section says it is empty and points at the
 * import it needs.
 */
export function EmptyState({
  title,
  body,
  dataset,
  icon,
}: {
  title: string
  body: string
  /** deep-links straight into the import flow for the missing dataset */
  dataset?: string
  icon?: ReactNode
}) {
  return (
    <Card className="flex flex-col items-center justify-center px-6 py-10 text-center">
      <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-full border border-line bg-surface-2 text-ink-3">
        {icon ?? <span className="text-lg">↑</span>}
      </div>
      <h3 className="text-[14px] font-semibold text-ink">{title}</h3>
      <p className="mt-1.5 max-w-md text-[12px] leading-relaxed text-ink-2">{body}</p>
      {dataset ? (
        <Link
          to={`/data?dataset=${dataset}`}
          className="no-print mt-4 rounded-lg border border-accent/40 bg-accent/15 px-3 py-1.5 text-[13px] font-medium text-accent transition-colors hover:bg-accent/25"
        >
          Import {dataset}
        </Link>
      ) : null}
    </Card>
  )
}
