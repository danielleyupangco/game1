import { describe, expect, it } from 'vitest'
import type { SheetPreview } from '@/lib/workbook'
import { looksLikeAirbnbPayout, parseAirbnbPayout, reconcile } from '@/lib/airbnb-csv'
import { looksLikeAddOnForm, matchQuotes, parseAddOnForm, testSubmissionReason } from '@/lib/addon-form'

const prov = { importId: 'i', fileName: 'f.csv', sheetName: 'CSV' }

function sheet(headers: string[], rows: unknown[][]): SheetPreview {
  return {
    name: 'CSV',
    headers,
    rows,
    rowNumbers: rows.map((_, i) => i + 2),
    sections: [{ label: 'CSV', startIndex: 0, endIndex: rows.length - 1 }],
    impliedDate: null,
  }
}

const AIRBNB_HEADERS = [
  'Date', 'Type', 'Confirmation code', 'Booking date', 'Start date', 'End date', 'Nights', 'Guest',
  'Listing', 'Details', 'Reference code', 'Currency', 'Amount', 'Paid out', 'Service fee', 'Fast pay fee',
  'Cleaning fee', 'Gross earnings', 'Airbnb remitted tax', 'Earnings year',
]

const airbnb = sheet(AIRBNB_HEADERS, [
  ['03/02/2026', 'Reservation', 'AAA111', '01/02/2026', '03/01/2026', '03/04/2026', 3, 'Ana Cruz',
   'Island T', '', '', 'PHP', '48,000.00', '', '1,500.00', '', '1000', '50000', '0', '2026'],
  ['03/02/2026', 'Resolution Payout', 'AAA111', '', '03/01/2026', '03/04/2026', 3, 'Ana Cruz',
   'Island T', 'Resolution payout for CLA-1', '', 'PHP', '90000', '', '', '', '', '90000', '', '2026'],
  ['03/05/2026', 'Payout', '', '', '', '', '', '', '', 'Transfer to bank', 'ref', 'PHP', '', '138000',
   '', '', '', '', '', ''],
  ['04/01/2026', 'Adjustment', 'BBB222', '02/01/2026', '03/20/2026', '03/22/2026', 2, 'Refunded Guest',
   'Island T', '', '', 'PHP', '-12000', '', '400', '', '-500', '', '0', '2026'],
])

describe('Airbnb transaction export', () => {
  it('recognises the file by its own headers', () => {
    expect(looksLikeAirbnbPayout(airbnb)).toBe(true)
    expect(looksLikeAirbnbPayout(sheet(['Date', 'Amount'], [['01/01/2026', 1]]))).toBe(false)
  })

  it('reads only reservations as room revenue', () => {
    const result = parseAirbnbPayout(airbnb, prov)
    expect(result.bookings).toHaveLength(2)
    const stay = result.bookings.find((b) => b.confirmationCode === 'AAA111')!
    expect(stay.netRevenue).toBe(48000)
    expect(stay.grossRevenue).toBe(50000)
    expect(stay.fees).toBe(1500)
    expect(stay.checkIn).toBe('2026-03-01')
    expect(stay.bookedOn).toBe('2026-01-02')
    expect(stay.channel).toBe('Airbnb')
  })

  it('keeps the crew money out of revenue', () => {
    const result = parseAirbnbPayout(airbnb, prov)
    expect(result.resolutions).toHaveLength(1)
    expect(result.resolutions[0].amount).toBe(90000)
    expect(result.resolutions[0].kind).toBe('payout')
    expect(result.bookings.find((b) => b.confirmationCode === 'AAA111')!.addOnRevenue).toBe(0)
  })

  it('ignores bank transfers rather than counting the same peso twice', () => {
    const result = parseAirbnbPayout(airbnb, prov)
    expect(result.payoutCount).toBe(1)
    expect(result.payoutTotal).toBe(138000)
    expect(result.bookings.some((b) => b.guestName === '')).toBe(false)
  })

  it('keeps a refund as a negative adjustment, not a stay', () => {
    const refund = parseAirbnbPayout(airbnb, prov).bookings.find((b) => b.confirmationCode === 'BBB222')!
    expect(refund.netRevenue).toBe(-12000)
    expect(refund.nights).toBe(-2)
    expect(refund.status).toBe('adjustment')
  })

  it('ties the bank total back to the rows behind it', () => {
    const sums = reconcile(parseAirbnbPayout(airbnb, prov))
    expect(sums.reservations).toBe(36000)
    expect(sums.resolutions).toBe(90000)
    expect(sums.paidOut).toBe(138000)
    expect(sums.difference).toBe(12000)
  })
})

