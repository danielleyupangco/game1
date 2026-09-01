import type { CompetitorListing, CompetitorObservation } from '@/types'

/**
 * Watching the competition.
 *
 * Airbnb cannot be read automatically — it blocks machine access, and the
 * numbers that matter (a live rate for specific dates, how full a calendar is)
 * exist nowhere else. So every figure here is something a person saw on a day
 * and wrote down, and the model is built around that honestly: a listing is an
 * identity, and what it charged on a given date is an observation against it.
 *
 * That constraint is not only a limitation. A rate scraped once is a number; a
 * rate observed on the same dates month after month is a trend, and the trend
 * is what actually tells you whether the market is moving.
 */

export type ListingSnapshot = {
  listing: CompetitorListing
  latest: CompetitorObservation | null
  previous: CompetitorObservation | null
  observations: CompetitorObservation[]
  /** change in nightly rate between the two most recent observations */
  rateChange: number | null
  rateChangePct: number | null
  /** new reviews between the two most recent observations */
  reviewsGained: number | null
  /** reviews per month between observations — the closest thing to a demand read */
  reviewVelocity: number | null
  /** how long since anyone looked, in days */
  staleDays: number | null
}

function daysBetween(a: string, b: string): number {
  const left = new Date(`${a}T00:00:00`).getTime()
  const right = new Date(`${b}T00:00:00`).getTime()
  if (Number.isNaN(left) || Number.isNaN(right)) return 0
  return Math.round((right - left) / 86400000)
}

export function snapshotOf(
  listing: CompetitorListing,
  all: CompetitorObservation[],
  asOf: string,
): ListingSnapshot {
  const observations = all
    .filter((row) => row.listingId === listing.id)
    .sort((a, b) => a.observedOn.localeCompare(b.observedOn))
  const latest = observations[observations.length - 1] ?? null
  const previous = observations.length > 1 ? observations[observations.length - 2] : null

  const rateChange = latest && previous ? latest.nightlyRate - previous.nightlyRate : null
  const gap = latest && previous ? daysBetween(previous.observedOn, latest.observedOn) : 0
  const reviewsGained = latest && previous ? latest.reviewCount - previous.reviewCount : null

  return {
    listing,
    latest,
    previous,
    observations,
    rateChange,
    rateChangePct:
      latest && previous && previous.nightlyRate > 0 ? (latest.nightlyRate - previous.nightlyRate) / previous.nightlyRate : null,
    reviewsGained,
    // Reviews arrive after stays, so their pace is a lagging but real proxy for
    // how much a listing is actually selling. Below a month of separation the
    // number is noise, so it is not reported.
    reviewVelocity: reviewsGained !== null && gap >= 25 ? (reviewsGained / gap) * 30.44 : null,
    staleDays: latest ? daysBetween(latest.observedOn, asOf) : null,
  }
}

export type MarketRead = {
  tracked: number
  observed: number
  /** median nightly rate across the most recent observation of each listing */
  medianRate: number | null
  lowRate: number | null
  highRate: number | null
  /** your rate's position, 0 = cheapest, 1 = dearest */
  yourPercentile: number | null
  /** listings that changed price since the previous look */
  movers: ListingSnapshot[]
  /** listings nobody has looked at in over 45 days */
  stale: ListingSnapshot[]
  /** amenities several rivals list that you have not recorded */
  featureGaps: { amenity: string; rivals: number }[]
}

function median(values: number[]): number | null {
  if (values.length === 0) return null
  const sorted = [...values].sort((a, b) => a - b)
  const middle = Math.floor(sorted.length / 2)
  return sorted.length % 2 === 0 ? (sorted[middle - 1] + sorted[middle]) / 2 : sorted[middle]
}

