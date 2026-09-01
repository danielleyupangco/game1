import { useMemo, useState } from 'react'
import { useLedger } from '@/state/store'
import {
  guestProfiles,
  matchesQuery,
  summariseGuestBook,
  toStays,
  type GuestProfile,
  type GuestStay,
  type Segment,
} from '@/domain/airbnb/guests'
import { Button, Card, Field, Pill, SectionHeader, Tabs, TextInput, cx, inputClass } from '@/components/ui/primitives'
import { Stat, StatGrid } from '@/components/ui/Stat'
import { DataTable, type Column } from '@/components/ui/DataTable'
import { EmptyState } from '@/components/ui/EmptyState'
import { QuickAdd } from '@/components/entry/QuickAdd'
import { useProvenance } from '@/components/ui/Provenance'
import { money, num, pct, shortDate } from '@/lib/format'
import type { AddOnQuote } from '@/types'
import { today } from '@/lib/dates'

type View = 'upcoming' | 'now' | 'past' | 'everyone' | 'repeat'

/**
 * The guest book: who stayed, who is here, who is coming.
 *
 * Kept separate from the revenue pages on purpose. Those answer "how did the
 * month go"; this one answers "who do I need to prepare for on Thursday, and
 * who should I write to". Future stays entered here are real bookings — they
 * feed the forecast and the cash view straight away.
 */
