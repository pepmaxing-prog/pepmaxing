import type { Measurement, UserProfile } from '@/data/types';

import { baselineMeasurements, bodyFatPercentFor, latestMeasurements } from '../progress';

function measurement(partial: Partial<Measurement> & Pick<Measurement, 'type' | 'value' | 'timestamp'>): Measurement {
  return { id: `${partial.type}-${partial.timestamp}`, unit: 'cm', ...partial };
}

const profile: UserProfile = {
  id: 'local',
  name: '',
  age: 30,
  height: 180,
  sex: 'male',
  weightUnit: 'kg',
  lengthUnit: 'cm',
  createdAt: '2026-01-01T00:00:00.000Z',
};

const measurements: Measurement[] = [
  measurement({ type: 'weight', value: 100, unit: 'kg', timestamp: '2026-01-01T00:00:00.000Z' }),
  measurement({ type: 'weight', value: 92, unit: 'kg', timestamp: '2026-03-01T00:00:00.000Z' }),
  measurement({ type: 'waist', value: 100, timestamp: '2026-01-01T00:00:00.000Z' }),
  measurement({ type: 'waist', value: 90, timestamp: '2026-03-01T00:00:00.000Z' }),
  measurement({ type: 'neck', value: 40, timestamp: '2026-01-01T00:00:00.000Z' }),
];

describe('latest / baseline', () => {
  it('takes the newest value per type', () => {
    expect(latestMeasurements(measurements).weight?.value).toBe(92);
    expect(latestMeasurements(measurements).waist?.value).toBe(90);
  });

  it('takes the oldest value per type', () => {
    expect(baselineMeasurements(measurements).weight?.value).toBe(100);
    expect(baselineMeasurements(measurements).waist?.value).toBe(100);
  });

  it('returns nothing for types never logged', () => {
    expect(latestMeasurements(measurements).hip).toBeUndefined();
  });
});

describe('bodyFatPercentFor', () => {
  it('prefers a logged body-fat entry over the tape estimate', () => {
    const withLogged = [
      ...measurements,
      measurement({ type: 'bodyFat', value: 17.2, unit: '%', timestamp: '2026-03-02T00:00:00.000Z' }),
    ];
    expect(bodyFatPercentFor(latestMeasurements(withLogged), profile)).toBe(17.2);
  });

  it('derives from tape measurements when none is logged', () => {
    const estimate = bodyFatPercentFor(latestMeasurements(measurements), profile);
    expect(estimate).toBeGreaterThan(10);
    expect(estimate).toBeLessThan(30);
  });

  it('needs sex and height', () => {
    expect(bodyFatPercentFor(latestMeasurements(measurements), null)).toBeNull();
    expect(bodyFatPercentFor(latestMeasurements(measurements), { ...profile, sex: null })).toBeNull();
  });

  it('needs a neck measurement for the male formula', () => {
    const waistOnly = measurements.filter((entry) => entry.type !== 'neck');
    expect(bodyFatPercentFor(latestMeasurements(waistOnly), profile)).toBeNull();
  });
});
