import { useCallback, useEffect, useMemo, useState } from 'react'
import { CartesianGrid, Line, LineChart, Tooltip, XAxis, YAxis } from 'recharts'
import { useLedger } from '@/state/store'
import { perGuestRate, readMarket, snapshotOf, SEED_LISTINGS, type ListingSnapshot } from '@/domain/airbnb/competitors'
import { addOnPerGuest, groupByOperator, priceLadder, type Operator } from '@/domain/airbnb/operators'
import { buildAddOnStays } from '@/domain/airbnb/addons'
import { parseCompetitorReport } from '@/lib/competitor-report'
import { aggregate, trailing } from '@/domain/airbnb/metrics'
import { findLevers } from '@/domain/airbnb/growth'
import { buildBrief, type MarketBrief } from '@/domain/airbnb/marketbrief'
import { describeError, explainError, getSample } from '@/lib/claude'
import type { MonthMetrics } from '@/domain/airbnb/metrics'
import { Button, Card, Field, Pill, SectionHeader, Tabs, TextInput, cx } from '@/components/ui/primitives'
import { Stat, StatGrid } from '@/components/ui/Stat'
import { ChartFrame, tooltipProps } from '@/components/charts/Chart'
import { AXIS, GRID, SERIES, TOOLTIP_STYLE } from '@/components/charts/theme'
import { money, num, pct, shortDate } from '@/lib/format'
import { uid } from '@/lib/id'
import { today } from '@/lib/dates'
import type { AncillaryBenchmark, CompetitorListing, CompetitorObservation, MarketReport } from '@/types'

/**
 * What everyone else is charging.
 *
 * Airbnb blocks machine access, so nothing here is scraped — each figure is
 * something someone opened the listing and recorded on a day. That is slower
 * than a scraper and better than a guess, and it produces the one thing a
 * scrape of a single moment never could: a price history on the same dates,
 * which is what actually shows whether the market is moving.
 */
type View = 'brief' | 'operators' | 'rates' | 'addons' | 'watchlist'