export function readMarket(
  snapshots: ListingSnapshot[],
  yourNightlyRate: number,
  yourAmenities: string[],
): MarketRead {
  const rates = snapshots
    .map((snapshot) => snapshot.latest?.nightlyRate ?? 0)
    .filter((rate) => rate > 0)

  const mine = new Set(yourAmenities.map((item) => item.trim().toLowerCase()).filter(Boolean))
  const counts = new Map<string, number>()
  for (const snapshot of snapshots) {
    for (const amenity of new Set(snapshot.latest?.amenities ?? [])) {
      const key = amenity.trim().toLowerCase()
      if (!key || mine.has(key)) continue
      counts.set(amenity.trim(), (counts.get(amenity.trim()) ?? 0) + 1)
    }
  }

  return {
    tracked: snapshots.length,
    observed: snapshots.filter((snapshot) => snapshot.latest).length,
    medianRate: median(rates),
    lowRate: rates.length > 0 ? Math.min(...rates) : null,
    highRate: rates.length > 0 ? Math.max(...rates) : null,
    yourPercentile:
      rates.length > 0 && yourNightlyRate > 0
        ? rates.filter((rate) => rate < yourNightlyRate).length / rates.length
        : null,
    movers: snapshots.filter((snapshot) => snapshot.rateChange !== null && Math.abs(snapshot.rateChange) > 0),
    stale: snapshots.filter((snapshot) => snapshot.staleDays === null || snapshot.staleDays > 45),
    featureGaps: [...counts.entries()]
      .map(([amenity, rivals]) => ({ amenity, rivals }))
      .filter((row) => row.rivals >= 2)
      .sort((a, b) => b.rivals - a.rivals),
  }
}

/** The listings the owner named, so the tracker starts with something in it. */
export const SEED_LISTINGS: Omit<CompetitorListing, 'id' | 'addedAt'>[] = [
  {
    roomId: '1124254310478730220',
    name: 'Reference listing',
    host: '',
    area: 'Coron / Culion',
    url: 'https://www.airbnb.com/rooms/1124254310478730220',
    note: 'The listing you flagged first — the anchor for the comparison.',
    active: true,
  },
  {
    roomId: '1542585101559299608',
    name: 'Culion area listing',
    host: '',
    area: 'Culion, Palawan',
    url: 'https://www.airbnb.com/rooms/1542585101559299608',
    note: 'Surfaced on a Culion search for 20–22 Sep.',
    active: true,
  },
  {
    roomId: '810498845843468991',
    name: 'Coron area listing',
    host: '',
    area: 'Coron, Palawan',
    url: 'https://www.airbnb.com/rooms/810498845843468991',
    note: 'Category-tagged result on the same search.',
    active: true,
  },
  {
    roomId: '1157675553748265881',
    name: 'Coron area listing',
    host: '',
    area: 'Coron, Palawan',
    url: 'https://www.airbnb.com/rooms/1157675553748265881',
    note: 'Same search, same dates.',
    active: true,
  },
  {
    roomId: '835068738817936258',
    name: 'Coron area listing',
    host: '',
    area: 'Coron, Palawan',
    url: 'https://www.airbnb.com/rooms/835068738817936258',
    note: 'Same search, same dates.',
    active: true,
  },
  {
    roomId: '1049061392352383138',
    name: 'Coron area listing',
    host: '',
    area: 'Coron, Palawan',
    url: 'https://www.airbnb.com/rooms/1049061392352383138',
    note: 'Same search, same dates.',
    active: true,
  },
  {
    roomId: 'paolyn-houseboats',
    name: 'Paolyn Houseboats (all listings)',
    host: 'Paolo',
    area: 'Coron, Palawan',
    url: 'https://www.airbnb.com/users/profile/1467264748305053244',
    note: 'A multi-listing host rather than one room — watch the profile for new units appearing.',
    active: true,
  },
]

/**
 * The comparison that matters is not the headline rate but the rate per guest:
 * a private island for eight and a houseboat for two are not competing on the
 * same number, and reading them as if they were is how a good rate gets cut.
 */
export function perGuestRate(observation: CompetitorObservation): number | null {
  if (observation.maxGuests <= 0 || observation.nightlyRate <= 0) return null
  return observation.nightlyRate / observation.maxGuests
}
