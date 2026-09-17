import type { Shot } from '@/data/types';
import { checkDose, estimatedLevelMcg, formatLevel, levelSeries, remainingFraction, shotTimestamp } from '@/lib/levels';

function shot(overrides: Partial<Shot> = {}): Shot {
  return {
    id: 'shot-1',
    medicationId: 'semaglutide',
    date: '2026-01-01',
    time: '08:00',
    dosageAmount: 1,
    dosageUnit: 'mg',
    injectionSite: 'abdomenLeft',
    painLevel: 1,
    notes: '',
    createdAt: '2026-01-01T08:00:00.000Z',
    updatedAt: '2026-01-01T08:00:00.000Z',
    ...overrides,
  };
}

const HOUR = 60 * 60 * 1000;

describe('remainingFraction', () => {
  it('halves every half-life', () => {
    expect(remainingFraction(0, 10)).toBe(1);
    expect(remainingFraction(10, 10)).toBeCloseTo(0.5);
    expect(remainingFraction(20, 10)).toBeCloseTo(0.25);
  });

  it('treats future and zero-half-life inputs defensively', () => {
    expect(remainingFraction(-5, 10)).toBe(1);
    expect(remainingFraction(5, 0)).toBe(0);
  });
});

describe('estimatedLevelMcg', () => {
  const taken = shotTimestamp({ date: '2026-01-01', time: '08:00' });

  it('is the full dose at the moment of injection', () => {
    expect(estimatedLevelMcg([shot()], taken)).toBeCloseTo(1000);
  });

  it('decays by the medication half-life', () => {
    const semaglutideHalfLife = 165;
    expect(estimatedLevelMcg([shot()], taken + semaglutideHalfLife * HOUR)).toBeCloseTo(500, 0);
  });

  it('sums overlapping doses', () => {
    const second = shot({ id: 'shot-2', date: '2026-01-01', time: '08:00' });
    expect(estimatedLevelMcg([shot(), second], taken)).toBeCloseTo(2000);
  });

  it('ignores shots in the future and unconvertible units', () => {
    expect(estimatedLevelMcg([shot()], taken - HOUR)).toBe(0);
    expect(estimatedLevelMcg([shot({ dosageUnit: 'iu' })], taken)).toBe(0);
  });

  it('ignores unknown medications', () => {
    expect(estimatedLevelMcg([shot({ medicationId: 'nope' })], taken)).toBe(0);
  });
});

describe('levelSeries', () => {
  it('samples the window inclusively and decreases after the last dose', () => {
    const taken = shotTimestamp({ date: '2026-01-01', time: '08:00' });
    const series = levelSeries([shot()], { from: taken, to: taken + 100 * HOUR, points: 5 });
    expect(series).toHaveLength(5);
    expect(series[0].t).toBe(taken);
    expect(series[4].t).toBe(taken + 100 * HOUR);
    expect(series[4].mcg).toBeLessThan(series[0].mcg);
  });

  it('returns nothing for a degenerate window', () => {
    expect(levelSeries([], { from: 10, to: 10 })).toEqual([]);
  });
});

describe('formatLevel', () => {
  it('switches to mg above 1000 mcg', () => {
    expect(formatLevel(2400)).toBe('2.4 mg');
    expect(formatLevel(250)).toBe('250 mcg');
    expect(formatLevel(0.125)).toBe('0.13 mcg');
  });
});

describe('checkDose', () => {
  it('warns above the catalogue maximum', () => {
    expect(checkDose('semaglutide', 3, 'mg')?.level).toBe('high');
    expect(checkDose('semaglutide', 1, 'mg')).toBeNull();
  });

  it('compares across units', () => {
    expect(checkDose('semaglutide', 3000, 'mcg')?.level).toBe('high');
    expect(checkDose('semaglutide', 1000, 'mcg')).toBeNull();
  });

  it('stays quiet for unknown medications or unconvertible units', () => {
    expect(checkDose('nope', 99, 'mg')).toBeNull();
    expect(checkDose('semaglutide', 99, 'iu')).toBeNull();
  });
});