const FORM_HEADERS = [
  'Submitted', 'Guest Name', 'Email', 'Check-In', 'Check-Out', 'Nights', 'Guests', 'Adults', 'Kids',
  'Purpose', 'Pickup Details', 'Dropoff Details', 'Total (PHP)', 'Allergies', 'Additional snacks',
  'Special Requests', "Allan's Cost", 'Guest cost calculated on the form', 'Margin (PHP)',
  'Guest downpayment sent to Dani via airbnb', 'Remaining owed to pay in cash to allan',
]

const row = (over: Record<number, unknown> = {}) => {
  const base: unknown[] = [
    '7/18/2026 3:48:23', 'Ana Cruz', 'ana@real.fr', 'March 1, 2026', 'March 4, 2026', 3, 8, 8, 0,
    'Friends vacation', 'Busuanga Airport', 'Busuanga Airport', '117900', 'None', 'Beers',
    '', '109370', '129820', '20450', '94650', '23250',
  ]
  for (const [index, value] of Object.entries(over)) base[Number(index)] = value
  return base
}

describe('guest add-on form', () => {
  it('recognises the responses sheet', () => {
    expect(looksLikeAddOnForm(sheet(FORM_HEADERS, [row()]))).toBe(true)
    expect(looksLikeAddOnForm(sheet(['Guest Name', 'Check-In'], [['A', 'March 1, 2026']]))).toBe(false)
  })

  it('keeps the margin, not the whole amount the guest pays', () => {
    const { quotes } = parseAddOnForm(sheet(FORM_HEADERS, [row()]), prov)
    expect(quotes).toHaveLength(1)
    expect(quotes[0].guestTotal).toBe(129820)
    expect(quotes[0].allanCost).toBe(109370)
    expect(quotes[0].margin).toBe(20450)
    expect(quotes[0].excluded).toBe(false)
  })

  it('derives the margin when the sheet own formula is blank', () => {
    const { quotes } = parseAddOnForm(sheet(FORM_HEADERS, [row({ 18: '' })]), prov)
    expect(quotes[0].margin).toBe(20450)
  })

  it('flags the owner own submissions with a reason', () => {
    const { quotes, excludedCount } = parseAddOnForm(
      sheet(FORM_HEADERS, [row({ 2: 'danielleyupangco@gmail.com' })]),
      prov,
    )
    expect(excludedCount).toBe(1)
    expect(quotes[0].excluded).toBe(true)
    expect(quotes[0].excludedReason).toContain('owner')
  })

  it('flags test rows without deleting them', () => {
    const rows = [
      row({ 1: 'TEST - setup check', 2: 'test@example.com' }),
      row({ 1: '149' }),
      row({ 1: 'Real Guest', 10: 'Pickup Location *' }),
      row({ 1: 'Ana Cruz' }),
    ]
    const { quotes, excludedCount } = parseAddOnForm(sheet(FORM_HEADERS, rows), prov)
    expect(quotes).toHaveLength(4)
    expect(excludedCount).toBe(3)
    expect(quotes[3].excluded).toBe(false)
  })

  it('names every exclusion so the judgement is arguable', () => {
    expect(testSubmissionReason({ 'guest name': 'Ana', email: 'ana@real.fr' })).toBe('')
    expect(testSubmissionReason({ 'guest name': 'Test 112', email: 'a@b.c' })).toContain('test')
    expect(testSubmissionReason({ 'guest name': '', email: 'a@b.c' })).toBe('no guest name')
  })

  it('ties a submission to its reservation by name and date', () => {
    const { quotes } = parseAddOnForm(sheet(FORM_HEADERS, [row()]), prov)
    const bookings = [
      { id: 'b1', guestName: 'ana  cruz', checkIn: '2026-03-01', checkOut: '2026-03-04' },
      { id: 'b2', guestName: 'Someone Else', checkIn: '2026-06-01', checkOut: '2026-06-03' },
    ]
    const [match] = matchQuotes(quotes, bookings)
    expect(match.bookingId).toBe('b1')
    expect(match.how).toBe('name and dates')
  })

  it('never matches an excluded submission to a real stay', () => {
    const { quotes } = parseAddOnForm(sheet(FORM_HEADERS, [row({ 1: 'TEST run', 2: 'test@example.com' })]), prov)
    const [match] = matchQuotes(quotes, [
      { id: 'b1', guestName: 'TEST run', checkIn: '2026-03-01', checkOut: '2026-03-04' },
    ])
    expect(match.bookingId).toBeNull()
    expect(match.how).toBe('unmatched')
  })
})
