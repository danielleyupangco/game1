import { useState } from 'react'
import { useLedger } from '@/state/store'
import { Button, Field, Select, TextInput, cx, inputClass } from '@/components/ui/primitives'
import { uid } from '@/lib/id'
import { today } from '@/lib/dates'
import { money } from '@/lib/format'
import { toExpenseNature } from '@/lib/coerce'
import { CAPEX_CATEGORIES, type Booking, type CapitalSpend, type Expense, type Provenance } from '@/types'

type Kind = 'expense' | 'booking' | 'capital'

/**
 * Adding things by hand.
 *
 * Everything entered here lands in the same stores as imported data, so it
 * flows straight into the P&L, the insights and the valuation — there is no
 * separate "manual" ledger to reconcile later. Each row records that it was
 * typed rather than imported, and by whom, so a shared book still says where
 * every number came from.
 */
export function QuickAdd({ open, onClose, initialKind = 'expense' }: { open: boolean; onClose: () => void; initialKind?: Kind }) {
  const [kind, setKind] = useState<Kind>(initialKind)
  if (!open) return null

  return (
    <div className="no-print fixed inset-0 z-50 flex items-start justify-center overflow-y-auto p-4 sm:items-center">
      <button type="button" aria-label="Close" onClick={onClose} className="fixed inset-0 bg-black/60 backdrop-blur-[2px]" />
      <div className="animate-in relative w-full max-w-lg rounded-xl border border-line bg-bg shadow-2xl">
        <header className="flex items-center justify-between gap-3 border-b border-line px-4 py-3">
          <h2 className="text-[14px] font-semibold text-ink">Add an entry</h2>
          <Button variant="ghost" size="sm" onClick={onClose}>
            Close
          </Button>
        </header>

        <div className="border-b border-line px-4 py-3">
          <div className="grid grid-cols-3 gap-1.5">
            {(
              [
                ['expense', 'Running cost', 'Something you pay to keep going'],
                ['booking', 'Booking', 'A stay, and what it earned'],
                ['capital', 'Capital spend', 'Something you bought that lasts'],
              ] as [Kind, string, string][]
            ).map(([value, label, hint]) => (
              <button
                key={value}
                type="button"
                onClick={() => setKind(value)}
                className={cx(
                  'rounded-lg border px-2.5 py-2 text-left transition-colors',
                  kind === value ? 'border-accent/50 bg-accent/10' : 'border-line bg-surface-2 hover:bg-surface-3',
                )}
              >
                <div className={cx('text-[12px] font-semibold', kind === value ? 'text-accent' : 'text-ink')}>{label}</div>
                <div className="mt-0.5 text-[10.5px] leading-tight text-ink-3">{hint}</div>
              </button>
            ))}
          </div>
        </div>

        <div className="px-4 py-4">
          {kind === 'expense' ? <ExpenseForm onDone={onClose} /> : null}
          {kind === 'booking' ? <BookingForm onDone={onClose} /> : null}
          {kind === 'capital' ? <CapitalForm onDone={onClose} /> : null}
        </div>
      </div>
    </div>
  )
}

function manualProv(enteredBy: string): Provenance {
  return {
    importId: 'manual',
    fileName: 'Entered by hand',
    sheetName: enteredBy || 'unknown',
    rowNumber: 0,
    manual: true,
    enteredBy: enteredBy || undefined,
  }
}

function useEnteredBy() {
  const [who, setWho] = useState(() => {
    try {
      return localStorage.getItem('buddy.enteredBy') ?? ''
    } catch {
      return ''
    }
  })
  const remember = (value: string) => {
    setWho(value)
    try {
      localStorage.setItem('buddy.enteredBy', value)
    } catch {
      /* private mode — the name just won't stick */
    }
  }
  return [who, remember] as const
}

