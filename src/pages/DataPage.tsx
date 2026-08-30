import { useMemo, useRef, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { DATASET_LIST, DATASETS } from '@/lib/schema'
import { ImportWizard } from '@/components/import/ImportWizard'
import { Button, Card, Pill, SectionHeader, cx } from '@/components/ui/primitives'
import { DataTable } from '@/components/ui/DataTable'
import { useLedger } from '@/state/store'
import { exportBackup, importBackup, wipeEverything, type Backup } from '@/lib/db'
import { exportJson } from '@/lib/export'
import { SaveDeclined } from '@/lib/save'
import { relativeTime, shortDate } from '@/lib/format'
import type { DatasetKey, ImportBatch } from '@/types'

export function DataPage() {
  const { imports, snapshots, reload, removeImport, ...data } = useLedger()
  const [params, setParams] = useSearchParams()
  const requested = params.get('dataset') as DatasetKey | null
  // Which wizard is open is read straight from the URL rather than mirrored in
  // state, so a ?dataset= link works whether the page was already mounted or not
  // — and the back button closes the wizard for free.
  const active: DatasetKey | null = requested && DATASETS[requested] ? requested : null
  const [message, setMessage] = useState<string | null>(null)
  const restoreRef = useRef<HTMLInputElement>(null)

  const counts = useMemo<Record<DatasetKey, number>>(
    () => ({
      holdings: data.holdings.length,
      transactions: data.transactions.length,
      benchmark: data.benchmark.length,
      bookings: data.bookings.length,
      expenses: data.expenses.length,
    }),
    [data.holdings, data.transactions, data.benchmark, data.bookings, data.expenses],
  )

  const lastFor = (dataset: DatasetKey): ImportBatch | null =>
    imports
      .filter((batch) => batch.dataset === dataset)
      .sort((a, b) => (a.importedAt < b.importedAt ? 1 : -1))[0] ?? null

  const openWizard = (dataset: DatasetKey) => {
    setParams({ dataset }, { replace: true })
    setMessage(null)
  }

  const closeWizard = () => {
    setParams({}, { replace: true })
  }

  return (
    <div className="space-y-5">
      <SectionHeader
        title="Data"
        subtitle="Everything the dashboards show comes from files you import here. Each import keeps its column mapping and the source row behind every record, and can be removed cleanly."
      />

      {message ? (
        <div className="rounded-lg border border-accent/30 bg-accent/10 px-3 py-2 text-[12px] text-accent">
          {message}
        </div>
      ) : null}

      {active ? (
        <ImportWizard
          dataset={active}
          onDone={() => {
            closeWizard()
            setMessage('Import complete. The dashboards now include it.')
          }}
        />
      ) : (
        <>
          <div className="grid gap-2.5 sm:grid-cols-2 lg:grid-cols-3">
            {DATASET_LIST.map((spec) => {
              const last = lastFor(spec.key)
              return (
                <Card key={spec.key} className="flex flex-col">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <h3 className="text-[13px] font-semibold text-ink">{spec.label}</h3>
                      <span className="text-[10px] uppercase tracking-wide text-ink-3">
                        {spec.domain === 'investments' ? 'Investments' : 'Island T'}
                      </span>
                    </div>
                    <Pill tone={counts[spec.key] > 0 ? 'pos' : 'neutral'}>
                      {counts[spec.key].toLocaleString()} rows
                    </Pill>
                  </div>
                  <p className="mt-2 flex-1 text-[11px] leading-relaxed text-ink-2">{spec.blurb}</p>
                  <div className="mt-3 flex items-center justify-between gap-2">
                    <span className="truncate text-[11px] text-ink-3">
                      {last ? `${last.fileName} · ${relativeTime(last.importedAt)}` : 'Never imported'}
                    </span>
                    <Button size="sm" variant={counts[spec.key] > 0 ? 'default' : 'primary'} onClick={() => openWizard(spec.key)}>
                      {counts[spec.key] > 0 ? 'Import more' : 'Import'}
                    </Button>
                  </div>
                </Card>
              )
            })}
          </div>

          <Card>
            <SectionHeader
              title="Import history"
              subtitle="Every batch, with the column mapping it used. Removing a batch deletes exactly the rows it added."
            />
            <DataTable
              rows={[...imports].sort((a, b) => (a.importedAt < b.importedAt ? 1 : -1))}
              getKey={(batch) => batch.id}
              emptyLabel="No imports yet."
              columns={[
                {
                  key: 'file',
                  header: 'File',
                  render: (batch) => (
                    <div className="max-w-[220px]">
                      <div className="truncate text-ink">{batch.fileName}</div>
                      <div className="truncate text-[11px] text-ink-3">{batch.sheetName}</div>
                    </div>
                  ),
                  sortValue: (batch) => batch.fileName,
                },
                {
                  key: 'dataset',
                  header: 'Dataset',
                  render: (batch) => <Pill>{DATASETS[batch.dataset].label}</Pill>,
                  sortValue: (batch) => batch.dataset,
                },
                {
                  key: 'rows',
                  header: 'Rows',
                  align: 'right',
                  render: (batch) => (
                    <span>
                      {batch.rowCount}
                      {batch.rejected.length > 0 ? (
                        <span className="ml-1 text-warn">+{batch.rejected.length} skipped</span>
                      ) : null}
                    </span>
                  ),
                  sortValue: (batch) => batch.rowCount,
                },
                {
                  key: 'snapshot',
                  header: 'Snapshot',
                  hideOnMobile: true,
                  render: (batch) => {
                    const snapshot = snapshots.find((s) => s.id === batch.snapshotId)
                    return snapshot ? (
                      <span className="text-ink-2">{shortDate(snapshot.asOf)}</span>
                    ) : (
                      <span className="text-ink-3">—</span>
                    )
                  },
                },
                {
                  key: 'when',
                  header: 'Imported',
                  align: 'right',
                  render: (batch) => <span className="text-ink-2">{relativeTime(batch.importedAt)}</span>,
                  sortValue: (batch) => batch.importedAt,
                },
                {
                  key: 'mapping',
                  header: 'Mapping',
                  hideOnMobile: true,
                  render: (batch) => <MappingPeek batch={batch} />,
                },
                {
                  key: 'remove',
                  header: '',
                  align: 'right',
                  render: (batch) => (
                    <button
                      type="button"
                      className="no-print text-[11px] text-ink-3 transition-colors hover:text-neg"
                      onClick={() => {
                        if (window.confirm(`Remove ${batch.rowCount} rows imported from ${batch.fileName}?`)) {
                          void removeImport(batch.id).then(() => setMessage('Import removed.'))
                        }
                      }}
                    >
                      remove
                    </button>
                  ),
                },
              ]}
              initialSort={{ key: 'when', dir: 'desc' }}
            />
          </Card>

          <Card>
            <SectionHeader
              title="Backup and restore"
              subtitle="Data lives in this browser only. A backup file is how you move it to another device — or get it back after clearing browsing data."
            />
            <div className="flex flex-wrap gap-2">
              <Button
                onClick={() => {
                  void exportBackup()
                    .then((backup) => exportJson(backup, `buddy-backup-${new Date().toISOString().slice(0, 10)}`))
                    .then(() => setMessage('Backup saved.'))
                    .catch((caught) => {
                      if (caught instanceof SaveDeclined) return
                      setMessage(caught instanceof Error ? caught.message : 'Backup failed.')
                    })
                }}
              >
                Download backup
              </Button>
              <input
                ref={restoreRef}
                type="file"
                accept=".json"
                className="hidden"
                onChange={(event) => {
                  const file = event.target.files?.[0]
                  event.target.value = ''
                  if (!file) return
                  if (!window.confirm('Restoring replaces everything currently in this browser. Continue?')) return
                  void file.text().then(async (text) => {
                    try {
                      await importBackup(JSON.parse(text) as Backup)
                      await reload()
                      setMessage('Backup restored.')
                    } catch {
                      setMessage('That file could not be read as a Buddy backup.')
                    }
                  })
                }}
              />
              <Button onClick={() => restoreRef.current?.click()}>Restore from backup</Button>
              <Button
                variant="danger"
                onClick={() => {
                  if (window.confirm('Delete all imported data, settings and assumptions from this browser?')) {
                    void wipeEverything().then(async () => {
                      await reload()
                      setMessage('All local data deleted.')
                    })
                  }
                }}
              >
                Erase everything
              </Button>
            </div>
          </Card>
        </>
      )}
    </div>
  )
}

function MappingPeek({ batch }: { batch: ImportBatch }) {
  const [open, setOpen] = useState(false)
  const entries = Object.entries(batch.mapping)
  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        className={cx('text-[11px] transition-colors', open ? 'text-accent' : 'text-ink-3 hover:text-ink')}
      >
        {entries.length} columns {open ? '▾' : '▸'}
      </button>
      {open ? (
        <div className="absolute right-0 top-5 z-20 w-64 rounded-lg border border-line bg-surface-2 p-2 shadow-xl">
          {entries.map(([field, header]) => (
            <div key={field} className="flex justify-between gap-2 py-0.5 text-[11px]">
              <span className="text-ink-3">{field}</span>
              <span className="truncate text-ink">{header}</span>
            </div>
          ))}
        </div>
      ) : null}
    </div>
  )
}
