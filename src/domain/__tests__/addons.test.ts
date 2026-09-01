import { describe, expect, it } from 'vitest'
import { addOnsByMonth, buildAddOnStays, summariseAddOns } from '@/domain/airbnb/addons'
import type { AddOnQuote, Booking, Provenance, Resolution } from '@/types'

const prov: Provenance = { importId: 'i', fileName: 'f.csv', sheetName: 'S', rowNumber: 2 }

const booking = (over: Partial<Booking> = {}): Booking => ({
  id: 'b1',
  prov,
  confirmationCode: 'AAA111',
  guestName: 'Ana Cruz',
  channel: 'Airbnb',
  bookedOn: '2026-01-01',
  checkIn: '2026-03-01',
  checkOut: '2026-03-04',
  nights: 3,
  guests: 6,
  grossRevenue: 60000,
  fees: 0,
  netRevenue: 60000,
  addOnRevenue: 0,
  currency: 'PHP',
  status: 'confirmed',
  country: 'USA',
  rating: '',
  review: '',
  notes: '',
  contact: '',
  ...over,
})

const quote = (over: Partial<AddOnQuote> = {}): AddOnQuote => ({
  id: 'q1',
  prov,
  submittedAt: '2026-01-05',
  guestName: 'Ana Cruz',
  email: 'ana@real.fr',
  checkIn: '2026-03-01',
  checkOut: '2026-03-04',
  nights: 3,
  guests: 6,
  adults: 6,
  kids: 0,
  guestTotal: 120000,
  allanCost: 100000,
  margin: 20000,
  downpayment: 90000,
  cashOnArrival: 30000,
  currency: 'PHP',
  purpose: '',
  allergies: 'No shellfish',
  requests: '',
  snacks: '',
  pickup: '',
  dropoff: '',
  howHeard: '',
  excluded: false,
  excludedReason: '',
  ...over,
})

const resolution = (amount: number): Resolution => ({
  id: `r-${amount}`,
  prov,
  confirmationCode: 'AAA111',
  guestName: 'Ana Cruz',
  date: '2026-03-02',
  checkIn: '2026-03-01',
  checkOut: '2026-03-04',
  amount,
  currency: 'PHP',
  kind: 'payout',
  details: '',
})

