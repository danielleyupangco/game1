import type { AddOnQuote, Booking, CompetitorListing, CompetitorObservation } from '@/types'
import type { MonthMetrics } from '@/domain/airbnb/metrics'
import { isAdjustment } from '@/domain/airbnb/metrics'

/**
 * The brief handed to Claude when the market read is refreshed.
 *
 * Everything in it is measured from the property's own records — no rounding
 * into "roughly", no adjectives. The quality of the answer is almost entirely
 * a function of how specific this is, and a brief that says "occupancy is low"
 * gets back advice that says "raise occupancy".
 */

export type BriefInput = {
  series: MonthMetrics[]
  bookings: Booking[]
  addons: AddOnQuote[]
  listings: CompetitorListing[]
  observations: CompetitorObservation[]
  asOf: string
}

export type Move = {
  title: string
  /** why this property specifically, referencing its numbers */
  why: string
  /** the concrete thing to do */
  action: string
  /** when it has to happen to matter */
  timing: string
  effort: 'low' | 'medium' | 'high'
  /** nights a year the move could plausibly be worth */
  nightsUpside: number
}

export type MarketBrief = {
  positioning: string
  threats: { title: string; detail: string }[]
  moves: Move[]
  /** things worth checking on Airbnb by hand, because no model can know them */
  toVerify: string[]
  generatedAt: string
}

function monthName(index1: number): string {
  return new Date(2000, index1 - 1, 1).toLocaleDateString('en-US', { month: 'long' })
}

