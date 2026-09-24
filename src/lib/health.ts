import AsyncStorage from '@react-native-async-storage/async-storage';
import { useSyncExternalStore } from 'react';

import type { Units } from './onboarding-store';

export type HealthMetric = 'weight' | 'bodyFat' | 'leanMass' | 'waist' | 'mood' | 'energy';

/** Values are stored metric (kg, cm) or as plain numbers (%, 1–5); display converts. */
export type HealthEntry = { id: string; metric: HealthMetric; value: number; at: string; note?: string };

export type MetricDef = {
  id: HealthMetric;
  label: string;
  /** "Log weight" */
  action: string;
  kind: 'number' | 'scale';
  /** Unit shown for the given preference (values stay metric underneath). */
  unit: (units: Units) => string;
  /** Sensible bounds for the input, in display units. */
  min: number;
  max: number;
  step: number;
  hint: string;
};

export const METRIC_DEFS: MetricDef[] = [
  { id: 'weight', label: 'Weight', action: 'Log weight', kind: 'number', unit: (u) => (u === 'imperial' ? 'lb' : 'kg'), min: 30, max: 400, step: 0.1, hint: 'Same time of day, same scale, gives the cleanest trend.' },
  { id: 'bodyFat', label: 'Body fat', action: 'Log body fat', kind: 'number', unit: () => '%', min: 2, max: 70, step: 0.1, hint: 'From a scale, calipers or a scan — note which, and keep using it.' },
  { id: 'leanMass', label: 'Lean body mass', action: 'Log lean mass', kind: 'number', unit: (u) => (u === 'imperial' ? 'lb' : 'kg'), min: 20, max: 300, step: 0.1, hint: 'Everything that is not fat: muscle, bone, water, organs.' },
  { id: 'waist', label: 'Waist', action: 'Log waist', kind: 'number', unit: (u) => (u === 'imperial' ? 'in' : 'cm'), min: 40, max: 200, step: 0.5, hint: 'At the navel, relaxed, after breathing out.' },
  { id: 'mood', label: 'Mood', action: 'Log mood', kind: 'scale', unit: () => '/ 5', min: 1, max: 5, step: 1, hint: 'A gut feeling is fine. Trends matter more than any single day.' },
  { id: 'energy', label: 'Energy', action: 'Log energy', kind: 'scale', unit: () => '/ 5', min: 1, max: 5, step: 1, hint: 'How you feel right now, not how the day should have gone.' },
];

export const metricById = (id: string) => METRIC_DEFS.find((m) => m.id === id);

const KG_PER_LB = 0.45359237;
const CM_PER_IN = 2.54;

/** Display → stored (metric). */
export function toStored(metric: HealthMetric, value: number, units: Units): number {
  if ((metric === 'weight' || metric === 'leanMass') && units === 'imperial') return value * KG_PER_LB;
  if (metric === 'waist' && units === 'imperial') return value * CM_PER_IN;
  return value;
}

/** Stored (metric) → display. */
export function toDisplay(metric: HealthMetric, value: number, units: Units): number {
  if ((metric === 'weight' || metric === 'leanMass') && units === 'imperial') return value / KG_PER_LB;
  if (metric === 'waist' && units === 'imperial') return value / CM_PER_IN;
  return value;
}

export const SCALE_LABELS = ['Rough', 'Low', 'Okay', 'Good', 'Great'];

const KEY = 'pepmaxing.health.v1';
let entries: HealthEntry[] = [];
let hydrated: Promise<void> | null = null;
const listeners = new Set<() => void>();
const emit = () => listeners.forEach((l) => l());
const persist = () => AsyncStorage.setItem(KEY, JSON.stringify(entries)).catch(() => {});

export const healthStore = {
  get: () => entries,
  hydrate(): Promise<void> {
    if (!hydrated) {
      hydrated = AsyncStorage.getItem(KEY)
        .then((raw) => {
          if (!raw) return;
          entries = JSON.parse(raw) as HealthEntry[];
          emit();
        })
        .catch(() => {});
    }
    return hydrated;
  },
  add(metric: HealthMetric, value: number, note?: string): HealthEntry {
    const entry: HealthEntry = { id: `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`, metric, value, at: new Date().toISOString(), note };
    entries = [entry, ...entries];
    emit();
    persist();
    return entry;
  },
  remove(id: string) {
    entries = entries.filter((e) => e.id !== id);
    emit();
    persist();
  },
  /** Adopts a merged list (cloud sync). */
  replace(next: HealthEntry[]) {
    entries = [...next].sort((a, b) => b.at.localeCompare(a.at));
    emit();
    persist();
  },
  reset() {
    entries = [];
    emit();
    persist();
  },
  subscribe(listener: () => void) {
    listeners.add(listener);
    healthStore.hydrate();
    return () => listeners.delete(listener);
  },
};

export function useHealth(): HealthEntry[] {
  return useSyncExternalStore(healthStore.subscribe, healthStore.get, healthStore.get);
}

export const latest = (list: HealthEntry[], metric: HealthMetric) => list.find((e) => e.metric === metric);
