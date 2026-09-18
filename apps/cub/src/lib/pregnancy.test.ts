import { describe, expect, it } from 'vitest';
import {
  DEFAULT_DATING_OFFSET_DAYS,
  FULL_TERM_DAYS,
  dateOfGestation,
  eddFromGestation,
  eddFromLmp,
  gestationOn,
  impliedConceptionDate,
  impliedLmp,
  shouldRedateFromScan,
  trimesterForWeek,
} from '@/lib/pregnancy';
import {
  addCivilDays,
  differenceInCivilDays,
  isCivilDate,
  todayInManila,
} from '@/lib/civil-date';

/**
 * Dani's dating inputs, as issued by Makati Medical Center on 18 Sept 2026:
 * LMP 14 Aug 2026 on a 28-day cycle, giving an EDC of 21 May 2027. The app
 * follows the chart rather than a derivation of its own.
 */
const LMP = '2026-08-14';
const CYCLE_DAYS = 28;
const EDD = '2027-05-21';

describe('gestationOn', () => {
  it('reads Week 5, Day 0 on 2026-09-18 — matching the scan report AOG', () => {
    // The Makati Med report of that date states AOG 5 weeks 0 days. The app
    // must agree with the chart, so this is the case that pins it.
    const result = gestationOn({ edd: EDD, on: '2026-09-18' });
    expect(result.label).toBe('Week 5, Day 0');
    expect(result.weeks).toBe(5);
    expect(result.days).toBe(0);
    expect(result.daysToGo).toBe(245);
  });

  it('needs no offset now that the EDD is derived from a real LMP', () => {
    // The offset exists for a clinic redating, not to bend the arithmetic, so
    // the default must be inert: the same date reads the same either way.
    expect(DEFAULT_DATING_OFFSET_DAYS).toBe(0);
    const explicitZero = gestationOn({ edd: EDD, on: '2026-09-18', datingOffsetDays: 0 });
    expect(explicitZero.label).toBe(gestationOn({ edd: EDD, on: '2026-09-18' }).label);
    expect(explicitZero.totalDays).toBe(FULL_TERM_DAYS - 245);
  });

  it('advances exactly one day per calendar day', () => {
    const start = gestationOn({ edd: EDD, on: '2026-09-16' });
    for (let offset = 1; offset <= 40; offset += 1) {
      const next = gestationOn({ edd: EDD, on: addCivilDays('2026-09-16', offset) });
      expect(next.totalDays).toBe(start.totalDays + offset);
    }
  });

  it('rolls Day 6 over to the next week rather than showing Day 7', () => {
    const sixth = gestationOn({ edd: EDD, on: '2026-09-17' });
    expect(sixth.label).toBe('Week 4, Day 6');
    expect(gestationOn({ edd: EDD, on: '2026-09-18' }).label).toBe('Week 5, Day 0');
  });

  it('never reports a day outside 0-6 across the whole pregnancy', () => {
    for (let offset = 0; offset <= FULL_TERM_DAYS + 21; offset += 1) {
      const { days } = gestationOn({ edd: EDD, on: addCivilDays('2026-08-18', offset) });
      expect(days).toBeGreaterThanOrEqual(0);
      expect(days).toBeLessThanOrEqual(6);
    }
  });

  it('reads Week 40, Day 0 on the EDD itself', () => {
    const atDue = gestationOn({ edd: EDD, on: EDD, datingOffsetDays: 0 });
    expect(atDue.label).toBe('Week 40, Day 0');
    expect(atDue.daysToGo).toBe(0);
    expect(atDue.isPastDue).toBe(false);
    expect(atDue.progress).toBe(1);
  });

  it('keeps counting past the due date instead of stopping at 40 weeks', () => {
    const overdue = gestationOn({ edd: EDD, on: '2027-05-28', datingOffsetDays: 0 });
    expect(overdue.label).toBe('Week 41, Day 0');
    expect(overdue.daysToGo).toBe(-7);
    expect(overdue.isPastDue).toBe(true);
    // The ring is full rather than overflowing once term is passed.
    expect(overdue.progress).toBe(1);
  });

  it('clamps to Week 0 before dating begins instead of going negative', () => {
    const beforeLmp = gestationOn({ edd: EDD, on: '2026-08-01' });
    expect(beforeLmp.totalDays).toBeLessThan(0);
    expect(beforeLmp.weeks).toBe(0);
    expect(beforeLmp.days).toBe(0);
    expect(beforeLmp.progress).toBe(0);
  });

  it('crosses month, year and leap-day boundaries without drifting', () => {
    // 2028 is a leap year; a span containing 29 Feb must still be exact.
    expect(differenceInCivilDays('2028-03-01', '2028-02-28')).toBe(2);
    expect(differenceInCivilDays('2027-01-01', '2026-12-31')).toBe(1);

    const beforeNewYear = gestationOn({ edd: EDD, on: '2026-12-31' });
    const afterNewYear = gestationOn({ edd: EDD, on: '2027-01-01' });
    expect(afterNewYear.totalDays).toBe(beforeNewYear.totalDays + 1);
  });

  it('assigns trimesters on the 14-week and 28-week boundaries', () => {
    expect(trimesterForWeek(13)).toBe(1);
    expect(trimesterForWeek(14)).toBe(2);
    expect(trimesterForWeek(27)).toBe(3 - 1);
    expect(trimesterForWeek(28)).toBe(3);

    // 13w6d is still the first trimester; 14w0d is the second.
    expect(gestationOn({ edd: EDD, on: dateOfGestation(EDD, 13, 6) }).trimester).toBe(1);
    expect(gestationOn({ edd: EDD, on: dateOfGestation(EDD, 14, 0) }).trimester).toBe(2);
  });
});

