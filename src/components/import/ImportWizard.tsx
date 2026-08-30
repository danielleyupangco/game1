import { useCallback, useMemo, useRef, useState } from 'react'
import { parseWorkbook, type ParsedWorkbook, type SheetPreview } from '@/lib/workbook'
import { DATASETS, type FieldSpec } from '@/lib/schema'
import { autoMap, BUILDERS, missingRequired, type Mapping } from '@/lib/mapping'
import * as db from '@/lib/db'
import { uid } from '@/lib/id'
import { today } from '@/lib/dates'
import { useLedger } from '@/state/store'
import { Button, Card, Field, Pill, Select, TextInput, cx, inputClass } from '@/components/ui/primitives'
import type { DatasetKey, ImportBatch, Snapshot } from '@/types'

type Step = 'file' | 'sheet' | 'map' | 'review'

/**
 * Four-step import: pick file → pick sheet → map columns → review and commit.
 *
 * The mapping step is the whole point. Column names are never assumed: they are
 * guessed, shown, and editable, so the app keeps working when the export format
 * changes underneath it.
 */
export function ImportWizard({
  dataset,
  onDone,
}: {
  dataset: DatasetKey
  onDone: () => void
}) {
  const { reload, settings, snapshots } = useLedger()
  const spec = DATASETS[dataset]

  const [step, setStep] = useState<Step>('file')
  const [workbook, setWorkbook] = useState<ParsedWorkbook | null>(null)
  const [sheetName, setSheetName] = useState('')
  const [mapping, setMapping] = useState<Mapping>({})
  const [dayFirst, setDayFirst] = useState(false)
  const [asOf, setAsOf] = useState(today())
  const [label, setLabel] = useState('')
  const [usdPhp, setUsdPhp] = useState(String(settings.usdPhp))
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)

  const sheet: SheetPreview | null = useMemo(
    () => workbook?.sheets.find((s) => s.name === sheetName) ?? null,
    [workbook, sheetName],
  )

  const handleFile = useCallback(
    async (file: File) => {
      setBusy(true)
      setError(null)
      try {
        const parsed = await parseWorkbook(file)
        const usable = parsed.sheets.filter((s) => s.headers.length > 0 && s.rows.length > 0)
        if (usable.length === 0) {
          setError('No sheet in that file has a header row and at least one data row.')
          setBusy(false)
          return
        }
        setWorkbook(parsed)
        // Prefer the sheet whose headers auto-map most completely.
        const scored = usable
          .map((candidate) => ({
            candidate,
            score: Object.keys(autoMap(candidate.headers, dataset)).length,
          }))
          .sort((a, b) => b.score - a.score)
        const best = scored[0].candidate
        setSheetName(best.name)
        setMapping(autoMap(best.headers, dataset))
        setLabel(file.name.replace(/\.(xlsx|xlsm|csv)$/i, ''))
        setStep(usable.length > 1 ? 'sheet' : 'map')
      } catch (caught) {
        setError(caught instanceof Error ? caught.message : 'Could not read that file.')
      } finally {
        setBusy(false)
      }
    },
    [dataset],
  )

  const preview = useMemo(() => {
    if (!sheet) return null
    const importId = 'preview'
    const build = BUILDERS[dataset]
    return build({
      sheet: { ...sheet, rows: sheet.rows, rowNumbers: sheet.rowNumbers },
      fileName: workbook?.fileName ?? '',
      mapping,
      importId,
      dayFirst,
      snapshotId: 'preview',
    })
  }, [sheet, mapping, dataset, dayFirst, workbook])

  const missing = useMemo(() => missingRequired(mapping, dataset), [mapping, dataset])

  const commit = useCallback(async () => {
    if (!sheet || !workbook || !preview) return
    setBusy(true)
    setError(null)
    try {
      const importId = uid('imp')
      const snapshotId = dataset === 'holdings' ? uid('snp') : undefined
      const build = BUILDERS[dataset]
      const result = build({
        sheet,
        fileName: workbook.fileName,
        mapping,
        importId,
        dayFirst,
        snapshotId,
      })

      if (result.rows.length === 0) {
        setError('Nothing imported — every row was rejected. Check the column mapping below.')
        setBusy(false)
        return
      }

      if (dataset === 'holdings' && snapshotId) {
        const snapshot: Snapshot = {
          id: snapshotId,
          asOf,
          label: label || workbook.fileName,
          createdAt: new Date().toISOString(),
          importId,
          usdPhp: Number(usdPhp) || settings.usdPhp,
        }
        await db.putOne('snapshots', snapshot)
      }

      await db.putMany(dataset === 'holdings' ? 'holdings' : dataset, result.rows as never[])

      const batch: ImportBatch = {
        id: importId,
        dataset,
        fileName: workbook.fileName,
        sheetName: sheet.name,
        importedAt: new Date().toISOString(),
        rowCount: result.rows.length,
        mapping,
        rejected: result.rejected,
        snapshotId,
      }
      await db.putOne('imports', batch)
      await reload()
      onDone()
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Import failed.')
    } finally {
      setBusy(false)
    }
  }, [sheet, workbook, preview, dataset, mapping, dayFirst, asOf, label, usdPhp, settings.usdPhp, reload, onDone])

  return (
    <Card className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h3 className="text-[14px] font-semibold text-ink">Import {spec.label.toLowerCase()}</h3>
          <p className="mt-0.5 max-w-2xl text-[12px] leading-relaxed text-ink-2">{spec.blurb}</p>
        </div>
        <StepDots step={step} />
      </div>

      {error ? (
        <div className="rounded-lg border border-neg/30 bg-neg/10 px-3 py-2 text-[12px] text-neg">{error}</div>
      ) : null}

      {step === 'file' ? (
        <div>
          <input
            ref={fileRef}
            type="file"
            accept=".xlsx,.xlsm,.csv"
            className="hidden"
            onChange={(event) => {
              const file = event.target.files?.[0]
              if (file) void handleFile(file)
              event.target.value = ''
            }}
          />
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            onDragOver={(event) => event.preventDefault()}
            onDrop={(event) => {
              event.preventDefault()
              const file = event.dataTransfer.files?.[0]
              if (file) void handleFile(file)
            }}
            className="flex w-full flex-col items-center justify-center rounded-xl border border-dashed border-line bg-surface-2 px-6 py-10 text-center transition-colors hover:border-accent/50 hover:bg-surface-3"
          >
            <span className="text-[20px] text-ink-3">⇪</span>
            <span className="mt-2 text-[13px] font-medium text-ink">
              {busy ? 'Reading…' : 'Drop an .xlsx or .csv here, or click to choose'}
            </span>
            <span className="mt-1 text-[11px] text-ink-3">
              The file is read in your browser. Nothing is uploaded anywhere.
            </span>
          </button>
        </div>
      ) : null}

      {step === 'sheet' && workbook ? (
        <div className="space-y-2">
          <p className="text-[12px] text-ink-2">
            {workbook.fileName} has {workbook.sheets.length} sheets. Pick the one holding your{' '}
            {spec.label.toLowerCase()}.
          </p>
          <div className="grid gap-2 sm:grid-cols-2">
            {workbook.sheets.map((candidate) => {
              const guess = autoMap(candidate.headers, dataset)
              const matched = Object.keys(guess).length
              const disabled = candidate.rows.length === 0
              return (
                <button
                  key={candidate.name}
                  type="button"
                  disabled={disabled}
                  onClick={() => {
                    setSheetName(candidate.name)
                    setMapping(autoMap(candidate.headers, dataset))
                    setStep('map')
                  }}
                  className={cx(
                    'rounded-lg border p-3 text-left transition-colors',
                    sheetName === candidate.name ? 'border-accent/50 bg-surface-3' : 'border-line bg-surface-2',
                    disabled ? 'cursor-not-allowed opacity-40' : 'hover:border-accent/40 hover:bg-surface-3',
                  )}
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="truncate text-[13px] font-medium text-ink">{candidate.name}</span>
                    <Pill tone={matched >= 3 ? 'pos' : matched > 0 ? 'warn' : 'neutral'}>
                      {matched} field{matched === 1 ? '' : 's'} matched
                    </Pill>
                  </div>
                  <div className="mt-1 truncate text-[11px] text-ink-3">
                    {candidate.rows.length} rows · {candidate.headers.slice(0, 4).join(', ')}
                    {candidate.headers.length > 4 ? '…' : ''}
                  </div>
                </button>
              )
            })}
          </div>
        </div>
      ) : null}

      {step === 'map' && sheet ? (
        <MappingStep
          sheet={sheet}
          fields={spec.fields}
          mapping={mapping}
          setMapping={setMapping}
          dayFirst={dayFirst}
          setDayFirst={setDayFirst}
          blanks={preview?.blanks ?? {}}
        />
      ) : null}

      {step === 'review' && preview && sheet ? (
        <div className="space-y-3">
          <div className="grid gap-2 sm:grid-cols-3">
            <SummaryTile label="Rows ready" value={String(preview.rows.length)} tone="pos" />
            <SummaryTile
              label="Rows rejected"
              value={String(preview.rejected.length)}
              tone={preview.rejected.length > 0 ? 'warn' : 'neutral'}
            />
            <SummaryTile label="Source" value={`${sheet.name} · ${sheet.rows.length} rows`} tone="neutral" />
          </div>

          {dataset === 'holdings' && snapshots.some((snapshot) => snapshot.asOf === asOf) ? (
            <div className="rounded-lg border border-warn/30 bg-warn/5 px-3 py-2 text-[12px] leading-relaxed text-warn">
              A snapshot already exists for {asOf}. Two snapshots on the same date produce no period between them, so
              this import will add positions without extending the return series. Set the date these prices are actually
              good for.
            </div>
          ) : null}

          {dataset === 'holdings' ? (
            <div className="grid gap-3 rounded-lg border border-line bg-surface-2 p-3 sm:grid-cols-3">
              <Field label="Valued as of" hint="The date these prices are good for. Drives the return series.">
                <input type="date" value={asOf} onChange={(e) => setAsOf(e.target.value)} className={inputClass} />
              </Field>
              <Field label="Snapshot label">
                <TextInput value={label} onChange={setLabel} placeholder="e.g. March close" />
              </Field>
              <Field label="USD → PHP rate" hint="Locked to this snapshot so past values don't move when today's rate does.">
                <TextInput value={usdPhp} onChange={setUsdPhp} type="number" />
              </Field>
            </div>
          ) : null}

          {preview.rejected.length > 0 ? (
            <div className="rounded-lg border border-warn/25 bg-warn/5 p-3">
              <p className="mb-1.5 text-[12px] font-medium text-warn">
                {preview.rejected.length} row{preview.rejected.length === 1 ? '' : 's'} will be skipped
              </p>
              <ul className="max-h-32 space-y-0.5 overflow-y-auto text-[11px] text-ink-2">
                {preview.rejected.slice(0, 40).map((rejection) => (
                  <li key={rejection.rowNumber}>
                    Row {rejection.rowNumber} — {rejection.reason}
                  </li>
                ))}
                {preview.rejected.length > 40 ? <li className="text-ink-3">…and more</li> : null}
              </ul>
            </div>
          ) : null}

          <PreviewTable rows={preview.rows.slice(0, 8)} fields={spec.fields} />
        </div>
      ) : null}

      <div className="flex flex-wrap items-center justify-between gap-2 border-t border-line pt-3">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => {
            if (step === 'review') setStep('map')
            else if (step === 'map') setStep(workbook && workbook.sheets.length > 1 ? 'sheet' : 'file')
            else if (step === 'sheet') setStep('file')
            else onDone()
          }}
        >
          {step === 'file' ? 'Cancel' : 'Back'}
        </Button>

        <div className="flex items-center gap-2">
          {step === 'map' && missing.length > 0 ? (
            <span className="text-[11px] text-warn">
              Still need: {missing.map((field) => field.label).join(', ')}
            </span>
          ) : null}
          {step === 'map' ? (
            <Button variant="primary" disabled={missing.length > 0} onClick={() => setStep('review')}>
              Preview {preview?.rows.length ?? 0} rows
            </Button>
          ) : null}
          {step === 'review' ? (
            <Button variant="primary" disabled={busy || preview?.rows.length === 0} onClick={() => void commit()}>
              {busy ? 'Importing…' : `Import ${preview?.rows.length ?? 0} rows`}
            </Button>
          ) : null}
        </div>
      </div>
    </Card>
  )
}

