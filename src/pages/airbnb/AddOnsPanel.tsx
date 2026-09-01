import { useMemo, useState } from 'react'
import { Bar, BarChart, CartesianGrid, Tooltip, XAxis, YAxis } from 'recharts'
import { useLedger } from '@/state/store'
import { addOnsByMonth, buildAddOnStays, summariseAddOns, type AddOnStay } from '@/domain/airbnb/addons'
import { Button, Card, Field, Pill, SectionHeader, TextInput, cx } from '@/components/ui/primitives'
import { Stat, StatGrid } from '@/components/ui/Stat'
import { DataTable, type Column } from '@/components/ui/DataTable'
import { EmptyState } from '@/components/ui/EmptyState'
import { ChartFrame, Legend, tooltipProps } from '@/components/charts/Chart'
import { AXIS, GRID, SERIES, TOOLTIP_STYLE } from '@/components/charts/theme'
import { money, monthLabel, num, pct, shortDate } from '@/lib/format'

/**
 * Food, boats and tours — the whole of it, in one place.
 *
 * This page exists so the rest of the dashboard does not have to carry it. The
 * room business is measured on room revenue alone everywhere else; here is
 * where the crew's trade is laid out, with all three numbers visible at once:
 * what the guest paid, what went to Kuya Allan, and what stayed behind.
 */