export function GuestsPanel() {
  const { bookings, settings, addons, resolutions } = useLedger()
  const { trace } = useProvenance()
  const [view, setView] = useState<View>('upcoming')
  const [query, setQuery] = useState('')
  const [adding, setAdding] = useState(false)
  const [openStay, setOpenStay] = useState<string | null>(null)

  const asOf = today()
  const stays = useMemo(() => toStays(bookings, asOf), [bookings, asOf])
  const profiles = useMemo(() => guestProfiles(stays), [stays])
  const book = useMemo(() => summariseGuestBook(stays, profiles), [stays, profiles])

  const rows = useMemo(() => {
    const bySegment = (segment: Segment) =>
      stays.filter((stay) => stay.segment === segment).sort((a, b) => a.distance - b.distance)
    const base =
      view === 'upcoming'
        ? bySegment('upcoming')
        : view === 'now'
          ? bySegment('now')
          : view === 'past'
            ? bySegment('past')
            : [...stays].sort((a, b) => b.checkIn.localeCompare(a.checkIn))
    return base.filter((stay) => matchesQuery(stay, query))
  }, [stays, view, query])

  const selected = useMemo(() => stays.find((stay) => stay.id === openStay) ?? null, [stays, openStay])
  // A negative add-on share on an otherwise paid stay means the sheet captured
  // the crew's side and not the guest's — a missing number, not a real loss.
  const incomplete = useMemo(
    () =>
      stays
        .filter((stay) => stay.addOnRevenue < 0 && stay.netRevenue > 0)
        .map((stay) => ({
          stay,
          // What actually came through Airbnb for this stay beyond the room. It
          // is the number the missing figure has to be reconciled against, so
          // showing it turns a flag into something answerable.
          collected: resolutions
            .filter((row) => row.confirmationCode === stay.confirmationCode)
            .reduce((sum, row) => sum + row.amount, 0),
        })),
    [stays, resolutions],
  )
  /**
   * Stays whose party size, country or review never made it across. The payout
   * export does not carry them, so without a list they simply stay blank and
   * quietly weaken every average built on them.
   */
  const needsDetail = useMemo(
    () =>
      stays
        .filter((stay) => stay.segment !== 'upcoming')
        .map((stay) => ({
          stay,
          missing: [
            stay.guests > 0 ? '' : 'party size',
            stay.country.trim() ? '' : 'country',
            stay.review.trim() ? '' : 'review',
          ].filter(Boolean),
        }))
        .filter((row) => row.missing.length > 0)
        .sort((a, b) => a.stay.distance - b.stay.distance),
    [stays],
  )

  const repeatKeys = useMemo(
    () => new Set(book.repeatGuests.flatMap((profile) => profile.stays.map((stay) => stay.id))),
    [book.repeatGuests],
  )

  if (bookings.length === 0) {
    return (
      <EmptyState
        title="No guests yet"
        body="Import the Island T mastersheet to load the stays you have already hosted, or add a booking by hand — a future one counts, and it will show up in the forecast the moment you save it."
        dataset="bookings"
      />
    )
  }

  const columns: Column<GuestStay>[] = [
    {
      key: 'guest',
      header: 'Guest',
      render: (stay) => (
        <div className="min-w-0">
          <div className="flex items-center gap-1.5">
            <span className="truncate font-medium text-ink">{stay.guestName.trim() || '—'}</span>
            {repeatKeys.has(stay.id) ? (
              <Pill tone="accent" title="This guest has stayed with you before">
                repeat
              </Pill>
            ) : null}
          </div>
          <div className="mt-0.5 truncate text-[11px] text-ink-3">
            {[stay.country, stay.channel, stay.confirmationCode].filter(Boolean).join(' · ') || '—'}
          </div>
          {/* On a phone the money columns scroll out of view, so the figure that
              matters most rides along with the name. */}
          <div className="num mt-0.5 text-[11px] text-ink-2 sm:hidden">
            {stay.nights} night{stay.nights === 1 ? '' : 's'} · {money(stay.totalValue, stay.currency, true)}
          </div>
        </div>
      ),
      sortValue: (stay) => stay.guestName.toLowerCase(),
    },
    {
      key: 'dates',
      header: 'Stay',
      render: (stay) => (
        <div>
          <div className="num text-ink">
            {shortDate(stay.checkIn)} → {shortDate(stay.checkOut)}
          </div>
          <div className="mt-0.5 text-[11px] text-ink-3">{whenLabel(stay)}</div>
        </div>
      ),
      sortValue: (stay) => stay.checkIn,
    },
    {
      key: 'nights',
      header: 'Nights',
      align: 'right',
      hideOnMobile: true,
      render: (stay) => <span className="num">{stay.nights}</span>,
      sortValue: (stay) => stay.nights,
    },
    {
      key: 'guests',
      header: 'Party',
      align: 'right',
      hideOnMobile: true,
      render: (stay) => <span className="num">{stay.guests || '—'}</span>,
      sortValue: (stay) => stay.guests,
    },
    {
      key: 'room',
      header: 'Room',
      align: 'right',
      hideOnMobile: true,
      render: (stay) => <span className="num">{money(stay.netRevenue, stay.currency, true)}</span>,
      sortValue: (stay) => stay.netRevenue,
    },
    {
      key: 'addons',
      header: 'Add-ons',
      align: 'right',
      hideOnMobile: true,
      render: (stay) =>
        stay.addOnRevenue === 0 ? (
          <span className="text-ink-3">—</span>
        ) : (
          <span className={cx('num', stay.addOnRevenue < 0 ? 'text-neg' : 'text-ink')}>
            {money(stay.addOnRevenue, stay.currency, true)}
          </span>
        ),
      sortValue: (stay) => stay.addOnRevenue,
    },
    {
      key: 'total',
      header: 'Total',
      align: 'right',
      render: (stay) => <span className="num font-medium text-ink">{money(stay.totalValue, stay.currency, true)}</span>,
      sortValue: (stay) => stay.totalValue,
    },
    {
      key: 'lead',
      header: 'Booked ahead',
      align: 'right',
      hideOnMobile: true,
      render: (stay) => (stay.leadTime >= 0 ? <span className="num">{stay.leadTime}d</span> : <span className="text-ink-3">—</span>),
      sortValue: (stay) => stay.leadTime,
    },
  ]

  return (
    <div className="space-y-4">
      <QuickAdd open={adding} onClose={() => setAdding(false)} initialKind="booking" />

      <Card className="border-info/25 bg-info/[0.04]">
        <div className="flex gap-3">
          <span className="mt-0.5 text-[14px] text-info">◫</span>
          <div>
            <h3 className="text-[13px] font-semibold text-ink">One book, three tenses</h3>
            <p className="mt-1 max-w-3xl text-[12px] leading-relaxed text-ink-2">
              Past stays are the record — what each guest paid, how long they stayed, what they said. Present is who is
              on the island today. Future is what is already promised: money in the diary, not yet in the bank. Adding a
              future guest here is the same as any other booking, so it lands in the forecast, the cash view and the
              occupancy numbers immediately.
            </p>
          </div>
        </div>
      </Card>

      <StatGrid>
        <Stat
          label="Stays hosted"
          value={num(book.hosted, 0)}
          sub={`${num(book.hostedNights, 0)} nights stayed`}
          hint="Completed stays, not unique guests — the same party booking twice counts twice."
          onTrace={() =>
            trace({
              title: 'Completed stays',
              description: 'Every booking that has already checked out. Refund and correction rows are excluded.',
              rows: stays.filter((stay) => stay.segment === 'past'),
              columns: [
                { key: 'guestName', label: 'Guest' },
                { key: 'checkIn', label: 'Check-in' },
                { key: 'nights', label: 'Nights' },
                { key: 'netRevenue', label: 'Room' },
              ],
            })
          }
        />
        <Stat
          label="On the island now"
          value={book.here.length > 0 ? `${book.here.length} booking${book.here.length === 1 ? '' : 's'}` : 'Empty'}
          tone={book.here.length > 0 ? 'pos' : 'neutral'}
          sub={
            book.here.length > 0
              ? book.here.map((stay) => `out ${shortDate(stay.checkOut)}`).join(' · ')
              : book.nextArrival
                ? `next in ${book.nextArrival.distance} day${book.nextArrival.distance === 1 ? '' : 's'}`
                : 'nothing booked ahead'
          }
        />
        <Stat
          label="Arriving in 90 days"
          value={num(book.arriving90.length, 0)}
          sub={`${num(book.arriving90.reduce((sum, stay) => sum + stay.nights, 0), 0)} nights reserved`}
        />
        <Stat
          label="Booked ahead"
          value={money(book.bookedAhead, settings.baseCurrency, true)}
          sub="Promised, not yet earned"
          hint="Room payout plus add-ons across every stay that has not started. It is not revenue until the guest arrives."
        />
      </StatGrid>

      {incomplete.length > 0 ? (
        <Card className="border-warn/25 bg-warn/[0.04]">
          <h3 className="text-[13px] font-semibold text-ink">
            {incomplete.length} stay{incomplete.length === 1 ? '' : 's'} with an unfinished add-on figure
          </h3>
          <p className="mt-1 max-w-3xl text-[12px] leading-relaxed text-ink-2">
            The old sheet recorded what went to the crew but not what the guest was charged, so your share reads as a
            negative number and drags the month down with it. It is a gap in the record, not a loss. The Airbnb
            resolution total below is what the guest actually paid for food and boats, so the difference is the
            arithmetic — open the stay, check it, and put the real figure in. The P&amp;L, the forecast and the
            valuation all pick it up.
          </p>
          <div className="mt-2.5 space-y-1.5">
            {incomplete.map(({ stay, collected }) => (
              <button
                key={stay.id}
                type="button"
                onClick={() => setOpenStay(stay.id)}
                className="block w-full rounded-md border border-warn/30 bg-warn/10 px-2.5 py-1.5 text-left text-[11.5px] transition-colors hover:bg-warn/20"
              >
                <span className="font-medium text-warn">{stay.guestName.trim() || stay.confirmationCode}</span>
                <span className="ml-2 text-ink-2">
                  reads as <span className="num">{money(stay.addOnRevenue, stay.currency, true)}</span>
                  {collected > 0 ? (
                    <>
                      {' · '}
                      <span className="num">{money(collected, stay.currency, true)}</span> actually came through Airbnb,{' '}
                      <span className="num">{money(collected + stay.addOnRevenue, stay.currency, true)}</span> of it
                      looks like yours
                    </>
                  ) : null}
                </span>
              </button>
            ))}
          </div>
        </Card>
      ) : null}

      {needsDetail.length > 0 ? (
        <Card>
          <SectionHeader
            title={`${needsDetail.length} stay${needsDetail.length === 1 ? '' : 's'} still missing details`}
            subtitle="Party size, country and the review only exist in your Airbnb inbox — the payout export does not carry them. Until they are filled in, the averages built on them are thinner than they look. Click one to add what you have."
          />
          <div className="flex flex-wrap gap-1.5">
            {needsDetail.slice(0, 24).map(({ stay, missing }) => (
              <button
                key={stay.id}
                type="button"
                onClick={() => setOpenStay(stay.id)}
                className="rounded-md border border-line bg-surface-2 px-2 py-1 text-left text-[11px] transition-colors hover:bg-surface-3"
                title={`Missing ${missing.join(', ')}`}
              >
                <span className="text-ink">{stay.guestName.trim() || stay.confirmationCode}</span>
                <span className="ml-1.5 text-ink-3">{missing.join(' · ')}</span>
              </button>
            ))}
          </div>
          {needsDetail.length > 24 ? (
            <p className="mt-2 text-[11px] text-ink-3">…and {needsDetail.length - 24} more.</p>
          ) : null}
        </Card>
      ) : null}

      {book.namedShare < 0.5 ? (
        <Card className="border-warn/25 bg-warn/[0.04]">
          <p className="text-[12px] leading-relaxed text-ink-2">
            Only <span className="num text-warn">{pct(book.namedShare, 0)}</span> of your stays carry a guest name — the
            rest came in from the sheet as a confirmation code alone. Repeat-guest counts are therefore a floor, not a
            total. Filling names in as you go, or on the next export from Airbnb, is what turns this page into a real
            contact book.
          </p>
        </Card>
      ) : null}

      <div>
        <SectionHeader
          title="Guest register"
          subtitle="Click any row for the full record — dates, party, what they paid, and anything you have noted."
          right={
            <Button variant="primary" size="sm" onClick={() => setAdding(true)}>
              + Add a guest
            </Button>
          }
        />

        <div className="mb-3 flex flex-wrap items-center gap-2">
          <Tabs
            value={view}
            onChange={setView}
            options={[
              { value: 'upcoming', label: `Upcoming (${stays.filter((s) => s.segment === 'upcoming').length})` },
              { value: 'now', label: `Here now (${book.here.length})` },
              { value: 'past', label: `Past (${book.hosted})` },
              { value: 'everyone', label: 'Everyone' },
              { value: 'repeat', label: `Repeat (${book.repeatGuests.length})` },
            ]}
          />
          {view !== 'repeat' ? (
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search name, country, code, notes…"
              className={cx(inputClass, 'max-w-xs')}
            />
          ) : null}
        </div>

        {view === 'repeat' ? (
          <RepeatList profiles={book.repeatGuests} share={book.repeatShare} onOpen={setOpenStay} />
        ) : (
          <Card padded={false}>
            <DataTable
              key={view}
              rows={rows}
              columns={columns}
              getKey={(stay) => stay.id}
              onRowClick={(stay) => setOpenStay(stay.id)}
              initialSort={{ key: 'dates', dir: view === 'past' ? 'desc' : 'asc' }}
              emptyLabel={
                query
                  ? 'No stay matches that search.'
                  : view === 'upcoming'
                    ? 'Nothing booked ahead yet. Add a guest to put a stay in the diary.'
                    : 'Nothing here.'
              }
            />
          </Card>
        )}
      </div>

      <div>
        <SectionHeader
          title="How guests find you"
          subtitle="Averages across every stay on file, so you know what a normal booking looks like before you judge an unusual one."
        />
        <StatGrid>
          <Stat
            label="Typical party"
            value={`${num(book.averageParty, 1)} guests`}
            sub="Across stays that recorded a headcount"
          />
          <Stat
            label="Typical lead time"
            value={`${num(book.averageLeadTime, 0)} days`}
            sub="Between booking and arrival"
            hint="This is what the forecast's pickup curve is built on — how far ahead people commit."
          />
          <Stat
            label="Repeat rate"
            value={pct(book.repeatShare, 0)}
            sub={`${book.repeatGuests.length} guest${book.repeatGuests.length === 1 ? '' : 's'} came back`}
            tone={book.repeatShare > 0.15 ? 'pos' : 'neutral'}
            hint="Share of named stays that came from someone who had stayed before. Only names can be matched, so treat it as a floor."
          />
          <Stat
            label="Channels in use"
            value={num(new Set(stays.map((stay) => stay.channel).filter(Boolean)).size, 0)}
            sub={[...new Set(stays.map((stay) => stay.channel).filter(Boolean))].slice(0, 3).join(', ') || '—'}
          />
        </StatGrid>
      </div>

      {selected ? (
        <StayDrawer
          stay={selected}
          profiles={profiles}
          quote={addons.find((row) => !row.excluded && matchesStay(row, selected)) ?? null}
          resolutionTotal={resolutions
            .filter((row) => row.confirmationCode === selected.confirmationCode)
            .reduce((sum, row) => sum + row.amount, 0)}
          onClose={() => setOpenStay(null)}
        />
      ) : null}
    </div>
  )
}

