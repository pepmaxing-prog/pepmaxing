import type { Shot } from '@/data/types';
import {
  adherenceRate,
  currentStreak,
  daysUntilNextDose,
  dosedDays,
  inferCadence,
  milestonesFor,
} from '@/lib/adherence';

function shot(date: string, id = date): Shot {
  return {
    id,
    medicationId: 'semaglutide',
    date,
    time: '08:00',
    dosageAmount: 1,
    dosageUnit: 'mg',
    injectionSite: 'abdomenLeft',
    painLevel: 1,
    notes: '',
    createdAt: `${date}T08:00:00.000Z`,
    updatedAt: `${date}T08:00:00.000Z`,
  };
}

const today = new Date(2026, 0, 29);

describe('dosedDays', () => {
  it('dedupes and sorts newest first', () => {
    expect(dosedDays([shot('2026-01-01', 'a'), shot('2026-01-01', 'b'), shot('2026-01-08')])).toEqual([
      '2026-01-08',
      '2026-01-01',
    ]);
  });
});

describe('inferCadence', () => {
  it('defaults to weekly before there is enough history', () => {
    expect(inferCadence([])).toBe('weekly');
    expect(inferCadence([shot('2026-01-29'), shot('2026-01-28')])).toBe('weekly');
  });

  it('reads daily dosing from the median gap', () => {
    const shots = ['2026-01-29', '2026-01-28', '2026-01-27', '2026-01-26'].map((date) => shot(date));
    expect(inferCadence(shots)).toBe('daily');
  });

  it('stays weekly when most gaps are a week', () => {
    const shots = ['2026-01-29', '2026-01-22', '2026-01-15', '2026-01-14'].map((date) => shot(date));
    expect(inferCadence(shots)).toBe('weekly');
  });
});

describe('currentStreak', () => {
  it('counts consecutive weekly doses inside the grace window', () => {
    const shots = [shot('2026-01-29'), shot('2026-01-22'), shot('2026-01-15')];
    expect(currentStreak(shots, 'weekly', today)).toBe(3);
  });

  it('breaks on a skipped week', () => {
    const shots = [shot('2026-01-29'), shot('2026-01-22'), shot('2026-01-01')];
    expect(currentStreak(shots, 'weekly', today)).toBe(2);
  });

  it('is zero once the latest dose is overdue past the grace window', () => {
    expect(currentStreak([shot('2026-01-10')], 'weekly', today)).toBe(0);
  });

  it('handles daily cadence and empty logs', () => {
    expect(currentStreak([shot('2026-01-29'), shot('2026-01-28')], 'daily', today)).toBe(2);
    expect(currentStreak([], 'weekly', today)).toBe(0);
  });
});

describe('adherenceRate', () => {
  it('is 1 when every expected weekly dose is logged', () => {
    const shots = [shot('2026-01-29'), shot('2026-01-22'), shot('2026-01-15'), shot('2026-01-08')];
    expect(adherenceRate(shots, 'weekly', 30, today)).toBe(1);
  });

  it('drops when doses are missed', () => {
    const shots = [shot('2026-01-29'), shot('2026-01-08')];
    expect(adherenceRate(shots, 'weekly', 30, today)).toBeCloseTo(0.5);
  });

  it('is null with no history', () => {
    expect(adherenceRate([], 'weekly', 30, today)).toBeNull();
  });
});

describe('milestonesFor', () => {
  it('celebrates the first dose', () => {
    expect(milestonesFor([shot('2026-01-29')], 'weekly', today).map((m) => m.id)).toContain('shots-1');
  });

  it('says nothing on an unremarkable count', () => {
    const shots = ['2026-01-29', '2026-01-22', '2026-01-15'].map((date) => shot(date));
    expect(milestonesFor(shots, 'weekly', today)).toEqual([]);
  });
});

describe('daysUntilNextDose', () => {
  it('counts forward from the last dose', () => {
    expect(daysUntilNextDose([shot('2026-01-29')], 'weekly', today)).toBe(7);
  });

  it('goes negative when overdue', () => {
    expect(daysUntilNextDose([shot('2026-01-15')], 'weekly', today)).toBe(-7);
  });

  it('is null with no history', () => {
    expect(daysUntilNextDose([], 'weekly', today)).toBeNull();
  });
});