/** Compact, numeric, and entirely from her records. */
export function buildBrief(input: BriefInput): string {
  const stays = input.bookings.filter((b) => !isAdjustment(b) && b.nights > 0 && b.netRevenue > 0)

  const byCalendarMonth = new Map<number, { nights: number; revenue: number }>()
  for (const stay of stays) {
    const month = Number(stay.checkIn.slice(5, 7))
    const bucket = byCalendarMonth.get(month) ?? { nights: 0, revenue: 0 }
    bucket.nights += stay.nights
    bucket.revenue += stay.netRevenue
    byCalendarMonth.set(month, bucket)
  }
  const seasonality = [...Array(12)]
    .map((_, index) => {
      const bucket = byCalendarMonth.get(index + 1) ?? { nights: 0, revenue: 0 }
      const rate = bucket.nights > 0 ? Math.round(bucket.revenue / bucket.nights) : 0
      return `${monthName(index + 1)}: ${bucket.nights} nights sold across all years, average rate ${rate || 'n/a'}`
    })
    .join('\n')

  const leads = stays
    .filter((stay) => stay.bookedOn)
    .map((stay) =>
      Math.round(
        (new Date(`${stay.checkIn}T00:00:00`).getTime() - new Date(`${stay.bookedOn}T00:00:00`).getTime()) / 86400000,
      ),
    )
    .filter((days) => days >= 0)
    .sort((a, b) => a - b)
  const at = (fraction: number) => (leads.length > 0 ? leads[Math.floor(leads.length * fraction)] : 0)

  const countries = new Map<string, number>()
  for (const stay of stays) {
    const country = stay.country.trim()
    if (country && country.toLowerCase() !== 'n/a') countries.set(country, (countries.get(country) ?? 0) + 1)
  }
  const topCountries = [...countries.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 8)
    .map(([country, count]) => `${country} ${count}`)
    .join(', ')

  const lengths = new Map<number, number>()
  for (const stay of stays) lengths.set(stay.nights, (lengths.get(stay.nights) ?? 0) + 1)
  const stayLengths = [...lengths.entries()]
    .sort((a, b) => a[0] - b[0])
    .map(([nights, count]) => `${nights}n×${count}`)
    .join(' ')

  const recent = input.series.filter((month) => month.month <= input.asOf.slice(0, 7)).slice(-12)
  const nightsSold = recent.reduce((sum, month) => sum + month.nightsSold, 0)
  const available = recent.reduce((sum, month) => sum + month.availableNights, 0)
  const roomRevenue = recent.reduce((sum, month) => sum + month.revenue, 0)

  const realQuotes = input.addons.filter((quote) => !quote.excluded && quote.guestTotal > 0)
  const marginLine =
    realQuotes.length > 0
      ? `Add-on margin: the owner keeps ${Math.round(
          (realQuotes.reduce((sum, q) => sum + q.margin, 0) / realQuotes.reduce((sum, q) => sum + q.guestTotal, 0)) * 100,
        )}% of what guests pay for food, boats and tours; the rest goes to the island crew, whose business it is.`
      : 'Add-on margin: not yet measured from enough form submissions.'

  const observed = input.listings
    .filter((listing) => listing.active)
    .map((listing) => {
      const rows = input.observations
        .filter((row) => row.listingId === listing.id)
        .sort((a, b) => a.observedOn.localeCompare(b.observedOn))
      const latest = rows[rows.length - 1]
      if (!latest) return `- ${listing.name || listing.roomId} (${listing.area}): tracked, never priced`
      return `- ${listing.name || listing.roomId} (${listing.area}): ${latest.nightlyRate} a night for ${latest.quotedFor}, sleeps ${latest.maxGuests}, ${latest.bedrooms} bedrooms, rating ${latest.rating} on ${latest.reviewCount} reviews, seen ${latest.observedOn}${latest.amenities.length ? `, amenities: ${latest.amenities.join(', ')}` : ''}`
    })
    .join('\n')

  const repeatNames = new Map<string, number>()
  for (const stay of stays) {
    const key = stay.guestName.trim().toLowerCase()
    if (key) repeatNames.set(key, (repeatNames.get(key) ?? 0) + 1)
  }
  const repeaters = [...repeatNames.values()].filter((count) => count > 1).length

  return `You are a revenue manager for small, remote, high-value holiday rentals. You are advising the owner of one property. Be concrete and specific to the numbers below; never give generic hosting advice.

THE PROPERTY
Island T, a private island retreat off Culion, Palawan, Philippines. 3 bedrooms, 3 baths, whole-island exclusive use, reached by boat from Coron. Sleeps large groups. Sold on Airbnb. The island crew, led by a local operator, run catering, boat transfers and tours as their own business; the owner earns the room revenue plus a margin on the crew's services.

TRAILING TWELVE MONTHS (to ${input.asOf})
Nights sold ${nightsSold} of ${available} available (occupancy ${available > 0 ? Math.round((nightsSold / available) * 100) : 0}%).
Room revenue ${Math.round(roomRevenue).toLocaleString()} PHP. Average nightly rate ${nightsSold > 0 ? Math.round(roomRevenue / nightsSold).toLocaleString() : 0} PHP.
${marginLine}

SEASONALITY — nights sold per calendar month, summed over the whole history
${seasonality}

HOW GUESTS BOOK
Lead time percentiles (days between booking and arrival): 25th ${at(0.25)}, 50th ${at(0.5)}, 75th ${at(0.75)}, on ${leads.length} stays.
Stay-length distribution: ${stayLengths}
Guest origin: ${topCountries || 'not recorded'}
Repeat guests: ${repeaters} of ${repeatNames.size} named guests have booked more than once.

COMPETITORS BEING TRACKED
${observed || '(none tracked yet)'}

WHAT TO PRODUCE
Return JSON only, no prose outside it, matching exactly:
{
  "positioning": "2-4 sentences on where this property sits in the Coron/Culion market and what it is actually selling. Reference its own numbers.",
  "threats": [{"title": "short", "detail": "1-2 sentences"}],
  "moves": [{"title": "short imperative", "why": "grounded in the numbers above", "action": "the concrete thing to do", "timing": "when, referencing the lead-time data", "effort": "low|medium|high", "nightsUpside": 12}],
  "toVerify": ["things the owner should check on Airbnb by hand, because they cannot be known without looking"]
}

Rules:
- 4 to 6 moves, ordered by nightsUpside descending. nightsUpside is nights per year, an integer, and must be justifiable from the data above.
- Every "why" must cite a specific number from this brief.
- You cannot see live Airbnb prices or availability. Never state a competitor's current rate as fact unless it appears in the tracked list above. Anything that needs looking up belongs in toVerify.
- Weak months and long lead times are the two biggest facts here. Do not recommend last-minute discounting if the lead-time data contradicts it.
- Prefer moves that raise nights sold in the weak months over moves that raise the rate in the strong ones.`
}
