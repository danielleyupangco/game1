import type { Booking } from '@/types'
import { isAdjustment } from '@/domain/airbnb/metrics'
import { daysBetween, today } from '@/lib/dates'

/**
 * The guest book.
 *
 * Bookings are the accounting record; guests are the relationship. The same
 * party can appear as several bookings, so this module folds them back
 * together by name to answer the questions a host actually asks: who is on the
 * island right now, who is coming, who has been before, and who is worth
 * writing to personally.
 */

export type Segment = 'past' | 'now' | 'upcoming'

export type GuestStay = Booking & {
  segment: Segment
  /** days between the reservation being made and arrival; -1 when unknown */
  leadTime: number
  /** the room payout — what the stay is worth to the room business */
  roomValue: number
  /** days until arrival (upcoming), days since departure (past), 0 while here */
  distance: number
}

export type GuestProfile = {
  key: string
  name: string
  stays: GuestStay[]
  nights: number
  roomValue: number
  firstStay: string
  lastStay: string
  countries: string[]
  channels: string[]
  ratings: string[]
  /** has stayed more than once — counting a booked future stay */
  repeat: boolean
}

/** Names arrive with inconsistent spacing and casing across channels. */
export function guestKey(name: string): string {
  return name.trim().toLowerCase().replace(/\s+/g, ' ')
}

export function segmentOf(booking: Booking, asOf = today()): Segment {
  if (booking.checkOut <= asOf) return 'past'
  if (booking.checkIn <= asOf) return 'now'
  return 'upcoming'
}

/**
 * Turns raw bookings into stays, dropping refund and correction rows — they
 * are money movements against an existing stay, not people arriving.
 */
export function toStays(bookings: Booking[], asOf = today()): GuestStay[] {
  return bookings
    .filter((booking) => !isAdjustment(booking))
    .filter((booking) => Boolean(booking.checkIn) && Boolean(booking.checkOut))
    .map((booking) => {
      const segment = segmentOf(booking, asOf)
      const leadTime = booking.bookedOn ? Math.max(0, daysBetween(booking.bookedOn, booking.checkIn)) : -1
      const distance =
        segment === 'upcoming'
          ? daysBetween(asOf, booking.checkIn)
          : segment === 'past'
            ? daysBetween(booking.checkOut, asOf)
            : 0
      return {
        ...booking,
        segment,
        leadTime,
        distance,
        roomValue: booking.netRevenue,
      }
    })
}

/**
 * Groups stays into guests. Unnamed bookings — most of the imported history,
 * where the sheet recorded a confirmation code and nothing else — are each
 * kept as their own entry rather than being merged into one giant "blank"
 * guest that would then look like your best repeat customer.
 */
export function guestProfiles(stays: GuestStay[]): GuestProfile[] {
  const groups = new Map<string, GuestStay[]>()
  for (const stay of stays) {
    const named = guestKey(stay.guestName)
    const key = named ? `n:${named}` : `b:${stay.id}`
    const bucket = groups.get(key)
    if (bucket) bucket.push(stay)
    else groups.set(key, [stay])
  }

  const profiles: GuestProfile[] = []
  for (const [key, group] of groups) {
    const sorted = [...group].sort((a, b) => a.checkIn.localeCompare(b.checkIn))
    const unique = (values: string[]) => [...new Set(values.map((v) => v.trim()).filter(Boolean))]
    profiles.push({
      key,
      name: sorted[0].guestName.trim() || 'Unnamed booking',
      stays: sorted,
      nights: sorted.reduce((sum, stay) => sum + stay.nights, 0),
      roomValue: sorted.reduce((sum, stay) => sum + stay.roomValue, 0),
      firstStay: sorted[0].checkIn,
      lastStay: sorted[sorted.length - 1].checkIn,
      countries: unique(sorted.map((stay) => stay.country)),
      channels: unique(sorted.map((stay) => stay.channel)),
      ratings: unique(sorted.map((stay) => stay.rating)),
      repeat: key.startsWith('n:') && sorted.length > 1,
    })
  }
  return profiles.sort((a, b) => b.lastStay.localeCompare(a.lastStay))
}

export type GuestBookSummary = {
  hosted: number
  hostedNights: number
  here: GuestStay[]
  arriving90: GuestStay[]
  nextArrival: GuestStay | null
  repeatGuests: GuestProfile[]
  repeatShare: number
  namedShare: number
  bookedAhead: number
  averageLeadTime: number
  averageParty: number
}

export function summariseGuestBook(stays: GuestStay[], profiles: GuestProfile[]): GuestBookSummary {
  const past = stays.filter((stay) => stay.segment === 'past')
  const here = stays.filter((stay) => stay.segment === 'now')
  const upcoming = stays
    .filter((stay) => stay.segment === 'upcoming')
    .sort((a, b) => a.checkIn.localeCompare(b.checkIn))
  const arriving90 = upcoming.filter((stay) => stay.distance <= 90)
  const withLead = stays.filter((stay) => stay.leadTime >= 0)
  const withParty = stays.filter((stay) => stay.guests > 0)
  const named = stays.filter((stay) => guestKey(stay.guestName))
  const repeatGuests = profiles.filter((profile) => profile.repeat)
  const repeatStays = repeatGuests.reduce((sum, profile) => sum + profile.stays.length, 0)

  return {
    hosted: past.length,
    hostedNights: past.reduce((sum, stay) => sum + stay.nights, 0),
    here,
    arriving90,
    nextArrival: upcoming[0] ?? null,
    repeatGuests: [...repeatGuests].sort((a, b) => b.roomValue - a.roomValue),
    repeatShare: named.length > 0 ? repeatStays / named.length : 0,
    namedShare: stays.length > 0 ? named.length / stays.length : 0,
    bookedAhead: upcoming.reduce((sum, stay) => sum + stay.roomValue, 0),
    averageLeadTime: withLead.length > 0 ? withLead.reduce((s, stay) => s + stay.leadTime, 0) / withLead.length : 0,
    averageParty: withParty.length > 0 ? withParty.reduce((s, stay) => s + stay.guests, 0) / withParty.length : 0,
  }
}

/** Free-text match across every field a host might search by. */
export function matchesQuery(stay: GuestStay, query: string): boolean {
  const q = query.trim().toLowerCase()
  if (!q) return true
  return [
    stay.guestName,
    stay.confirmationCode,
    stay.country,
    stay.channel,
    stay.notes,
    stay.contact,
    stay.review,
    stay.checkIn,
    stay.checkOut,
  ]
    .join(' ')
    .toLowerCase()
    .includes(q)
}
