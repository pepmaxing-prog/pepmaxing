import { useSyncExternalStore } from 'react';

/** A peptide protocol the user runs; colours tag its doses on the calendar. */
export type Protocol = {
  id: string;
  peptide: string;
  color: string;
};

/** One scheduled (or logged) dose on a calendar day. */
export type DoseEvent = {
  id: string;
  protocolId: string;
  peptide: string;
  color: string;
  /** Local calendar day, `YYYY-MM-DD`. */
  day: string;
  /** Wall-clock time label, e.g. "8:00 AM". */
  time: string;
  amount: string;
  logged: boolean;
};

export type Schedule = {
  protocols: Protocol[];
  doses: DoseEvent[];
};

const EMPTY: Schedule = { protocols: [], doses: [] };

let state: Schedule = EMPTY;
const listeners = new Set<() => void>();

/** In-memory for now; protocols land in Supabase with the protocol builder. */
export const scheduleStore = {
  get: () => state,
  set(next: Schedule) {
    state = next;
    listeners.forEach((l) => l());
  },
  subscribe(listener: () => void) {
    listeners.add(listener);
    return () => listeners.delete(listener);
  },
};

export function useSchedule(): Schedule {
  return useSyncExternalStore(scheduleStore.subscribe, scheduleStore.get, scheduleStore.get);
}

// ---- dates -------------------------------------------------------------------------------

export function dayKey(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export function addDays(date: Date, days: number): Date {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
}

export function sameDay(a: Date, b: Date): boolean {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

/** Start of the week containing `date`; `weekStartsOn` 0 = Sunday, 1 = Monday. */
export function startOfWeek(date: Date, weekStartsOn: 0 | 1): Date {
  const start = new Date(date);
  start.setHours(0, 0, 0, 0);
  const offset = (start.getDay() - weekStartsOn + 7) % 7;
  return addDays(start, -offset);
}

/** Six full weeks covering the month, so the grid never changes height. */
export function monthGrid(year: number, month: number, weekStartsOn: 0 | 1): Date[] {
  const first = startOfWeek(new Date(year, month, 1), weekStartsOn);
  return Array.from({ length: 42 }, (_, i) => addDays(first, i));
}

export function weekdayLabels(weekStartsOn: 0 | 1): string[] {
  const names = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  return [...names.slice(weekStartsOn), ...names.slice(0, weekStartsOn)];
}

export const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

export function formatDayTitle(date: Date): string {
  const weekday = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'][date.getDay()];
  return `${weekday}, ${MONTHS[date.getMonth()].slice(0, 3)} ${date.getDate()}`;
}

// ---- derived -----------------------------------------------------------------------------

export function dosesOn(schedule: Schedule, date: Date): DoseEvent[] {
  const key = dayKey(date);
  return schedule.doses.filter((d) => d.day === key);
}

/** Consecutive days ending today (or yesterday) on which every scheduled dose was logged. */
export function currentStreak(schedule: Schedule, today = new Date()): number {
  const byDay = new Map<string, DoseEvent[]>();
  for (const dose of schedule.doses) {
    const list = byDay.get(dose.day) ?? [];
    list.push(dose);
    byDay.set(dose.day, list);
  }
  let streak = 0;
  let cursor = today;
  const todayDoses = byDay.get(dayKey(today));
  if (todayDoses && !todayDoses.every((d) => d.logged)) cursor = addDays(today, -1);
  for (;;) {
    const doses = byDay.get(dayKey(cursor));
    if (!doses || doses.length === 0 || !doses.every((d) => d.logged)) break;
    streak += 1;
    cursor = addDays(cursor, -1);
  }
  return streak;
}

export function nextDose(schedule: Schedule, now = new Date()): DoseEvent | null {
  const today = dayKey(now);
  const upcoming = schedule.doses.filter((d) => !d.logged && d.day >= today).sort((a, b) => (a.day + a.time).localeCompare(b.day + b.time));
  return upcoming[0] ?? null;
}
