import AsyncStorage from '@react-native-async-storage/async-storage';
import { useSyncExternalStore } from 'react';

import { compoundById, compoundCategoryById, halfLifeHours } from './compounds';

// ---- model ---------------------------------------------------------------------------------

export type DoseUnit = 'mg' | 'mcg' | 'IU' | 'mL' | 'units' | 'tablets' | 'capsules';
export const DOSE_UNITS: DoseUnit[] = ['mg', 'mcg', 'IU', 'mL', 'units', 'tablets', 'capsules'];

export type Administration = 'injection' | 'pen' | 'oral' | 'nasal' | 'topical';
export const ADMINISTRATIONS: { id: Administration; label: string; caption: string }[] = [
  { id: 'injection', label: 'Injection', caption: 'Reconstituted vial, drawn with a syringe' },
  { id: 'pen', label: 'Pen', caption: 'Pre-filled injector pen' },
  { id: 'oral', label: 'Oral', caption: 'Tablet, capsule or liquid' },
  { id: 'nasal', label: 'Nasal spray', caption: 'Metered spray' },
  { id: 'topical', label: 'Topical', caption: 'Cream, gel or serum' },
];

/** Weekdays use JavaScript numbering: 0 = Sunday … 6 = Saturday. */
export type Frequency =
  | { kind: 'daily' }
  | { kind: 'everyOtherDay' }
  | { kind: 'weekdays'; days: number[] }
  | { kind: 'weekly'; day: number }
  | { kind: 'everyN'; n: number }
  | { kind: 'fiveTwo' };

export type Cycle = { onWeeks: number; offWeeks: number } | null;

export type ProtocolItem = {
  id: string;
  /** One compound, or several when the protocol is tracked as a blend. */
  compoundIds: string[];
  dose: number | null;
  unit: DoseUnit;
  administration: Administration;
  /** Injection only: what is in the vial and how much bacteriostatic water went in. */
  vialMg: number | null;
  bacMl: number | null;
  /** Overrides of the protocol-level schedule. */
  frequency?: Frequency;
  time?: string;
};

export type Protocol = {
  id: string;
  name: string;
  mode: 'separate' | 'blend';
  items: ProtocolItem[];
  frequency: Frequency;
  /** `HH:mm`, 24-hour. */
  time: string;
  /** Local calendar day, `YYYY-MM-DD`. */
  startDate: string;
  cycle: Cycle;
  notes: string;
  color: string;
  createdAt: string;
  /** Paused protocols keep their history but schedule nothing from the pause onwards. */
  pausedAt?: string | null;
};

/** What was recorded for a scheduled dose: when, where, how much — or that it was skipped. */
export type DoseLog = {
  /** ISO timestamp of the administration (or of the skip). */
  at: string;
  /** Injection site id, see `sites.ts`. */
  site?: string;
  /** Actual amount taken when it differed from the plan. */
  dose?: number;
  unit?: DoseUnit;
  note?: string;
  skipped?: boolean;
};

/** One scheduled dose on a calendar day, expanded from a protocol. `id` is stable across rebuilds. */
export type DoseEvent = {
  id: string;
  protocolId: string;
  itemId: string;
  title: string;
  subtitle?: string;
  color: string;
  day: string;
  /** Wall-clock label, e.g. "9:00 AM". */
  time: string;
  /** `HH:mm`, for sorting. */
  timeKey: string;
  amount: string;
  /** Taken (not skipped). */
  logged: boolean;
  log?: DoseLog;
  administration: Administration;
};

export type Schedule = {
  protocols: Protocol[];
  /** Dose id → what happened. */
  logs: Record<string, DoseLog>;
  /** Materialised from `protocols` for the visible window; never edit directly. */
  doses: DoseEvent[];
};

// ---- store ---------------------------------------------------------------------------------

const KEY = 'pepmaxing.schedule.v1';
/** How far ahead the calendar can see scheduled doses. */
const HORIZON_DAYS = 7 * 16;

const EMPTY: Schedule = { protocols: [], logs: {}, doses: [] };
let state: Schedule = EMPTY;
let hydrated: Promise<void> | null = null;
const listeners = new Set<() => void>();
const emit = () => listeners.forEach((l) => l());