describe('the add-on business, kept to itself', () => {
  it('shows all three numbers when the form recorded both sides', () => {
    const [row] = buildAddOnStays({ bookings: [booking()], quotes: [quote()], resolutions: [] })
    expect(row.charged).toBe(120000)
    expect(row.toAllan).toBe(100000)
    expect(row.patong).toBe(20000)
    expect(row.marginPct).toBeCloseTo(1 / 6, 10)
    expect(row.source).toBe('form')
    expect(row.incomplete).toBe(false)
  })

  it('never invents the crew’s side when only the old sheet knows the figure', () => {
    const rows = buildAddOnStays({
      bookings: [booking({ addOnRevenue: 45000 })],
      quotes: [],
      resolutions: [],
    })
    expect(rows).toHaveLength(1)
    expect(rows[0].source).toBe('sheet')
    expect(rows[0].patong).toBe(45000)
    // The sheet recorded only her side, so these stay blank rather than guessed.
    expect(rows[0].charged).toBe(0)
    expect(rows[0].toAllan).toBe(0)
  })

  it('prefers the form over the sheet for the same stay, rather than listing it twice', () => {
    const rows = buildAddOnStays({
      bookings: [booking({ addOnRevenue: 45000 })],
      quotes: [quote()],
      resolutions: [],
    })
    expect(rows).toHaveLength(1)
    expect(rows[0].source).toBe('form')
    expect(rows[0].patong).toBe(20000)
  })

  it('carries what actually moved through Airbnb, for reconciling', () => {
    const [row] = buildAddOnStays({
      bookings: [booking()],
      quotes: [quote()],
      resolutions: [resolution(80000), resolution(15000)],
    })
    expect(row.throughAirbnb).toBe(95000)
  })

  it('flags a stay whose patong cannot be trusted', () => {
    const rows = buildAddOnStays({
      bookings: [booking({ addOnRevenue: -130800 })],
      quotes: [],
      resolutions: [resolution(136000)],
    })
    expect(rows[0].incomplete).toBe(true)
    // The two numbers together are what makes the gap answerable.
    expect(rows[0].throughAirbnb + rows[0].patong).toBe(5200)
  })

  it('leaves excluded test submissions out of the flow entirely', () => {
    const rows = buildAddOnStays({
      bookings: [booking()],
      quotes: [quote({ excluded: true, excludedReason: 'test entry' })],
      resolutions: [],
    })
    expect(rows).toHaveLength(0)
  })

  it('never counts an unverifiable sheet figure as the owner’s patong', () => {
    const summary = summariseAddOns(
      buildAddOnStays({
        bookings: [booking(), booking({ id: 'b2', confirmationCode: 'BBB', guestName: 'Other', addOnRevenue: 500000 })],
        quotes: [quote()],
        resolutions: [],
      }),
    )
    expect(summary.stays).toBe(2)
    // The old sheet's 500,000 might be Allan's turnover rather than her income —
    // the column meant different things in different years. Summing it would
    // restate his takings as hers, so it is reported apart.
    expect(summary.patong).toBe(20000)
    expect(summary.measured).toBe(1)
    expect(summary.unverified).toBe(500000)
    expect(summary.unverifiedStays).toBe(1)
    expect(summary.marginPct).toBeCloseTo(1 / 6, 10)
  })

  it('keeps the unverifiable figures visible rather than dropping them', () => {
    const rows = buildAddOnStays({
      bookings: [booking({ addOnRevenue: 500000 })],
      quotes: [],
      resolutions: [],
    })
    expect(rows).toHaveLength(1)
    expect(rows[0].patong).toBe(500000)
    expect(rows[0].source).toBe('sheet')
  })

  it('adds up by month for the split chart', () => {
    const months = addOnsByMonth(
      buildAddOnStays({
        bookings: [booking(), booking({ id: 'b2', confirmationCode: 'BBB', checkIn: '2026-04-01', checkOut: '2026-04-03', guestName: 'Bee' })],
        quotes: [quote(), quote({ id: 'q2', guestName: 'Bee', checkIn: '2026-04-01', guestTotal: 50000, allanCost: 40000, margin: 10000 })],
        resolutions: [],
      }),
    )
    expect(months.map((m) => m.month)).toEqual(['2026-03', '2026-04'])
    expect(months[0].toAllan).toBe(100000)
    expect(months[1].patong).toBe(10000)
  })
})

describe('a stay whose payout Airbnb split into several rows', () => {
  // Airbnb writes an altered or long reservation as more than one Reservation
  // row under the same confirmation code. Room revenue is the sum of them — but
  // the add-on figure was recorded once against the stay, not once per row.
  const split = [
    booking({ id: 'b1', netRevenue: 22227.69, addOnRevenue: 8900 }),
    booking({ id: 'b2', netRevenue: 104471.5, addOnRevenue: 8900 }),
  ]

  it('counts the add-on figure once, not once per payout row', () => {
    const rows = buildAddOnStays({ bookings: split, quotes: [], resolutions: [] })
    expect(rows).toHaveLength(1)
    expect(rows[0].patong).toBe(8900)
  })

  it('still lists two different stays that happen to share a guest name', () => {
    const rows = buildAddOnStays({
      bookings: [
        booking({ id: 'b1', confirmationCode: 'AAA', addOnRevenue: 5000 }),
        booking({ id: 'b2', confirmationCode: 'BBB', checkIn: '2026-08-01', checkOut: '2026-08-04', addOnRevenue: 7000 }),
      ],
      quotes: [],
      resolutions: [],
    })
    expect(rows).toHaveLength(2)
  })
})
