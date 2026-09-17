import type { Measurement, MeasurementType, UserProfile } from '@/data/types';

import { navyBodyFatPercent } from './body-composition';

export type MeasurementSnapshot = Partial<Record<MeasurementType, Measurement>>;

function pick(
  measurements: Measurement[],
  better: (candidate: Measurement, current: Measurement) => boolean,
): MeasurementSnapshot {
  const snapshot: MeasurementSnapshot = {};
  for (const measurement of measurements) {
    const current = snapshot[measurement.type];
    if (!current || better(measurement, current)) snapshot[measurement.type] = measurement;
  }
  return snapshot;
}

/** Most recent value of each measurement type. */
export function latestMeasurements(measurements: Measurement[]): MeasurementSnapshot {
  return pick(measurements, (candidate, current) => candidate.timestamp > current.timestamp);
}

/** First ever value of each measurement type — the baseline progress is measured against. */
export function baselineMeasurements(measurements: Measurement[]): MeasurementSnapshot {
  return pick(measurements, (candidate, current) => candidate.timestamp < current.timestamp);
}

/**
 * Body fat for a snapshot: a logged `bodyFat` entry wins, otherwise it is derived from
 * tape measurements with the US Navy formula. Null when neither is available.
 */
export function bodyFatPercentFor(
  snapshot: MeasurementSnapshot,
  profile: UserProfile | null,
): number | null {
  const logged = snapshot.bodyFat;
  if (logged) return logged.value;

  const { waist, neck, hip } = snapshot;
  if (!profile?.sex || !profile.height || !waist || !neck) return null;
  return navyBodyFatPercent({
    sex: profile.sex,
    heightCm: profile.height,
    waistCm: waist.value,
    neckCm: neck.value,
    hipCm: hip?.value,
  });
}
