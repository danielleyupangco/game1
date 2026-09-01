import { describe, expect, it } from 'vitest'
import { buildActualCash, buildStatement, expenseMatrix, totalStatement } from '@/domain/airbnb/statement'
import { findLevers } from '@/domain/airbnb/growth'
import { readMarket, snapshotOf, perGuestRate } from '@/domain/airbnb/competitors'
import type { Booking, CompetitorListing, CompetitorObservation, DividendPayout, Expense, Provenance } from '@/types'

const prov: Provenance = { importId: 'i', fileName: 'f.xlsx', sheetName: 'S', rowNumber: 2 }

const month = (m: string, revenue: number, addOn: number) => ({
  month: m,
  revenue,
  addOnRevenue: addOn,
  nightsSold: 10,
  availableNights: 30,
  occupancy: 10 / 30,
  bookings: 3,
  guestNights: 40,
  adr: revenue / 10,
  revpar: revenue / 30,
})

const expense = (date: string, category: string, amount: number): Expense => ({
  id: `${date}-${category}`,
  prov,
  date,
  category,
  nature: 'fixed',
  amount,
  currency: 'PHP',
  vendor: '',
  note: '',
})

describe('income statement', () => {
  const series = [month('2025-06', 200000, 90000), month('2026-01', 240000, 50000)]
  const expenses = [
    expense('2025-06-05', 'Salary', 34000),
    expense('2025-06-05', 'Per night costs', 20000),
    expense('2025-06-05', 'Depreciation', 12750),
    expense('2026-01-05', 'Salary', 34000),
    expense('2026-01-05', 'Per night costs', 20000),
  ]
  const built = buildStatement({ series, expenses, addOnIncomeFrom: '2025-12' })

  it('counts room revenue always and add-on margin only once it was tracked', () => {
    expect(built[0].roomRevenue).toBe(200000)
    // June 2025 predates the tracking date, so the crew's gross is not income.
    expect(built[0].addOnMargin).toBe(0)
    expect(built[0].revenue).toBe(200000)
    expect(built[1].addOnMargin).toBe(50000)
    expect(built[1].revenue).toBe(290000)
  })

  it('keeps the untracked add-on figure visible as a memo rather than deleting it', () => {
    expect(built[0].addOnGross).toBe(90000)
  })

  it('splits cost of sales from operating costs from depreciation', () => {
    expect(built[0].cogs).toBe(20000)
    expect(built[0].opex).toBe(34000)
    expect(built[0].depreciation).toBe(12750)
    expect(built[0].grossProfit).toBe(180000)
    expect(built[0].ebitda).toBe(146000)
    expect(built[0].ebit).toBe(133250)
  })

  it('moves the whole statement when the tracking date moves', () => {
    const earlier = buildStatement({ series, expenses, addOnIncomeFrom: '2025-01' })
    expect(earlier[0].addOnMargin).toBe(90000)
    expect(earlier[0].revenue).toBe(290000)
  })

  it('adds months into a column without double-counting percentages', () => {
    const total = totalStatement(built)
    expect(total.revenue).toBe(490000)
    expect(total.roomRevenue).toBe(440000)
    expect(total.cogs).toBe(40000)
    expect(total.ebitdaPct).toBeCloseTo(total.ebitda / total.revenue, 10)
    expect(total.byCategory.Salary).toBe(68000)
  })
})

describe('cash flow', () => {
  const series = [month('2026-01', 200000, 0), month('2026-02', 200000, 0)]
  const built = buildStatement({ series, expenses: [expense('2026-01-05', 'Salary', 50000)], addOnIncomeFrom: '2025-12' })
  const dividends: DividendPayout[] = [
    {
      id: 'd1',
      prov,
      date: '2026-02-10',
      amount: 300000,
      currency: 'PHP',
      recipients: [{ name: 'Dani', amount: 300000 }],
      approvedBy: 'Dani',
      note: '',
    },
  ]

  it('takes capital and dividends out of cash but never out of profit', () => {
    const cash = buildActualCash(built, { '2026-01': 100000 }, dividends, 50000)
    expect(built[0].ebitda).toBe(150000)
    expect(cash[0].investing).toBe(100000)
    expect(cash[0].net).toBe(200000 - 50000 - 100000)
    expect(cash[1].financing).toBe(300000)
    expect(cash[1].net).toBe(200000 - 300000)
  })

  it('carries the running balance forward from the opening figure', () => {
    const cash = buildActualCash(built, {}, [], 50000)
    expect(cash[0].running).toBe(50000 + 150000)
    expect(cash[1].running).toBe(cash[0].running + cash[1].net)
  })

  it('leaves depreciation out of cash, since no money moves', () => {
    const withDep = buildStatement({
      series,
      expenses: [expense('2026-01-05', 'Depreciation', 12750)],
      addOnIncomeFrom: '2025-12',
    })
    const cash = buildActualCash(withDep, {}, [], 0)
    expect(cash[0].operatingCosts).toBe(0)
  })
})