export function CompetitorsPanel({ series }: { series: MonthMetrics[] }) {
  const {
    competitors,
    observations,
    reports,
    benchmarks,
    saveCompetitor,
    removeCompetitor,
    addObservation,
    importReport,
    removeReport,
    bookings,
    addons,
    resolutions,
  } = useLedger()
  const [observing, setObserving] = useState<string | null>(null)
  const [addingListing, setAddingListing] = useState(false)
  const [view, setView] = useState<View>('brief')
  const asOf = today()

  const latestReport = useMemo(
    () => [...reports].sort((a, b) => b.reportedOn.localeCompare(a.reportedOn))[0] ?? null,
    [reports],
  )

  // The listings the owner named are seeded once so the tracker is never an
  // empty page — but they carry no numbers, because nobody has looked yet. A
  // report supersedes them entirely, so this only ever runs before the first one.
  useEffect(() => {
    if (competitors.length > 0) return
    for (const listing of SEED_LISTINGS) {
      void saveCompetitor({ ...listing, id: uid('cmp'), addedAt: asOf })
    }
  }, [competitors.length, saveCompetitor, asOf])

  const snapshots = useMemo(
    () =>
      competitors
        .filter((listing) => listing.active)
        .map((listing) => snapshotOf(listing, observations, asOf))
        .sort((a, b) => (b.latest?.nightlyRate ?? -1) - (a.latest?.nightlyRate ?? -1)),
    [competitors, observations, asOf],
  )

  const mine = useMemo(() => (series.length > 0 ? aggregate(trailing(series, 12)) : null), [series])
  // Your own listing's advertised rate when a report carries it, since that is
  // what rivals are actually quoted against; the twelve-month average otherwise.
  const observedMine = snapshots.find((snapshot) => snapshot.listing.isMine)?.latest?.nightlyRate ?? 0
  const myRate = observedMine > 0 ? observedMine : (mine?.adr ?? 0)
  const market = useMemo(() => readMarket(snapshots, myRate, []), [snapshots, myRate])

  const operators = useMemo(() => groupByOperator(snapshots, myRate), [snapshots, myRate])
  const ladder = useMemo(() => priceLadder(snapshots), [snapshots])
  const myAddOns = useMemo(
    () => addOnPerGuest(buildAddOnStays({ bookings, quotes: addons, resolutions })),
    [bookings, addons, resolutions],
  )
  const latestBenchmarks = useMemo(
    () => (latestReport ? benchmarks.filter((row) => row.reportId === latestReport.id) : []),
    [benchmarks, latestReport],
  )

  const priceHistory = useMemo(() => {
    const byDate = new Map<string, Record<string, number>>()
    for (const observation of observations) {
      const listing = competitors.find((row) => row.id === observation.listingId)
      if (!listing) continue
      const row = byDate.get(observation.observedOn) ?? { }
      row[listing.name || listing.roomId] = observation.nightlyRate
      byDate.set(observation.observedOn, row)
    }
    return [...byDate.entries()]
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([observedOn, rates]) => ({ observedOn, ...rates }))
  }, [observations, competitors])

  const names = useMemo(
    () => [...new Set(observations.map((o) => competitors.find((c) => c.id === o.listingId)?.name || ''))].filter(Boolean),
    [observations, competitors],
  )

  return (
    <div className="space-y-4">
      <ReportBar
        report={latestReport}
        reports={reports}
        known={competitors}
        onImport={importReport}
        onRemove={removeReport}
      />

      <div className="no-print overflow-x-auto">
        <Tabs
          value={view}
          onChange={setView}
          options={[
            { value: 'brief', label: 'The brief' },
            {
              value: 'operators',
              label: `Who you compete with (${operators.filter((o) => !o.isMine && o.listings.length > 1).length || operators.filter((o) => !o.isMine).length})`,
            },
            { value: 'rates', label: 'Rates' },
            { value: 'addons', label: 'Add-on prices' },
            { value: 'watchlist', label: `Watchlist (${snapshots.length})` },
          ]}
        />
      </div>

      {view === 'brief' ? (
        <>
          <ReportBrief report={latestReport} ladder={ladder} myRate={myRate} />
          <MarketRead series={series} />
          <GrowthLevers bookings={bookings} addons={addons} />
        </>
      ) : null}

      {view === 'operators' ? <Operators operators={operators} myRate={myRate} /> : null}

      {view === 'rates' ? (
        <>
          <StatGrid>
            <Stat
              label="Your rate"
              value={myRate > 0 ? money(myRate, 'PHP', true) : '—'}
              sub={observedMine > 0 ? 'As the latest report saw it advertised' : 'Average over the last twelve months'}
            />
            <Stat
              label="Market median"
              value={market.medianRate !== null ? money(market.medianRate, 'PHP', true) : 'Not observed yet'}
              sub={
                market.lowRate !== null
                  ? `${money(market.lowRate, 'PHP', true)} – ${money(market.highRate ?? 0, 'PHP', true)}`
                  : `${market.tracked} listing${market.tracked === 1 ? '' : 's'} tracked, none priced`
              }
              hint="A median across a ₱2,550 bungalow and a ₱58,000 houseboat describes a market nobody is in. The ladder below is the honest read."
            />
            <Stat
              label="Where you sit"
              value={market.yourPercentile !== null ? `${pct(market.yourPercentile, 0)} dearer` : '—'}
              sub={
                market.yourPercentile !== null
                  ? `than the ${market.observed} listing${market.observed === 1 ? '' : 's'} priced`
                  : 'Record a rate on any listing to see this'
              }
            />
            <Stat
              label="Moved last report"
              value={num(market.movers.length, 0)}
              tone={market.movers.length > 0 ? 'warn' : 'neutral'}
              sub="Rate changes since the previous look"
            />
          </StatGrid>

          <PriceLadderCard ladder={ladder} />

          {market.movers.length > 0 ? (
            <Card>
              <SectionHeader
                title="Moved since last look"
                subtitle="A rate change is the earliest signal you get that the market is repricing."
              />
              <div className="space-y-1.5">
                {market.movers.map((snapshot) => (
                  <div key={snapshot.listing.id} className="flex flex-wrap items-baseline gap-2 text-[12px]">
                    <span className="font-medium text-ink">{snapshot.listing.name || snapshot.listing.roomId}</span>
                    <span className={cx('num', (snapshot.rateChange ?? 0) > 0 ? 'text-pos' : 'text-neg')}>
                      {(snapshot.rateChange ?? 0) > 0 ? '+' : ''}
                      {money(snapshot.rateChange ?? 0, 'PHP', true)}
                    </span>
                    <span className="text-ink-3">
                      {money(snapshot.previous?.nightlyRate ?? 0, 'PHP', true)} →{' '}
                      {money(snapshot.latest?.nightlyRate ?? 0, 'PHP', true)} between{' '}
                      {shortDate(snapshot.previous?.observedOn ?? '')} and {shortDate(snapshot.latest?.observedOn ?? '')}
                    </span>
                  </div>
                ))}
              </div>
            </Card>
          ) : null}

          {priceHistory.length > 1 ? (
            <Card>
              <SectionHeader
                title="Rates over time"
                subtitle="One point per report, on the same sampled dates each time — which is what makes the lines comparable at all."
              />
              <ChartFrame title="Nightly rate as observed" height={240}>
                <LineChart data={priceHistory} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                  <CartesianGrid {...GRID} />
                  <XAxis dataKey="observedOn" {...AXIS} tickFormatter={shortDate} minTickGap={20} />
                  <YAxis {...AXIS} width={54} tickFormatter={(v: number) => money(v, 'PHP', true)} />
                  <Tooltip
                    {...TOOLTIP_STYLE}
                    {...tooltipProps((value) => [money(Number(value), 'PHP'), ''], (label) => shortDate(String(label)))}
                  />
                  {names.map((name, index) => (
                    <Line
                      key={name}
                      type="monotone"
                      dataKey={name}
                      stroke={SERIES[index % SERIES.length]}
                      strokeWidth={2}
                      dot={{ r: 2 }}
                      connectNulls
                    />
                  ))}
                </LineChart>
              </ChartFrame>
            </Card>
          ) : null}
        </>
      ) : null}

      {view === 'addons' ? <AncillaryPrices benchmarks={latestBenchmarks} mine={myAddOns} report={latestReport} /> : null}

      {view === 'watchlist' ? (
        <>
          <div>
            <SectionHeader
              title="Watchlist"
              subtitle={
                latestReport
                  ? `Every listing the reports have named, with the rate each one carried. Add a rate by hand any time you look between reports.`
                  : 'Seven starting points are already in — the listings you named, plus Paolyn as a host to watch for new units. Load a report or add a rate and the comparison above comes alive.'
              }
              right={
                <Button variant="primary" size="sm" onClick={() => setAddingListing(true)}>
                  + Track a listing
                </Button>
              }
            />
            {addingListing ? (
              <ListingForm onDone={() => setAddingListing(false)} onSave={(listing) => saveCompetitor(listing)} />
            ) : null}

            <div className="mt-3 space-y-2">
              {snapshots.map((snapshot) => (
                <ListingRow
                  key={snapshot.listing.id}
                  snapshot={snapshot}
                  myRate={myRate}
                  onObserve={() => setObserving(snapshot.listing.id)}
                  onRemove={() => void removeCompetitor(snapshot.listing.id)}
                  onSaveListing={saveCompetitor}
                />
              ))}
            </div>
          </div>

          {market.featureGaps.length > 0 ? (
            <Card>
              <SectionHeader
                title="What they offer that you have not recorded"
                subtitle="Only counts amenities two or more rivals list. It is a prompt to check, not a verdict — you may already have these."
              />
              <div className="flex flex-wrap gap-1.5">
                {market.featureGaps.map((gap) => (
                  <Pill key={gap.amenity} tone="info">
                    {gap.amenity} · {gap.rivals}
                  </Pill>
                ))}
              </div>
            </Card>
          ) : null}
        </>
      ) : null}

      {observing ? (
        <ObservationForm
          listing={competitors.find((row) => row.id === observing)!}
          onDone={() => setObserving(null)}
          onSave={addObservation}
        />
      ) : null}
    </div>
  )
}


/**
 * Loading the fortnight's report.
 *
 * The report is a written document, so it is dropped in whole rather than
 * mapped column by column: it carries a rate table but also the reasoning
 * around it, and the reasoning is half of what makes it worth reading. What
 * lands in the database is both — rates against listings that keep their
 * identity between reports, and the report's own words kept intact.
 */
