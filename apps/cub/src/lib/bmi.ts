/**
 * Body-mass index and the Institute of Medicine gestational weight-gain bands.
 *
 * The bands are guidance for a conversation with the OB, not a target to hit,
 * so the UI shows them as a shaded range rather than a pass/fail line.
 *
 * Source: Institute of Medicine (US) / National Research Council, "Weight Gain
 * During Pregnancy: Reexamining the Guidelines" (2009), singleton pregnancies.
 * Last verified 2026-09-16.
 */

export type BmiCategory = 'underweight' | 'normal' | 'overweight' | 'obese';

export interface GainBand {
  category: BmiCategory;
  label: string;
  /** Total recommended gain across the pregnancy, in kilograms. */
  totalMinKg: number;
  totalMaxKg: number;
  /** Recommended weekly gain in the second and third trimesters. */
  weeklyMinKg: number;
  weeklyMaxKg: number;
}

/** Total gain recommended during the first trimester, regardless of BMI. */
export const FIRST_TRIMESTER_GAIN_KG = { min: 0.5, max: 2 } as const;

/** The week from which the steady weekly rate applies. */
export const STEADY_GAIN_FROM_WEEK = 13;

const GAIN_BANDS: Record<BmiCategory, GainBand> = {
  underweight: {
    category: 'underweight',
    label: 'Under 18.5',
    totalMinKg: 12.5,
    totalMaxKg: 18,
    weeklyMinKg: 0.44,
    weeklyMaxKg: 0.58,
  },
  normal: {
    category: 'normal',
    label: '18.5 – 24.9',
    totalMinKg: 11.5,
    totalMaxKg: 16,
    weeklyMinKg: 0.35,
    weeklyMaxKg: 0.5,
  },
  overweight: {
    category: 'overweight',
    label: '25 – 29.9',
    totalMinKg: 7,
    totalMaxKg: 11.5,
    weeklyMinKg: 0.23,
    weeklyMaxKg: 0.33,
  },
  obese: {
    category: 'obese',
    label: '30 and above',
    totalMinKg: 5,
    totalMaxKg: 9,
    weeklyMinKg: 0.17,
    weeklyMaxKg: 0.27,
  },
};

export function calculateBmi(weightKg: number, heightCm: number): number {
  if (heightCm <= 0) throw new RangeError('Height must be greater than zero');
  const heightM = heightCm / 100;
  return weightKg / (heightM * heightM);
}

export function bmiCategory(bmi: number): BmiCategory {
  if (bmi < 18.5) return 'underweight';
  if (bmi < 25) return 'normal';
  if (bmi < 30) return 'overweight';
  return 'obese';
}

export function gainBandForBmi(bmi: number): GainBand {
  return GAIN_BANDS[bmiCategory(bmi)];
}

/**
 * The recommended total-gain range at a given week, used to shade the weight
 * chart. Below {@link STEADY_GAIN_FROM_WEEK} only the flat first-trimester
 * allowance applies; after it the weekly rate accumulates on top.
 */
export function gainRangeAtWeek(band: GainBand, week: number): { minKg: number; maxKg: number } {
  const clampedWeek = Math.min(Math.max(week, 0), 40);

  if (clampedWeek <= STEADY_GAIN_FROM_WEEK) {
    // Ramps the first-trimester allowance in proportionally rather than
    // stepping, so the shaded band is continuous.
    const fraction = clampedWeek / STEADY_GAIN_FROM_WEEK;
    return {
      minKg: FIRST_TRIMESTER_GAIN_KG.min * fraction,
      maxKg: FIRST_TRIMESTER_GAIN_KG.max * fraction,
    };
  }

  const steadyWeeks = clampedWeek - STEADY_GAIN_FROM_WEEK;
  return {
    minKg: FIRST_TRIMESTER_GAIN_KG.min + band.weeklyMinKg * steadyWeeks,
    maxKg: FIRST_TRIMESTER_GAIN_KG.max + band.weeklyMaxKg * steadyWeeks,
  };
}