/** The form has no confirmation code, so a quote ties to a stay by name and date. */
function matchesStay(quote: AddOnQuote, stay: GuestStay): boolean {
  const key = (name: string) => name.trim().toLowerCase().replace(/\s+/g, ' ')
  if (key(quote.guestName) !== key(stay.guestName)) return false
  const apart = Math.abs(
    Math.round(
      (new Date(`${quote.checkIn}T00:00:00`).getTime() - new Date(`${stay.checkIn}T00:00:00`).getTime()) / 86400000,
    ),
  )
  return apart <= 2
}

function whenLabel(stay: GuestStay): string {
  if (stay.segment === 'now') return 'Here now'
  if (stay.segment === 'upcoming')
    return stay.distance === 0 ? 'Arrives today' : `In ${stay.distance} day${stay.distance === 1 ? '' : 's'}`
  if (stay.distance < 31) return `${stay.distance} day${stay.distance === 1 ? '' : 's'} ago`
  const months = Math.round(stay.distance / 30.44)
  return months < 12 ? `${months} month${months === 1 ? '' : 's'} ago` : `${num(stay.distance / 365.25, 1)} years ago`
}

function RepeatList({
  profiles,
  share,
  onOpen,
}: {
  profiles: GuestProfile[]
  share: number
  onOpen: (id: string) => void
}) {
  if (profiles.length === 0) {
    return (
      <Card>
        <p className="text-[12px] leading-relaxed text-ink-2">
          No guest has booked twice under the same name yet. On a remote property that is normal early on — the trip is
          long and expensive, so most stays are once-in-a-while. It is worth watching anyway: a repeat guest costs
          nothing to acquire, which makes them the most profitable booking you can take.
        </p>
      </Card>
    )
  }
  return (
    <div className="space-y-3">
      <p className="text-[12px] leading-relaxed text-ink-2">
        <span className="num text-ink">{pct(share, 0)}</span> of named stays came from someone who had been before.
        These are the people to write to first when you have a gap to fill — they already know the boat ride.
      </p>
      <div className="grid gap-3 sm:grid-cols-2">
        {profiles.map((profile) => (
          <Card key={profile.key}>
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <h3 className="truncate text-[13px] font-semibold text-ink">{profile.name}</h3>
                <p className="mt-0.5 text-[11px] text-ink-3">
                  {profile.countries.join(', ') || 'Country not recorded'} · {profile.channels.join(', ')}
                </p>
              </div>
              <Pill tone="accent">{profile.stays.length} stays</Pill>
            </div>
            <div className="mt-2.5 flex flex-wrap gap-x-5 gap-y-1 text-[12px]">
              <span className="text-ink-2">
                Lifetime <span className="num font-medium text-ink">{money(profile.totalValue, 'PHP', true)}</span>
              </span>
              <span className="text-ink-2">
                <span className="num text-ink">{profile.nights}</span> nights
              </span>
              <span className="text-ink-2">
                Last <span className="num text-ink">{shortDate(profile.lastStay)}</span>
              </span>
            </div>
            <div className="mt-2.5 flex flex-wrap gap-1.5">
              {profile.stays.map((stay) => (
                <button
                  key={stay.id}
                  type="button"
                  onClick={() => onOpen(stay.id)}
                  className="rounded-md border border-line bg-surface-2 px-2 py-0.5 text-[11px] text-ink-2 transition-colors hover:bg-surface-3 hover:text-ink"
                >
                  {shortDate(stay.checkIn)}
                </button>
              ))}
            </div>
          </Card>
        ))}
      </div>
    </div>
  )
}

