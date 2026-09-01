import { describe, expect, it } from 'vitest'
import { basisOf, moneyRange, parseLayout, parseRating, parseReportDate, proximityOf } from '@/lib/competitor-report'
import { addOnPerGuest, groupByOperator, priceLadder } from '@/domain/airbnb/operators'
import type { ListingSnapshot } from '@/domain/airbnb/competitors'
import type { CompetitorListing, CompetitorObservation } from '@/types'

/**
 * The report is written by hand each fortnight, so its wording will drift. These
 * pin down the readings that matter rather than the exact strings around them.
 */
describe('reading the report’s numbers', () => {
  it('reads the date the rates were captured', () => {
    expect(parseReportDate('1 Sept 2026', 2026)).toBe('2026-09-01')
    expect(parseReportDate('18 Aug 2026', 2026)).toBe('2026-08-18')
    // A quoted stay spans two days; the first is the one that dates it.
    expect(parseReportDate('4–6 Oct 2026', 2026)).toBe('2026-10-04')
    // A missing year falls back rather than failing the whole import.
    expect(parseReportDate('9 Dec', 2026)).toBe('2026-12-09')
    expect(parseReportDate('sometime soon', 2026)).toBeNull()
  })

  it('keeps a price range as a range', () => {
    expect(moneyRange('₱1,200–1,800 pp')).toEqual({ low: 1200, high: 1800 })
    expect(moneyRange('₱25,110')).toEqual({ low: 25110, high: 25110 })
    // A calendar that is closed has no price, and that is not a parse failure.
    expect(moneyRange('Booked*')).toBeNull()
  })

  it('splits a rating from its review count', () => {
    expect(parseRating('4.96 (76)')).toEqual({ rating: 4.96, reviews: 76 })
    expect(parseRating('"New"')).toEqual({ rating: 0, reviews: 0 })
  })

  it('reads capacity out of the layout line, which is what makes a rate comparable', () => {
    expect(parseLayout('Entire home · 9g · 3BR/7bed/3ba')).toEqual({ maxGuests: 9, bedrooms: 3 })
    expect(parseLayout('Entire home · 16+g · 6BR/12bed/6ba')).toEqual({ maxGuests: 16, bedrooms: 6 })
    expect(parseLayout('Room (B&B) · 1 king · private bath')).toEqual({ maxGuests: 0, bedrooms: 0 })
  })

  it('groups listings by how far they are from the island', () => {
    expect(proximityOf('● Culion — same island as you (nearest)')).toBe('same-island')
    expect(proximityOf('● Coron — ~1–2 hrs by boat (moderate)')).toBe('near')
    expect(proximityOf('● Busuanga — ~2–3 hrs travel (farthest)')).toBe('far')
    expect(proximityOf('Palawan')).toBe('unknown')
  })

  /**
   * The bug this was written for: the boat-charter note mentions a per-person
   * split, so searching rate and note together priced a whole boat as a seat.
   */
  it('takes the unit from the rate before the notes', () => {
    expect(basisOf('₱5,000–9,000 / boat', '~₱1,000–2,250 pp split 4–6 guests')).toBe('group')
    expect(basisOf('₱1,200–1,800 pp', 'Kayangan Lake, Twin Lagoon')).toBe('guest')
    expect(basisOf('₱150–200 pp', 'Private van ₱800–1,000 / vehicle')).toBe('guest')
    // Nothing in the rate, so the item name decides.
    expect(basisOf('₱14,900–43,200', 'Coron Tour A, 2–12 pax', 'Private boat — premium operators (per group)')).toBe(
      'group',
    )
    expect(basisOf('₱80–800', 'Carinderia ₱80–150', 'Meals (per person, per meal)')).toBe('guest')
    expect(basisOf('~₱200 / lake', '₱500–700/day; tribe fees separate', 'Environmental fees')).toBe('day')
    expect(basisOf('₱3,800 / ₱6,000 (2 pax)', '+12% VAT; fuel and guide included', "Paolo's speedboat")).toBe('group')
  })
})

const prov = { importId: 'i', fileName: 'report.html', sheetName: 'r', rowNumber: 1 }