export function AddOnsPanel() {
  const { bookings, addons, resolutions, saveAddOn, updateBooking } = useLedger()
  const [fixing, setFixing] = useState<string | null>(null)

  const rows = useMemo(
    () => buildAddOnStays({ bookings, quotes: addons, resolutions }),
    [bookings, addons, resolutions],
  )
  const summary = useMemo(() => summariseAddOns(rows), [rows])
  // Only the measured rows are plotted: a bar built from a number that might be
  // Allan's turnover would read as a huge month for the owner.
  const byMonth = useMemo(
    () => addOnsByMonth(rows.filter((row) => row.source === 'form')).filter((month) => month.charged > 0),
    [rows],
  )
  const excluded = addons.filter((quote) => quote.excluded)

  if (rows.length === 0) {
    return (
      <EmptyState
        title="No add-ons recorded yet"
        body="Import the guest add-on form responses and this fills in: what each guest paid for food, boats and tours, what went to the island crew, and what you kept."
        dataset="addons"
      />
    )
  }

  const columns: Column<AddOnStay>[] = [
    {
      key: 'guest',
      header: 'Guest',
      render: (row) => (
        <div className="min-w-0">
          <div className="flex items-center gap-1.5">
            <span className="truncate font-medium text-ink">{row.guestName}</span>
            {row.source === 'sheet' ? (
              <Pill tone="warn" title="From the old spreadsheet, which recorded one number without saying whose it was — not counted in any total">
                unverified
              </Pill>
            ) : null}
          </div>
          <div className="mt-0.5 text-[11px] text-ink-3">
            {shortDate(row.checkIn)} · {row.nights} night{row.nights === 1 ? '' : 's'}
          </div>
        </div>
      ),
      sortValue: (row) => row.checkIn,
    },
    {
      key: 'charged',
      header: 'Guest paid',
      align: 'right',
      render: (row) => (row.charged > 0 ? <span className="num">{money(row.charged, row.currency, true)}</span> : <span className="text-ink-3">not recorded</span>),
      sortValue: (row) => row.charged,
    },
    {
      key: 'allan',
      header: 'To Allan',
      align: 'right',
      render: (row) => (row.toAllan > 0 ? <span className="num text-ink-2">{money(row.toAllan, row.currency, true)}</span> : <span className="text-ink-3">—</span>),
      sortValue: (row) => row.toAllan,
    },
    {
      key: 'patong',
      header: 'Your patong',
      align: 'right',
      render: (row) => (
        <span
          className={cx(
            'num font-medium',
            row.patong < 0 ? 'text-neg' : row.source === 'sheet' ? 'text-ink-3' : 'text-ink',
          )}
          title={row.source === 'sheet' ? 'From the old sheet — not counted in the totals above' : undefined}
        >
          {money(row.patong, row.currency, true)}
        </span>
      ),
      sortValue: (row) => row.patong,
    },
    {
      key: 'margin',
      header: 'Margin',
      align: 'right',
      hideOnMobile: true,
      render: (row) => (row.marginPct > 0 ? pct(row.marginPct, 1) : <span className="text-ink-3">—</span>),
      sortValue: (row) => row.marginPct,
    },
    {
      key: 'airbnb',
      header: 'Through Airbnb',
      align: 'right',
      hideOnMobile: true,
      render: (row) =>
        row.throughAirbnb !== 0 ? (
          <span className="num text-ink-3">{money(row.throughAirbnb, 'PHP', true)}</span>
        ) : (
          <span className="text-ink-3">—</span>
        ),
      sortValue: (row) => row.throughAirbnb,
    },
  ]

  return (
    <div className="space-y-4">
      <Card className="border-info/25 bg-info/[0.04]">
        <div className="flex gap-3">
          <span className="mt-0.5 text-[14px] text-info">◫</span>
          <div>
            <h3 className="text-[13px] font-semibold text-ink">This is Allan's business, not the island's</h3>
            <p className="mt-1 max-w-3xl text-[12px] leading-relaxed text-ink-2">
              Guests pay you for food, boats and tours; almost all of it goes straight to Kuya Allan, and what stays is
              your patong on his quote. None of it is counted anywhere else in this dashboard — every revenue, rate,
              occupancy, profit and forecast figure on every other tab is the room and only the room. This page is where
              the whole flow lives, so you can see it without it distorting anything.
            </p>
          </div>
        </div>
      </Card>

      <StatGrid>
        <Stat
          label="Guests paid"
          value={summary.charged > 0 ? money(summary.charged, 'PHP', true) : '—'}
          sub={`across ${num(summary.measured, 0)} stay${summary.measured === 1 ? '' : 's'} on the form`}
          hint="What guests were charged for food, boats and tours. Not your money."
        />
        <Stat
          label="Went to Allan"
          value={summary.toAllan > 0 ? money(summary.toAllan, 'PHP', true) : '—'}
          sub={summary.charged > 0 ? `${pct(summary.toAllan / summary.charged, 0)} of what guests paid` : 'His quote'}
        />
        <Stat
          label="Your patong"
          value={summary.measured > 0 ? money(summary.patong, 'PHP', true) : 'Not measured yet'}
          tone={summary.patong >= 0 ? 'pos' : 'neg'}
          sub={summary.measured > 0 ? 'What you actually kept' : 'Needs a form submission'}
          hint="Counted only where the form recorded both what the guest paid and what Allan quoted, so it is arithmetic rather than a guess."
        />
        <Stat
          label="Margin"
          value={summary.marginPct > 0 ? pct(summary.marginPct, 1) : '—'}
          tone={summary.marginPct > 0 && summary.marginPct < 0.2 ? 'warn' : 'neutral'}
          sub="On stays where both sides are known"
          hint="A thin margin on a large gross means a lot of coordination and cash handling for little return."
        />
      </StatGrid>

      {summary.unverifiedStays > 0 ? (
        <Card>
          <h3 className="text-[13px] font-semibold text-ink">
            {num(summary.unverifiedStays, 0)} older stays carry a figure nobody can interpret
          </h3>
          <p className="mt-1 max-w-3xl text-[12px] leading-relaxed text-ink-2">
            The old spreadsheet had one add-on column, and it did not always mean the same thing — the crew's gross in
            the early years, your balance later, with nothing marking the change. Those stays add up to{' '}
            <span className="num text-ink">{money(summary.unverified, 'PHP', true)}</span>, and that number is
            deliberately kept out of your patong above: adding it would report Allan's turnover as your income. They are
            listed below so nothing is lost, and any of them can be corrected with both sides filled in.
          </p>
        </Card>
      ) : null}

      {summary.marginPct > 0 && summary.marginPct < 0.2 ? (
        <Card className="border-warn/25 bg-warn/[0.04]">
          <p className="max-w-3xl text-[12px] leading-relaxed text-ink-2">
            You handle <span className="num text-ink">{money(summary.charged, 'PHP', true)}</span> of guest money to keep{' '}
            <span className="num text-ink">{money(summary.patong, 'PHP', true)}</span> —{' '}
            <span className="num text-warn">{pct(summary.marginPct, 1)}</span>. That is a lot of coordination, cash and
            responsibility for a thin return. Three ways out: negotiate the split with Allan, quote the package as one
            number so the mark-up is not visible line by line, or treat it purely as a service that makes the room
            easier to sell and stop expecting it to be a second income.
          </p>
        </Card>
      ) : null}

      {summary.incomplete.length > 0 ? (
        <Card className="border-warn/25 bg-warn/[0.04]">
          <SectionHeader
            title={`${summary.incomplete.length} stay${summary.incomplete.length === 1 ? '' : 's'} with a figure that cannot be trusted`}
            subtitle="Either one side of the trade was never recorded, or the patong came out negative — which usually means the sheet captured Allan's cost but not what the guest was charged. The Airbnb column is what actually moved, so the difference is the arithmetic."
          />
          <div className="space-y-1.5">
            {summary.incomplete.map((row) => (
              <button
                key={row.id}
                type="button"
                onClick={() => setFixing(row.id)}
                className="block w-full rounded-md border border-warn/30 bg-warn/10 px-2.5 py-1.5 text-left text-[11.5px] transition-colors hover:bg-warn/20"
              >
                <span className="font-medium text-warn">{row.guestName}</span>
                <span className="ml-2 text-ink-2">
                  patong reads <span className="num">{money(row.patong, row.currency, true)}</span>
                  {row.throughAirbnb > 0 ? (
                    <>
                      {' · '}
                      <span className="num">{money(row.throughAirbnb, 'PHP', true)}</span> came through Airbnb, so about{' '}
                      <span className="num">{money(row.throughAirbnb + row.patong, 'PHP', true)}</span> looks like yours
                    </>
                  ) : null}
                </span>
              </button>
            ))}
          </div>
        </Card>
      ) : null}

      {byMonth.length > 1 ? (
        <Card>
          <ChartFrame
            title="Month by month"
            caption="What guests paid, split into the crew's share and yours. The height of the bar is not your revenue — only the darker slice is."
            right={<Legend items={[{ label: 'To Allan', color: SERIES[1] }, { label: 'Your patong', color: SERIES[0] }]} />}
            height={230}
          >
            <BarChart data={byMonth} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
              <CartesianGrid {...GRID} />
              <XAxis dataKey="month" {...AXIS} tickFormatter={monthLabel} minTickGap={16} />
              <YAxis {...AXIS} width={56} tickFormatter={(value: number) => money(value, 'PHP', true)} />
              <Tooltip
                {...TOOLTIP_STYLE}
                {...tooltipProps(
                  (value, name) => [money(value, 'PHP'), name === 'toAllan' ? 'To Allan' : 'Your patong'],
                  (label) => monthLabel(String(label)),
                )}
              />
              <Bar dataKey="toAllan" name="toAllan" stackId="a" fill={SERIES[1]} fillOpacity={0.5} maxBarSize={34} />
              <Bar dataKey="patong" name="patong" stackId="a" fill={SERIES[0]} radius={[4, 4, 0, 0]} maxBarSize={34} />
            </BarChart>
          </ChartFrame>
        </Card>
      ) : null}

      <Card padded={false}>
        <div className="border-b border-line px-4 py-3 sm:px-5">
          <SectionHeader
            title="Stay by stay"
            subtitle={
              summary.unverifiedStays > 0
                ? `${summary.unverifiedStays} of these came from the old spreadsheet, which recorded one number without saying whose it was — so the guest and crew columns are blank and the figure is not in any total above. Rows from the form have all three.`
                : 'Every row from a guest form submission, so all three numbers are known.'
            }
          />
        </div>
        <DataTable
          rows={rows}
          columns={columns}
          getKey={(row) => row.id}
          initialSort={{ key: 'guest', dir: 'desc' }}
          pageSize={20}
        />
      </Card>

      {excluded.length > 0 ? (
        <Card>
          <SectionHeader
            title={`${excluded.length} submission${excluded.length === 1 ? '' : 's'} flagged as tests`}
            subtitle="Kept rather than deleted, so a wrong call is visible and reversible. Restore one and its margin lands on the matching stay."
          />
          <div className="space-y-1.5">
            {excluded.map((quote) => (
              <div key={quote.id} className="flex flex-wrap items-center justify-between gap-2 text-[11.5px]">
                <span className="text-ink-2">
                  <span className="text-ink">{quote.guestName || '(no name)'}</span> · {shortDate(quote.checkIn)} ·{' '}
                  {money(quote.guestTotal, quote.currency, true)}
                  <span className="ml-1.5 text-ink-3">— {quote.excludedReason}</span>
                </span>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => void saveAddOn({ ...quote, excluded: false, excludedReason: '' })}
                >
                  Count it after all
                </Button>
              </div>
            ))}
          </div>
        </Card>
      ) : null}

      {fixing ? (
        <FixPatong
          row={rows.find((row) => row.id === fixing)!}
          onClose={() => setFixing(null)}
          onSaveQuote={saveAddOn}
          onSaveBooking={updateBooking}
        />
      ) : null}
    </div>
  )
}

