import { relativeTime } from '@/lib/format'
import { Pill } from '@/components/ui/primitives'

/**
 * Tells you how old the data behind a section is. Stale numbers that look
 * current are worse than no numbers, so this sits on every section header.
 */
export function Freshness({ timestamp, label }: { timestamp?: string; label?: string }) {
  if (!timestamp) {
    return <Pill tone="neutral">no data</Pill>
  }
  // Reading the clock during render is impure by definition — but "how stale is
  // this" has no answer that isn't time-dependent, and re-reading on each render
  // is exactly the freshness behaviour we want.
  // eslint-disable-next-line react-hooks/purity
  const ageDays = (Date.now() - new Date(timestamp).getTime()) / 86400000
  const tone = ageDays > 90 ? 'neg' : ageDays > 30 ? 'warn' : 'pos'
  return (
    <Pill tone={tone} title={new Date(timestamp).toLocaleString()}>
      {label ? `${label} · ` : ''}
      {relativeTime(timestamp)}
    </Pill>
  )
}