function ReportBar({
  report,
  reports,
  known,
  onImport,
  onRemove,
}: {
  report: MarketReport | null
  reports: MarketReport[]
  known: CompetitorListing[]
  onImport: (parsed: {
    report: MarketReport
    listings: CompetitorListing[]
    observations: CompetitorObservation[]
    benchmarks: AncillaryBenchmark[]
  }) => Promise<void>
  onRemove: (id: string) => Promise<void>
}) {
  const [busy, setBusy] = useState(false)
  const [result, setResult] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const load = async (file: File) => {
    setBusy(true)
    setError(null)
    setResult(null)
    try {
      const html = await file.text()
      const parsed = parseCompetitorReport(html, file.name, known)
      if (parsed.observations.length === 0) {
        setError(
          'No rate table found in that file. The importer looks for a "Pricing" section with a table of listings — if the report is laid out differently, tell me and I will teach it the new shape.',
        )
        return
      }
      await onImport(parsed)
      const fresh = parsed.listings.filter((listing) => !known.some((row) => row.id === listing.id)).length
      setResult(
        `${parsed.observations.length} rates, ${parsed.listings.length} listings (${fresh} new to the watchlist)` +
          `${parsed.benchmarks.length > 0 ? `, ${parsed.benchmarks.length} add-on prices` : ''}` +
          `${parsed.skipped.length > 0 ? ` · ${parsed.skipped.length} row(s) skipped` : ''}`,
      )
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'That file could not be read.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <Card>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="text-[13px] font-semibold text-ink">
            {report ? report.title : 'No competitor report loaded yet'}
          </h3>
          <p className="mt-1 max-w-2xl text-[11.5px] leading-relaxed text-ink-2">
            {report ? (
              <>
                Rates captured {shortDate(report.reportedOn)}
                {report.quotedFor
                  ? ` for a ${report.nights}-night stay from ${shortDate(report.quotedFor)}, ${report.guests} guests`
                  : ''}
                . {reports.length} report{reports.length === 1 ? '' : 's'} on file — each one adds a point to every rate
                line, which is what turns a price into a trend.
              </>
            ) : (
              <>
                Drop this fortnight's report in and the whole tab fills: rates against each listing, who hosts what, what
                the market charges for add-ons, and the report's own conclusions. Load the next one and the rates become
                a history rather than a snapshot.
              </>
            )}
          </p>
          {result ? <p className="mt-2 text-[11.5px] text-pos">Loaded — {result}.</p> : null}
          {error ? <p className="mt-2 text-[11.5px] text-warn">{error}</p> : null}
        </div>
        <div className="flex shrink-0 items-center gap-2">
          {report ? (
            <Button variant="ghost" size="sm" onClick={() => void onRemove(report.id)}>
              Undo this one
            </Button>
          ) : null}
          <label
            className={cx(
              'cursor-pointer rounded-lg border border-accent/40 bg-accent/10 px-3 py-1.5 text-[12px] font-medium text-accent',
              busy && 'pointer-events-none opacity-60',
            )}
          >
            {busy ? 'Reading…' : report ? 'Load a newer report' : 'Load a report'}
            <input
              type="file"
              accept=".html,.htm"
              className="hidden"
              onChange={(event) => {
                const file = event.target.files?.[0]
                event.target.value = ''
                if (file) void load(file)
              }}
            />
          </label>
        </div>
      </div>
    </Card>
  )
}

/** The report's own argument, kept in its own words. */
function ReportBrief({
  report,
  ladder,
  myRate,
}: {
  report: MarketReport | null
  ladder: ReturnType<typeof priceLadder>
  myRate: number
}) {
  if (!report) return null

  return (
    <div className="space-y-4">
      {report.bottomLine ? (
        <Card className="border-accent/25 bg-accent/[0.04]">
          <div className="flex gap-3">
            <span className="mt-0.5 text-[14px] text-accent">◉</span>
            <div>
              <h3 className="text-[13px] font-semibold text-ink">Bottom line, {shortDate(report.reportedOn)}</h3>
              <p className="mt-1 max-w-3xl text-[12px] leading-relaxed text-ink-2">{report.bottomLine}</p>
            </div>
          </div>
        </Card>
      ) : null}

      <StatGrid>
        <Stat
          label="Your rate"
          value={myRate > 0 ? money(myRate, 'PHP') : '—'}
          sub="As the report saw it advertised"
        />
        <Stat
          label="The lane you sit in"
          value={
            ladder.belowYou !== null && ladder.aboveYou !== null
              ? `${money(ladder.belowYou, 'PHP', true)} – ${money(ladder.aboveYou, 'PHP', true)}`
              : '—'
          }
          sub={
            ladder.gapBelow !== null && ladder.gapAbove !== null
              ? `${ladder.gapBelow.toFixed(1)}× the rung below, ${ladder.gapAbove.toFixed(1)}× under the one above`
              : 'Empty until rates are observed'
          }
          hint="The gap either side is the point: you are not competing with the homes below or the boats above, which is why a market median says nothing useful about your price."
        />
        <Stat
          label="Homes in the area"
          value={report.supplyCount !== null ? num(report.supplyCount, 0) : '—'}
          tone={
            report.supplyCount !== null && report.supplyPrevious !== null && report.supplyCount > report.supplyPrevious
              ? 'warn'
              : 'neutral'
          }
          sub={
            report.supplyPrevious !== null
              ? `was ${num(report.supplyPrevious, 0)} at the last report`
              : 'Not counted in this report'
          }
        />
      </StatGrid>

      {report.changes.length > 0 ? (
        <Card>
          <SectionHeader
            title="What changed"
            subtitle={`Since the report before this one. The report's own words — nothing here is inferred.`}
          />
          <ul className="mt-1 space-y-2">
            {report.changes.map((line) => (
              <li key={line} className="flex gap-2 text-[12px] leading-relaxed text-ink-2">
                <span className="mt-[6px] h-1 w-1 shrink-0 rounded-full bg-accent" />
                <span>{line}</span>
              </li>
            ))}
          </ul>
        </Card>
      ) : null}

      {report.takeaways.length > 0 ? (
        <Card>
          <SectionHeader title="What it means for the island" subtitle="The report's positioning read." />
          <ul className="mt-1 space-y-2">
            {report.takeaways.map((line) => (
              <li key={line} className="flex gap-2 text-[12px] leading-relaxed text-ink-2">
                <span className="mt-[6px] h-1 w-1 shrink-0 rounded-full bg-ink-3" />
                <span>{line}</span>
              </li>
            ))}
          </ul>
        </Card>
      ) : null}

      {report.triggers.length > 0 ? (
        <Card className="border-warn/25 bg-warn/[0.05]">
          <SectionHeader
            title="Act fast if these happen"
            subtitle="Conditions the report says change the picture the moment they occur — worth re-reading each fortnight rather than only when they do."
          />
          <ul className="mt-1 space-y-2">
            {report.triggers.map((line) => (
              <li key={line} className="flex gap-2 text-[12px] leading-relaxed text-ink-2">
                <span className="mt-[6px] h-1 w-1 shrink-0 rounded-full bg-warn" />
                <span>{line}</span>
              </li>
            ))}
          </ul>
        </Card>
      ) : null}

      {report.playbook.length > 0 ? (
        <Card>
          <SectionHeader
            title="The longer plays"
            subtitle="These carry across reports rather than changing fortnightly, which is exactly why they are easy to keep not doing."
          />
          <div className="mt-1 space-y-3">
            {report.playbook.map((group) => (
              <div key={group.heading}>
                <h4 className="text-[12px] font-semibold text-ink">{group.heading}</h4>
                <ul className="mt-1 space-y-1.5">
                  {group.points.map((line) => (
                    <li key={line} className="flex gap-2 text-[11.5px] leading-relaxed text-ink-2">
                      <span className="mt-[6px] h-1 w-1 shrink-0 rounded-full bg-ink-3" />
                      <span>{line}</span>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </Card>
      ) : null}
    </div>
  )
}

/**
 * The competition, grouped by who runs it.
 *
 * The single most useful thing the September report established was that the
 * field is smaller than the listing count: five of nine listings are one host.
 * A dozen rooms run by three people is a different market from a dozen rooms
 * run by a dozen people, and only the first one can reprice.
 */
function Operators({ operators, myRate }: { operators: Operator[]; myRate: number }) {
  const rivals = operators.filter((operator) => !operator.isMine)
  if (rivals.length === 0) {
    return (
      <Card>
        <p className="text-[12px] leading-relaxed text-ink-2">
          Nothing to group yet. Load a report — it records who hosts each listing, and that is what turns a watchlist
          into a picture of who you are actually up against.
        </p>
      </Card>
    )
  }

  // The report's central point is that the field is smaller than the listing
  // count. Ten single listings printed at the same weight as a five-listing
  // portfolio buries exactly that, so the portfolios get cards and the singles
  // get a list.
  const portfolios = operators.filter((operator) => operator.isMine || operator.listings.length > 1)
  const singles = operators.filter((operator) => !operator.isMine && operator.listings.length === 1)

  return (
    <div className="space-y-3">
      <SectionHeader
        title="Who you actually compete with"
        subtitle="Grouped by host rather than by listing. A host with one house prices to fill it; a host with a portfolio across every size band prices to move a market — and only the second one is a competitor in any useful sense."
      />
      {portfolios.map((operator) => (
        <Card key={operator.name} className={operator.isMine ? 'border-accent/30 bg-accent/[0.04]' : undefined}>
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <div className="flex items-baseline gap-2">
              <h4 className="text-[13px] font-semibold text-ink">{operator.name}</h4>
              {operator.isMine ? <Pill tone="info">You</Pill> : null}
              {operator.listings.length > 1 ? (
                <Pill tone="warn">{operator.listings.length} listings</Pill>
              ) : null}
            </div>
            <span className="text-[11.5px] text-ink-3">
              {operator.reviews > 0 ? `${num(operator.reviews, 0)} reviews` : 'no reviews recorded'}
              {operator.bestRating > 0 ? ` · best ${operator.bestRating.toFixed(2)}★` : ''}
            </span>
          </div>

          <div className="mt-2 grid gap-2 sm:grid-cols-3">
            <Cell
              label="Range"
              value={
                operator.low !== null && operator.high !== null
                  ? operator.low === operator.high
                    ? money(operator.low, 'PHP', true)
                    : `${money(operator.low, 'PHP', true)} – ${money(operator.high, 'PHP', true)}`
                  : '—'
              }
            />
            <Cell
              label="Span"
              value={operator.span !== null && operator.span > 1 ? `${operator.span.toFixed(1)}× top to bottom` : '—'}
            />
            <Cell
              label={operator.isMine ? 'Your rate' : 'Reaches'}
              value={
                operator.isMine
                  ? money(myRate, 'PHP', true)
                  : operator.reachOfYourRate !== null
                    ? `${pct(operator.reachOfYourRate, 0)} of your rate`
                    : '—'
              }
            />
          </div>

          {operator.movers.length > 0 ? (
            <p className="mt-2 text-[11.5px] leading-relaxed text-warn">
              Moved this report:{' '}
              {operator.movers
                .map(
                  (row) =>
                    `${row.listing.name} ${(row.rateChange ?? 0) > 0 ? '+' : ''}${money(row.rateChange ?? 0, 'PHP', true)}`,
                )
                .join(' · ')}
              . A portfolio operator raising rates has the volume to make it stick — that is the move to watch, not the
              level.
            </p>
          ) : null}

          <div className="mt-2 space-y-1">
            {operator.listings.map((row) => (
              <div key={row.listing.id} className="flex flex-wrap items-baseline gap-x-2 text-[11.5px]">
                <span className="text-ink">{row.listing.name}</span>
                <span className="num text-ink-2">
                  {(row.latest?.nightlyRate ?? 0) > 0
                    ? money(row.latest!.nightlyRate, 'PHP')
                    : row.latest?.demandSignal
                      ? `no rate — ${row.latest.demandSignal.toLowerCase()}`
                      : 'no rate recorded'}
                </span>
                <span className="text-ink-3">
                  {row.listing.layout || ''}
                  {row.latest?.demandSignal ? ` · ${row.latest.demandSignal}` : ''}
                </span>
              </div>
            ))}
          </div>
        </Card>
      ))}

      {singles.length > 0 ? (
        <Card>
          <SectionHeader
            title={`And ${singles.length} single listing${singles.length === 1 ? '' : 's'}`}
            subtitle="One listing each, so far as any report has said. Worth watching for the moment one of these becomes two — that is how a portfolio starts, and it is how the report spotted David."
          />
          <div className="mt-1 overflow-x-auto rounded-xl border border-line">
            <table className="w-full min-w-[520px] text-[11.5px]">
              <thead className="bg-surface-2 text-ink-2">
                <tr>
                  {['Listing', 'Host', 'Rate', 'Of your rate', 'Reviews'].map((header) => (
                    <th key={header} className="px-3 py-2 text-left font-medium">
                      {header}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {singles.map((operator) => {
                  const row = operator.listings[0]
                  return (
                    <tr key={operator.name} className="border-t border-line">
                      <td className="px-3 py-1.5 text-ink">{row.listing.name}</td>
                      <td className="px-3 py-1.5 text-ink-3">
                        {row.listing.host.trim() || 'not named in the report'}
                      </td>
                      <td className="num whitespace-nowrap px-3 py-1.5 text-ink-2">
                        {(row.latest?.nightlyRate ?? 0) > 0
                          ? money(row.latest!.nightlyRate, 'PHP')
                          : row.latest?.demandSignal
                            ? row.latest.demandSignal.toLowerCase()
                            : '—'}
                      </td>
                      <td className="num whitespace-nowrap px-3 py-1.5 text-ink-3">
                        {operator.reachOfYourRate !== null ? pct(operator.reachOfYourRate, 0) : '—'}
                      </td>
                      <td className="num whitespace-nowrap px-3 py-1.5 text-ink-3">
                        {operator.reviews > 0 ? num(operator.reviews, 0) : '—'}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </Card>
      ) : null}
    </div>
  )
}

/** Every observed rate in order, so the holes in the market are visible. */
function PriceLadderCard({ ladder }: { ladder: ReturnType<typeof priceLadder> }) {
  if (ladder.rungs.length === 0) return null
  const top = Math.max(...ladder.rungs.map((rung) => rung.rate))

  return (
    <Card>
      <SectionHeader
        title="The ladder"
        subtitle="Every rate anyone has observed, cheapest first. Where the bars jump is where the market has a hole — and one of those holes is where you sit."
      />
      <div className="mt-1 space-y-1">
        {ladder.rungs.map((rung, index) => (
          <div key={`${rung.name}-${index}`} className="flex items-center gap-2 text-[11.5px]">
            <span className={cx('w-40 shrink-0 truncate sm:w-56', rung.isMine ? 'font-semibold text-accent' : 'text-ink-2')}>
              {rung.name}
            </span>
            <span className="h-2 flex-1 overflow-hidden rounded-full bg-surface-2">
              <span
                className="block h-full rounded-full"
                style={{
                  width: `${top > 0 ? (rung.rate / top) * 100 : 0}%`,
                  background: rung.isMine ? 'var(--accent)' : 'var(--ink-3)',
                }}
              />
            </span>
            <span className={cx('num w-20 shrink-0 text-right', rung.isMine ? 'font-semibold text-accent' : 'text-ink-2')}>
              {money(rung.rate, 'PHP', true)}
            </span>
            <span className="num hidden w-24 shrink-0 text-right text-ink-3 sm:block">
              {rung.maxGuests > 0 ? `${money(rung.rate / rung.maxGuests, 'PHP', true)}/guest` : '—'}
            </span>
          </div>
        ))}
      </div>
      {ladder.gapBelow !== null && ladder.gapAbove !== null ? (
        <p className="mt-3 text-[11.5px] leading-relaxed text-ink-3">
          You are {ladder.gapBelow.toFixed(1)}× the rung below you and {ladder.gapAbove.toFixed(1)}× below the one above.
          Both gaps are large, which is the argument for holding the rate: there is nobody to be undercut by and nobody
          to undercut. The risk in a lane this empty is under-pricing it, not over-pricing it.
        </p>
      ) : null}
    </Card>
  )
}

/**
 * What the market charges for the things guests buy beyond the room.
 *
 * Shown next to the island's own add-on economics, but deliberately not divided
 * into them: the benchmark prices one activity for one person and the island's
 * figure is a whole stay's worth of food, boats and transfers. Side by side is
 * useful; a ratio between them would be a number that looks like a finding.
 */
function AncillaryPrices({
  benchmarks,
  mine,
  report,
}: {
  benchmarks: AncillaryBenchmark[]
  mine: ReturnType<typeof addOnPerGuest>
  report: MarketReport | null
}) {
  if (benchmarks.length === 0) {
    return (
      <Card>
        <p className="text-[12px] leading-relaxed text-ink-2">
          No add-on prices recorded yet. The competitor report carries a section on what the market charges for island
          hopping, boat charters, transfers and meals — load one and it lands here, next to what the island charges.
        </p>
      </Card>
    )
  }

  const basisLabel: Record<string, string> = {
    guest: 'per person',
    group: 'per boat or vehicle',
    day: 'per day',
    unknown: '',
  }

  return (
    <div className="space-y-4">
      <SectionHeader
        title="What the market charges for add-ons"
        subtitle={`From the ${report ? shortDate(report.reportedOn) : 'latest'} report. Until now there was no outside price to judge Kuya Allan's quotes or the mark-up on them against — an argument about whether a price is fair needs a number from outside the island.`}
      />

      {mine ? (
        <StatGrid>
          <Stat
            label="You charge, per guest"
            value={money(mine.chargedPerGuest, 'PHP')}
            sub={`Across ${mine.stays} stays with both sides recorded · whole stay, all add-ons`}
          />
          <Stat label="Goes to Allan, per guest" value={money(mine.toAllanPerGuest, 'PHP')} sub="His quote for the same" />
          <Stat
            label="You keep, per guest"
            value={money(mine.patongPerGuest, 'PHP')}
            tone="pos"
            sub={`${pct(mine.marginPct, 0)} of what the guest paid`}
          />
        </StatGrid>
      ) : null}

      <Card>
        <div className="overflow-x-auto rounded-xl border border-line">
          <table className="w-full min-w-[560px] text-[12px]">
            <thead className="bg-surface-2 text-ink-2">
              <tr>
                {['What', 'Market rate', 'Basis', 'Notes'].map((header) => (
                  <th key={header} className="px-3 py-2 text-left font-medium">
                    {header}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {benchmarks.map((row) => (
                <tr key={row.id} className="border-t border-line">
                  <td className="px-3 py-1.5 text-ink">{row.item}</td>
                  <td className="num whitespace-nowrap px-3 py-1.5 text-ink">
                    {row.low === row.high
                      ? money(row.low, row.currency)
                      : `${money(row.low, row.currency)} – ${money(row.high, row.currency)}`}
                  </td>
                  <td className="px-3 py-1.5 text-ink-3">{basisLabel[row.basis] || '—'}</td>
                  <td className="px-3 py-1.5 text-ink-3">{row.note || '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="mt-3 text-[11.5px] leading-relaxed text-ink-3">
          These are per activity, per person. The figures above them are everything one guest was charged across a whole
          stay. They are not the same unit and nothing here divides one by the other — read them side by side and judge
          for yourself whether the quotes coming back from the island look like the mainland prices plus a boat ride.
        </p>
      </Card>
    </div>
  )
}

const BRIEF_KEY = 'buddy.marketRead'

/**
 * The market read, refreshed on demand.
 *
 * Pressing refresh hands Claude this property's own numbers — seasonality,
 * lead times, rate, guest origin, anything observed on rivals — and gets back
 * a positioning read and a ranked set of moves. Claude cannot browse, so it
 * never sees a live Airbnb price: anything that needs looking up comes back in
 * "check these by hand" rather than being invented. The last read is kept so
 * the page is not blank on arrival, with the date it was produced.
 */
function MarketRead({ series }: { series: MonthMetrics[] }) {
  const { bookings, addons, competitors, observations } = useLedger()
  const [available, setAvailable] = useState<boolean | null>(null)
  const [brief, setBrief] = useState<MarketBrief | null>(() => {
    try {
      const stored = localStorage.getItem(BRIEF_KEY)
      return stored ? (JSON.parse(stored) as MarketBrief) : null
    } catch {
      return null
    }
  })
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [progress, setProgress] = useState('')

  useEffect(() => {
    let live = true
    void getSample().then((fn) => {
      if (live) setAvailable(fn !== null)
    })
    return () => {
      live = false
    }
  }, [])

  const refresh = useCallback(async () => {
    setBusy(true)
    setError(null)
    setProgress('Reading your numbers…')
    try {
      const sample = await getSample()
      if (!sample) {
        setError('This only works on the published dashboard, where the page can ask Claude.')
        return
      }
      const prompt = buildBrief({
        series,
        bookings,
        addons,
        listings: competitors,
        observations,
        asOf: today(),
      })
      setProgress('Claude is working through it — this takes up to a minute.')
      const result = await sample.json<Omit<MarketBrief, 'generatedAt'>>(prompt, { modelTier: 'complex' })
      const next: MarketBrief = { ...result, generatedAt: new Date().toISOString() }
      setBrief(next)
      try {
        localStorage.setItem(BRIEF_KEY, JSON.stringify(next))
      } catch {
        // A viewer with site data blocked simply loses the cache, not the read.
      }
    } catch (caught) {
      setError(explainError(describeError(caught)))
    } finally {
      setBusy(false)
      setProgress('')
    }
  }, [series, bookings, addons, competitors, observations])

  return (
    <Card>
      <SectionHeader
        title="The market read"
        subtitle="Your own numbers, read by Claude as a revenue manager would. It cannot see live Airbnb prices — anything needing a look comes back as something to check, never as a made-up figure."
        right={
          available === false ? null : (
            <Button variant="primary" size="sm" disabled={busy} onClick={() => void refresh()}>
              {busy ? 'Working…' : brief ? 'Refresh' : 'Run the read'}
            </Button>
          )
        }
      />

      {available === false ? (
        <p className="text-[12px] leading-relaxed text-ink-2">
          The read runs on the published dashboard, where the page is allowed to ask Claude. Open the published link and
          the button appears. Everything else on this page works here either way.
        </p>
      ) : null}

      {busy ? (
        <p className="text-[12px] text-ink-2">
          <span className="mr-2 inline-block h-2 w-2 animate-pulse rounded-full bg-accent" />
          {progress}
        </p>
      ) : null}

      {error ? <p className="text-[12px] leading-relaxed text-warn">{error}</p> : null}

      {brief && !busy ? (
        <div className="space-y-4">
          <p className="text-[11px] text-ink-3">Read produced {shortDate(brief.generatedAt.slice(0, 10))}</p>

          <div>
            <h3 className="text-[12px] font-semibold uppercase tracking-wide text-ink-2">Where you sit</h3>
            <p className="mt-1 max-w-3xl text-[12.5px] leading-relaxed text-ink">{brief.positioning}</p>
          </div>

          {brief.moves?.length ? (
            <div>
              <h3 className="mb-2 text-[12px] font-semibold uppercase tracking-wide text-ink-2">
                What to do, biggest first
              </h3>
              <div className="space-y-2">
                {brief.moves.map((move) => (
                  <div key={move.title} className="rounded-lg border border-line bg-surface-2 p-3">
                    <div className="flex flex-wrap items-baseline justify-between gap-2">
                      <h4 className="text-[13px] font-semibold text-ink">{move.title}</h4>
                      <div className="flex items-center gap-1.5">
                        {move.nightsUpside > 0 ? <Pill tone="accent">~{move.nightsUpside} nights a year</Pill> : null}
                        <Pill tone={move.effort === 'low' ? 'pos' : move.effort === 'high' ? 'warn' : 'neutral'}>
                          {move.effort} effort
                        </Pill>
                      </div>
                    </div>
                    <p className="mt-1.5 max-w-3xl text-[12px] leading-relaxed text-ink">{move.action}</p>
                    <p className="mt-1.5 max-w-3xl text-[12px] leading-relaxed text-ink-2">{move.why}</p>
                    {move.timing ? (
                      <p className="mt-1.5 text-[11.5px] leading-relaxed text-ink-3">Timing: {move.timing}</p>
                    ) : null}
                  </div>
                ))}
              </div>
            </div>
          ) : null}

          {brief.threats?.length ? (
            <div>
              <h3 className="mb-2 text-[12px] font-semibold uppercase tracking-wide text-ink-2">What to watch</h3>
              <div className="space-y-1.5">
                {brief.threats.map((threat) => (
                  <div key={threat.title} className="text-[12px] leading-relaxed">
                    <span className="font-medium text-ink">{threat.title}</span>
                    <span className="text-ink-2"> — {threat.detail}</span>
                  </div>
                ))}
              </div>
            </div>
          ) : null}

          {brief.toVerify?.length ? (
            <div className="rounded-lg border border-warn/25 bg-warn/[0.04] p-3">
              <h3 className="text-[12px] font-semibold text-ink">Check these on Airbnb yourself</h3>
              <p className="mt-1 text-[11.5px] leading-relaxed text-ink-2">
                Nobody can know these without looking. Record what you find on the watchlist below and the next read gets
                sharper.
              </p>
              <ul className="mt-2 space-y-1">
                {brief.toVerify.map((item) => (
                  <li key={item} className="text-[12px] leading-relaxed text-ink-2">
                    · {item}
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
        </div>
      ) : null}

      {!brief && !busy && available !== false ? (
        <p className="text-[12px] leading-relaxed text-ink-2">
          Nothing read yet. Press the button and Claude works through your seasonality, lead times, rate, guest origin
          and anything you have recorded on rivals, then comes back with where you sit and what to do about it.
        </p>
      ) : null}
    </Card>
  )
}

/**
 * Where the next booking comes from, read out of this property's own history.
 *
 * Kept beside the competitor page on purpose: knowing what everyone else
 * charges is only useful next to what your own numbers say you should do.
 */
function GrowthLevers({ bookings, addons }: { bookings: import('@/types').Booking[]; addons: import('@/types').AddOnQuote[] }) {
  const marginRate = useMemo(() => {
    const real = addons.filter((quote) => !quote.excluded && quote.guestTotal > 0)
    if (real.length === 0) return null
    const charged = real.reduce((sum, quote) => sum + quote.guestTotal, 0)
    const kept = real.reduce((sum, quote) => sum + quote.margin, 0)
    return charged > 0 ? kept / charged : null
  }, [addons])

  const levers = useMemo(() => findLevers(bookings, marginRate), [bookings, marginRate])
  if (levers.length === 0) return null

  return (
    <div>
      <SectionHeader
        title="How to get more bookings"
        subtitle="Every one of these comes out of your own history, with the number that produced it attached — ordered by how many nights a year are actually at stake."
      />
      <div className="space-y-2.5">
        {levers.map((lever) => (
          <Card key={lever.id} className={cx(lever.tone === 'warn' && 'border-warn/25 bg-warn/[0.03]')}>
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <h3 className="text-[13px] font-semibold text-ink">{lever.title}</h3>
              {lever.nightsAtStake > 0 ? (
                <Pill tone={lever.tone === 'warn' ? 'warn' : 'info'}>~{lever.nightsAtStake} nights a year</Pill>
              ) : null}
            </div>
            <p className="mt-1.5 max-w-3xl text-[12px] leading-relaxed text-ink-2">{lever.finding}</p>
            <p className="mt-1.5 max-w-3xl text-[12px] leading-relaxed text-ink">{lever.action}</p>
            <p className="num mt-2 border-t border-line pt-2 text-[10.5px] leading-relaxed text-ink-3">{lever.evidence}</p>
          </Card>
        ))}
      </div>
    </div>
  )
}

function ListingRow({
  snapshot,
  myRate,
  onObserve,
  onRemove,
  onSaveListing,
}: {
  snapshot: ListingSnapshot
  myRate: number
  onObserve: () => void
  onRemove: () => void
  onSaveListing: (listing: CompetitorListing) => Promise<void>
}) {
  const { listing, latest } = snapshot
  const [editing, setEditing] = useState(false)
  const [name, setName] = useState(listing.name)
  const perGuest = latest ? perGuestRate(latest) : null

  return (
    <Card>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          {editing ? (
            <div className="flex items-center gap-2">
              <TextInput value={name} onChange={setName} placeholder="What is this listing?" />
              <Button
                size="sm"
                variant="primary"
                onClick={() => {
                  void onSaveListing({ ...listing, name: name.trim() })
                  setEditing(false)
                }}
              >
                Save
              </Button>
            </div>
          ) : (
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="text-[13px] font-semibold text-ink">{listing.name || `Listing ${listing.roomId}`}</h3>
              {listing.host ? <Pill>{listing.host}</Pill> : null}
              <Pill>{listing.area}</Pill>
              {snapshot.staleDays === null ? (
                <Pill tone="warn">never looked at</Pill>
              ) : snapshot.staleDays > 45 ? (
                <Pill tone="warn">{snapshot.staleDays}d since a look</Pill>
              ) : (
                <Pill tone="pos">checked {snapshot.staleDays}d ago</Pill>
              )}
              <button
                type="button"
                onClick={() => setEditing(true)}
                className="text-[11px] text-ink-3 underline-offset-2 hover:text-accent hover:underline"
              >
                rename
              </button>
            </div>
          )}
          <p className="mt-1 text-[11.5px] leading-relaxed text-ink-3">{listing.note}</p>
          <a
            href={listing.url}
            target="_blank"
            rel="noreferrer noopener"
            className="mt-1 inline-block break-all text-[11px] text-accent hover:underline"
          >
            {listing.url}
          </a>
        </div>

        <div className="flex shrink-0 items-center gap-2">
          <Button size="sm" variant="primary" onClick={onObserve}>
            Record what you see
          </Button>
          <Button size="sm" variant="ghost" onClick={onRemove}>
            Remove
          </Button>
        </div>
      </div>

      {latest ? (
        <dl className="mt-3 grid grid-cols-2 gap-x-4 gap-y-2 border-t border-line pt-3 sm:grid-cols-6">
          <Cell label="Nightly" value={money(latest.nightlyRate, latest.currency, true)} />
          <Cell
            label="Per guest"
            value={perGuest !== null ? money(perGuest, latest.currency, true) : '—'}
            tone={perGuest !== null && myRate > 0 && latest.maxGuests > 0 ? undefined : undefined}
          />
          <Cell label="Sleeps" value={latest.maxGuests > 0 ? `${latest.maxGuests}` : '—'} />
          <Cell label="Bedrooms" value={latest.bedrooms > 0 ? `${latest.bedrooms}` : '—'} />
          <Cell
            label="Rating"
            value={latest.rating > 0 ? `${num(latest.rating, 2)} · ${num(latest.reviewCount, 0)}` : '—'}
          />
          <Cell
            label="Reviews / month"
            value={snapshot.reviewVelocity !== null ? num(snapshot.reviewVelocity, 1) : '—'}
          />
        </dl>
      ) : (
        <p className="mt-3 border-t border-line pt-3 text-[11.5px] text-ink-3">
          No rate recorded yet. Open the listing for a date you care about — the same dates each time — and enter what
          it quotes.
        </p>
      )}

      {latest && latest.amenities.length > 0 ? (
        <div className="mt-2.5 flex flex-wrap gap-1">
          {latest.amenities.map((amenity) => (
            <span key={amenity} className="rounded border border-line bg-surface-2 px-1.5 py-0.5 text-[10.5px] text-ink-2">
              {amenity}
            </span>
          ))}
        </div>
      ) : null}
    </Card>
  )
}

function Cell({ label, value }: { label: string; value: string; tone?: undefined }) {
  return (
    <div>
      <dt className="text-[10.5px] font-medium uppercase tracking-wide text-ink-3">{label}</dt>
      <dd className="num mt-0.5 text-[12.5px] text-ink">{value}</dd>
    </div>
  )
}

function ListingForm({
  onDone,
  onSave,
}: {
  onDone: () => void
  onSave: (listing: CompetitorListing) => Promise<void>
}) {
  const [url, setUrl] = useState('')
  const [name, setName] = useState('')
  const [host, setHost] = useState('')
  const [area, setArea] = useState('Coron, Palawan')
  const [note, setNote] = useState('')

  const roomId = (url.match(/rooms\/(\d+)/) ?? url.match(/profile\/(\d+)/) ?? [])[1] ?? ''
  const valid = url.trim().length > 0

  return (
    <Card className="mt-3">
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="Airbnb link" hint={roomId ? `Listing ${roomId}` : 'Paste the room or host URL'}>
          <TextInput value={url} onChange={setUrl} placeholder="https://www.airbnb.com/rooms/…" />
        </Field>
        <Field label="What to call it">
          <TextInput value={name} onChange={setName} placeholder="e.g. Floral Island villa" />
        </Field>
        <Field label="Host">
          <TextInput value={host} onChange={setHost} placeholder="Optional" />
        </Field>
        <Field label="Area">
          <TextInput value={area} onChange={setArea} />
        </Field>
      </div>
      <div className="mt-3">
        <Field label="Why watch it">
          <TextInput value={note} onChange={setNote} placeholder="Closest substitute, cheapest island, new entrant…" />
        </Field>
      </div>
      <div className="mt-3 flex justify-end gap-2 border-t border-line pt-3">
        <Button variant="ghost" size="sm" onClick={onDone}>
          Cancel
        </Button>
        <Button
          variant="primary"
          size="sm"
          disabled={!valid}
          onClick={() => {
            void onSave({
              id: uid('cmp'),
              roomId: roomId || url.trim(),
              name: name.trim(),
              host: host.trim(),
              area: area.trim(),
              url: url.trim(),
              note: note.trim(),
              active: true,
              addedAt: today(),
            })
            onDone()
          }}
        >
          Track it
        </Button>
      </div>
    </Card>
  )
}

/**
 * One look at one listing.
 *
 * The quoted dates are required rather than optional: a nightly rate without
 * the dates it was quoted for is not comparable to anything, including its own
 * earlier self.
 */
function ObservationForm({
  listing,
  onDone,
  onSave,
}: {
  listing: CompetitorListing
  onDone: () => void
  onSave: (observation: CompetitorObservation) => Promise<void>
}) {
  const [quotedFor, setQuotedFor] = useState('')
  const [nights, setNights] = useState('2')
  const [guests, setGuests] = useState('2')
  const [rate, setRate] = useState('')
  const [cleaning, setCleaning] = useState('')
  const [bedrooms, setBedrooms] = useState('')
  const [maxGuests, setMaxGuests] = useState('')
  const [rating, setRating] = useState('')
  const [reviews, setReviews] = useState('')
  const [booked90, setBooked90] = useState('')
  const [amenities, setAmenities] = useState('')
  const [note, setNote] = useState('')
  const [busy, setBusy] = useState(false)

  const rateValue = Number(rate) || 0
  const valid = rateValue > 0 && quotedFor.trim().length > 0

  const submit = async () => {
    if (!valid) return
    setBusy(true)
    await onSave({
      id: uid('obs'),
      prov: {
        importId: 'manual',
        fileName: 'Observed on airbnb.com',
        sheetName: listing.roomId,
        rowNumber: 0,
        manual: true,
      },
      listingId: listing.id,
      observedOn: today(),
      quotedFor: quotedFor.trim(),
      nights: Number(nights) || 0,
      guests: Number(guests) || 0,
      nightlyRate: rateValue,
      cleaningFee: Number(cleaning) || 0,
      currency: 'PHP',
      bedrooms: Number(bedrooms) || 0,
      maxGuests: Number(maxGuests) || 0,
      rating: Number(rating) || 0,
      reviewCount: Number(reviews) || 0,
      nightsBookedNext90: Number(booked90) || 0,
      amenities: amenities
        .split(',')
        .map((item) => item.trim())
        .filter(Boolean),
      note: note.trim(),
    })
    setBusy(false)
    onDone()
  }

  return (
    <div className="no-print fixed inset-0 z-50 flex items-start justify-center overflow-y-auto p-4 sm:items-center">
      <button type="button" aria-label="Close" onClick={onDone} className="fixed inset-0 bg-black/60 backdrop-blur-[2px]" />
      <div className="animate-in relative w-full max-w-xl rounded-xl border border-line bg-bg shadow-2xl">
        <header className="sticky top-0 z-10 flex items-start justify-between gap-3 border-b border-line bg-bg px-4 py-3">
          <div className="min-w-0">
            <h2 className="truncate text-[14px] font-semibold text-ink">{listing.name || `Listing ${listing.roomId}`}</h2>
            <p className="mt-0.5 text-[11.5px] text-ink-2">Recording what you can see today, {shortDate(today())}.</p>
          </div>
          <Button variant="ghost" size="sm" onClick={onDone}>
            Close
          </Button>
        </header>

        <div className="space-y-3 px-4 pt-4">
          <a
            href={listing.url}
            target="_blank"
            rel="noreferrer noopener"
            className="block rounded-lg border border-accent/30 bg-accent/10 px-3 py-2 text-[12px] text-accent hover:bg-accent/15"
          >
            Open the listing in a new tab →
          </a>

          <div className="grid gap-3 sm:grid-cols-2">
            <Field
              label="Dates you priced"
              hint="Use the same dates every time — that is what makes two observations comparable."
            >
              <TextInput value={quotedFor} onChange={setQuotedFor} placeholder="20–22 Sep 2026" />
            </Field>
            <Field label="Nightly rate (₱)" hint="Before Airbnb's guest service fee.">
              <TextInput value={rate} onChange={setRate} type="number" placeholder="0" />
            </Field>
            <Field label="Nights priced">
              <TextInput value={nights} onChange={setNights} type="number" />
            </Field>
            <Field label="Guests priced for">
              <TextInput value={guests} onChange={setGuests} type="number" />
            </Field>
            <Field label="Cleaning fee (₱)">
              <TextInput value={cleaning} onChange={setCleaning} type="number" placeholder="0" />
            </Field>
            <Field label="Sleeps up to" hint="The fair comparison is rate per guest, not the headline.">
              <TextInput value={maxGuests} onChange={setMaxGuests} type="number" placeholder="0" />
            </Field>
            <Field label="Bedrooms">
              <TextInput value={bedrooms} onChange={setBedrooms} type="number" placeholder="0" />
            </Field>
            <Field label="Rating">
              <TextInput value={rating} onChange={setRating} type="number" placeholder="4.9" />
            </Field>
            <Field label="Review count" hint="Watched over time, this is the closest read you get on how much they sell.">
              <TextInput value={reviews} onChange={setReviews} type="number" placeholder="0" />
            </Field>
            <Field label="Nights taken in next 90" hint="Count the blocked days on their calendar, if it shows.">
              <TextInput value={booked90} onChange={setBooked90} type="number" placeholder="0" />
            </Field>
          </div>

          <Field label="Amenities worth noting" hint="Comma separated — kayaks, generator, wifi, aircon, chef.">
            <TextInput value={amenities} onChange={setAmenities} placeholder="kayaks, wifi, chef" />
          </Field>
          <Field label="Anything else">
            <TextInput value={note} onChange={setNote} placeholder="New photos, changed title, discount banner…" />
          </Field>

          <div className="sticky bottom-0 -mx-4 flex items-center justify-between gap-3 border-t border-line bg-bg px-4 py-3">
            <span className="text-[11.5px] text-ink-3">
              {valid ? `${money(rateValue, 'PHP')} a night for ${quotedFor}` : 'Needs a rate and the dates it was for'}
            </span>
            <Button variant="primary" size="sm" disabled={busy || !valid} onClick={() => void submit()}>
              {busy ? 'Saving…' : 'Save observation'}
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}
