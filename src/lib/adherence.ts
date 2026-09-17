import type { Shot } from '@/data/types';

import { addDays, daysBetween, fromDateKey, startOfDay, toDateKey } from './dates';

/** Distinct calendar days that have at least one shot, newest first. */
export function dosedDays(shots: Shot[]): string[] {
  return [...new Set(shots.map((shot) => shot.date))].sort((a, b) => b.localeCompare(a));
}

export type Cadence = 'daily' | 'weekly';

/**
 * Consecutive on-schedule doses ending at the most recent one.
 * Weekly protocols allow a 2-day grace window either side of the 7-day mark.
 */
export function currentStreak(shots: Shot[], cadence: Cadence, today: Date = new Date()): number {
  const days = dosedDays(shots);
  if (days.length === 0) return 0;

  const interval = cadence === 'daily' ? 1 : 7;
  const grace = cadence === 'daily' ? 1 : 2;

  // A streak is already broken if the latest dose is overdue past the grace window.
  if (daysBetween(fromDateKey(days[0]), today) > interval + grace) return 0;

  let streak = 1;
  for (let i = 1; i < days.length; i += 1) {
    const gap = daysBetween(fromDateKey(days[i]), fromDateKey(days[i - 1]));
    if (gap <= interval + grace) streak += 1;
    else break;
  }
  return streak;
}

/** Share of expected doses actually logged over the trailing window, 0-1. */
export function adherenceRate(
  shots: Shot[],
  cadence: Cadence,
  windowDays = 30,
  today: Date = new Date(),
): number | null {
  const days = dosedDays(shots);
  if (days.length === 0) return null;

  const windowStart = addDays(startOfDay(today), -(windowDays - 1));
  const firstEver = fromDateKey(days[days.length - 1]);
  const from = firstEver > windowStart ? firstEver : windowStart;
  const span = daysBetween(from, today) + 1;

  const interval = cadence === 'daily' ? 1 : 7;
  const expected = Math.max(1, Math.ceil(span / interval));
  const fromKey = toDateKey(from);
  const taken = days.filter((day) => day >= fromKey).length;
  return Math.min(1, taken / expected);
}

export type Milestone = { id: string; label: string; detail: string };

/** Wins worth celebrating — checked after every log. */
export function milestonesFor(shots: Shot[], cadence: Cadence, today: Date = new Date()): Milestone[] {
  const milestones: Milestone[] = [];
  const total = shots.length;

  for (const count of [1, 5, 10, 25, 50, 100]) {
    if (total === count) {
      milestones.push({
        id: `shots-${count}`,
        label: count === 1 ? 'First dose logged' : `${count} doses logged`,
        detail: count === 1 ? "You're on the board." : 'Consistency compounds.',
      });
    }
  }

  const streak = currentStreak(shots, cadence, today);
  for (const count of [4, 8, 12, 26, 52]) {
    if (streak === count) {
      milestones.push({
        id: `streak-${count}`,
        label: `${count} in a row`,
        detail: 'Not a single one missed.',
      });
    }
  }

  return milestones;
}

/** Days until the next dose is due; negative means overdue. */
export function daysUntilNextDose(
  shots: Shot[],
  cadence: Cadence,
  today: Date = new Date(),
): number | null {
  const days = dosedDays(shots);
  if (days.length === 0) return null;
  const interval = cadence === 'daily' ? 1 : 7;
  const due = addDays(fromDateKey(days[0]), interval);
  return daysBetween(startOfDay(today), due);
}
