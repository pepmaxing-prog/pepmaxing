import { getMedication } from '@/data/medications';
import type { DosageUnit, Shot } from '@/data/types';

const HOUR_MS = 60 * 60 * 1000;

/** Everything is normalised to mcg so shots logged in different units can be summed. */
const TO_MCG: Record<DosageUnit, number | null> = {
  mcg: 1,
  mg: 1000,
  // IU / ml / "units" depend on the vial's concentration, so they can't be normalised here.
  iu: null,
  ml: null,
  units: null,
};

export function toMicrograms(amount: number, unit: DosageUnit): number | null {
  const factor = TO_MCG[unit];
  return factor == null ? null : amount * factor;
}

/** Local wall-clock `date` + `time` as an absolute instant. */
export function shotTimestamp(shot: Pick<Shot, 'date' | 'time'>): number {
  const [year, month, day] = shot.date.split('-').map(Number);
  const [hours, minutes] = shot.time.split(':').map(Number);
  return new Date(year, (month ?? 1) - 1, day ?? 1, hours ?? 0, minutes ?? 0).getTime();
}

/** Fraction of a dose still present after `hours`, for a first-order elimination half-life. */
export function remainingFraction(hours: number, halfLifeHours: number): number {
  if (hours <= 0) return 1;
  if (halfLifeHours <= 0) return 0;
  return Math.pow(0.5, hours / halfLifeHours);
}

/**
 * Superposition of every shot's decay curve at `at`, in mcg.
 *
 * This is a single-compartment approximation with instant absorption — good enough to show a
 * trend line, not a pharmacokinetic prediction.
 */
export function estimatedLevelMcg(shots: Shot[], at: number = Date.now()): number {
  let total = 0;
  for (const shot of shots) {
    const taken = shotTimestamp(shot);
    if (taken > at) continue;
    const medication = getMedication(shot.medicationId);
    if (!medication) continue;
    const mcg = toMicrograms(shot.dosageAmount, shot.dosageUnit);
    if (mcg == null) continue;
    total += mcg * remainingFraction((at - taken) / HOUR_MS, medication.halfLifeHours);
  }
  return total;
}

export type LevelPoint = { t: number; mcg: number };

/** Evenly spaced samples of `estimatedLevelMcg`, oldest first — feeds the Today chart. */
export function levelSeries(
  shots: Shot[],
  { from, to, points = 48 }: { from: number; to: number; points?: number },
): LevelPoint[] {
  if (points < 2 || to <= from) return [];
  const step = (to - from) / (points - 1);
  return Array.from({ length: points }, (_, i) => {
    const t = from + step * i;
    return { t, mcg: estimatedLevelMcg(shots, t) };
  });
}

/** Human-readable level, switching to mg once the number gets large. */
export function formatLevel(mcg: number): string {
  if (mcg >= 1000) return `${round(mcg / 1000, 2)} mg`;
  if (mcg >= 1) return `${round(mcg, 1)} mcg`;
  return `${round(mcg, 2)} mcg`;
}

function round(value: number, decimals: number): number {
  const factor = Math.pow(10, decimals);
  return Math.round(value * factor) / factor;
}

export type DoseWarning = { level: 'high' | 'unknown'; message: string };

/** Sanity-check a dose against the catalogue's maximum, ignoring unconvertible units. */
export function checkDose(
  medicationId: string,
  amount: number,
  unit: DosageUnit,
): DoseWarning | null {
  const medication = getMedication(medicationId);
  if (!medication) return null;
  if (unit !== medication.defaultUnit) {
    const entered = toMicrograms(amount, unit);
    const max = medication.maxDose == null ? null : toMicrograms(medication.maxDose, medication.defaultUnit);
    if (entered == null || max == null) return null;
    return entered > max
      ? { level: 'high', message: `Above the usual max of ${medication.maxDose} ${medication.defaultUnit}.` }
      : null;
  }
  if (medication.maxDose != null && amount > medication.maxDose) {
    return {
      level: 'high',
      message: `Above the usual max of ${medication.maxDose} ${medication.defaultUnit} for ${medication.name}.`,
    };
  }
  return null;
}