describe('expense summary', () => {
  it('lays categories down and months across, in the owner’s order', () => {
    const rows = expenseMatrix(
      [expense('2026-01-05', 'Maintenance', 5000), expense('2026-02-05', 'Salary', 34000), expense('2026-01-09', 'Maintenance', 1000)],
      ['2026-01', '2026-02'],
    )
    expect(rows[0].category).toBe('Salary')
    expect(rows[1].category).toBe('Maintenance')
    expect(rows[1].byMonth['2026-01']).toBe(6000)
    expect(rows[1].total).toBe(6000)
  })

  it('ignores months outside the period shown', () => {
    const rows = expenseMatrix([expense('2024-01-05', 'Salary', 1000)], ['2026-01'])
    expect(rows).toHaveLength(0)
  })
})

function booking(checkIn: string, nights: number, net: number, over: Partial<Booking> = {}): Booking {
  const out = new Date(`${checkIn}T00:00:00`)
  out.setDate(out.getDate() + nights)
  return {
    id: `${checkIn}-${net}-${Math.random()}`,
    prov,
    confirmationCode: checkIn,
    guestName: 'Guest',
    channel: 'Airbnb',
    bookedOn: checkIn,
    checkIn,
    checkOut: out.toISOString().slice(0, 10),
    nights,
    guests: 4,
    grossRevenue: net,
    fees: 0,
    netRevenue: net,
    addOnRevenue: 0,
    currency: 'PHP',
    status: 'confirmed',
    country: 'USA',
    rating: '',
    review: '',
    notes: '',
    contact: '',
    ...over,
  }
}

describe('growth levers', () => {
  // Twelve months of history with a deliberate hole in September.
  const stays: Booking[] = []
  for (const year of ['2024', '2025']) {
    for (let m = 1; m <= 12; m += 1) {
      const mm = String(m).padStart(2, '0')
      const nights = m === 9 ? 1 : 5
      stays.push(booking(`${year}-${mm}-05`, nights, nights * 18000, { id: `s-${year}-${mm}` }))
    }
  }

  it('says nothing at all without enough history', () => {
    expect(findLevers(stays.slice(0, 4), null)).toEqual([])
  })

  it('finds the empty month and names it', () => {
    const levers = findLevers(stays, null)
    const season = levers.find((lever) => lever.id === 'season')
    expect(season).toBeDefined()
    expect(season!.title).toContain('September')
    expect(season!.evidence).toContain('Sep')
  })

  it('flags a thin add-on margin only when it is genuinely thin', () => {
    expect(findLevers(stays, 0.16).some((l) => l.id === 'addons')).toBe(true)
    expect(findLevers(stays, 0.45).some((l) => l.id === 'addons')).toBe(false)
    expect(findLevers(stays, null).some((l) => l.id === 'addons')).toBe(false)
  })

  it('ranks by nights at stake so the biggest lever reads first', () => {
    const levers = findLevers(stays, 0.16)
    for (let i = 1; i < levers.length; i += 1) {
      expect(levers[i].nightsAtStake).toBeLessThanOrEqual(levers[i - 1].nightsAtStake)
    }
  })

  it('carries the evidence for every claim it makes', () => {
    for (const lever of findLevers(stays, 0.16)) {
      expect(lever.evidence.length).toBeGreaterThan(0)
      expect(lever.action.length).toBeGreaterThan(0)
    }
  })
})

describe('competitor tracking', () => {
  const listing: CompetitorListing = {
    id: 'c1',
    roomId: '123',
    name: 'Rival island',
    host: 'Someone',
    area: 'Coron',
    url: 'https://www.airbnb.com/rooms/123',
    note: '',
    active: true,
    addedAt: '2026-01-01',
  }

  const observe = (observedOn: string, nightlyRate: number, reviewCount: number): CompetitorObservation => ({
    id: `o-${observedOn}`,
    prov: { ...prov, manual: true },
    listingId: 'c1',
    observedOn,
    quotedFor: '20-22 Sep 2026',
    nights: 2,
    guests: 2,
    nightlyRate,
    cleaningFee: 0,
    currency: 'PHP',
    bedrooms: 3,
    maxGuests: 6,
    rating: 4.9,
    reviewCount,
    nightsBookedNext90: 0,
    amenities: ['kayaks', 'wifi'],
    note: '',
  })

  it('reports a price move between the two most recent looks', () => {
    const snapshot = snapshotOf(listing, [observe('2026-01-01', 10000, 20), observe('2026-03-01', 12000, 26)], '2026-03-05')
    expect(snapshot.rateChange).toBe(2000)
    expect(snapshot.rateChangePct).toBeCloseTo(0.2, 10)
    expect(snapshot.reviewsGained).toBe(6)
    expect(snapshot.staleDays).toBe(4)
  })

  it('refuses to compute a review pace from looks too close together', () => {
    const snapshot = snapshotOf(listing, [observe('2026-03-01', 10000, 20), observe('2026-03-08', 10000, 22)], '2026-03-08')
    expect(snapshot.reviewVelocity).toBeNull()
  })

  it('says nothing about a listing nobody has priced', () => {
    const snapshot = snapshotOf(listing, [], '2026-03-05')
    expect(snapshot.latest).toBeNull()
    expect(snapshot.staleDays).toBeNull()
    const market = readMarket([snapshot], 20000, [])
    expect(market.medianRate).toBeNull()
    expect(market.yourPercentile).toBeNull()
    expect(market.stale).toHaveLength(1)
  })

  it('places your rate against the ones actually observed', () => {
    const a = snapshotOf(listing, [observe('2026-03-01', 10000, 20)], '2026-03-01')
    const b = snapshotOf({ ...listing, id: 'c2' }, [{ ...observe('2026-03-01', 30000, 5), listingId: 'c2', id: 'o2' }], '2026-03-01')
    const market = readMarket([a, b], 20000, [])
    expect(market.medianRate).toBe(20000)
    expect(market.yourPercentile).toBe(0.5)
  })

  it('compares per guest, since a headline rate alone is not comparable', () => {
    expect(perGuestRate(observe('2026-03-01', 12000, 5))).toBe(2000)
    expect(perGuestRate({ ...observe('2026-03-01', 12000, 5), maxGuests: 0 })).toBeNull()
  })

  it('only calls an amenity a gap when several rivals have it and you do not', () => {
    const a = snapshotOf(listing, [observe('2026-03-01', 10000, 20)], '2026-03-01')
    const b = snapshotOf({ ...listing, id: 'c2' }, [{ ...observe('2026-03-01', 10000, 5), listingId: 'c2', id: 'o2' }], '2026-03-01')
    expect(readMarket([a, b], 0, []).featureGaps.map((g) => g.amenity)).toEqual(['kayaks', 'wifi'])
    expect(readMarket([a, b], 0, ['Kayaks']).featureGaps.map((g) => g.amenity)).toEqual(['wifi'])
    expect(readMarket([a], 0, []).featureGaps).toEqual([])
  })
})

