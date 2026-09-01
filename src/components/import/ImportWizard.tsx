import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { parseWorkbook, type ParsedWorkbook, type SheetPreview } from '@/lib/workbook'
import { DATASETS, type FieldSpec } from '@/lib/schema'
import { looksLikeAirbnbPayout, parseAirbnbPayout, reconcile, type AirbnbParseResult } from '@/lib/airbnb-csv'
import { looksLikeAddOnForm, matchQuotes, parseAddOnForm, type AddOnParseResult } from '@/lib/addon-form'
import { autoMap, BUILDERS, missingRequired, type Mapping } from '@/lib/mapping'
import {
  buildCrosstabExpenses,
  detectPeriodColumns,
  guessLabelColumn,
  looksLikeCrosstab,
  type PeriodColumn,
} from '@/lib/crosstab'
import * as db from '@/lib/db'
import { uid } from '@/lib/id'
import { today } from '@/lib/dates'
import { useLedger } from '@/state/store'
import { Button, Card, Field, Pill, Select, TextInput, cx, inputClass } from '@/components/ui/primitives'
import type { DatasetKey, Expense, ImportBatch, Snapshot } from '@/types'

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
  const { reload, settings, snapshots, expenses: ledgerExpenses } = useLedger()
  const spec = DATASETS[dataset]

  const [step, setStep] = useState<Step>('file')
  const [workbook, setWorkbook] = useState<ParsedWorkbook | null>(null)
  const [sheetName, setSheetName] = useState('')
  const [mapping, setMapping] = useState<Mapping>({})
  const [dayFirst, setDayFirst] = useState(false)
  const [asOf, setAsOf] = useState(today())
  const [label, setLabel] = useState('')
  const [usdPhp, setUsdPhp] = useState(String(settings.usdPhp))
  /** holdings only: import every dated sheet as its own snapshot */
  const [multi, setMulti] = useState(false)
  const [sheetDates, setSheetDates] = useState<Record<string, string>>({})
  const [sheetOn, setSheetOn] = useState<Record<string, boolean>>({})
  const [sectionLabels, setSectionLabels] = useState<string[]>([])
  const [sectionOn, setSectionOn] = useState<boolean[]>([])
  const [progress, setProgress] = useState<string | null>(null)
  /**
   * Two files arrive in a fixed shape every time — the Airbnb transaction
   * export and the guest add-on form — so they are recognised and read whole
   * rather than mapped column by column.
   */
  const [known, setKnown] = useState<'airbnb' | 'addons' | null>(null)
  /** expenses only: months across the top rather than one row per expense */
  const [crosstab, setCrosstab] = useState(false)
  const [labelColumn, setLabelColumn] = useState(0)
  const [periodYear, setPeriodYear] = useState(new Date().getFullYear())
  const [excludedRows, setExcludedRows] = useState<number[]>([])
  const [natures, setNatures] = useState<Record<string, 'fixed' | 'variable'>>({})
  const [excludedPeriods, setExcludedPeriods] = useState<number[]>([])
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
        setSectionLabels(best.sections.map((section) => section.label))
        setSectionOn(best.sections.map(() => true))

        const recognised = usable.find((candidate) => looksLikeAirbnbPayout(candidate) || looksLikeAddOnForm(candidate))
        if (recognised) {
          setSheetName(recognised.name)
          setKnown(looksLikeAirbnbPayout(recognised) ? 'airbnb' : 'addons')
          setStep('review')
          setBusy(false)
          return
        }

        // A workbook whose sheets are named by date is a history, not a single
        // portfolio. Offer to import the whole thing as dated snapshots.
        // Months across the top rather than one row per record: a management
        // P&L or expense summary, which has to be read cell by cell.
        if (dataset === 'expenses') {
          const year = best.impliedDate
            ? Number(best.impliedDate.slice(0, 4))
            : Number((best.name.match(/20\d{2}/) ?? [])[0]) || new Date().getFullYear()
          if (looksLikeCrosstab(best, year)) {
            setCrosstab(true)
            setPeriodYear(year)
            setLabelColumn(guessLabelColumn(best, detectPeriodColumns(best.headers, year)))
            setStep(usable.length > 1 ? 'sheet' : 'map')
            setBusy(false)
            return
          }
        }

        const dated = usable.filter((candidate) => candidate.impliedDate)
        if (dataset === 'holdings' && dated.length >= 2) {
          setMulti(true)
          setSheetDates(Object.fromEntries(dated.map((c) => [c.name, c.impliedDate!])))
          setSheetOn(Object.fromEntries(usable.map((c) => [c.name, Boolean(c.impliedDate)])))
          setAsOf(dated[0].impliedDate!)
          setStep('map')
        } else {
          if (best.impliedDate) setAsOf(best.impliedDate)
          setStep(usable.length > 1 ? 'sheet' : 'map')
        }
      } catch (caught) {
        setError(caught instanceof Error ? caught.message : 'Could not read that file.')
      } finally {
        setBusy(false)
      }
    },
    [dataset],
  )

  const preview = useMemo(() => {
    if (!sheet || dataset === 'addons') return null
    const importId = 'preview'
    const build = BUILDERS[dataset]
    return build({
      sheet,
      fileName: workbook?.fileName ?? '',
      mapping,
      importId,
      dayFirst,
      snapshotId: 'preview',
      sectionLabels,
      excludedSections: sectionOn.map((on, i) => (on ? -1 : i)).filter((i) => i >= 0),
    })
  }, [sheet, mapping, dataset, dayFirst, workbook, sectionLabels, sectionOn])

  const periods = useMemo(
    () => (sheet && crosstab ? detectPeriodColumns(sheet.headers, periodYear) : []),
    [sheet, crosstab, periodYear],
  )

  const crossPreview = useMemo(() => {
    if (!sheet || !crosstab) return null
    return buildCrosstabExpenses({
      sheet,
      fileName: workbook?.fileName ?? '',
      importId: 'preview',
      labelColumn,
      periods,
      currency: 'PHP',
      excludedRows,
      excludedPeriods,
      natures,
    })
  }, [sheet, crosstab, workbook, labelColumn, periods, excludedRows, excludedPeriods, natures])

  /**
   * Months this dataset already has records for. A P&L covering a fiscal year
   * overlaps the calendar year either side of it, and importing both would
   * double the shared months without anything on screen saying so.
   */
  const coveredMonths = useMemo(() => {
    const months = new Set<string>()
    for (const expense of ledgerExpenses) months.add(expense.date.slice(0, 7))
    return months
  }, [ledgerExpenses])

  const overlapping = useMemo(
    () => periods.filter((period) => coveredMonths.has(period.date.slice(0, 7))),
    [periods, coveredMonths],
  )

  // Pre-exclude the clashing columns rather than silently doubling them.
  useEffect(() => {
    if (overlapping.length === 0) return
    setExcludedPeriods((prev) => (prev.length > 0 ? prev : overlapping.map((period) => period.index)))
  }, [overlapping])

  // Summary rows restate the rows above them; pre-excluding them stops a sheet
  // being double-counted, while leaving the choice visible and reversible.
  useEffect(() => {
    if (!crossPreview) return
    setExcludedRows((prev) =>
      prev.length > 0 ? prev : crossPreview.labels.filter((row) => row.isSummary).map((row) => row.rowIndex),
    )
  }, [crossPreview])

  const commitCrosstab = useCallback(async () => {
    if (!sheet || !workbook) return
    setBusy(true)
    setError(null)
    try {
      const importId = uid('imp')
      const result = buildCrosstabExpenses({
        sheet,
        fileName: workbook.fileName,
        importId,
        labelColumn,
        periods,
        currency: 'PHP',
        excludedRows,
        excludedPeriods,
        natures,
      })
      if (result.rows.length === 0) {
        setError('Nothing to import — every row was excluded or empty.')
        setBusy(false)
        return
      }
      await db.putMany('expenses', result.rows)
      await db.putOne('imports', {
        id: importId,
        dataset: 'expenses',
        fileName: workbook.fileName,
        sheetName: sheet.name,
        importedAt: new Date().toISOString(),
        rowCount: result.rows.length,
        mapping: { layout: 'months across columns', category: sheet.headers[labelColumn] ?? '(first column)' },
        rejected: result.rejected,
      })
      await reload()
      onDone()
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Import failed.')
    } finally {
      setBusy(false)
    }
  }, [sheet, workbook, labelColumn, periods, excludedRows, excludedPeriods, natures, reload, onDone])

  /** Sheets that will be imported as snapshots in multi mode, oldest first. */
  const multiSheets = useMemo(() => {
    if (!multi || !workbook) return []
    return workbook.sheets
      .filter((candidate) => sheetOn[candidate.name] && sheetDates[candidate.name])
      .map((candidate) => ({ sheet: candidate, asOf: sheetDates[candidate.name] }))
      .sort((a, b) => (a.asOf < b.asOf ? -1 : 1))
  }, [multi, workbook, sheetOn, sheetDates])

  const missing = useMemo(() => missingRequired(mapping, dataset), [mapping, dataset])

  const commitMulti = useCallback(async () => {
    if (!workbook || multiSheets.length === 0) return
    setBusy(true)
    setError(null)
    try {
      const build = BUILDERS.holdings
      const excludedSections = sectionOn.map((on, i) => (on ? -1 : i)).filter((i) => i >= 0)
      let imported = 0

      for (const { sheet: target, asOf: sheetAsOf } of multiSheets) {
        setProgress(`${target.name} (${imported + 1} of ${multiSheets.length})`)
        const importId = uid('imp')
        const snapshotId = uid('snp')
        // Mapping is by header name, so a sheet with an extra or reordered
        // column still resolves — only a renamed header would need re-mapping.
        const result = build({
          sheet: target,
          fileName: workbook.fileName,
          mapping,
          importId,
          dayFirst,
          snapshotId,
          sectionLabels,
          excludedSections,
        })
        if (result.rows.length === 0) continue

        await db.putOne('snapshots', {
          id: snapshotId,
          asOf: sheetAsOf,
          label: target.name,
          createdAt: new Date().toISOString(),
          importId,
          usdPhp: Number(usdPhp) || settings.usdPhp,
        })
        await db.putMany('holdings', result.rows)
        await db.putOne('imports', {
          id: importId,
          dataset: 'holdings',
          fileName: workbook.fileName,
          sheetName: target.name,
          importedAt: new Date().toISOString(),
          rowCount: result.rows.length,
          mapping,
          rejected: result.rejected,
          snapshotId,
        })
        imported++
      }

      if (imported === 0) {
        setError('Nothing imported — every row in every sheet was rejected. Check the mapping.')
        setBusy(false)
        setProgress(null)
        return
      }
      await reload()
      onDone()
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Import failed.')
    } finally {
      setBusy(false)
      setProgress(null)
    }
  }, [workbook, multiSheets, mapping, dayFirst, sectionLabels, sectionOn, usdPhp, settings.usdPhp, reload, onDone])

  /** Whole-file reads for the two recognised shapes. */
  const airbnbParse = useMemo<AirbnbParseResult | null>(() => {
    if (known !== 'airbnb' || !sheet || !workbook) return null
    return parseAirbnbPayout(sheet, { importId: 'preview', fileName: workbook.fileName, sheetName: sheet.name })
  }, [known, sheet, workbook])

  const addOnParse = useMemo<AddOnParseResult | null>(() => {
    if (known !== 'addons' || !sheet || !workbook) return null
    return parseAddOnForm(sheet, { importId: 'preview', fileName: workbook.fileName, sheetName: sheet.name })
  }, [known, sheet, workbook])

  /**
   * Commits a recognised file.
   *
   * The Airbnb export writes reservations and resolutions to separate stores so
   * the crew's money never lands in the revenue line. The add-on form writes
   * quotes, then pushes each kept margin onto the reservation it belongs to —
   * that margin is the source of truth, so it replaces whatever the old
   * spreadsheet had recorded for the same stay.
   */
  const commitKnown = useCallback(async () => {
    if (!sheet || !workbook || !known) return
    setBusy(true)
    setError(null)
    try {
      const importId = uid('imp')
      const prov = { importId, fileName: workbook.fileName, sheetName: sheet.name }
      let rowCount = 0
      let rejected: { rowNumber: number; reason: string }[] = []

      if (known === 'airbnb') {
        const result = parseAirbnbPayout(sheet, prov)
        const existing = await db.getAll('bookings')
        const seen = new Map(existing.map((booking) => [`${booking.confirmationCode}|${booking.checkIn}`, booking]))
        // Re-importing an overlapping export must not double the history, so a
        // stay already on file keeps its id — and with it the country, review
        // and notes that only ever came from somewhere else.
        const bookings = result.bookings.map((booking) => {
          const prior = seen.get(`${booking.confirmationCode}|${booking.checkIn}`)
          if (!prior) return booking
          return {
            ...booking,
            id: prior.id,
            guests: prior.guests || booking.guests,
            country: prior.country,
            rating: prior.rating,
            review: prior.review,
            contact: prior.contact,
            notes: prior.notes || booking.notes,
            addOnRevenue: prior.addOnRevenue,
          }
        })
        await db.putMany('bookings', bookings)
        await db.putMany('resolutions', result.resolutions)
        rowCount = bookings.length + result.resolutions.length
        rejected = result.rejected
      } else {
        const result = parseAddOnForm(sheet, prov)
        await db.putMany('addons', result.quotes)
        const bookings = await db.getAll('bookings')
        const matches = matchQuotes(result.quotes, bookings)
        const updates = matches
          .filter((match) => match.bookingId !== null && !match.quote.excluded)
          .map((match) => {
            const booking = bookings.find((row) => row.id === match.bookingId)!
            return {
              ...booking,
              addOnRevenue: match.quote.margin,
              guests: booking.guests || match.quote.guests,
            }
          })
        if (updates.length > 0) await db.putMany('bookings', updates)
        rowCount = result.quotes.length
        rejected = result.rejected
      }

      const batch: ImportBatch = {
        id: importId,
        dataset: known === 'airbnb' ? 'bookings' : 'addons',
        fileName: workbook.fileName,
        sheetName: sheet.name,
        importedAt: new Date().toISOString(),
        rowCount,
        mapping: {},
        rejected,
      }
      await db.putOne('imports', batch)
      await reload()
      onDone()
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Import failed.')
    } finally {
      setBusy(false)
    }
  }, [sheet, workbook, known, reload, onDone])

  const commit = useCallback(async () => {
    if (!sheet || !workbook || !preview) return
    setBusy(true)
    setError(null)
    try {
      const importId = uid('imp')
      const snapshotId = dataset === 'holdings' ? uid('snp') : undefined
      if (dataset === 'addons') return
      const build = BUILDERS[dataset]
      const result = build({
        sheet,
        fileName: workbook.fileName,
        mapping,
        importId,
        dayFirst,
        snapshotId,
        sectionLabels,
        excludedSections: sectionOn.map((on, i) => (on ? -1 : i)).filter((i) => i >= 0),
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
  }, [sheet, workbook, preview, dataset, mapping, dayFirst, asOf, label, usdPhp, settings.usdPhp, sectionLabels, sectionOn, reload, onDone])

  // A sheet that stacks several tables (one per owner or account) needs those
  // blocks named, or every row lands under one undifferentiated account.
  const sectionPanel =
    sheet && sheet.sections.length > 1 ? (
      <div className="rounded-lg border border-line bg-surface-2 p-3">
        <p className="mb-2 text-[12px] leading-relaxed text-ink-2">
          <span className="font-medium text-ink">
            {sheet.sections.length} separate tables in this sheet.
          </span>{' '}
          Name each one and it becomes the account on those rows, so you can see the split. Untick anything you don't
          want imported.
        </p>
        <div className="space-y-1.5">
          {sheet.sections.map((section, index) => {
            const first = sheet.rows[section.startIndex]?.[0]
            const count = section.endIndex - section.startIndex
            return (
              <div key={index} className="flex flex-wrap items-center gap-2">
                <input
                  type="checkbox"
                  checked={sectionOn[index] ?? true}
                  onChange={(event) => {
                    const next = [...sectionOn]
                    next[index] = event.target.checked
                    setSectionOn(next)
                  }}
                  className="accent-accent"
                />
                <input
                  value={sectionLabels[index] ?? section.label}
                  onChange={(event) => {
                    const next = [...sectionLabels]
                    next[index] = event.target.value
                    setSectionLabels(next)
                  }}
                  className="w-36 rounded border border-line bg-surface-3 px-2 py-1 text-[12px] text-ink outline-none focus:border-accent/60"
                />
                <span className="min-w-0 flex-1 truncate text-[11px] text-ink-3">
                  {count} rows, starting “{String(first ?? '')}”
                </span>
              </div>
            )
          })}
        </div>
      </div>
    ) : null

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
                    const year =
                      Number((candidate.name.match(/20\d{2}/) ?? [])[0]) ||
                      (candidate.impliedDate ? Number(candidate.impliedDate.slice(0, 4)) : new Date().getFullYear())
                    const isCross = dataset === 'expenses' && looksLikeCrosstab(candidate, year)
                    setCrosstab(isCross)
                    setExcludedRows([])
                    if (isCross) {
                      setPeriodYear(year)
                      setLabelColumn(guessLabelColumn(candidate, detectPeriodColumns(candidate.headers, year)))
                    }
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

      {step === 'map' && multi ? (
        <div className="rounded-lg border border-accent/30 bg-accent/[0.06] px-3 py-2 text-[12px] leading-relaxed text-ink-2">
          Mapping is read from <span className="text-ink">{sheetName}</span> and applied to every sheet by column{' '}
          <em>name</em>, so sheets with an extra or reordered column still import. A sheet that renamed its headers
          would need its own import.
        </div>
      ) : null}

      {step === 'map' && crosstab && sheet ? (
        <CrosstabStep
          sheet={sheet}
          periods={periods}
          labelColumn={labelColumn}
          setLabelColumn={setLabelColumn}
          periodYear={periodYear}
          setPeriodYear={setPeriodYear}
          labels={crossPreview?.labels ?? []}
          excludedRows={excludedRows}
          setExcludedRows={setExcludedRows}
          natures={natures}
          setNatures={setNatures}
          excludedPeriods={excludedPeriods}
          setExcludedPeriods={setExcludedPeriods}
          coveredMonths={coveredMonths}
          onUseRowLayout={() => {
            setCrosstab(false)
            setMapping(autoMap(sheet.headers, dataset))
          }}
        />
      ) : null}

      {step === 'map' && !crosstab && sheet ? (
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

      {step === 'review' && crosstab && crossPreview && sheet ? (
        <div className="space-y-3">
          <div className="grid gap-2 sm:grid-cols-3">
            <SummaryTile label="Records" value={String(crossPreview.rows.length)} tone="pos" />
            <SummaryTile
              label="Categories"
              value={String(crossPreview.labels.length - excludedRows.length)}
              tone="neutral"
            />
            <SummaryTile label="Periods" value={String(periods.length)} tone="neutral" />
          </div>
          <p className="text-[12px] leading-relaxed text-ink-2">
            Each populated cell becomes one expense, dated to the end of its column's month and tagged with its row
            label. Both the row and the column are kept, so any figure traces back to the exact cell.
          </p>
          <CrossPreviewTable rows={crossPreview.rows.slice(0, 10)} />
        </div>
      ) : null}

      {step === 'review' && multi && workbook ? (
        <div className="space-y-3">
          <div className="rounded-lg border border-accent/30 bg-accent/[0.06] px-3 py-2.5 text-[12px] leading-relaxed text-ink-2">
            <span className="font-semibold text-accent">
              {multiSheets.length} dated sheets found.
            </span>{' '}
            Each becomes its own snapshot, so importing this one file gives you a full history rather than a single
            point — which is what makes returns, drawdown and drift-over-time computable. Dates come from the sheet
            names; correct any that are wrong.
          </div>

          <div className="max-h-72 space-y-1 overflow-y-auto rounded-lg border border-line p-2">
            {workbook.sheets
              .filter((candidate) => candidate.rows.length > 0)
              .map((candidate) => {
                const on = sheetOn[candidate.name] ?? false
                const built = BUILDERS.holdings({
                  sheet: candidate,
                  fileName: workbook.fileName,
                  mapping,
                  importId: 'preview',
                  dayFirst,
                  snapshotId: 'preview',
                  sectionLabels,
                  excludedSections: sectionOn.map((v, i) => (v ? -1 : i)).filter((i) => i >= 0),
                })
                return (
                  <div
                    key={candidate.name}
                    className={cx(
                      'flex flex-wrap items-center gap-2 rounded-md px-2 py-1.5',
                      on ? 'bg-surface-2' : 'opacity-45',
                    )}
                  >
                    <input
                      type="checkbox"
                      checked={on}
                      onChange={(event) => setSheetOn({ ...sheetOn, [candidate.name]: event.target.checked })}
                      className="accent-accent"
                    />
                    <span className="min-w-0 flex-1 truncate text-[12px] text-ink">{candidate.name}</span>
                    <span className="num text-[11px] text-ink-3">
                      {built.rows.length} rows
                      {built.rejected.length > 0 ? (
                        <span className="ml-1 text-warn">+{built.rejected.length} skipped</span>
                      ) : null}
                    </span>
                    <input
                      type="date"
                      value={sheetDates[candidate.name] ?? ''}
                      onChange={(event) => setSheetDates({ ...sheetDates, [candidate.name]: event.target.value })}
                      className="num rounded border border-line bg-surface-3 px-1.5 py-0.5 text-[11px] text-ink outline-none focus:border-accent/60"
                    />
                  </div>
                )
              })}
          </div>

          {sectionPanel}

          <div className="grid gap-3 rounded-lg border border-line bg-surface-2 p-3 sm:grid-cols-2">
            <Field
              label="USD → PHP rate"
              hint="Applied to every snapshot in this import. Edit an individual snapshot later if your sheet used different rates."
            >
              <TextInput value={usdPhp} onChange={setUsdPhp} type="number" />
            </Field>
            <div className="flex items-end">
              <button
                type="button"
                onClick={() => {
                  setMulti(false)
                  setStep('sheet')
                }}
                className="text-[12px] text-accent hover:underline"
              >
                Import just one sheet instead
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {step === 'review' && known === 'airbnb' && airbnbParse ? (
        <div className="space-y-3">
          <div className="rounded-lg border border-info/25 bg-info/[0.04] p-3">
            <h3 className="text-[12.5px] font-semibold text-ink">Recognised as an Airbnb transaction export</h3>
            <p className="mt-1 text-[11.5px] leading-relaxed text-ink-2">
              Four kinds of row, three meanings. Reservations are room revenue. Resolution payouts are the guest paying
              for catering and boats through the platform — collected, then passed almost entirely to the island crew,
              so they are kept out of revenue and used to reconcile the bank instead. Payout rows are transfers of money
              already counted, so they are ignored.
            </p>
          </div>
          <div className="grid gap-2 sm:grid-cols-4">
            <SummaryTile label="Reservations" value={String(airbnbParse.bookings.length)} tone="pos" />
            <SummaryTile label="Resolutions" value={String(airbnbParse.resolutions.length)} tone="neutral" />
            <SummaryTile label="Transfers ignored" value={String(airbnbParse.payoutCount)} tone="neutral" />
            <SummaryTile
              label="Rows skipped"
              value={String(airbnbParse.rejected.length)}
              tone={airbnbParse.rejected.length > 0 ? 'warn' : 'neutral'}
            />
          </div>
          <ReconcilePanel result={airbnbParse} />
        </div>
      ) : null}

      {step === 'review' && known === 'addons' && addOnParse ? (
        <div className="space-y-3">
          <div className="rounded-lg border border-info/25 bg-info/[0.04] p-3">
            <h3 className="text-[12.5px] font-semibold text-ink">Recognised as the guest add-on form</h3>
            <p className="mt-1 text-[11.5px] leading-relaxed text-ink-2">
              What the business keeps is the guest total less the island crew's cost — not the whole amount the guest
              pays. Each kept submission writes that margin onto the matching stay, replacing whatever an older sheet
              had recorded for it. Test and setup rows are flagged out with a reason and can be put back later.
            </p>
          </div>
          <div className="grid gap-2 sm:grid-cols-3">
            <SummaryTile
              label="Real submissions"
              value={String(addOnParse.quotes.length - addOnParse.excludedCount)}
              tone="pos"
            />
            <SummaryTile label="Flagged as tests" value={String(addOnParse.excludedCount)} tone="neutral" />
            <SummaryTile
              label="Margin recorded"
              value={new Intl.NumberFormat('en-PH', { style: 'currency', currency: 'PHP', maximumFractionDigits: 0 }).format(
                addOnParse.quotes.filter((q) => !q.excluded).reduce((sum, q) => sum + q.margin, 0),
              )}
              tone="neutral"
            />
          </div>
          <div className="overflow-x-auto rounded-lg border border-line">
            <table className="w-full text-[11.5px]">
              <thead className="bg-surface-2 text-ink-2">
                <tr>
                  {['Guest', 'Arrives', 'Guest pays', 'Crew cost', 'You keep', 'Status'].map((header) => (
                    <th key={header} className="px-2.5 py-1.5 text-left font-medium">
                      {header}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {addOnParse.quotes.map((quote) => (
                  <tr key={quote.id} className={cx('border-t border-line', quote.excluded && 'opacity-45')}>
                    <td className="px-2.5 py-1.5 text-ink">{quote.guestName || '—'}</td>
                    <td className="num px-2.5 py-1.5 text-ink-2">{quote.checkIn}</td>
                    <td className="num px-2.5 py-1.5 text-ink-2">{quote.guestTotal.toLocaleString()}</td>
                    <td className="num px-2.5 py-1.5 text-ink-2">{quote.allanCost.toLocaleString()}</td>
                    <td className="num px-2.5 py-1.5 font-medium text-ink">{quote.margin.toLocaleString()}</td>
                    <td className="px-2.5 py-1.5 text-ink-3">{quote.excludedReason || 'counted'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : null}

      {step === 'review' && !known && !multi && preview && sheet ? (
        <div className="space-y-3">
          {sectionPanel}
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
                {preview.rejected.slice(0, 40).map((rejection: { rowNumber: number; reason: string }) => (
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
            if (known) {
              setKnown(null)
              setStep('file')
            }
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
            <Button
              variant="primary"
              disabled={crosstab ? periods.length === 0 : missing.length > 0}
              onClick={() => setStep('review')}
            >
              {crosstab
                ? `Preview ${crossPreview?.rows.length ?? 0} records`
                : multi
                  ? `Preview ${multiSheets.length} snapshots`
                  : `Preview ${preview?.rows.length ?? 0} rows`}
            </Button>
          ) : null}
          {step === 'review' && crosstab ? (
            <Button
              variant="primary"
              disabled={busy || (crossPreview?.rows.length ?? 0) === 0}
              onClick={() => void commitCrosstab()}
            >
              {busy ? 'Importing…' : `Import ${crossPreview?.rows.length ?? 0} records`}
            </Button>
          ) : null}
          {step === 'review' && multi ? (
            <Button
              variant="primary"
              disabled={busy || multiSheets.length === 0}
              onClick={() => void commitMulti()}
            >
              {busy ? (progress ?? 'Importing…') : `Import ${multiSheets.length} snapshots`}
            </Button>
          ) : null}
          {step === 'review' && known === 'airbnb' && airbnbParse ? (
            <Button variant="primary" disabled={busy} onClick={() => void commitKnown()}>
              {busy
                ? 'Importing…'
                : `Import ${airbnbParse.bookings.length} stays and ${airbnbParse.resolutions.length} resolutions`}
            </Button>
          ) : null}
          {step === 'review' && known === 'addons' && addOnParse ? (
            <Button variant="primary" disabled={busy} onClick={() => void commitKnown()}>
              {busy
                ? 'Importing…'
                : `Import ${addOnParse.quotes.length - addOnParse.excludedCount} submission${
                    addOnParse.quotes.length - addOnParse.excludedCount === 1 ? '' : 's'
                  }`}
            </Button>
          ) : null}
          {step === 'review' && !known && !multi && !crosstab ? (
            <Button variant="primary" disabled={busy || preview?.rows.length === 0} onClick={() => void commit()}>
              {busy ? 'Importing…' : `Import ${preview?.rows.length ?? 0} rows`}
            </Button>
          ) : null}
        </div>
      </div>
    </Card>
  )
}

/**
 * The check that the export was read correctly: every peso Airbnb transferred
 * should be a reservation or a resolution. A pending export has no transfers
 * yet, which is not a mismatch — so it says so rather than showing a scary gap.
 */
function ReconcilePanel({ result }: { result: AirbnbParseResult }) {
  const sums = reconcile(result)
  const peso = (value: number) =>
    new Intl.NumberFormat('en-PH', { style: 'currency', currency: 'PHP', maximumFractionDigits: 0 }).format(value)
  const pending = result.payoutCount === 0
  const clean = Math.abs(sums.difference) < 1

  return (
    <div className="rounded-lg border border-line bg-surface-2 p-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h4 className="text-[12px] font-semibold text-ink">Does it tie out?</h4>
        <Pill tone={pending ? 'info' : clean ? 'pos' : 'warn'}>
          {pending ? 'nothing paid out yet' : clean ? 'balances exactly' : `off by ${peso(sums.difference)}`}
        </Pill>
      </div>
      <dl className="mt-2 grid grid-cols-2 gap-x-4 gap-y-1 text-[11.5px] sm:grid-cols-4">
        <Line label="Reservations" value={peso(sums.reservations)} />
        <Line label="Resolutions" value={peso(sums.resolutions)} />
        <Line label="Should total" value={peso(sums.expected)} />
        <Line label="Actually transferred" value={pending ? '—' : peso(sums.paidOut)} />
      </dl>
      <p className="mt-2 text-[11px] leading-relaxed text-ink-3">
        {pending
          ? 'This is a pending export — the stays have not been paid out yet, so there is nothing to reconcile against.'
          : clean
            ? 'Every peso transferred to the bank is accounted for by a reservation or a resolution, which is the check that these rows were read the right way round.'
            : 'The transfers do not match the rows behind them. That usually means the export covers a different date range than the payouts in it.'}
      </p>
    </div>
  )
}

function Line({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-ink-3">{label}</dt>
      <dd className="num text-ink">{value}</dd>
    </div>
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

function CrosstabStep({
  sheet,
  periods,
  labelColumn,
  setLabelColumn,
  periodYear,
  setPeriodYear,
  labels,
  excludedRows,
  setExcludedRows,
  natures,
  setNatures,
  excludedPeriods,
  setExcludedPeriods,
  coveredMonths,
  onUseRowLayout,
}: {
  sheet: SheetPreview
  periods: PeriodColumn[]
  labelColumn: number
  setLabelColumn: (index: number) => void
  periodYear: number
  setPeriodYear: (year: number) => void
  labels: {
    rowIndex: number
    rowNumber: number
    label: string
    total: number
    cells: number
    isSummary: boolean
    nature: 'fixed' | 'variable'
  }[]
  excludedRows: number[]
  setExcludedRows: (rows: number[]) => void
  natures: Record<string, 'fixed' | 'variable'>
  setNatures: (next: Record<string, 'fixed' | 'variable'>) => void
  excludedPeriods: number[]
  setExcludedPeriods: (next: number[]) => void
  coveredMonths: Set<string>
  onUseRowLayout: () => void
}) {
  const excluded = new Set(excludedRows)
  const toggle = (rowIndex: number) =>
    setExcludedRows(excluded.has(rowIndex) ? excludedRows.filter((i) => i !== rowIndex) : [...excludedRows, rowIndex])

  const includedTotal = labels
    .filter((row) => !excluded.has(row.rowIndex))
    .reduce((sum, row) => sum + row.total, 0)
  const clashing = periods.filter((period) => coveredMonths.has(period.date.slice(0, 7)))

  return (
    <div className="space-y-3">
      <div className="rounded-lg border border-accent/30 bg-accent/[0.06] px-3 py-2.5 text-[12px] leading-relaxed text-ink-2">
        <span className="font-semibold text-accent">This sheet reads as a matrix, not a list.</span> Periods run across
        the top and categories down the side, so one row becomes one expense per month rather than a single record.{' '}
        <button type="button" onClick={onUseRowLayout} className="text-accent underline hover:no-underline">
          Treat it as one row per expense instead
        </button>
        .
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="Category column" hint="The column holding the name of each cost line.">
          <Select
            value={String(labelColumn)}
            onChange={(value) => setLabelColumn(Number(value))}
            options={sheet.headers.map((header, index) => ({ value: String(index), label: header }))}
          />
        </Field>
        <Field
          label="Year for month names"
          hint="Column headers like “January” carry no year. Dates are set to month end."
        >
          <input
            type="number"
            value={periodYear}
            onChange={(event) => setPeriodYear(Number(event.target.value) || periodYear)}
            className={cx(inputClass, 'num')}
          />
        </Field>
      </div>

      <div>
        <p className="mb-1.5 text-[11px] uppercase tracking-wide text-ink-3">
          {periods.length - excludedPeriods.length} of {periods.length} period column
          {periods.length === 1 ? '' : 's'} will be imported
        </p>
        {clashing.length > 0 ? (
          <div className="mb-2 rounded-lg border border-warn/30 bg-warn/5 px-3 py-2 text-[11.5px] leading-relaxed text-warn">
            {clashing.length} month{clashing.length === 1 ? ' is' : 's are'} already covered by an earlier expense
            import — a fiscal-year sheet overlaps the calendar years either side of it. Those columns are unticked, so
            the shared months aren't counted twice. Tick one back only if you meant to replace what's there.
          </div>
        ) : null}
        <div className="flex flex-wrap gap-1">
          {periods.map((period) => {
            const on = !excludedPeriods.includes(period.index)
            const clash = coveredMonths.has(period.date.slice(0, 7))
            return (
              <button
                key={period.index}
                type="button"
                onClick={() =>
                  setExcludedPeriods(
                    on ? [...excludedPeriods, period.index] : excludedPeriods.filter((i) => i !== period.index),
                  )
                }
                title={`Column “${period.header}” → ${period.date}${clash ? ' · already imported' : ''}`}
                className={cx(
                  'rounded border px-1.5 py-0.5 text-[11px] transition-colors',
                  on
                    ? 'border-line bg-surface-2 text-ink-2 hover:text-ink'
                    : 'border-line-soft bg-transparent text-ink-3 line-through',
                  clash && on && 'border-warn/40 text-warn',
                )}
              >
                <span className="num">{period.date.slice(0, 7)}</span>
              </button>
            )
          })}
          {periods.length === 0 ? (
            <span className="text-[12px] text-warn">
              No date columns recognised. Check the year, or use the row-per-expense layout.
            </span>
          ) : null}
        </div>
      </div>

      <div>
        <div className="mb-1.5 flex flex-wrap items-center justify-between gap-2">
          <p className="text-[11px] uppercase tracking-wide text-ink-3">Rows to import</p>
          <span className="num text-[11px] text-ink-2">
            {includedTotal.toLocaleString('en-US', { maximumFractionDigits: 0 })} total across included rows
          </span>
        </div>
        <p className="mb-2 text-[11px] leading-relaxed text-ink-3">
          Totals and margins restate the rows above them; night counts and occupancy rates aren't money at all. Both
          are unticked by default so the sheet isn't counted twice and a night count doesn't land in the accounts as
          pesos. Tick anything that is a real cost line, and click the fixed/variable tag to correct it — that split
          drives break-even and cost per available night.
        </p>
        <div className="max-h-64 space-y-0.5 overflow-y-auto rounded-lg border border-line p-2">
          {labels.map((row) => {
            const on = !excluded.has(row.rowIndex)
            return (
              <label
                key={row.rowIndex}
                className={cx(
                  'flex cursor-pointer items-center gap-2 rounded px-1.5 py-1 hover:bg-surface-2',
                  !on && 'opacity-45',
                )}
              >
                <input type="checkbox" checked={on} onChange={() => toggle(row.rowIndex)} className="accent-accent" />
                <span className="min-w-0 flex-1 truncate text-[12px] text-ink">{row.label}</span>
                <span className="num shrink-0 text-[11px] text-ink-3">
                  {row.cells} × · {row.total.toLocaleString('en-US', { maximumFractionDigits: 0 })}
                </span>
                {on ? (
                  <button
                    type="button"
                    title="Fixed costs run whether or not anyone books; variable costs scale with stays"
                    onClick={(event) => {
                      event.preventDefault()
                      setNatures({ ...natures, [row.label]: row.nature === 'fixed' ? 'variable' : 'fixed' })
                    }}
                    className={cx(
                      'shrink-0 rounded border px-1.5 py-0.5 text-[10px] font-medium',
                      row.nature === 'fixed'
                        ? 'border-line bg-surface-3 text-ink-2'
                        : 'border-accent/40 bg-accent/15 text-accent',
                    )}
                  >
                    {row.nature}
                  </button>
                ) : null}
              </label>
            )
          })}
        </div>
      </div>
    </div>
  )
}

function CrossPreviewTable({ rows }: { rows: Expense[] }) {
  if (rows.length === 0) return null
  return (
    <div>
      <p className="mb-1.5 text-[11px] uppercase tracking-wide text-ink-3">First records, as they'll be stored</p>
      <div className="overflow-x-auto rounded-lg border border-line">
        <table className="w-full min-w-max text-left text-[12px]">
          <thead>
            <tr className="border-b border-line bg-surface-2 text-[10px] uppercase tracking-wide text-ink-3">
              <th className="px-2 py-1.5 font-medium">Source cell</th>
              <th className="px-2 py-1.5 font-medium">Date</th>
              <th className="px-2 py-1.5 font-medium">Category</th>
              <th className="px-2 py-1.5 font-medium">Type</th>
              <th className="px-2 py-1.5 text-right font-medium">Amount</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.id} className="border-b border-line-soft last:border-0">
                <td className="num px-2 py-1.5 text-ink-3">
                  #{row.prov.rowNumber} · {row.prov.column}
                </td>
                <td className="num px-2 py-1.5 text-ink-2">{row.date}</td>
                <td className="px-2 py-1.5 text-ink">{row.category}</td>
                <td className="px-2 py-1.5 text-ink-2">{row.nature}</td>
                <td className="num px-2 py-1.5 text-right text-ink">
                  {row.amount.toLocaleString('en-US', { maximumFractionDigits: 0 })}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
