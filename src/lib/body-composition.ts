/**
 * Body-fat estimation from tape measurements (US Navy circumference method) plus the
 * derived masses that make a "fat lost, muscle kept" story possible.
 */

export type NavyInput = {
  sex: 'male' | 'female';
  /** cm */
  heightCm: number;
  /** cm, at the navel for men, at the narrowest point for women */
  waistCm: number;
  /** cm */
  neckCm: number;
  /** cm, widest point — required for women */
  hipCm?: number;
};

/** Body-fat percentage (0-100), or null when the inputs can't produce a valid result. */
export function navyBodyFatPercent(input: NavyInput): number | null {
  const { sex, heightCm, waistCm, neckCm, hipCm } = input;
  if (heightCm <= 0 || waistCm <= 0 || neckCm <= 0) return null;

  let percent: number;
  if (sex === 'male') {
    const circumference = waistCm - neckCm;
    if (circumference <= 0) return null;
    percent =
      495 /
        (1.0324 - 0.19077 * Math.log10(circumference) + 0.15456 * Math.log10(heightCm)) -
      450;
  } else {
    if (hipCm == null || hipCm <= 0) return null;
    const circumference = waistCm + hipCm - neckCm;
    if (circumference <= 0) return null;
    percent =
      495 /
        (1.29579 - 0.35004 * Math.log10(circumference) + 0.221 * Math.log10(heightCm)) -
      450;
  }

  if (!Number.isFinite(percent) || percent <= 0 || percent >= 75) return null;
  return Math.round(percent * 10) / 10;
}

export type BodyComposition = { fatMassKg: number; leanMassKg: number };

export function bodyComposition(weightKg: number, bodyFatPercent: number): BodyComposition {
  const fatMassKg = (weightKg * bodyFatPercent) / 100;
  return { fatMassKg, leanMassKg: weightKg - fatMassKg };
}

/**
 * The number that actually matters on a GLP-1: how much of the weight lost was fat.
 * Returns null when either end of the comparison is missing.
 */
export function fatLossShare(
  start: { weightKg: number; bodyFatPercent: number },
  current: { weightKg: number; bodyFatPercent: number },
): number | null {
  const weightLost = start.weightKg - current.weightKg;
  if (weightLost <= 0) return null;
  const fatLost =
    bodyComposition(start.weightKg, start.bodyFatPercent).fatMassKg -
    bodyComposition(current.weightKg, current.bodyFatPercent).fatMassKg;
  return Math.max(0, Math.min(1, fatLost / weightLost));
}

export type BmiCategory = 'underweight' | 'healthy' | 'overweight' | 'obese';

export function bmi(weightKg: number, heightCm: number): number | null {
  if (weightKg <= 0 || heightCm <= 0) return null;
  const meters = heightCm / 100;
  return Math.round((weightKg / (meters * meters)) * 10) / 10;
}

export function bmiCategory(value: number): BmiCategory {
  if (value < 18.5) return 'underweight';
  if (value < 25) return 'healthy';
  if (value < 30) return 'overweight';
  return 'obese';
}
