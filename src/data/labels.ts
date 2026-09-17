import type { InjectionSite, MeasurementType, PainLevel } from './types';

export const INJECTION_SITE_LABELS: Record<InjectionSite, string> = {
  abdomenLeft: 'Abdomen L',
  abdomenRight: 'Abdomen R',
  thighLeft: 'Thigh L',
  thighRight: 'Thigh R',
  armLeft: 'Arm L',
  armRight: 'Arm R',
  glutealLeft: 'Glute L',
  glutealRight: 'Glute R',
};

export const PAIN_LABELS: Record<PainLevel, string> = {
  1: 'Nothing',
  2: 'Mild',
  3: 'Noticeable',
  4: 'Sharp',
  5: 'Rough',
};

export const MEASUREMENT_LABELS: Record<MeasurementType, string> = {
  weight: 'Weight',
  bodyFat: 'Body fat',
  waist: 'Waist',
  neck: 'Neck',
  hip: 'Hip',
};

/** Rotating through sites reduces lipohypertrophy — suggest the least recently used one. */
export function suggestNextSite(recentSites: InjectionSite[], all: readonly InjectionSite[]): InjectionSite {
  const unused = all.find((site) => !recentSites.includes(site));
  if (unused) return unused;
  const oldest = [...all].sort(
    (a, b) => recentSites.lastIndexOf(a) - recentSites.lastIndexOf(b),
  );
  return oldest[oldest.length - 1];
}
