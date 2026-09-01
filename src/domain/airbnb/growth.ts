import type { Booking } from '@/types'
import { isAdjustment } from '@/domain/airbnb/metrics'
/** Full month names read better in a sentence than the three-letter form. */
function monthName(monthIndex1: number): string {
  return new Date(2000, monthIndex1 - 1, 1).toLocaleDateString('en-US', { month: 'long' })
}

/**
 * Where the next booking actually comes from.
 *
 * Not a checklist of good practice — every lever below is derived from this
 * property's own history and carries the number that produced it, so the ones
 * that do not apply simply do not appear. The ranking is by nights at stake,
 * because a lever worth four nights a year is not worth a season of effort.
 */

export type Lever = {
  id: string
  title: string
  /** the finding, in the owner's terms */
  finding: string
  /** what to do about it */
  action: string
  /** the evidence, so the claim is checkable rather than asserted */
  evidence: string
  /** rough nights a year at stake, used only for ordering */
  nightsAtStake: number
  tone: 'warn' | 'info' | 'pos'
}

type Sellable = Booking & { nights: number }

function sellable(bookings: Booking[]): Sellable[] {
  return bookings.filter(
    (booking) => !isAdjustment(booking) && booking.nights > 0 && booking.netRevenue > 0,
  ) as Sellable[]
}

/**
 * True when two country names differ by a single typed character — "Philippines"
 * against "Philippinnes". Deliberately narrow: anything looser would start
 * merging genuinely different places.
 */
function closeSpelling(a: string, b: string): boolean {
  const left = a.trim().toLowerCase()
  const right = b.trim().toLowerCase()
  if (left === right) return true
  if (Math.abs(left.length - right.length) > 1) return false
  if (left.length < 5) return false

  const [shorter, longer] = left.length <= right.length ? [left, right] : [right, left]
  let i = 0
  let j = 0
  let edits = 0
  while (i < shorter.length && j < longer.length) {
    if (shorter[i] === longer[j]) {
      i += 1
      j += 1
      continue
    }
    edits += 1
    if (edits > 1) return false
    if (shorter.length === longer.length) i += 1
    j += 1
  }
  return edits + (longer.length - j) + (shorter.length - i) <= 1
}

function median(values: number[]): number {
  if (values.length === 0) return 0
  const sorted = [...values].sort((a, b) => a - b)
  const middle = Math.floor(sorted.length / 2)
  return sorted.length % 2 === 0 ? (sorted[middle - 1] + sorted[middle]) / 2 : sorted[middle]
}