function commit(protocols: Protocol[], logs: Record<string, DoseLog>) {
  state = { protocols, logs, doses: buildDoses(protocols, logs) };
  emit();
  AsyncStorage.setItem(KEY, JSON.stringify({ protocols, logs })).catch(() => {});
}

export const scheduleStore = {
  get: () => state,
  /** Reads the saved protocols once; the root layout awaits this before the first route. */
  hydrate(): Promise<void> {
    if (!hydrated) {
      hydrated = AsyncStorage.getItem(KEY)
        .then((raw) => {
          if (!raw) return;
          const saved = JSON.parse(raw) as { protocols?: Protocol[]; logs?: Record<string, string | DoseLog> };
          const protocols = saved.protocols ?? [];
          // Early builds stored just the timestamp.
          const logs = Object.fromEntries(Object.entries(saved.logs ?? {}).map(([id, v]) => [id, typeof v === 'string' ? { at: v } : v]));
          state = { protocols, logs, doses: buildDoses(protocols, logs) };
          emit();
        })
        .catch(() => {});
    }
    return hydrated;
  },
  addProtocol(protocol: Protocol) {
    commit([...state.protocols, protocol], state.logs);
  },
  updateProtocol(id: string, patch: Partial<Protocol>) {
    commit(
      state.protocols.map((p) => (p.id === id ? { ...p, ...patch } : p)),
      state.logs,
    );
  },
  removeProtocol(id: string) {
    const logs = Object.fromEntries(Object.entries(state.logs).filter(([doseId]) => !doseId.startsWith(`${id}:`)));
    commit(
      state.protocols.filter((p) => p.id !== id),
      logs,
    );
  },
  /** Records a dose as taken (with optional site, actual amount and note). */
  logDose(doseId: string, details: Omit<DoseLog, 'at' | 'skipped'> & { at?: Date }) {
    const { at, ...rest } = details;
    commit(state.protocols, { ...state.logs, [doseId]: { ...rest, at: (at ?? new Date()).toISOString() } });
  },
  skipDose(doseId: string, note?: string) {
    commit(state.protocols, { ...state.logs, [doseId]: { at: new Date().toISOString(), skipped: true, note } });
  },
  /** Forgets whatever was recorded for a dose. */
  unlog(doseId: string) {
    const logs = { ...state.logs };
    delete logs[doseId];
    commit(state.protocols, logs);
  },
  pauseProtocol(id: string, paused: boolean) {
    commit(
      state.protocols.map((p) => (p.id === id ? { ...p, pausedAt: paused ? new Date().toISOString() : null } : p)),
      state.logs,
    );
  },
  /** Adopts merged protocols and logs (cloud sync). */
  replace(protocols: Protocol[], logs: Record<string, DoseLog>) {
    commit(protocols, logs);
  },
  /** Forgets every protocol and log on this device. */
  reset() {
    commit([], {});
  },
  subscribe(listener: () => void) {
    listeners.add(listener);
    scheduleStore.hydrate();
    return () => listeners.delete(listener);
  },
};

export function useSchedule(): Schedule {
  return useSyncExternalStore(scheduleStore.subscribe, scheduleStore.get, scheduleStore.get);
}

export const newId = () => `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 7)}`;

// ---- expansion -----------------------------------------------------------------------------

const daysBetween = (from: Date, to: Date) => Math.round((startOfDay(to).getTime() - startOfDay(from).getTime()) / 86_400_000);

/** Whether `frequency` (with an optional cycle) puts a dose on `date`, counting from `start`. */
export function isScheduledOn(frequency: Frequency, start: Date, date: Date, cycle: Cycle = null): boolean {
  const since = daysBetween(start, date);
  if (since < 0) return false;
  if (cycle) {
    const period = cycle.onWeeks + cycle.offWeeks;
    if (period > 0 && Math.floor(since / 7) % period >= cycle.onWeeks) return false;
  }
  switch (frequency.kind) {
    case 'daily':
      return true;
    case 'everyOtherDay':
      return since % 2 === 0;
    case 'weekdays':
      return frequency.days.includes(date.getDay());
    case 'weekly':
      return date.getDay() === frequency.day;
    case 'everyN':
      return frequency.n > 0 && since % frequency.n === 0;
    case 'fiveTwo':
      return since % 7 < 5;
  }
}