describe('dating derivations', () => {
  // The corroboration that settled the dating: an LMP of 15 Aug with a 28-30
  // day cycle implies conception on 29-31 Aug, which is exactly the window the
  // couple recall independently. Each cycle length in her stated range lands on
  // one day of it.
  it('implies a conception date beside the Aug 29-31 window the couple recall', () => {
    // The chart's 14 Aug LMP lands one day before the window opens; the 15th
    // Dani recalled lands inside it. Both are within a day, which is the point.
    expect(impliedConceptionDate(eddFromLmp('2026-08-14', 28))).toBe('2026-08-28');
    expect(impliedConceptionDate(eddFromLmp('2026-08-15', 28))).toBe('2026-08-29');
    expect(impliedConceptionDate(eddFromLmp('2026-08-15', 30))).toBe('2026-08-31');
  });

  it('derives an LMP exactly 280 days plus the offset before the EDD', () => {
    expect(differenceInCivilDays(EDD, impliedLmp(EDD))).toBe(
      FULL_TERM_DAYS + DEFAULT_DATING_OFFSET_DAYS,
    );
  });

  it('round-trips a date through dateOfGestation and back', () => {
    for (const [weeks, days] of [[4, 5], [12, 0], [20, 3], [40, 0]] as const) {
      const date = dateOfGestation(EDD, weeks, days);
      const back = gestationOn({ edd: EDD, on: date });
      expect([back.weeks, back.days]).toEqual([weeks, days]);
    }
  });

  it('round-trips through eddFromGestation', () => {
    expect(eddFromGestation('2026-09-18', 5, 0)).toBe(EDD);
  });
});

describe('todayInManila', () => {
  it('uses the Manila calendar day, not the host timezone', () => {
    // 15:30 UTC is already the next day in Manila (UTC+8).
    expect(todayInManila(new Date('2026-09-16T15:30:00Z'))).toBe('2026-09-16');
    expect(todayInManila(new Date('2026-09-16T16:30:00Z'))).toBe('2026-09-17');
    expect(isCivilDate(todayInManila())).toBe(true);
  });
});

describe('isCivilDate', () => {
  it('rejects impossible dates that still match the pattern', () => {
    expect(isCivilDate('2027-05-23')).toBe(true);
    expect(isCivilDate('2027-02-30')).toBe(false);
    expect(isCivilDate('2027-13-01')).toBe(false);
    expect(isCivilDate('23-05-2027')).toBe(false);
  });
});

describe('eddFromLmp', () => {
  it('reproduces the clinic EDC from the LMP on the report', () => {
    expect(eddFromLmp(LMP, 28)).toBe('2027-05-21');
  });

  it('moves the due date later for a longer cycle, because ovulation is later', () => {
    expect(eddFromLmp(LMP, 29)).toBe('2027-05-22');
    expect(eddFromLmp(LMP, 30)).toBe('2027-05-23');
  });

  it('derives the EDD the app actually uses from her midpoint cycle', () => {
    expect(eddFromLmp(LMP, CYCLE_DAYS)).toBe(EDD);
  });

  it('defaults to the 28-day assumption when no cycle length is given', () => {
    expect(eddFromLmp(LMP)).toBe(eddFromLmp(LMP, 28));
  });
});

describe('shouldRedateFromScan', () => {
  // The report reads AOG 5w0d by LMP against 5w2d by mean sac diameter — two
  // days apart. ACOG's first-trimester tolerance is five days, so LMP dating
  // stands, and a sac measurement is weaker evidence than a CRL anyway.
  it('leaves the LMP date alone for the 2-day sac discrepancy on the report', () => {
    expect(shouldRedateFromScan(2, 5)).toBe(false);
  });

  it('redates once an early scan disagrees by more than five days', () => {
    expect(shouldRedateFromScan(5, 5)).toBe(false);
    expect(shouldRedateFromScan(6, 5)).toBe(true);
  });

  it('widens the tolerance as the pregnancy advances', () => {
    expect(shouldRedateFromScan(7, 12)).toBe(false);
    expect(shouldRedateFromScan(8, 12)).toBe(true);
    expect(shouldRedateFromScan(14, 26)).toBe(false);
    expect(shouldRedateFromScan(21, 30)).toBe(false);
    expect(shouldRedateFromScan(22, 30)).toBe(true);
  });

  it('is symmetric — a scan dating behind or ahead is treated the same', () => {
    expect(shouldRedateFromScan(-6, 5)).toBe(true);
    expect(shouldRedateFromScan(-4, 5)).toBe(false);
  });
});