export function findLevers(bookings: Booking[], addOnMarginRate: number | null): Lever[] {
  const stays = sellable(bookings)
  if (stays.length < 8) return []

  const levers: Lever[] = []

  // --- Seasonality: which months are empty, and what they fetch when sold ---
  const nightsByMonth = new Map<number, number>()
  const revenueByMonth = new Map<number, number>()
  for (const stay of stays) {
    const month = Number(stay.checkIn.slice(5, 7))
    nightsByMonth.set(month, (nightsByMonth.get(month) ?? 0) + stay.nights)
    revenueByMonth.set(month, (revenueByMonth.get(month) ?? 0) + stay.netRevenue)
  }
  const perMonth = [...Array(12)].map((_, index) => {
    const month = index + 1
    const nights = nightsByMonth.get(month) ?? 0
    const revenue = revenueByMonth.get(month) ?? 0
    return { month, nights, rate: nights > 0 ? revenue / nights : 0 }
  })
  const busiest = [...perMonth].sort((a, b) => b.nights - a.nights)
  const typical = median(perMonth.map((row) => row.nights))
  const weak = perMonth.filter((row) => row.nights < typical * 0.6).sort((a, b) => a.nights - b.nights)

  if (weak.length > 0 && typical > 0) {
    const worst = weak[0]
    const gap = Math.round(typical - weak.reduce((sum, row) => sum + row.nights, 0) / weak.length) * weak.length
    levers.push({
      id: 'season',
      title: `Fill ${weak.map((row) => monthName(row.month)).join(', ')}`,
      finding: `${weak.map((row) => monthName(row.month)).join(', ')} run far below your other months. ${monthName(worst.month)} is the emptiest at ${worst.nights} night${worst.nights === 1 ? '' : 's'} across your whole history, against ${busiest[0].nights} in ${monthName(busiest[0].month)}.`,
      action:
        'This is where the upside is — an empty night earns nothing, and the island costs the same whether or not anyone is on it. Target these months specifically rather than raising effort evenly across the year.',
      evidence: perMonth
        .map((row) => `${monthName(row.month).slice(0, 3)} ${row.nights}n`)
        .join(' · '),
      nightsAtStake: Math.max(0, gap),
      tone: 'warn',
    })
  }

  // --- Discounting into a weak month is the classic own-goal ---
  const soldMonths = perMonth.filter((row) => row.nights >= 3)
  if (soldMonths.length >= 6) {
    const averageRate = soldMonths.reduce((sum, row) => sum + row.rate, 0) / soldMonths.length
    const cheapWeak = soldMonths
      .filter((row) => row.nights < typical * 0.8 && row.rate < averageRate * 0.92)
      .sort((a, b) => a.rate - b.rate)
    if (cheapWeak.length > 0) {
      levers.push({
        id: 'discount',
        title: `You are discounting ${cheapWeak.map((row) => monthName(row.month)).join(' and ')} and it is not filling them`,
        finding: `${cheapWeak
          .map(
            (row) =>
              `${monthName(row.month)} averages ${Math.round(row.rate).toLocaleString()} a night on only ${row.nights} nights`,
          )
          .join('; ')}. The rate is below your average of ${Math.round(averageRate).toLocaleString()} and the occupancy is below average too.`,
        action:
          'A lower price has not bought volume in these months, so it is costing you on the nights you do sell without winning the ones you do not. Put the rate back to normal and spend the difference on reaching people instead — the demand problem is not price.',
        evidence: soldMonths
          .map((row) => `${monthName(row.month).slice(0, 3)} ${Math.round(row.rate).toLocaleString()}/${row.nights}n`)
          .join(' · '),
        nightsAtStake: Math.round(cheapWeak.reduce((sum, row) => sum + (typical - row.nights), 0)),
        tone: 'warn',
      })
    }
  }

  // --- Lead time decides when effort has to happen ---
  const leads = stays
    .filter((stay) => stay.bookedOn)
    .map((stay) => Math.round((new Date(`${stay.checkIn}T00:00:00`).getTime() - new Date(`${stay.bookedOn}T00:00:00`).getTime()) / 86400000))
    .filter((days) => days >= 0)
  if (leads.length >= 10) {
    const sorted = [...leads].sort((a, b) => a - b)
    const at = (fraction: number) => Math.round(sorted[Math.min(sorted.length - 1, Math.floor(sorted.length * fraction))])
    const p25 = at(0.25)
    const p50 = at(0.5)
    const p75 = at(0.75)
    levers.push({
      id: 'lead',
      title: `Act ${p50} days before the month you want to fill`,
      finding: `Half your guests book at least ${p50} days ahead, and a quarter book more than ${p75} days out. Only the earliest quarter book inside ${p25} days. This is a trip people plan, not one they decide on a Friday.`,
      action: `A last-minute discount cannot rescue a weak month — by then most of the people who would have come have already booked somewhere. Whatever you do for a month, do it ${p50}+ days before it starts.`,
      evidence: `${leads.length} stays with a booking date · 25th/50th/75th percentile ${p25}/${p50}/${p75} days`,
      nightsAtStake: 0,
      tone: 'info',
    })
  }

  // --- Repeat guests are the cheapest booking there is ---
  const named = stays.filter((stay) => stay.guestName.trim())
  const byGuest = new Map<string, number>()
  for (const stay of named) {
    const key = stay.guestName.trim().toLowerCase().replace(/\s+/g, ' ')
    byGuest.set(key, (byGuest.get(key) ?? 0) + 1)
  }
  const repeaters = [...byGuest.values()].filter((count) => count > 1).length
  const repeatShare = named.length > 0 ? repeaters / byGuest.size : 0
  if (named.length >= 20 && repeatShare < 0.1) {
    levers.push({
      id: 'repeat',
      title: 'Almost nobody comes back',
      finding: `Only ${repeaters} of ${byGuest.size} guests have booked twice — about ${Math.round(repeatShare * 100)}%. A repeat guest costs nothing to find and already knows about the boat ride.`,
      action:
        'You have contact details and reviews for most of these people. A short note to past guests before your weak months is the cheapest marketing available, and nothing in the numbers suggests it has been tried.',
      evidence: `${byGuest.size} distinct named guests · ${repeaters} booked more than once`,
      nightsAtStake: Math.round(byGuest.size * 0.1 * 3),
      tone: 'warn',
    })
  }

  // --- Where guests come from, and the market nearest by ---
  const countries = new Map<string, number>()
  for (const stay of stays) {
    const country = stay.country.trim()
    if (!country || country.toLowerCase() === 'n/a') continue
    countries.set(country, (countries.get(country) ?? 0) + 1)
  }
  // A single misspelling makes a country look like two smaller markets, so a
  // spelling one character away from a more common one is folded into it.
  const merged = new Map<string, number>()
  for (const [country, count] of [...countries.entries()].sort((a, b) => b[1] - a[1])) {
    const near = [...merged.keys()].find((known) => closeSpelling(known, country))
    if (near) merged.set(near, (merged.get(near) ?? 0) + count)
    else merged.set(country, count)
  }
  const ranked = [...merged.entries()].sort((a, b) => b[1] - a[1])
  const domestic = merged.get('Philippines') ?? 0
  const totalKnown = [...merged.values()].reduce((sum, count) => sum + count, 0)
  if (totalKnown >= 20 && domestic / totalKnown < 0.25) {
    levers.push({
      id: 'domestic',
      title: 'The nearest market is your smallest',
      finding: `${Math.round((domestic / totalKnown) * 100)}% of your guests are Filipino (${domestic} of ${totalKnown} with a country recorded). The rest fly in — ${ranked
        .filter(([country]) => country !== 'Philippines')
        .slice(0, 4)
        .map(([country, count]) => `${country} ${count}`)
        .join(', ')}.`,
      action:
        'Long-haul guests book far ahead and cannot fill a gap three weeks out. Domestic guests can, and Manila is a short flight. They are the only market that can realistically rescue a soft month at short notice.',
      evidence: ranked.map(([country, count]) => `${country} ${count}`).join(' · '),
      nightsAtStake: Math.round(totalKnown * 0.15 * 3),
      tone: 'info',
    })
  }

  // --- Stay length moves revenue without needing another guest ---
  const lengths = stays.map((stay) => stay.nights)
  const medianNights = median(lengths)
  const short = lengths.filter((nights) => nights <= 2).length
  if (short / lengths.length > 0.15) {
    levers.push({
      id: 'length',
      title: 'One extra night is worth more than one extra booking',
      finding: `${short} of ${lengths.length} stays are two nights or fewer, and the typical stay is ${medianNights} nights. Every stay costs the same boat run and the same changeover whether it is two nights or four.`,
      action:
        'A third-night discount is cheaper to give than a whole extra booking is to win, and it lifts the nights that carry no extra fixed cost. Try it on the weak months first.',
      evidence: `median ${medianNights} nights · ${Math.round((short / lengths.length) * 100)}% are 1–2 nights`,
      nightsAtStake: short,
      tone: 'info',
    })
  }

  // --- The add-on business, if it is thin ---
  if (addOnMarginRate !== null && addOnMarginRate > 0 && addOnMarginRate < 0.2) {
    levers.push({
      id: 'addons',
      title: 'The add-on business earns you very little for the work',
      finding: `You keep about ${Math.round(addOnMarginRate * 100)}% of what guests pay for food, boats and tours. The rest is the crew's.`,
      action:
        'This is a lot of coordination, cash handling and responsibility for a thin margin. Either negotiate the split, price the package higher as one number, or treat it purely as a service that makes the room easier to sell — but do not run it expecting it to be a second income.',
      evidence: `margin ${Math.round(addOnMarginRate * 100)}% on recorded add-on bookings`,
      nightsAtStake: 0,
      tone: 'warn',
    })
  }

  return levers.sort((a, b) => b.nightsAtStake - a.nightsAtStake)
}
