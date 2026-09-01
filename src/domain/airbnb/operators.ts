import type { CompetitorListing, CompetitorObservation } from '@/types'
import type { ListingSnapshot } from '@/domain/airbnb/competitors'

/**
 * Who you are actually competing against.
 *
 * A watchlist of nine listings looked like nine rivals until the September
 * report established that five of them are one host. That changes the read
 * completely: a person with one beach house prices to fill it, and a person
 * with a portfolio across every size band prices to move a market. The second
 * is a competitor; the first is a listing.
 *
 * So the unit of analysis here is the operator, not the room. An operator's
 * span — the range from their cheapest bed to their dearest — is what says
 * whether they can reach your tier, and whether their rate moves are one host
 * testing a price or a portfolio repricing.
 */

export type Operator = {
  name: string
  listings: ListingSnapshot[]
  /** the cheapest and dearest nightly rate anyone has observed from them */
  low: number | null
  high: number | null
  /** high ÷ low — how much of the market one operator covers */
  span: number | null
  /** total reviews across their listings: the closest read on their volume */
  reviews: number
  /** their best-rated listing's rating */
  bestRating: number
  /** listings whose rate moved at the last look */
  movers: ListingSnapshot[]
  /** net rate change across the portfolio since the previous observation */
  rateMove: number
  /** true for the owner's own listing */
  isMine: boolean
  /** how close their dearest room gets to yours, as a fraction of your rate */
  reachOfYourRate: number | null
}

function nameKey(name: string): string {
  return name.trim().toLowerCase()
}

/**
 * Groups the watchlist by host.
 *
 * Listings with no host recorded are left as their own single-listing
 * operators rather than lumped into an "unknown" bucket — a rival whose host
 * has not been identified is still a rival, and merging them would invent a
 * portfolio that does not exist.
 */
export function groupByOperator(snapshots: ListingSnapshot[], yourRate: number): Operator[] {
  const buckets = new Map<string, ListingSnapshot[]>()
  for (const snapshot of snapshots) {
    const host = snapshot.listing.host.trim()
    const key = host ? nameKey(host) : `listing:${snapshot.listing.id}`
    const bucket = buckets.get(key)
    if (bucket) bucket.push(snapshot)
    else buckets.set(key, [snapshot])
  }

  const operators: Operator[] = []
  for (const bucket of buckets.values()) {
    const rates = bucket.map((row) => row.latest?.nightlyRate ?? 0).filter((rate) => rate > 0)
    const low = rates.length > 0 ? Math.min(...rates) : null
    const high = rates.length > 0 ? Math.max(...rates) : null
    const first = bucket[0].listing
    operators.push({
      name: first.host.trim() || first.name,
      listings: [...bucket].sort((a, b) => (b.latest?.nightlyRate ?? 0) - (a.latest?.nightlyRate ?? 0)),
      low,
      high,
      span: low !== null && high !== null && low > 0 ? high / low : null,
      reviews: bucket.reduce((sum, row) => sum + (row.latest?.reviewCount ?? 0), 0),
      bestRating: bucket.reduce((best, row) => Math.max(best, row.latest?.rating ?? 0), 0),
      movers: bucket.filter((row) => row.rateChange !== null && row.rateChange !== 0),
      rateMove: bucket.reduce((sum, row) => sum + (row.rateChange ?? 0), 0),
      isMine: bucket.some((row) => row.listing.isMine === true),
      reachOfYourRate: high !== null && yourRate > 0 ? high / yourRate : null,
    })
  }

  // Yours first, then whoever runs the most listings, then whoever charges most.
  return operators.sort((a, b) => {
    if (a.isMine !== b.isMine) return a.isMine ? -1 : 1
    return b.listings.length - a.listings.length || (b.high ?? 0) - (a.high ?? 0)
  })
}

export type PriceLadder = {
  /** every observed rate in the market, cheapest first */
  rungs: { name: string; operator: string; rate: number; isMine: boolean; maxGuests: number }[]
  /** the dearest rate below yours */
  belowYou: number | null
  /** the cheapest rate above yours */
  aboveYou: number | null
  /** the empty stretch you sit in, as a multiple of the rung below */
  gapBelow: number | null
  gapAbove: number | null
}

