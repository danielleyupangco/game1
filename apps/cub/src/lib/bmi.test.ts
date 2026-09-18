import { describe, expect, it } from 'vitest';
import {
  FIRST_TRIMESTER_GAIN_KG,
  bmiCategory,
  calculateBmi,
  gainBandForBmi,
  gainRangeAtWeek,
} from '@/lib/bmi';

describe('calculateBmi', () => {
  it('computes BMI from kilograms and centimetres', () => {
    expect(calculateBmi(55, 160)).toBeCloseTo(21.48, 2);
    expect(calculateBmi(80, 170)).toBeCloseTo(27.68, 2);
  });

  it('rejects a height of zero rather than returning Infinity', () => {
    expect(() => calculateBmi(55, 0)).toThrow(RangeError);
  });
});

describe('bmiCategory', () => {
  it('splits on the IOM boundaries, taking each threshold as the upper band', () => {
    expect(bmiCategory(18.49)).toBe('underweight');
    expect(bmiCategory(18.5)).toBe('normal');
    expect(bmiCategory(24.9)).toBe('normal');
    expect(bmiCategory(25)).toBe('overweight');
    expect(bmiCategory(29.9)).toBe('overweight');
    expect(bmiCategory(30)).toBe('obese');
  });
});

describe('gainBandForBmi', () => {
  it('returns the published total-gain range for each category', () => {
    expect(gainBandForBmi(17)).toMatchObject({ totalMinKg: 12.5, totalMaxKg: 18 });
    expect(gainBandForBmi(21.5)).toMatchObject({ totalMinKg: 11.5, totalMaxKg: 16 });
    expect(gainBandForBmi(27)).toMatchObject({ totalMinKg: 7, totalMaxKg: 11.5 });
    expect(gainBandForBmi(33)).toMatchObject({ totalMinKg: 5, totalMaxKg: 9 });
  });
});

describe('gainRangeAtWeek', () => {
  const normal = gainBandForBmi(21.5);

  it('starts at zero gain', () => {
    expect(gainRangeAtWeek(normal, 0)).toEqual({ minKg: 0, maxKg: 0 });
  });

  it('reaches the first-trimester allowance by week 13', () => {
    expect(gainRangeAtWeek(normal, 13)).toEqual({
      minKg: FIRST_TRIMESTER_GAIN_KG.min,
      maxKg: FIRST_TRIMESTER_GAIN_KG.max,
    });
  });

  it('lands within the published total range at 40 weeks', () => {
    const atTerm = gainRangeAtWeek(normal, 40);
    // 0.5 + 0.35*27 = 9.95 and 2 + 0.5*27 = 15.5, bracketing the 11.5-16kg
    // total the IOM publishes for a normal BMI.
    expect(atTerm.minKg).toBeCloseTo(9.95, 2);
    expect(atTerm.maxKg).toBeCloseTo(15.5, 2);
  });

  it('never lets the lower edge cross the upper edge', () => {
    for (const bmi of [17, 21.5, 27, 33]) {
      const band = gainBandForBmi(bmi);
      for (let week = 0; week <= 40; week += 1) {
        const { minKg, maxKg } = gainRangeAtWeek(band, week);
        expect(maxKg).toBeGreaterThanOrEqual(minKg);
      }
    }
  });

  it('increases monotonically, so the shaded band never doubles back', () => {
    let previous = -1;
    for (let week = 0; week <= 40; week += 1) {
      const { minKg } = gainRangeAtWeek(normal, week);
      expect(minKg).toBeGreaterThanOrEqual(previous);
      previous = minKg;
    }
  });

  it('clamps past term instead of extrapolating forever', () => {
    expect(gainRangeAtWeek(normal, 44)).toEqual(gainRangeAtWeek(normal, 40));
  });
});