/**
 * Correcting a stay whose patong is wrong.
 *
 * Writes back to whichever record the row came from — the form submission or
 * the booking the old sheet wrote to — so the correction lands where the next
 * import will not overwrite it.
 */
function FixPatong({
  row,
  onClose,
  onSaveQuote,
  onSaveBooking,
}: {
  row: AddOnStay
  onClose: () => void
  onSaveQuote: (quote: import('@/types').AddOnQuote) => Promise<void>
  onSaveBooking: (booking: import('@/types').Booking) => Promise<void>
}) {
  const { addons, bookings } = useLedger()
  const [charged, setCharged] = useState(row.charged > 0 ? String(row.charged) : '')
  const [toAllan, setToAllan] = useState(row.toAllan > 0 ? String(row.toAllan) : '')
  const [busy, setBusy] = useState(false)

  const chargedValue = Number(charged) || 0
  const allanValue = Number(toAllan) || 0
  const patong = chargedValue - allanValue
  const valid = chargedValue > 0 && allanValue >= 0

  const save = async () => {
    if (!valid) return
    setBusy(true)
    const quote = addons.find((item) => item.id === row.id)
    if (quote) {
      await onSaveQuote({ ...quote, guestTotal: chargedValue, allanCost: allanValue, margin: patong })
    } else {
      const booking = bookings.find((item) => item.id === row.id)
      if (booking) {
        await onSaveBooking({
          ...booking,
          addOnRevenue: patong,
          prov: { ...booking.prov, manual: true },
        })
      }
    }
    setBusy(false)
    onClose()
  }

  return (
    <div className="no-print fixed inset-0 z-50 flex items-start justify-center overflow-y-auto p-4 sm:items-center">
      <button type="button" aria-label="Close" onClick={onClose} className="fixed inset-0 bg-black/60 backdrop-blur-[2px]" />
      <div className="animate-in relative w-full max-w-md rounded-xl border border-line bg-bg p-4 shadow-2xl">
        <h2 className="text-[14px] font-semibold text-ink">{row.guestName}</h2>
        <p className="mt-0.5 text-[11.5px] text-ink-2">
          {shortDate(row.checkIn)} · {row.nights} night{row.nights === 1 ? '' : 's'}
        </p>

        {row.throughAirbnb > 0 ? (
          <p className="mt-2.5 rounded-lg border border-line bg-surface-2 p-2.5 text-[11.5px] leading-relaxed text-ink-2">
            <span className="num text-ink">{money(row.throughAirbnb, 'PHP', true)}</span> came through Airbnb for this
            stay outside the room charge. If Allan was paid{' '}
            <span className="num text-ink">{money(Math.abs(row.patong), 'PHP', true)}</span>, the guest was probably
            charged something near that plus your mark-up.
          </p>
        ) : null}

        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          <Field label="Guest was charged (₱)">
            <TextInput value={charged} onChange={setCharged} type="number" placeholder="0" />
          </Field>
          <Field label="Went to Allan (₱)">
            <TextInput value={toAllan} onChange={setToAllan} type="number" placeholder="0" />
          </Field>
        </div>

        <p className="mt-2.5 text-[12px] text-ink-2">
          Your patong:{' '}
          <span className={cx('num font-medium', patong < 0 ? 'text-neg' : 'text-ink')}>{money(patong, 'PHP')}</span>
          {chargedValue > 0 ? <span className="text-ink-3"> · {pct(patong / chargedValue, 1)}</span> : null}
        </p>

        <div className="mt-3 flex justify-end gap-2 border-t border-line pt-3">
          <Button variant="ghost" size="sm" onClick={onClose}>
            Cancel
          </Button>
          <Button variant="primary" size="sm" disabled={busy || !valid} onClick={() => void save()}>
            {busy ? 'Saving…' : 'Save'}
          </Button>
        </div>
      </div>
    </div>
  )
}