function StepDots({ step }: { step: Step }) {
  const steps: Step[] = ['file', 'sheet', 'map', 'review']
  const labels = { file: 'File', sheet: 'Sheet', map: 'Map columns', review: 'Review' }
  const current = steps.indexOf(step)
  return (
    <div className="flex items-center gap-1.5">
      {steps.map((name, index) => (
        <span
          key={name}
          className={cx(
            'rounded px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wide',
            index === current ? 'bg-accent/15 text-accent' : index < current ? 'text-ink-3' : 'text-ink-3/50',
          )}
        >
          {labels[name]}
        </span>
      ))}
    </div>
  )
}

function SummaryTile({ label, value, tone }: { label: string; value: string; tone: 'pos' | 'warn' | 'neutral' }) {
  const tones = { pos: 'text-pos', warn: 'text-warn', neutral: 'text-ink' }
  return (
    <div className="rounded-lg border border-line bg-surface-2 px-3 py-2">
      <div className="text-[10px] uppercase tracking-wide text-ink-3">{label}</div>
      <div className={cx('num mt-0.5 text-[15px] font-semibold', tones[tone])}>{value}</div>
    </div>
  )
}

function MappingStep({
  sheet,
  fields,
  mapping,
  setMapping,
  dayFirst,
  setDayFirst,
  blanks,
}: {
  sheet: SheetPreview
  fields: FieldSpec[]
  mapping: Mapping
  setMapping: (next: Mapping) => void
  dayFirst: boolean
  setDayFirst: (next: boolean) => void
  blanks: Record<string, number>
}) {
  const options = useMemo(
    () => [{ value: '', label: '— not in my sheet —' }, ...sheet.headers.map((h) => ({ value: h, label: h }))],
    [sheet.headers],
  )

  const sampleFor = (header: string): string => {
    const index = sheet.headers.indexOf(header)
    if (index < 0) return ''
    for (const row of sheet.rows.slice(0, 30)) {
      const value = row[index]
      if (value !== null && value !== undefined && String(value).trim() !== '') {
        const text = value instanceof Date ? value.toISOString().slice(0, 10) : String(value)
        return text.length > 24 ? `${text.slice(0, 24)}…` : text
      }
    }
    return '(all blank)'
  }

  const hasDates = fields.some((field) => field.type === 'date' && mapping[field.key])

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-[12px] text-ink-2">
          Matched {Object.keys(mapping).length} of {fields.length} fields automatically. Correct anything that's wrong —
          your mapping is saved with the import.
        </p>
        {hasDates ? (
          <label className="flex cursor-pointer items-center gap-1.5 text-[11px] text-ink-2">
            <input
              type="checkbox"
              checked={dayFirst}
              onChange={(event) => setDayFirst(event.target.checked)}
              className="accent-accent"
            />
            Dates are DD/MM
          </label>
        ) : null}
      </div>

      <div className="grid gap-2 sm:grid-cols-2">
        {fields.map((field) => {
          const selected = mapping[field.key] ?? ''
          const blankCount = blanks[field.key] ?? 0
          return (
            <div
              key={field.key}
              className={cx(
                'rounded-lg border p-2.5',
                field.required && !selected ? 'border-warn/40 bg-warn/5' : 'border-line bg-surface-2',
              )}
            >
              <div className="mb-1.5 flex items-center justify-between gap-2">
                <span className="text-[12px] font-medium text-ink">
                  {field.label}
                  {field.required ? <span className="ml-1 text-warn">*</span> : null}
                </span>
                {selected && blankCount > 0 ? (
                  <Pill tone="warn">{blankCount} blank</Pill>
                ) : selected ? (
                  <Pill tone="pos">mapped</Pill>
                ) : null}
              </div>
              <Select
                value={selected}
                onChange={(value) => {
                  const next = { ...mapping }
                  if (value) next[field.key] = value
                  else delete next[field.key]
                  setMapping(next)
                }}
                options={options}
              />
              <div className="mt-1 text-[11px] leading-relaxed text-ink-3">
                {selected ? (
                  <>
                    e.g. <span className="num text-ink-2">{sampleFor(selected)}</span>
                  </>
                ) : (
                  (field.hint ?? (field.default !== undefined ? `Defaults to "${field.default}".` : 'Optional.'))
                )}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

function PreviewTable({ rows, fields }: { rows: unknown[]; fields: FieldSpec[] }) {
  if (rows.length === 0) return null
  const shown = fields.slice(0, 6)
  return (
    <div>
      <p className="mb-1.5 text-[11px] uppercase tracking-wide text-ink-3">First rows, as they'll be stored</p>
      <div className="overflow-x-auto rounded-lg border border-line">
        <table className="w-full min-w-max text-left text-[12px]">
          <thead>
            <tr className="border-b border-line bg-surface-2 text-[10px] uppercase tracking-wide text-ink-3">
              <th className="px-2 py-1.5 font-medium">Src row</th>
              {shown.map((field) => (
                <th key={field.key} className="px-2 py-1.5 font-medium">
                  {field.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row, index) => {
              const record = row as Record<string, unknown> & { prov: { rowNumber: number } }
              return (
                <tr key={index} className="border-b border-line-soft last:border-0">
                  <td className="num px-2 py-1.5 text-ink-3">#{record.prov.rowNumber}</td>
                  {shown.map((field) => {
                    const value = record[field.key]
                    return (
                      <td key={field.key} className="num whitespace-nowrap px-2 py-1.5 text-ink">
                        {typeof value === 'number'
                          ? value.toLocaleString('en-US', { maximumFractionDigits: 2 })
                          : String(value ?? '—')}
                      </td>
                    )
                  })}
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}