export function buildDoses(protocols: Protocol[], logs: Record<string, DoseLog>, today = new Date()): DoseEvent[] {
  const doses: DoseEvent[] = [];
  const end = addDays(today, HORIZON_DAYS);
  for (const protocol of protocols) {
    const start = parseDay(protocol.startDate);
    for (const item of protocol.items) {
      const frequency = item.frequency ?? protocol.frequency;
      const timeKey = item.time ?? protocol.time;
      const { title, subtitle, color } = describeItem(protocol, item);
      const amount = formatDose(item);
      const pausedDay = protocol.pausedAt ? dayKey(new Date(protocol.pausedAt)) : null;
      for (let d = new Date(start); d <= end; d = addDays(d, 1)) {
        if (!isScheduledOn(frequency, start, d, protocol.cycle)) continue;
        const day = dayKey(d);
        const id = `${protocol.id}:${item.id}:${day}`;
        const log = logs[id];
        // While paused, only days that were already dealt with stay on the calendar.
        if (pausedDay && day >= pausedDay && !log) continue;
        doses.push({ id, protocolId: protocol.id, itemId: item.id, title, subtitle, color, day, time: formatTime(timeKey), timeKey, amount, logged: !!log && !log.skipped, log, administration: item.administration });
      }
    }
  }
  return doses.sort((a, b) => (a.day + a.timeKey).localeCompare(b.day + b.timeKey));
}

export function describeItem(protocol: Protocol, item: ProtocolItem): { title: string; subtitle?: string; color: string } {
  const names = item.compoundIds.map((id) => compoundById(id)?.name ?? id);
  const first = compoundById(item.compoundIds[0]);
  const color = protocol.mode === 'blend' || !first ? protocol.color : compoundCategoryById(first.category).color;
  if (protocol.mode === 'blend') return { title: protocol.name, subtitle: `Blend of ${joinNames(names)}`, color };
  return { title: names[0] ?? protocol.name, subtitle: protocol.items.length > 1 ? protocol.name : undefined, color };
}

export function joinNames(names: string[]): string {
  if (names.length <= 1) return names[0] ?? '';
  return `${names.slice(0, -1).join(', ')} & ${names[names.length - 1]}`;
}

export function formatDose(item: Pick<ProtocolItem, 'dose' | 'unit'>): string {
  if (item.dose == null) return 'No dose set';
  const n = Number.isInteger(item.dose) ? String(item.dose) : String(Number(item.dose.toFixed(3)));
  return `${n} ${item.unit}`;
}

export function formatTime(hhmm: string): string {
  const [h, m] = hhmm.split(':').map(Number);
  const suffix = h >= 12 ? 'PM' : 'AM';
  const hour = h % 12 === 0 ? 12 : h % 12;
  return `${hour}:${String(m).padStart(2, '0')} ${suffix}`;
}