function EnteredBy({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return (
    <Field label="Entered by" hint="So a shared book says who recorded what. Remembered on this device.">
      <TextInput value={value} onChange={onChange} placeholder="Your name" />
    </Field>
  )
}

function ExpenseForm({ onDone }: { onDone: () => void }) {
  const { addRecords } = useLedger()
  const [date, setDate] = useState(today())
  const [category, setCategory] = useState('')
  const [amount, setAmount] = useState('')
  const [vendor, setVendor] = useState('')
  const [nature, setNature] = useState<'auto' | 'fixed' | 'variable'>('auto')
  const [repeat, setRepeat] = useState('1')
  const [who, setWho] = useEnteredBy()
  const [busy, setBusy] = useState(false)

  const value = Number(amount) || 0
  const months = Math.max(1, Math.min(36, Math.round(Number(repeat) || 1)))
  const resolved = nature === 'auto' ? toExpenseNature(null, category) : nature

  const submit = async () => {
    if (!category.trim() || value <= 0) return
    setBusy(true)
    const rows: Expense[] = []
    for (let index = 0; index < months; index++) {
      const start = new Date(`${date}T00:00:00`)
      start.setMonth(start.getMonth() + index)
      rows.push({
        id: uid('exp'),
        prov: manualProv(who),
        date: start.toISOString().slice(0, 10),
        category: category.trim(),
        nature: resolved,
        amount: value,
        currency: 'PHP',
        vendor: vendor.trim(),
        note: months > 1 ? `Repeating entry ${index + 1} of ${months}` : '',
      })
    }
    await addRecords('expenses', rows)
    setBusy(false)
    onDone()
  }

  return (
    <div className="space-y-3">
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="Date">
          <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className={inputClass} />
        </Field>
        <Field label="Amount (₱)">
          <TextInput value={amount} onChange={setAmount} type="number" placeholder="0" />
        </Field>
      </div>
      <Field label="What was it for" hint="Crew salaries, diesel, catering, boat fuel…">
        <TextInput value={category} onChange={setCategory} placeholder="e.g. Boat fuel" />
      </Field>
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="Paid to">
          <TextInput value={vendor} onChange={setVendor} placeholder="Optional" />
        </Field>
        <Field
          label="Fixed or variable"
          hint={
            nature === 'auto'
              ? `Guessed as ${resolved} from the description. Fixed = you pay it even with no guests.`
              : 'Fixed = you pay it even with no guests. Variable = only when someone stays.'
          }
        >
          <Select
            value={nature}
            onChange={(v) => setNature(v as typeof nature)}
            options={[
              { value: 'auto', label: `Work it out for me (${resolved})` },
              { value: 'fixed', label: 'Fixed — paid every month regardless' },
              { value: 'variable', label: 'Variable — only when guests come' },
            ]}
          />
        </Field>
      </div>
      <Field
        label="Repeat monthly for"
        hint="For something you pay every month. One entry is created per month, so the P&L shows it where it falls."
      >
        <div className="flex items-center gap-2">
          <input
            type="number"
            min={1}
            max={36}
            value={repeat}
            onChange={(e) => setRepeat(e.target.value)}
            className={cx(inputClass, 'num w-24')}
          />
          <span className="text-[12px] text-ink-2">month{months === 1 ? '' : 's'}</span>
        </div>
      </Field>
      <EnteredBy value={who} onChange={setWho} />

      <div className="flex items-center justify-between gap-3 border-t border-line pt-3">
        <span className="text-[12px] text-ink-2">
          {value > 0 ? (
            <>
              Adds <span className="num text-ink">{money(value * months, 'PHP')}</span>
              {months > 1 ? ` across ${months} months` : ''} as a {resolved} cost
            </>
          ) : (
            'Enter an amount'
          )}
        </span>
        <Button variant="primary" disabled={busy || !category.trim() || value <= 0} onClick={() => void submit()}>
          {busy ? 'Adding…' : 'Add cost'}
        </Button>
      </div>
    </div>
  )
}

function BookingForm({ onDone }: { onDone: () => void }) {
  const { addRecords } = useLedger()
  const [checkIn, setCheckIn] = useState(today())
  const [checkOut, setCheckOut] = useState(today())
  const [guestName, setGuestName] = useState('')
  const [guests, setGuests] = useState('2')
  const [room, setRoom] = useState('')
  const [addOns, setAddOns] = useState('')
  const [channel, setChannel] = useState('Airbnb')
  const [country, setCountry] = useState('')
  const [who, setWho] = useEnteredBy()
  const [busy, setBusy] = useState(false)

  const nights = Math.max(
    0,
    Math.round(
      (new Date(`${checkOut}T00:00:00`).getTime() - new Date(`${checkIn}T00:00:00`).getTime()) / 86400000,
    ),
  )
  const roomValue = Number(room) || 0
  const addOnValue = Number(addOns) || 0
  const valid = nights > 0 && roomValue + addOnValue > 0

  const submit = async () => {
    if (!valid) return
    setBusy(true)
    const booking: Booking = {
      id: uid('bkg'),
      prov: manualProv(who),
      confirmationCode: `MANUAL-${checkIn}`,
      guestName: guestName.trim(),
      channel: channel.trim() || 'Direct',
      bookedOn: today(),
      checkIn,
      checkOut,
      nights,
      guests: Math.max(1, Math.round(Number(guests) || 1)),
      grossRevenue: roomValue,
      fees: 0,
      netRevenue: roomValue,
      addOnRevenue: addOnValue,
      currency: 'PHP',
      status: 'confirmed',
      country: country.trim(),
      rating: '',
    }
    await addRecords('bookings', [booking])
    setBusy(false)
    onDone()
  }

  return (
    <div className="space-y-3">
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="Check-in">
          <input type="date" value={checkIn} onChange={(e) => setCheckIn(e.target.value)} className={inputClass} />
        </Field>
        <Field label="Check-out" hint={nights > 0 ? `${nights} night${nights === 1 ? '' : 's'}` : 'Must be after check-in'}>
          <input type="date" value={checkOut} onChange={(e) => setCheckOut(e.target.value)} className={inputClass} />
        </Field>
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="Guest name">
          <TextInput value={guestName} onChange={setGuestName} placeholder="Optional" />
        </Field>
        <Field label="Number of guests">
          <TextInput value={guests} onChange={setGuests} type="number" />
        </Field>
      </div>

      <div className="rounded-lg border border-line bg-surface-2 p-3">
        <p className="mb-2.5 text-[11.5px] leading-relaxed text-ink-2">
          Keep these two apart. The room payout is what you got for the accommodation; add-ons are your share of
          catering, boat trips and tours after anything passed to the crew. Rate and occupancy are measured on the room
          alone, so mixing them would flatter both.
        </p>
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Room payout (₱)" hint="What actually reached you, after platform fees">
            <TextInput value={room} onChange={setRoom} type="number" placeholder="0" />
          </Field>
          <Field label="Add-ons you kept (₱)" hint="Your share only, not what the guest paid in total">
            <TextInput value={addOns} onChange={setAddOns} type="number" placeholder="0" />
          </Field>
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="Booked through">
          <TextInput value={channel} onChange={setChannel} placeholder="Airbnb, Direct…" />
        </Field>
        <Field label="Guest country">
          <TextInput value={country} onChange={setCountry} placeholder="Optional" />
        </Field>
      </div>
      <EnteredBy value={who} onChange={setWho} />

      <div className="flex items-center justify-between gap-3 border-t border-line pt-3">
        <span className="text-[12px] text-ink-2">
          {valid ? (
            <>
              <span className="num text-ink">{money(roomValue + addOnValue, 'PHP')}</span> over {nights} night
              {nights === 1 ? '' : 's'} · rate {money(roomValue / nights, 'PHP')}
            </>
          ) : (
            'Needs dates and an amount'
          )}
        </span>
        <Button variant="primary" disabled={busy || !valid} onClick={() => void submit()}>
          {busy ? 'Adding…' : 'Add booking'}
        </Button>
      </div>
    </div>
  )
}

function CapitalForm({ onDone }: { onDone: () => void }) {
  const { addCapitalSpend, projects, saveProjects } = useLedger()
  const [date, setDate] = useState(today())
  const [item, setItem] = useState('')
  const [amount, setAmount] = useState('')
  const [category, setCategory] = useState<string>(CAPEX_CATEGORIES[0])
  const [projectId, setProjectId] = useState('')
  const [newProject, setNewProject] = useState('')
  const [newBudget, setNewBudget] = useState('')
  const [vendor, setVendor] = useState('')
  const [who, setWho] = useEnteredBy()
  const [busy, setBusy] = useState(false)

  const value = Number(amount) || 0
  const creating = projectId === '__new'
  const valid = item.trim() !== '' && value > 0 && (!creating || newProject.trim() !== '')

  const submit = async () => {
    if (!valid) return
    setBusy(true)
    let target = projectId === '__none' || projectId === '' ? '' : projectId

    if (creating) {
      const id = uid('prj')
      await saveProjects([
        ...projects,
        {
          id,
          name: newProject.trim(),
          capex: Number(newBudget) || value,
          annualCashflow: 0,
          rampYears: 1,
          lifeYears: 10,
          terminalValue: 0,
          note: '',
          status: 'active',
        },
      ])
      target = id
    }

    const spend: CapitalSpend = {
      id: uid('cap'),
      prov: manualProv(who),
      projectId: target,
      date,
      item: item.trim(),
      category,
      amount: value,
      currency: 'PHP',
      vendor: vendor.trim(),
      note: '',
    }
    await addCapitalSpend(spend)
    setBusy(false)
    onDone()
  }

  return (
    <div className="space-y-3">
      <div className="rounded-lg border border-info/25 bg-info/[0.06] px-3 py-2 text-[11.5px] leading-relaxed text-ink-2">
        <span className="font-medium text-info">This is money out of the bank, not a cost against profit.</span> A new
        generator or a bridge repair buys something that lasts, so it does not reduce this year's profit the way diesel
        does — it shows up in cash and in the value of what you own.
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="Date">
          <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className={inputClass} />
        </Field>
        <Field label="Amount (₱)">
          <TextInput value={amount} onChange={setAmount} type="number" placeholder="0" />
        </Field>
      </div>
      <Field label="What did you buy or fix">
        <TextInput value={item} onChange={setItem} placeholder="e.g. Water heater for the main bathroom" />
      </Field>
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="Type" hint="Groups the spend so you can see where capital is going.">
          <Select
            value={category}
            onChange={setCategory}
            options={CAPEX_CATEGORIES.map((c) => ({ value: c, label: c }))}
          />
        </Field>
        <Field label="Paid to">
          <TextInput value={vendor} onChange={setVendor} placeholder="Optional" />
        </Field>
      </div>

      <Field label="Part of a project" hint="Attach it to a budget to track how much is left.">
        <Select
          value={projectId}
          onChange={setProjectId}
          options={[
            { value: '__none', label: 'One-off, no project' },
            ...projects.map((project) => ({ value: project.id, label: project.name })),
            { value: '__new', label: '+ Start a new project…' },
          ]}
        />
      </Field>

      {creating ? (
        <div className="grid gap-3 rounded-lg border border-line bg-surface-2 p-3 sm:grid-cols-2">
          <Field label="Project name">
            <TextInput value={newProject} onChange={setNewProject} placeholder="e.g. Guest bathroom refit" />
          </Field>
          <Field label="Budget (₱)" hint="What you expect the whole thing to cost.">
            <TextInput value={newBudget} onChange={setNewBudget} type="number" placeholder="0" />
          </Field>
        </div>
      ) : null}

      <EnteredBy value={who} onChange={setWho} />

      <div className="flex items-center justify-between gap-3 border-t border-line pt-3">
        <span className="text-[12px] text-ink-2">
          {value > 0 ? (
            <>
              <span className="num text-ink">{money(value, 'PHP')}</span> of capital spend
            </>
          ) : (
            'Enter an amount'
          )}
        </span>
        <Button variant="primary" disabled={busy || !valid} onClick={() => void submit()}>
          {busy ? 'Adding…' : 'Add spend'}
        </Button>
      </div>
    </div>
  )
}
