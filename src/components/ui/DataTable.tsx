import { useMemo, useState, type ReactNode } from 'react'
import { cx } from '@/components/ui/primitives'

export type Column<T> = {
  key: string
  header: string
  align?: 'left' | 'right'
  /** cell content */
  render: (row: T) => ReactNode
  /** sortable value; omit to make the column unsortable */
  sortValue?: (row: T) => number | string
  className?: string
  /** hidden below the sm breakpoint to keep phone layouts readable */
  hideOnMobile?: boolean
}

/**
 * Sortable table with a horizontal scroll container, so wide tables never
 * force the page itself to scroll sideways on a phone.
 */
export function DataTable<T>({
  rows,
  columns,
  getKey,
  onRowClick,
  initialSort,
  emptyLabel = 'Nothing to show.',
  footer,
  pageSize = 25,
}: {
  rows: T[]
  columns: Column<T>[]
  getKey: (row: T, index: number) => string
  onRowClick?: (row: T) => void
  initialSort?: { key: string; dir: 'asc' | 'desc' }
  emptyLabel?: string
  footer?: ReactNode
  /** rows shown before the "show all" control; 0 disables the cap */
  pageSize?: number
}) {
  const [sort, setSort] = useState(initialSort ?? null)
  const [expanded, setExpanded] = useState(false)

  const sorted = useMemo(() => {
    if (!sort) return rows
    const column = columns.find((c) => c.key === sort.key)
    if (!column?.sortValue) return rows
    const direction = sort.dir === 'asc' ? 1 : -1
    return [...rows].sort((a, b) => {
      const av = column.sortValue!(a)
      const bv = column.sortValue!(b)
      if (typeof av === 'number' && typeof bv === 'number') return (av - bv) * direction
      return String(av).localeCompare(String(bv)) * direction
    })
  }, [rows, columns, sort])

  const toggle = (key: string) => {
    setSort((prev) =>
      prev?.key === key ? { key, dir: prev.dir === 'asc' ? 'desc' : 'asc' } : { key, dir: 'desc' },
    )
  }

  if (rows.length === 0) {
    return <p className="px-1 py-6 text-center text-[13px] text-ink-3">{emptyLabel}</p>
  }

  const capped = pageSize > 0 && !expanded && sorted.length > pageSize
  const visible = capped ? sorted.slice(0, pageSize) : sorted

  return (
    <>
    <div className="-mx-1 overflow-x-auto px-1">
      <table className="w-full min-w-max text-left text-[13px]">
        <thead>
          <tr className="border-b border-line text-[10px] uppercase tracking-wide text-ink-3">
            {columns.map((column) => (
              <th
                key={column.key}
                className={cx(
                  'whitespace-nowrap px-2.5 py-2 font-medium',
                  column.align === 'right' && 'text-right',
                  column.hideOnMobile && 'hidden sm:table-cell',
                  column.sortValue && 'cursor-pointer select-none hover:text-ink',
                )}
                onClick={column.sortValue ? () => toggle(column.key) : undefined}
              >
                {column.header}
                {sort?.key === column.key ? (
                  <span className="ml-1 text-accent">{sort.dir === 'asc' ? '↑' : '↓'}</span>
                ) : null}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {visible.map((row, index) => (
            <tr
              key={getKey(row, index)}
              onClick={onRowClick ? () => onRowClick(row) : undefined}
              className={cx(
                'border-b border-line-soft last:border-0',
                onRowClick && 'cursor-pointer hover:bg-surface-2',
              )}
            >
              {columns.map((column) => (
                <td
                  key={column.key}
                  className={cx(
                    'whitespace-nowrap px-2.5 py-2',
                    column.align === 'right' && 'num text-right',
                    column.hideOnMobile && 'hidden sm:table-cell',
                    column.className,
                  )}
                >
                  {column.render(row)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
        {footer ? <tfoot className="border-t border-line text-[12px]">{footer}</tfoot> : null}
      </table>
    </div>
    {pageSize > 0 && sorted.length > pageSize ? (
      <button
        type="button"
        onClick={() => setExpanded((prev) => !prev)}
        className="no-print mt-2 w-full rounded-lg border border-line bg-surface-2 py-1.5 text-[12px] font-medium text-ink-2 transition-colors hover:bg-surface-3 hover:text-ink"
      >
        {expanded
          ? `Show first ${pageSize} of ${sorted.length}`
          : `Show all ${sorted.length} rows`}
      </button>
    ) : null}
    </>
  )
}