export function timeKeyFromDate(date: Date): string {
  return `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;
}

export function dateFromTimeKey(hhmm: string, base = new Date()): Date {
  const [h, m] = hhmm.split(':').map(Number);
  const d = new Date(base);
  d.setHours(h, m, 0, 0);
  return d;
}

const SHORT_DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export function describeFrequency(f: Frequency): string {
  switch (f.kind) {
    case 'daily':
      return 'Every day';
    case 'everyOtherDay':
      return 'Every other day';
    case 'weekdays': {
      const days = [...f.days].sort();
      if (days.length === 7) return 'Every day';
      if (days.length === 5 && !days.includes(0) && !days.includes(6)) return 'Weekdays';
      return days.map((d) => SHORT_DAYS[d]).join(', ') || 'No days';
    }
    case 'weekly':
      return `Weekly on ${SHORT_DAYS[f.day]}`;
    case 'everyN':
      return `Every ${f.n} days`;
    case 'fiveTwo':
      return '5 days on, 2 off';
  }
}

export function describeCycle(c: Cycle): string {
  if (!c) return 'Continuous';
  return `${c.onWeeks} wk on · ${c.offWeeks} wk off`;
}

/** Units on a U-100 syringe for `dose` given a vial of `vialMg` reconstituted with `bacMl`. */
export function drawUnits(doseMg: number, vialMg: number, bacMl: number): { units: number; ml: number; mgPerMl: number } | null {
  if (!(doseMg > 0) || !(vialMg > 0) || !(bacMl > 0)) return null;
  const mgPerMl = vialMg / bacMl;
  const ml = doseMg / mgPerMl;
  return { units: ml * 100, ml, mgPerMl };
}

export function toMg(dose: number, unit: DoseUnit): number | null {
  if (unit === 'mg') return dose;
  if (unit === 'mcg') return dose / 1000;
  return null;
}

// ---- dates ---------------------------------------------------------------------------------

export function startOfDay(date: Date): Date {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
}

export function dayKey(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export function parseDay(key: string): Date {
  const [y, m, d] = key.split('-').map(Number);
  return new Date(y, m - 1, d);
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
  const start = startOfDay(date);
  const offset = (start.getDay() - weekStartsOn + 7) % 7;
  return addDays(start, -offset);
}

/** Six full weeks covering the month, so the grid never changes height. */
export function monthGrid(year: number, month: number, weekStartsOn: 0 | 1): Date[] {
  const first = startOfWeek(new Date(year, month, 1), weekStartsOn);
  return Array.from({ length: 42 }, (_, i) => addDays(first, i));
}

export function weekdayLabels(weekStartsOn: 0 | 1): string[] {
  return [...SHORT_DAYS.slice(weekStartsOn), ...SHORT_DAYS.slice(0, weekStartsOn)];
}

export const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

export function formatDayTitle(date: Date): string {
  const weekday = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'][date.getDay()];
  return `${weekday}, ${MONTHS[date.getMonth()].slice(0, 3)} ${date.getDate()}`;
}

export function formatDate(date: Date): string {
  return `${MONTHS[date.getMonth()].slice(0, 3)} ${date.getDate()}, ${date.getFullYear()}`;
}

// ---- derived -------------------------------------------------------------------------------

export function dosesOn(schedule: Schedule, date: Date): DoseEvent[] {
  const key = dayKey(date);
  return schedule.doses.filter((d) => d.day === key);
}

/** Consecutive days ending today (or yesterday) on which every scheduled dose was dealt with (taken or deliberately skipped). */
export function currentStreak(schedule: Schedule, today = new Date()): number {
  const byDay = new Map<string, DoseEvent[]>();
  for (const dose of schedule.doses) {
    const list = byDay.get(dose.day) ?? [];
    list.push(dose);
    byDay.set(dose.day, list);
  }
  const done = (doses: DoseEvent[]) => doses.every((d) => d.log);
  let streak = 0;
  let cursor = today;
  const todayDoses = byDay.get(dayKey(today));
  if (todayDoses && !done(todayDoses)) cursor = addDays(today, -1);
  for (;;) {
    const doses = byDay.get(dayKey(cursor));
    if (!doses || doses.length === 0 || !done(doses)) break;
    streak += 1;
    cursor = addDays(cursor, -1);
  }
  return streak;
}

/** The next dose still open, from today onwards. */
export function nextDose(schedule: Schedule, now = new Date()): DoseEvent | null {
  const today = dayKey(now);
  return schedule.doses.find((d) => !d.log && d.day >= today) ?? null;
}

/** Today's doses nobody has dealt with yet. */
export function openDosesToday(schedule: Schedule, now = new Date()): DoseEvent[] {
  return dosesOn(schedule, now).filter((d) => !d.log);
}

export const loggedCount = (schedule: Schedule) => Object.values(schedule.logs).filter((l) => !l.skipped).length;

// ---- per-compound summaries (the Home hero) ---------------------------------------------------

export type CompoundSummary = {
  /** Protocol item id — one card per tracked compound (or blend). */
  key: string;
  title: string;
  subtitle?: string;
  color: string;
  /** Earliest dose still open, today or overdue from earlier days. */
  next: DoseEvent | null;
  nextDue: Date | null;
  overdue: boolean;
  /** Most recent taken dose. */
  last: DoseEvent | null;
  lastAt: Date | null;
  /** How far through the interval between the last dose and the next we are, 0–1. */
  progress: number;
  /** Estimated amount still in the body, when the half-life is documented. */
  levelMg: number | null;
  halfLifeHours: number | null;
  unit: DoseUnit;
  /** The single compound this item tracks; null for a blend. */
  compoundId: string | null;
};

const dueAt = (dose: DoseEvent) => dateFromTimeKey(dose.timeKey, parseDay(dose.day));

/** One summary per protocol item, most urgent first. Only items with doses in the window. */
export function compoundSummaries(schedule: Schedule, now = new Date()): CompoundSummary[] {
  const out: CompoundSummary[] = [];
  for (const protocol of schedule.protocols) {
    for (const item of protocol.items) {
      const doses = schedule.doses.filter((d) => d.itemId === item.id);
      if (!doses.length) continue;
      const { title, subtitle, color } = describeItem(protocol, item);
      const taken = doses.filter((d) => d.log && !d.log.skipped).sort((a, b) => b.log!.at.localeCompare(a.log!.at));
      const last = taken[0] ?? null;
      const lastAt = last ? new Date(last.log!.at) : null;
      const open = doses.filter((d) => !d.log).sort((a, b) => (a.day + a.timeKey).localeCompare(b.day + b.timeKey));
      const next = open[0] ?? null;
      const nextDue = next ? dueAt(next) : null;
      const overdue = !!nextDue && nextDue.getTime() < now.getTime();
      let progress = 0;
      if (nextDue) {
        const start = lastAt?.getTime() ?? nextDue.getTime() - 86_400_000;
        progress = Math.min(1, Math.max(0, (now.getTime() - start) / Math.max(1, nextDue.getTime() - start)));
      }
      const compound = compoundById(item.compoundIds[0]);
      const half = compound && item.compoundIds.length === 1 ? halfLifeHours(compound) : undefined;
      let levelMg: number | null = null;
      if (half) {
        levelMg = 0;
        for (const d of taken) {
          const mg = toMg(d.log?.dose ?? item.dose ?? 0, d.log?.unit ?? item.unit);
          if (mg == null) continue;
          const hours = (now.getTime() - new Date(d.log!.at).getTime()) / 3_600_000;
          if (hours < 0 || hours > half * 6) continue;
          levelMg += mg * Math.pow(0.5, hours / half);
        }
      }
      out.push({ key: item.id, title, subtitle, color, next, nextDue, overdue, last, lastAt, progress, levelMg, halfLifeHours: half ?? null, unit: item.unit, compoundId: item.compoundIds.length === 1 ? item.compoundIds[0] : null });
    }
  }
  return out.sort((a, b) => {
    if (a.overdue !== b.overdue) return a.overdue ? -1 : 1;
    return (a.nextDue?.getTime() ?? Infinity) - (b.nextDue?.getTime() ?? Infinity);
  });
}

/** "in 3 h 20 m", "3 h ago", "2 days ago", "just now". */
export function formatRelative(target: Date, now = new Date()): string {
  const diff = target.getTime() - now.getTime();
  const abs = Math.abs(diff);
  const past = diff < 0;
  if (abs < 60_000) return 'just now';
  const minutes = Math.round(abs / 60_000);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);
  let text: string;
  if (days >= 1) text = `${days} day${days === 1 ? '' : 's'}`;
  else if (hours >= 1) text = minutes % 60 && hours < 6 ? `${hours} h ${minutes % 60} m` : `${hours} h`;
  else text = `${minutes} min`;
  return past ? `${text} ago` : `in ${text}`;
}

/** "Today, 9:00 AM" / "Yesterday, 9:05 PM" / "Mon, Sep 22, 9:00 AM". */
export function formatWhen(date: Date, now = new Date()): string {
  const time = formatTime(timeKeyFromDate(date));
  if (sameDay(date, now)) return `Today, ${time}`;
  if (sameDay(date, addDays(now, -1))) return `Yesterday, ${time}`;
  if (sameDay(date, addDays(now, 1))) return `Tomorrow, ${time}`;
  return `${formatDayTitle(date).replace(/^(\w{3})\w*,/, '$1,')}, ${time}`;
}

export function formatMg(mg: number): string {
  if (mg >= 1) return `${Number(mg.toFixed(mg >= 10 ? 1 : 2))} mg`;
  const mcg = mg * 1000;
  return `${Number(mcg.toFixed(mcg >= 10 ? 0 : 1))} mcg`;
}

/** Site history for rotation: most recent first, taken doses only. */
export function siteHistory(schedule: Schedule): { site: string; at: string; administration: Administration }[] {
  return schedule.doses
    .filter((d) => d.log && !d.log.skipped && d.log.site)
    .map((d) => ({ site: d.log!.site!, at: d.log!.at, administration: d.administration }))
    .sort((a, b) => b.at.localeCompare(a.at));
}