/**
 * The full record for one stay.
 *
 * Contact and notes are yours to keep current. The two money figures are
 * editable too, because a sheet row is sometimes only half filled in and the
 * alternative is a wrong number sitting in the P&L forever — but correcting one
 * stamps the record as hand-edited while keeping the pointer to the file and row
 * it came from, so the change is visible rather than silent.
 */
function StayDrawer({
  stay,
  profiles,
  quote,
  resolutionTotal,
  onClose,
}: {
  stay: GuestStay
  profiles: GuestProfile[]
  quote: AddOnQuote | null
  /** everything that moved through Airbnb for this stay beyond the room */
  resolutionTotal: number
  onClose: () => void
}) {
  const { updateBooking } = useLedger()
  const [contact, setContact] = useState(stay.contact)
  const [notes, setNotes] = useState(stay.notes)
  const [room, setRoom] = useState(String(stay.netRevenue))
  const [addOns, setAddOns] = useState(String(stay.addOnRevenue))
  // The payout export carries no party size, country or review — those live in
  // the Airbnb host inbox and only reach the book by being typed in.
  const [guests, setGuests] = useState(stay.guests > 0 ? String(stay.guests) : '')
  const [country, setCountry] = useState(stay.country)
  const [rating, setRating] = useState(stay.rating)
  const [review, setReview] = useState(stay.review)
  const [saved, setSaved] = useState(false)

  const profile = profiles.find((p) => p.stays.some((s) => s.id === stay.id))
  const roomValue = Number(room)
  const addOnValue = Number(addOns)
  const guestCount = guests.trim() === '' ? 0 : Math.round(Number(guests))
  const numbersValid =
    Number.isFinite(roomValue) && Number.isFinite(addOnValue) && Number.isFinite(guestCount) && guestCount >= 0
  const moneyChanged = numbersValid && (roomValue !== stay.netRevenue || addOnValue !== stay.addOnRevenue)
  const dirty =
    contact !== stay.contact ||
    notes !== stay.notes ||
    moneyChanged ||
    guestCount !== stay.guests ||
    country !== stay.country ||
    rating !== stay.rating ||
    review !== stay.review

  const save = async () => {
    if (!numbersValid) return
    const { segment, leadTime, totalValue, distance, ...booking } = stay
    void segment
    void leadTime
    void totalValue
    void distance
    await updateBooking({
      ...booking,
      contact: contact.trim(),
      notes: notes.trim(),
      guests: guestCount,
      country: country.trim(),
      rating: rating.trim(),
      review: review.trim(),
      netRevenue: roomValue,
      // Gross moves with the payout unless fees were recorded separately, so the
      // two do not silently drift apart.
      grossRevenue: moneyChanged && booking.fees === 0 ? roomValue : booking.grossRevenue,
      addOnRevenue: addOnValue,
      prov: moneyChanged ? { ...booking.prov, manual: true } : booking.prov,
    })
    setSaved(true)
  }

  return (
    <div className="no-print fixed inset-0 z-50 flex items-start justify-center overflow-y-auto p-4 sm:items-center">
      <button type="button" aria-label="Close" onClick={onClose} className="fixed inset-0 bg-black/60 backdrop-blur-[2px]" />
      <div className="animate-in relative w-full max-w-xl rounded-xl border border-line bg-bg shadow-2xl">
        <header className="sticky top-0 z-10 flex items-start justify-between gap-3 border-b border-line bg-bg px-4 py-3">
          <div className="min-w-0">
            <h2 className="truncate text-[14px] font-semibold text-ink">{stay.guestName.trim() || 'Unnamed booking'}</h2>
            <p className="mt-0.5 text-[11.5px] text-ink-2">
              {shortDate(stay.checkIn)} → {shortDate(stay.checkOut)} · {stay.nights} night
              {stay.nights === 1 ? '' : 's'} · {whenLabel(stay)}
            </p>
          </div>
          <Button variant="ghost" size="sm" onClick={onClose}>
            Close
          </Button>
        </header>

        <div className="space-y-4 px-4 pt-4">
          <div className="flex flex-wrap gap-1.5">
            <Pill tone={stay.segment === 'now' ? 'pos' : stay.segment === 'upcoming' ? 'info' : 'neutral'}>
              {stay.segment === 'now' ? 'Staying now' : stay.segment === 'upcoming' ? 'Upcoming' : 'Past stay'}
            </Pill>
            {stay.channel ? <Pill>{stay.channel}</Pill> : null}
            {stay.status ? <Pill>{stay.status}</Pill> : null}
            {profile && profile.repeat ? <Pill tone="accent">{profile.stays.length} stays with you</Pill> : null}
            {stay.prov.manual ? (
              <Pill
                tone="warn"
                title={
                  stay.prov.enteredBy || stay.prov.fileName === 'Entered by hand'
                    ? `Entered by ${stay.prov.enteredBy || 'someone'} rather than imported`
                    : 'Imported from the sheet, then corrected here'
                }
              >
                {stay.prov.enteredBy || stay.prov.fileName === 'Entered by hand' ? 'entered by hand' : 'corrected by hand'}
              </Pill>
            ) : null}
          </div>

          <dl className="grid grid-cols-2 gap-x-4 gap-y-2.5 sm:grid-cols-3">
            <Detail label="Booked on" value={stay.bookedOn ? shortDate(stay.bookedOn) : '—'} />
            <Detail label="Booked ahead" value={stay.leadTime >= 0 ? `${stay.leadTime} days` : '—'} />
            <Detail label="Confirmation" value={stay.confirmationCode || '—'} />
          </dl>

          <div className="rounded-lg border border-line bg-surface-2 p-3">
            <h4 className="text-[12px] font-semibold text-ink">Straight from Airbnb</h4>
            <p className="mt-1 text-[11.5px] leading-relaxed text-ink-2">
              The payout export has the money and the dates but not these three. They come from the reservation and the
              review in your Airbnb inbox, so this is where they get typed in — once, and they stay.
            </p>
            <div className="mt-2.5 grid gap-3 sm:grid-cols-3">
              <Field label="Party size">
                <TextInput
                  value={guests}
                  onChange={(v) => {
                    setGuests(v)
                    setSaved(false)
                  }}
                  type="number"
                  placeholder="Not recorded"
                />
              </Field>
              <Field label="Guest country">
                <TextInput
                  value={country}
                  onChange={(v) => {
                    setCountry(v)
                    setSaved(false)
                  }}
                  placeholder="Not recorded"
                />
              </Field>
              <Field label="Your rating">
                <TextInput
                  value={rating}
                  onChange={(v) => {
                    setRating(v)
                    setSaved(false)
                  }}
                  placeholder="A, B…"
                />
              </Field>
            </div>
            <div className="mt-3">
              <Field label="What they wrote">
                <textarea
                  value={review}
                  onChange={(event) => {
                    setReview(event.target.value)
                    setSaved(false)
                  }}
                  rows={3}
                  placeholder="Paste the review from Airbnb"
                  className={cx(inputClass, 'resize-y leading-relaxed')}
                />
              </Field>
            </div>
          </div>

          <div className="rounded-lg border border-line bg-surface-2 p-3">
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="Room payout" hint="What reached you for the accommodation, after platform fees.">
                <TextInput value={room} onChange={(v) => { setRoom(v); setSaved(false) }} type="number" />
              </Field>
              <Field label="Add-ons you kept" hint="Your share of catering, boat and tours — not the guest's total.">
                <TextInput value={addOns} onChange={(v) => { setAddOns(v); setSaved(false) }} type="number" />
              </Field>
            </div>
            {addOnValue < 0 ? (
              <p className="mt-2 text-[11.5px] leading-relaxed text-warn">
                A negative share usually means the sheet captured what went to the crew but not what the guest was
                charged. Put the amount you actually kept here — zero if you kept nothing.
              </p>
            ) : null}
            {stay.fees > 0 ? (
              <p className="mt-2 text-[11.5px] text-ink-3">
                Guest paid {money(stay.grossRevenue, stay.currency, true)}, less{' '}
                {money(stay.fees, stay.currency, true)} in fees.
              </p>
            ) : null}
            <p className="mt-2.5 border-t border-line pt-2.5 text-[11.5px] text-ink-2">
              Worth{' '}
              <span className="num font-medium text-ink">
                {money(numbersValid ? roomValue + addOnValue : stay.totalValue, stay.currency)}
              </span>{' '}
              in total —{' '}
              <span className="num">
                {money(stay.nights > 0 && numbersValid ? roomValue / stay.nights : 0, stay.currency)}
              </span>{' '}
              a night on the room.
            </p>
          </div>

          {quote ? (
            <div className="rounded-lg border border-line bg-surface-2 p-3">
              <h4 className="text-[12px] font-semibold text-ink">Catering, boat and tours</h4>
              <p className="mt-1 text-[11.5px] leading-relaxed text-ink-2">
                From the add-on form. Most of what the guest pays here is the island crew's; the margin is the only part
                the business keeps, and it is the figure carried into the P&amp;L above.
              </p>
              <dl className="mt-2.5 grid grid-cols-2 gap-x-4 gap-y-2.5 sm:grid-cols-4">
                <Detail label="Guest charged" value={money(quote.guestTotal, quote.currency, true)} />
                <Detail label="Crew cost" value={money(quote.allanCost, quote.currency, true)} />
                <Detail label="You keep" value={money(quote.margin, quote.currency, true)} />
                <Detail
                  label="Margin"
                  value={quote.guestTotal > 0 ? pct(quote.margin / quote.guestTotal, 1) : '—'}
                />
              </dl>
              <dl className="mt-2.5 grid grid-cols-2 gap-x-4 gap-y-2.5 border-t border-line pt-2.5 sm:grid-cols-4">
                <Detail label="Paid up front" value={money(quote.downpayment, quote.currency, true)} />
                <Detail label="Cash on arrival" value={money(quote.cashOnArrival, quote.currency, true)} />
                <Detail label="Party on form" value={quote.guests > 0 ? `${quote.guests} guests` : '—'} />
                <Detail label="Form submitted" value={shortDate(quote.submittedAt)} />
              </dl>
              {quote.allergies.trim() ? (
                <p className="mt-2.5 border-t border-line pt-2.5 text-[11.5px] leading-relaxed text-ink-2">
                  <span className="font-medium text-ink">Dietary:</span> {quote.allergies}
                </p>
              ) : null}
              {quote.snacks.trim() ? (
                <p className="mt-1.5 text-[11.5px] leading-relaxed text-ink-2">
                  <span className="font-medium text-ink">Requested:</span> {quote.snacks}
                </p>
              ) : null}
              {quote.pickup.trim() ? (
                <p className="mt-1.5 text-[11.5px] leading-relaxed text-ink-2">
                  <span className="font-medium text-ink">Pickup:</span> {quote.pickup}
                </p>
              ) : null}
            </div>
          ) : null}

          {resolutionTotal !== 0 ? (
            <p className="text-[11.5px] leading-relaxed text-ink-3">
              <span className="num text-ink-2">{money(resolutionTotal, 'PHP', true)}</span> also moved through Airbnb for
              this stay outside the room charge. That is the guest paying for food and boats through the platform, most
              of which goes to the crew — it is not counted as revenue, and it is how the bank total reconciles.
            </p>
          ) : null}

          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Contact" hint="Phone, email or handle — however you reach them.">
              <TextInput value={contact} onChange={(v) => { setContact(v); setSaved(false) }} placeholder="Not recorded" />
            </Field>
            <Field label="Notes" hint="Dietary needs, arrival plans, anything the crew should know.">
              <TextInput value={notes} onChange={(v) => { setNotes(v); setSaved(false) }} placeholder="Nothing noted" />
            </Field>
          </div>

          {/* The record is long enough to scroll, so the action stays reachable
              rather than sitting somewhere below the fold. */}
          <div className="sticky bottom-0 -mx-4 flex items-center justify-between gap-3 border-t border-line bg-bg px-4 py-3">
            <span className="text-[11.5px] text-ink-3">
              {stay.prov.enteredBy || stay.prov.fileName === 'Entered by hand'
                ? `Entered by ${stay.prov.enteredBy || 'hand'}`
                : `${stay.prov.fileName} › ${stay.prov.sheetName}, row ${stay.prov.rowNumber}${
                    stay.prov.manual ? ' · a figure was corrected by hand' : ''
                  }`}
            </span>
            <Button variant="primary" size="sm" disabled={!dirty} onClick={() => void save()}>
              {saved && !dirty ? 'Saved' : 'Save'}
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}

function Detail({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-[11px] font-medium uppercase tracking-wide text-ink-2">{label}</dt>
      <dd className="num mt-0.5 text-[12.5px] text-ink">{value}</dd>
    </div>
  )
}
