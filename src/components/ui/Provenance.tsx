import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react'
import type { Provenance } from '@/types'
import { Button } from '@/components/ui/primitives'
import { shortDate } from '@/lib/format'

/**
 * Data provenance.
 *
 * Any record that came from a spreadsheet carries `prov`. Components hand a
 * set of those records to `trace()`, which opens a drawer listing the exact
 * file, sheet and row each one came from. This is what makes a number on
 * screen arguable rather than merely displayed.
 */

export type TraceableRow = { prov: Provenance } & Record<string, unknown>

export type TraceRequest = {
  title: string
  /** what this number is and how it was derived */
  description?: string
  rows: TraceableRow[]
  /** fields worth showing per row, beyond the file/sheet/row identity */
  columns?: { key: string; label: string; format?: (value: unknown) => string }[]
}

type Ctx = { trace: (request: TraceRequest) => void }

const ProvenanceContext = createContext<Ctx | null>(null)

function defaultFormat(value: unknown): string {
  if (value === null || value === undefined) return '—'
  if (typeof value === 'number') {
    return value.toLocaleString('en-US', { maximumFractionDigits: 2 })
  }
  return String(value)
}

export function ProvenanceProvider({ children }: { children: ReactNode }) {
  const [request, setRequest] = useState<TraceRequest | null>(null)
  const trace = useCallback((next: TraceRequest) => setRequest(next), [])
  const value = useMemo(() => ({ trace }), [trace])

  return (
    <ProvenanceContext.Provider value={value}>
      {children}
      {request ? <ProvenanceDrawer request={request} onClose={() => setRequest(null)} /> : null}
    </ProvenanceContext.Provider>
  )
}

export function useProvenance(): Ctx {
  const ctx = useContext(ProvenanceContext)
  // Rendering outside the provider shouldn't crash a page; tracing just no-ops.
  return ctx ?? { trace: () => {} }
}

function ProvenanceDrawer({ request, onClose }: { request: TraceRequest; onClose: () => void }) {
  const byFile = useMemo(() => {
    const groups = new Map<string, TraceableRow[]>()
    for (const row of request.rows) {
      const key = `${row.prov.fileName} › ${row.prov.sheetName}`
      const bucket = groups.get(key)
      if (bucket) bucket.push(row)
      else groups.set(key, [row])
    }
    for (const bucket of groups.values()) bucket.sort((a, b) => a.prov.rowNumber - b.prov.rowNumber)
    return [...groups.entries()]
  }, [request.rows])

  const columns = request.columns ?? []

  return (
    <div className="no-print fixed inset-0 z-50 flex justify-end">
      <button
        type="button"
        aria-label="Close"
        onClick={onClose}
        className="absolute inset-0 bg-black/60 backdrop-blur-[2px]"
      />
      <aside className="animate-in relative flex h-full w-full max-w-xl flex-col border-l border-line bg-bg shadow-2xl">
        <header className="flex items-start justify-between gap-3 border-b border-line px-4 py-3">
          <div className="min-w-0">
            <div className="text-[10px] font-semibold uppercase tracking-widest text-accent">Source data</div>
            <h2 className="mt-0.5 truncate text-[15px] font-semibold text-ink">{request.title}</h2>
            {request.description ? (
              <p className="mt-1 text-[12px] leading-relaxed text-ink-2">{request.description}</p>
            ) : null}
          </div>
          <Button variant="ghost" size="sm" onClick={onClose}>
            Close
          </Button>
        </header>

        <div className="flex-1 overflow-y-auto px-4 py-3">
          {request.rows.length === 0 ? (
            <p className="py-8 text-center text-[13px] text-ink-3">
              No source rows contribute to this figure.
            </p>
          ) : (
            <>
              <p className="mb-3 text-[12px] text-ink-2">
                {request.rows.length} source row{request.rows.length === 1 ? '' : 's'} across{' '}
                {byFile.length} sheet{byFile.length === 1 ? '' : 's'}.
              </p>
              {byFile.map(([file, rows]) => (
                <section key={file} className="mb-4">
                  <h3 className="mb-1.5 flex items-center gap-2 text-[12px] font-medium text-ink">
                    <span className="truncate">{file}</span>
                    <span className="shrink-0 rounded bg-surface-2 px-1.5 py-0.5 text-[10px] text-ink-3">
                      {rows.length} row{rows.length === 1 ? '' : 's'}
                    </span>
                  </h3>
                  <div className="overflow-x-auto rounded-lg border border-line">
                    <table className="w-full min-w-max text-left text-[12px]">
                      <thead>
                        <tr className="border-b border-line bg-surface-2 text-[10px] uppercase tracking-wide text-ink-3">
                          <th className="px-2 py-1.5 font-medium">Row</th>
                          {columns.map((column) => (
                            <th key={column.key} className="px-2 py-1.5 font-medium">
                              {column.label}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {rows.map((row, index) => (
                          <tr
                            key={`${row.prov.rowNumber}-${index}`}
                            className="border-b border-line-soft last:border-0"
                          >
                            <td className="num whitespace-nowrap px-2 py-1.5 text-ink-3">
                              #{row.prov.rowNumber}
                            </td>
                            {columns.map((column) => {
                              const raw = row[column.key]
                              const text = column.format ? column.format(raw) : defaultFormat(raw)
                              return (
                                <td
                                  key={column.key}
                                  className="num whitespace-nowrap px-2 py-1.5 text-ink"
                                >
                                  {text}
                                </td>
                              )
                            })}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </section>
              ))}
            </>
          )}
        </div>
      </aside>
    </div>
  )
}

export const provFormats = {
  date: (value: unknown) => (typeof value === 'string' ? shortDate(value) : '—'),
  money: (value: unknown) =>
    typeof value === 'number' ? value.toLocaleString('en-US', { maximumFractionDigits: 0 }) : '—',
}
