/**
 * Calendar-date helpers.
 *
 * Pregnancy dating is *civil-date* arithmetic, not instant arithmetic: the app
 * must say "Week 4, Day 5" for the whole of a Manila day, regardless of what
 * hour it is or what timezone the phone is roaming in. So every date in the
 * dating layer is a plain `YYYY-MM-DD` string, and differences are whole days.
 */

export const APP_TIME_ZONE = 'Asia/Manila';

/** A calendar date with no time or zone attached, formatted `YYYY-MM-DD`. */
export type CivilDate = string;

const CIVIL_DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

export function isCivilDate(value: string): value is CivilDate {
  if (!CIVIL_DATE_PATTERN.test(value)) return false;
  // Reject real-looking but impossible dates such as 2027-02-30, which the
  // pattern alone would accept.
  return toCivilDate(parseCivilDate(value)) === value;
}

/**
 * Anchors a civil date at UTC midnight so day differences are exact integers.
 * The resulting `Date` is a positioning device, never a real instant — don't
 * format it for display without going back through {@link toCivilDate}.
 */
export function parseCivilDate(date: CivilDate): Date {
  const [year, month, day] = date.split('-').map(Number) as [number, number, number];
  return new Date(Date.UTC(year, month - 1, day));
}

/** Formats a UTC-anchored `Date` back to `YYYY-MM-DD`. */
export function toCivilDate(date: Date): CivilDate {
  return date.toISOString().slice(0, 10);
}

/** Whole days from `from` to `to`; negative when `to` is earlier. */
export function differenceInCivilDays(to: CivilDate, from: CivilDate): number {
  const MS_PER_DAY = 86_400_000;
  return Math.round((parseCivilDate(to).getTime() - parseCivilDate(from).getTime()) / MS_PER_DAY);
}

export function addCivilDays(date: CivilDate, days: number): CivilDate {
  const shifted = parseCivilDate(date);
  shifted.setUTCDate(shifted.getUTCDate() + days);
  return toCivilDate(shifted);
}

/**
 * The current calendar date in Manila. `en-CA` is used purely because it
 * formats as `YYYY-MM-DD`.
 */
export function todayInManila(now: Date = new Date()): CivilDate {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: APP_TIME_ZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(now);
}
