import {
  type CivilDate,
  addCivilDays,
  differenceInCivilDays,
  todayInManila,
} from '@/lib/civil-date';

/** A pregnancy is dated as 40 weeks from the last menstrual period. */
export const FULL_TERM_DAYS = 280;

/**
 * Days added to the raw dating arithmetic before it is shown.
 *
 * Dani's chart is dated two days ahead of what `EDD − today` alone produces:
 * with an EDD of 2027-05-23, 2026-09-16 reads as Week 4, Day 5 rather than the
 * Week 4, Day 3 the bare subtraction gives. Rather than bury that difference,
 * it lives here as one number, is stored per-pregnancy as `dating_offset_days`,
 * and is editable in Settings — which is also how a dating scan correction gets
 * applied, since scans routinely move dating by a few days.
 */
export const DEFAULT_DATING_OFFSET_DAYS = 2;

export type Trimester = 1 | 2 | 3;

export interface GestationInput {
  /** Estimated due date. */
  edd: CivilDate;
  /** Defaults to today in Manila. */
  on?: CivilDate;
  /** Defaults to {@link DEFAULT_DATING_OFFSET_DAYS}. */
  datingOffsetDays?: number;
}

export interface Gestation {
  /** Completed days of gestation. Negative before conception dating begins. */
  totalDays: number;
  /** Completed weeks — the "Week N" in the UI. */
  weeks: number;
  /** Completed days past `weeks` — the "Day N" in the UI, always 0–6. */
  days: number;
  /** Calendar days until the EDD. Negative once past due. */
  daysToGo: number;
  trimester: Trimester;
  /** 0–1, clamped, for the progress ring. */
  progress: number;
  /** `true` once the EDD has passed. */
  isPastDue: boolean;
  /** Human-readable, e.g. `Week 4, Day 5`. */
  label: string;
}

/**
 * Where each trimester starts, in completed weeks. The first trimester runs
 * through 13w6d, the second through 27w6d, and the third from 28w0d.
 */
const TRIMESTER_START_WEEKS = { 2: 14, 3: 28 } as const;

export function trimesterForWeek(weeks: number): Trimester {
  if (weeks >= TRIMESTER_START_WEEKS[3]) return 3;
  if (weeks >= TRIMESTER_START_WEEKS[2]) return 2;
  return 1;
}

/**
 * The app's central dating calculation: gestational age is what remains of the
 * 280-day term once the days still to go are taken off.
 */
export function gestationOn({
  edd,
  on = todayInManila(),
  datingOffsetDays = DEFAULT_DATING_OFFSET_DAYS,
}: GestationInput): Gestation {
  const daysToGo = differenceInCivilDays(edd, on);
  const totalDays = FULL_TERM_DAYS - daysToGo + datingOffsetDays;

  // `Math.floor` on a negative total would report -1 weeks; before dating
  // starts there is no meaningful week, so clamp the breakdown at zero.
  const clampedDays = Math.max(totalDays, 0);
  const weeks = Math.floor(clampedDays / 7);
  const days = clampedDays % 7;

  return {
    totalDays,
    weeks,
    days,
    daysToGo,
    trimester: trimesterForWeek(weeks),
    progress: Math.min(Math.max(clampedDays / FULL_TERM_DAYS, 0), 1),
    isPastDue: daysToGo < 0,
    label: `Week ${weeks}, Day ${days}`,
  };
}

/** The LMP the EDD implies — the zero point of the 280-day count. */
export function impliedLmp(edd: CivilDate, datingOffsetDays = DEFAULT_DATING_OFFSET_DAYS): CivilDate {
  return addCivilDays(edd, -(FULL_TERM_DAYS + datingOffsetDays));
}

/** Conception is dated about two weeks after the LMP. */
export function impliedConceptionDate(
  edd: CivilDate,
  datingOffsetDays = DEFAULT_DATING_OFFSET_DAYS,
): CivilDate {
  return addCivilDays(impliedLmp(edd, datingOffsetDays), 14);
}

/** The calendar date a given week and day of gestation falls on. */
export function dateOfGestation(
  edd: CivilDate,
  weeks: number,
  days = 0,
  datingOffsetDays = DEFAULT_DATING_OFFSET_DAYS,
): CivilDate {
  return addCivilDays(impliedLmp(edd, datingOffsetDays), weeks * 7 + days);
}

/** Derives the EDD that would make `on` read as the given week and day. */
export function eddFromGestation(
  on: CivilDate,
  weeks: number,
  days = 0,
  datingOffsetDays = DEFAULT_DATING_OFFSET_DAYS,
): CivilDate {
  return addCivilDays(on, FULL_TERM_DAYS + datingOffsetDays - (weeks * 7 + days));
}