/**
 * The market as a ladder of prices.
 *
 * The interesting fact about this market is not where the median is but where
 * the holes are: the conventional homes stop around ₱7,400 and the houseboats
 * start around ₱44,000, and the island sits alone in between. A median across
 * both would describe a market that nobody is actually in.
 */
export function priceLadder(snapshots: ListingSnapshot[]): PriceLadder {
  const rungs = snapshots
    .filter((snapshot) => (snapshot.latest?.nightlyRate ?? 0) > 0)
    .map((snapshot) => ({
      name: snapshot.listing.name,
      operator: snapshot.listing.host.trim() || '—',
      rate: snapshot.latest!.nightlyRate,
      isMine: snapshot.listing.isMine === true,
      maxGuests: snapshot.latest!.maxGuests,
    }))
    .sort((a, b) => a.rate - b.rate)

  const mine = rungs.find((rung) => rung.isMine) ?? null
  if (!mine) return { rungs, belowYou: null, aboveYou: null, gapBelow: null, gapAbove: null }

  const below = rungs.filter((rung) => !rung.isMine && rung.rate < mine.rate)
  const above = rungs.filter((rung) => !rung.isMine && rung.rate > mine.rate)
  const belowYou = below.length > 0 ? below[below.length - 1].rate : null
  const aboveYou = above.length > 0 ? above[0].rate : null

  return {
    rungs,
    belowYou,
    aboveYou,
    gapBelow: belowYou !== null && belowYou > 0 ? mine.rate / belowYou : null,
    gapAbove: aboveYou !== null && mine.rate > 0 ? aboveYou / mine.rate : null,
  }
}

/**
 * What the island's add-on trade looks like per guest.
 *
 * Deliberately not divided into the market benchmark to produce a ratio. The
 * benchmark prices one activity for one person; this is everything a guest was
 * charged across a whole stay. They belong side by side as context, and a
 * number made by dividing one by the other would look like a finding while
 * meaning nothing.
 */
export type AddOnPerGuest = {
  stays: number
  guests: number
  chargedPerGuest: number
  toAllanPerGuest: number
  patongPerGuest: number
  marginPct: number
}

export function addOnPerGuest(
  rows: { charged: number; toAllan: number; patong: number; guests: number; source: string; incomplete: boolean }[],
): AddOnPerGuest | null {
  const measured = rows.filter((row) => row.source === 'form' && !row.incomplete && row.guests > 0 && row.charged > 0)
  if (measured.length === 0) return null
  const guests = measured.reduce((sum, row) => sum + row.guests, 0)
  const charged = measured.reduce((sum, row) => sum + row.charged, 0)
  const toAllan = measured.reduce((sum, row) => sum + row.toAllan, 0)
  const patong = measured.reduce((sum, row) => sum + row.patong, 0)
  return {
    stays: measured.length,
    guests,
    chargedPerGuest: charged / guests,
    toAllanPerGuest: toAllan / guests,
    patongPerGuest: patong / guests,
    marginPct: charged > 0 ? patong / charged : 0,
  }
}

/**
 * Rate history in a shape a chart can draw, one column per listing.
 *
 * Built from observations rather than reports so a rate typed in by hand sits
 * on the same line as one that arrived in a report — the source is recorded on
 * each observation, but the trend does not care where a number came from.
 */
export function rateHistory(
  listings: CompetitorListing[],
  observations: CompetitorObservation[],
): { observedOn: string; [listing: string]: number | string }[] {
  const byDate = new Map<string, Record<string, number>>()
  for (const observation of observations) {
    if (observation.nightlyRate <= 0) continue
    const listing = listings.find((row) => row.id === observation.listingId)
    if (!listing) continue
    const row = byDate.get(observation.observedOn) ?? {}
    row[listing.name || listing.roomId] = observation.nightlyRate
    byDate.set(observation.observedOn, row)
  }
  return [...byDate.entries()]
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([observedOn, rates]) => ({ observedOn, ...rates }))
}