function snapshot(name: string, host: string, rate: number, extra: Partial<CompetitorObservation> = {}, isMine = false) {
  const listing: CompetitorListing = {
    id: name,
    roomId: name,
    name,
    host,
    area: 'Coron',
    url: '',
    note: '',
    active: true,
    addedAt: '2026-09-01',
    isMine: isMine || undefined,
  }
  const latest: CompetitorObservation = {
    id: `${name}-obs`,
    prov,
    listingId: name,
    observedOn: '2026-09-01',
    quotedFor: '2026-10-04',
    nights: 2,
    guests: 2,
    nightlyRate: rate,
    cleaningFee: 0,
    currency: 'PHP',
    bedrooms: 1,
    maxGuests: 4,
    rating: 4.9,
    reviewCount: 10,
    nightsBookedNext90: 0,
    amenities: [],
    note: '',
    ...extra,
  }
  return {
    listing,
    latest,
    previous: null,
    observations: [latest],
    rateChange: null,
    rateChangePct: null,
    reviewsGained: null,
    reviewVelocity: null,
    staleDays: 0,
  } as ListingSnapshot
}

/**
 * The report's central finding: nine listings turned out to be four operators.
 * That is the difference between a crowded market and a concentrated one.
 */
describe('grouping the field by who runs it', () => {
  const field = [
    snapshot('Private Island Retreat', 'Danielle', 25110, { maxGuests: 9 }, true),
    snapshot('Seaview Bungalow', 'David', 2550),
    snapshot('Dream Beachhouse', 'David', 2550),
    snapshot('4BR Beachhouse', 'David', 6000),
    snapshot('6BR Beachhouse', 'David', 6710),
    snapshot('Large Seaview House', 'David', 7400),
    snapshot('Nemo Room', 'Paolo', 15056),
    snapshot('Entire houseboat', 'Paolo', 57906),
    snapshot('Casa Osmeña', 'Janette', 3972),
  ]

  it('turns nine listings into four operators', () => {
    const operators = groupByOperator(field, 25110)
    expect(operators).toHaveLength(4)
    expect(operators[0].isMine).toBe(true)
    // Then whoever runs the most listings.
    expect(operators[1].name).toBe('David')
    expect(operators[1].listings).toHaveLength(5)
  })

  it('measures how much of the market one operator covers', () => {
    const david = groupByOperator(field, 25110).find((row) => row.name === 'David')!
    expect(david.low).toBe(2550)
    expect(david.high).toBe(7400)
    expect(david.span).toBeCloseTo(2.9, 1)
    // And how close his dearest room gets to hers — the number that says
    // whether he can reach her tier.
    expect(david.reachOfYourRate).toBeCloseTo(7400 / 25110, 3)
  })

  it('does not invent a portfolio out of listings with no host recorded', () => {
    const anonymous = [snapshot('One', '', 1000), snapshot('Two', '', 2000)]
    expect(groupByOperator(anonymous, 0)).toHaveLength(2)
  })

  /**
   * The market has a hole either side of her, which is the whole argument for
   * her rate — a median across a ₱2,550 bungalow and a ₱58,000 houseboat
   * describes a market nobody is in.
   */
  it('finds the empty lane she sits in', () => {
    const ladder = priceLadder(field)
    expect(ladder.belowYou).toBe(15056)
    expect(ladder.aboveYou).toBe(57906)
    expect(ladder.gapBelow).toBeCloseTo(25110 / 15056, 3)
    expect(ladder.gapAbove).toBeCloseTo(57906 / 25110, 3)
    expect(ladder.rungs[0].rate).toBe(2550)
  })

  it('leaves a closed calendar off the ladder rather than pricing it at zero', () => {
    const withBooked = [...field, snapshot('Luxe Villa', 'Mel', 0, { demandSignal: 'Booked' })]
    const ladder = priceLadder(withBooked)
    expect(ladder.rungs.some((rung) => rung.name === 'Luxe Villa')).toBe(false)
  })
})

describe('the island’s own add-on economics, per guest', () => {
  const stay = (charged: number, toAllan: number, guests: number, source = 'form') => ({
    charged,
    toAllan,
    patong: charged - toAllan,
    guests,
    source,
    incomplete: false,
  })

  it('divides by heads, not by stays', () => {
    const result = addOnPerGuest([stay(20000, 16000, 4), stay(10000, 8000, 2)])!
    expect(result.guests).toBe(6)
    expect(result.chargedPerGuest).toBeCloseTo(5000)
    expect(result.patongPerGuest).toBeCloseTo(1000)
    expect(result.marginPct).toBeCloseTo(0.2)
  })

  it('ignores the rows whose figures cannot be trusted', () => {
    // A sheet row knows one side only; counting it would restate the crew's
    // turnover as her income, exactly as on the Add-ons tab.
    expect(addOnPerGuest([stay(20000, 16000, 4, 'sheet')])).toBeNull()
    expect(addOnPerGuest([{ ...stay(20000, 16000, 4), incomplete: true }])).toBeNull()
    expect(addOnPerGuest([])).toBeNull()
  })
})
