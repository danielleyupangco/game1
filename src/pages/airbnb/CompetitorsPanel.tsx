import { useCallback, useEffect, useMemo, useState } from 'react'
import { CartesianGrid, Line, LineChart, Tooltip, XAxis, YAxis } from 'recharts'
import { useLedger } from '@/state/store'
import { perGuestRate, readMarket, snapshotOf, SEED_LISTINGS, type ListingSnapshot } from '@/domain/airbnb/competitors'
import { aggregate, trailing } from '@/domain/airbnb/metrics'
import { findLevers } from '@/domain/airbnb/growth'
import { buildBrief, type MarketBrief } from '@/domain/airbnb/marketbrief'
import { describeError, explainError, getSample } from '@/lib/claude'
import type { MonthMetrics } from '@/domain/airbnb/metrics'
import { Button, Card, Field, Pill, SectionHeader, TextInput, cx } from '@/components/ui/primitives'
import { Stat, StatGrid } from '@/components/ui/Stat'
import { ChartFrame, tooltipProps } from '@/components/charts/Chart'
import { AXIS, GRID, SERIES, STATUS, TOOLTIP_STYLE } from '@/components/charts/theme'
import { money, num, pct, shortDate } from '@/lib/format'
import { uid } from '@/lib/id'
import { today } from '@/lib/dates'
import type { CompetitorListing, CompetitorObservation } from '@/types'

/**
 * What everyone else is charging.
 *
 * Airbnb blocks machine access, so nothing here is scraped — each figure is
 * something someone opened the listing and recorded on a day. That is slower
 * than a scraper and better than a guess, and it produces the one thing a
 * scrape of a single moment never could: a price history on the same dates,
 * which is what actually shows whether the market is moving.
 */
export function CompetitorsPanel({ series }: { series: MonthMetrics[] }) {
  const { competitors, observations, saveCompetitor, removeCompetitor, addObservation, bookings, addons } = useLedger()
  const [observing, setObserving] = useState<string | null>(null)
  const [addingListing, setAddingListing] = useState(false)
  const asOf = today()

  // The listings the owner named are seeded once so the tracker is never an
  // empty page — but they carry no numbers, because nobody has looked yet.
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
  const myRate = mine?.adr ?? 0
  const market = useMemo(() => readMarket(snapshots, myRate, []), [snapshots, myRate])

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
      <MarketRead series={series} />

      <StatGrid>
        <Stat
          label="Your rate"
          value={myRate > 0 ? money(myRate, 'PHP', true) : '—'}
          sub="Average over the last twelve months"
        />
        <Stat
          label="Market median"
          value={market.medianRate !== null ? money(market.medianRate, 'PHP', true) : 'Not observed yet'}
          sub={
            market.lowRate !== null
              ? `${money(market.lowRate, 'PHP', true)} – ${money(market.highRate ?? 0, 'PHP', true)}`
              : `${market.tracked} listing${market.tracked === 1 ? '' : 's'} tracked, none priced`
          }
        />
        <Stat
          label="Where you sit"
          value={market.yourPercentile !== null ? `${pct(market.yourPercentile, 0)} dearer` : '—'}
          tone={market.yourPercentile !== null && market.yourPercentile > 0.75 ? 'warn' : 'neutral'}
          sub={
            market.yourPercentile !== null
              ? `than the ${market.observed} listing${market.observed === 1 ? '' : 's'} priced`
              : 'Record a rate on any listing to see this'
          }
          hint="A headline rate on its own is misleading — a private island for eight is not competing with a houseboat for two. The per-guest column in the table is the fairer read."
        />
        <Stat
          label="Needs a look"
          value={num(market.stale.length, 0)}
          tone={market.stale.length > 0 ? 'warn' : 'pos'}
          sub="Not checked in 45 days"
        />
      </StatGrid>

      {market.movers.length > 0 ? (
        <Card>
          <SectionHeader title="Moved since last look" subtitle="A rate change is the earliest signal you get that the market is repricing." />
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
            subtitle="Only as good as how often you look — but the shape is the point, not the individual dots."
          />
          <ChartFrame title="Nightly rate as observed" height={240}>
            <LineChart data={priceHistory} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
              <CartesianGrid {...GRID} />
              <XAxis dataKey="observedOn" {...AXIS} tickFormatter={shortDate} minTickGap={20} />
              <YAxis {...AXIS} width={54} tickFormatter={(v: number) => money(v, 'PHP', true)} />
              <Tooltip {...TOOLTIP_STYLE} {...tooltipProps((value) => [money(Number(value), 'PHP'), ''], (label) => shortDate(String(label)))} />
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
              {myRate > 0 ? (
                <Line
                  type="monotone"
                  dataKey={() => myRate}
                  name="Island T"
                  stroke={STATUS.warn}
                  strokeDasharray="4 3"
                  strokeWidth={2}
                  dot={false}
                />
              ) : null}
            </LineChart>
          </ChartFrame>
        </Card>
      ) : null}

      <div>
        <SectionHeader
          title="Watchlist"
          subtitle="Seven starting points are already in — the listings you named, plus Paolyn as a host to watch for new units. Add a rate to any of them and the comparison above comes alive."
          right={
            <Button variant="primary" size="sm" onClick={() => setAddingListing(true)}>
              + Track a listing
            </Button>
          }
        />
        {addingListing ? (
          <ListingForm
            onDone={() => setAddingListing(false)}
            onSave={(listing) => saveCompetitor(listing)}
          />
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

      <GrowthLevers bookings={bookings} addons={addons} />

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
