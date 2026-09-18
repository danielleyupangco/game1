import {
  type CivilDate,
  addCivilDays,
  differenceInCivilDays,
  todayInManila,
} from '@/lib/civil-date';

/** A pregnancy is dated as 40 weeks from the last menstrual period. */
export const FULL_TERM_DAYS = 280;

/** A cycle of this length is what Naegele's rule assumes. */
export const REFERENCE_CYCLE_LENGTH_DAYS = 28;

/**
 * Days added to the raw dating arithmetic before it is shown.
 *
 * This is now zero, and the history is worth keeping: it briefly carried a +2
 * fudge to force a particular week reading before the dating inputs were known.
 * The 18 Sept 2026 Makati Med scan supplied them, so the EDD is set directly
 * from the scan film (2027-05-19) and no offset is needed.
 *
 * It stays in the model, stored per-pregnancy as `dating_offset_days`, because
 * it is the correct place to apply a clinic redating that does not come with a
 * revised LMP. It should be set from a scan, never to make a number look right.
 */
export const DEFAULT_DATING_OFFSET_DAYS = 0;

/**
 * The due date implied by a last menstrual period — Naegele's rule, corrected
 * for cycle length.
 *
 * Naegele assumes ovulation on day 14 of a 28-day cycle. A longer cycle ovulates
 * later, so the due date moves later by the same difference; without this
 * correction a 30-day cycle is dated two days early.
 */
export function eddFromLmp(lmp: CivilDate, cycleLengthDays = REFERENCE_CYCLE_LENGTH_DAYS): CivilDate {
  return addCivilDays(lmp, FULL_TERM_DAYS + (cycleLengthDays - REFERENCE_CYCLE_LENGTH_DAYS));
}

/**
 * Whether a scan's dating should replace LMP dating.
 *
 * ACOG Committee Opinion 700: in the first trimester a crown-rump length
 * measurement redates the pregnancy only when it disagrees with LMP dating by
 * more than a threshold that widens with gestational age. Inside the threshold
 * the LMP date stands, because swapping dating on every small disagreement adds
 * noise rather than accuracy.
 *
 * The thresholds assume a crown-rump length. A mean sac diameter is not a
 * recommended dating measurement, so a sac-derived age should be treated as
 * weaker evidence than this function's verdict alone suggests.
 */
export function shouldRedateFromScan(discrepancyDays: number, scanWeeks: number): boolean {
  const toleranceDays =
    scanWeeks <= 8 ? 5 : scanWeeks <= 13 ? 7 : scanWeeks <= 15 ? 7 : scanWeeks <= 21 ? 10 : scanWeeks <= 27 ? 14 : 21;
  return Math.abs(discrepancyDays) > toleranceDays;
}

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