describe('growth levers: the details that were wrong once', () => {
  const stays: Booking[] = []
  // Lead times spread wide enough for the percentiles to be distinguishable,
  // fed in deliberately unsorted.
  const leadDays = [5, 300, 40, 200, 10, 150, 60, 250, 20, 120, 90, 30]
  leadDays.forEach((lead, index) => {
    const checkIn = `2025-${String((index % 12) + 1).padStart(2, '0')}-15`
    const booked = new Date(`${checkIn}T00:00:00`)
    booked.setDate(booked.getDate() - lead)
    stays.push(
      booking(checkIn, 4, 72000, {
        id: `lead-${index}`,
        bookedOn: booked.toISOString().slice(0, 10),
        guestName: `Guest ${index}`,
        country: index < 3 ? 'Philippines' : 'USA',
      }),
    )
  })

  it('takes percentiles from sorted lead times, not the order they arrived in', () => {
    const lead = findLevers(stays, null).find((l) => l.id === 'lead')!
    expect(lead.evidence).toContain('30/90/200')
    expect(lead.title).toContain('90 days')
  })

  it('never lists the home market among the guests who fly in', () => {
    const domestic = findLevers(
      [
        ...stays,
        ...Array.from({ length: 20 }, (_, i) =>
          booking('2025-07-10', 3, 54000, { id: `us-${i}`, guestName: `US ${i}`, country: 'USA' }),
        ),
      ],
      null,
    ).find((l) => l.id === 'domestic')
    if (domestic) expect(domestic.finding.split('The rest fly in')[1]).not.toContain('Philippines')
  })

  it('folds a one-character misspelling into the country it belongs to', () => {
    const withTypo = [
      ...Array.from({ length: 9 }, (_, i) =>
        booking('2025-07-10', 3, 54000, { id: `ph-${i}`, guestName: `PH ${i}`, country: 'Philippines' }),
      ),
      ...Array.from({ length: 2 }, (_, i) =>
        booking('2025-08-10', 3, 54000, { id: `typo-${i}`, guestName: `T ${i}`, country: 'Philippinnes' }),
      ),
      ...Array.from({ length: 20 }, (_, i) =>
        booking('2025-09-10', 3, 54000, { id: `us2-${i}`, guestName: `US ${i}`, country: 'USA' }),
      ),
    ]
    const domestic = findLevers(withTypo, null).find((l) => l.id === 'domestic')
    // 11 of 31 is above the 25% threshold, so the lever correctly stays silent
    // once the misspelling stops splitting the market in two.
    expect(domestic).toBeUndefined()
  })

  it('does not merge two genuinely different countries', () => {
    const stays2 = [
      ...Array.from({ length: 12 }, (_, i) =>
        booking('2025-07-10', 3, 54000, { id: `a-${i}`, guestName: `A ${i}`, country: 'Austria' }),
      ),
      ...Array.from({ length: 12 }, (_, i) =>
        booking('2025-08-10', 3, 54000, { id: `b-${i}`, guestName: `B ${i}`, country: 'Australia' }),
      ),
    ]
    const domestic = findLevers(stays2, null).find((l) => l.id === 'domestic')!
    expect(domestic.evidence).toContain('Austria 12')
    expect(domestic.evidence).toContain('Australia 12')
  })
})
