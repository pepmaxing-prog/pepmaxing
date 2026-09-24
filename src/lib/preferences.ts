import AsyncStorage from '@react-native-async-storage/async-storage';
import { useSyncExternalStore } from 'react';

import type { OnboardingState } from './onboarding-store';

export type Goals = { kcal: number; protein: number; carbs: number; fat: number; fiber: number; waterOz: number };
export type MetricId = 'weight' | 'bodyFat' | 'leanMass' | 'waist' | 'mood' | 'energy';
export type PhotoCategory = 'hair' | 'body' | 'face';
export type UnitsPref = 'automatic' | 'metric' | 'imperial';
export type LabelId = 'experience' | 'level' | 'goal' | 'peptide' | 'stage' | 'tenure' | 'milestone' | 'anniversary';

export type Preferences = {
  username: string;
  avatar: string;
  /** Up to four labels shown beside the username in community posts. */
  labels: LabelId[];
  /** Null means "use the estimate from height, weight, age and sex". */
  customGoals: Goals | null;
  metrics: Record<MetricId, boolean>;
  photos: Record<PhotoCategory, boolean>;
  healthSync: boolean;
  unitsPref: UnitsPref;
  notifications: { doses: boolean; missed: boolean; streak: boolean; weekly: boolean; research: boolean };
};

export const METRICS: { id: MetricId; label: string }[] = [
  { id: 'weight', label: 'Weight' },
  { id: 'bodyFat', label: 'Body fat' },
  { id: 'leanMass', label: 'Lean body mass' },
  { id: 'waist', label: 'Waist' },
  { id: 'mood', label: 'Mood' },
  { id: 'energy', label: 'Energy' },
];
export const PHOTO_CATEGORIES: { id: PhotoCategory; label: string }[] = [
  { id: 'hair', label: 'Hair' },
  { id: 'body', label: 'Body' },
  { id: 'face', label: 'Face' },
];

export const AVATARS = [
  'leaf.fill', 'sun.max.fill', 'moon.stars.fill', 'bolt.fill', 'drop.fill', 'flame.fill', 'sparkles', 'star.fill',
  'heart.fill', 'mountain.2.fill', 'water.waves', 'snowflake', 'pawprint.fill', 'tortoise.fill', 'hare.fill', 'bird.fill',
  'fish.fill', 'ladybug.fill', 'tree.fill', 'globe.americas.fill', 'atom', 'dumbbell.fill', 'figure.run', 'brain.head.profile',
] as const;
export const AVATAR_TINTS = ['#34D399', '#FBBF24', '#A78BFA', '#7DD3FC', '#60A5FA', '#FB923C', '#F9A8D4', '#FDE68A', '#FB7185', '#94A3B8', '#2DD4BF', '#BAE6FD'];

const ADJECTIVES = ['Steady', 'Quiet', 'Bright', 'Swift', 'Calm', 'Bold', 'Keen', 'Patient', 'Early', 'Sharp', 'Gentle', 'Rapid'];
const ANIMALS = ['Otter', 'Heron', 'Fox', 'Lynx', 'Falcon', 'Badger', 'Orca', 'Ibex', 'Kestrel', 'Marten', 'Puffin', 'Wolf'];

/** Anonymous handle, e.g. "SteadyOtter8846". Never derived from the person's name. */
export function randomUsername(): string {
  const pick = <T,>(list: readonly T[]) => list[Math.floor(Math.random() * list.length)];
  return `${pick(ADJECTIVES)}${pick(ANIMALS)}${Math.floor(1000 + Math.random() * 9000)}`;
}

const initial: Preferences = {
  username: '',
  avatar: AVATARS[0],
  labels: ['experience', 'level'],
  customGoals: null,
  metrics: { weight: true, bodyFat: false, leanMass: false, waist: false, mood: true, energy: true },
  photos: { hair: false, body: false, face: false },
  healthSync: false,
  unitsPref: 'automatic',
  notifications: { doses: true, missed: true, streak: true, weekly: true, research: false },
};

const KEY = 'pepmaxing.preferences.v1';
let state: Preferences = initial;
let hydrated: Promise<void> | null = null;
const listeners = new Set<() => void>();
const emit = () => listeners.forEach((l) => l());

function persist() {
  AsyncStorage.setItem(KEY, JSON.stringify(state)).catch(() => {});
}

export const preferencesStore = {
  get: () => state,
  hydrate(): Promise<void> {
    if (!hydrated) {
      hydrated = AsyncStorage.getItem(KEY)
        .then((raw) => {
          state = raw ? { ...initial, ...(JSON.parse(raw) as Partial<Preferences>) } : { ...initial, username: randomUsername() };
          if (!state.username) state.username = randomUsername();
          emit();
          if (!raw) persist();
        })
        .catch(() => {});
    }
    return hydrated;
  },
  set(patch: Partial<Preferences>) {
    state = { ...state, ...patch };
    emit();
    persist();
  },
  /** Adopts a synced copy (cloud sync). */
  replace(next: Preferences) {
    state = { ...initial, ...next };
    emit();
    persist();
  },
  reset() {
    state = { ...initial, username: randomUsername() };
    emit();
    persist();
  },
  subscribe(listener: () => void) {
    listeners.add(listener);
    preferencesStore.hydrate();
    return () => listeners.delete(listener);
  },
};

export function usePreferences(): Preferences {
  return useSyncExternalStore(preferencesStore.subscribe, preferencesStore.get, preferencesStore.get);
}

// ---- goals -------------------------------------------------------------------------------

export const REFERENCE_GOALS: Goals = { kcal: 2200, protein: 120, carbs: 250, fat: 73, fiber: 31, waterOz: 90 };

/**
 * Mifflin-St Jeor resting energy × 1.375 (light activity), protein 1.6 g/kg, fat 30% of energy,
 * fibre 14 g per 1000 kcal, water 35 ml/kg. Falls back to reference defaults without body data.
 */
export function estimateGoals(profile: Pick<OnboardingState, 'heightCm' | 'weightKg' | 'age' | 'sex'>): { goals: Goals; estimated: boolean } {
  const { heightCm, weightKg, age, sex } = profile;
  if (!heightCm || !weightKg || !age) return { goals: REFERENCE_GOALS, estimated: false };
  const base = 10 * weightKg + 6.25 * heightCm - 5 * age;
  const rest = sex === 'female' ? base - 161 : sex === 'male' ? base + 5 : base - 78;
  const kcal = Math.round((rest * 1.375) / 10) * 10;
  const protein = Math.round(weightKg * 1.6);
  const fat = Math.round((kcal * 0.3) / 9);
  const carbs = Math.max(0, Math.round((kcal - protein * 4 - fat * 9) / 4));
  const fiber = Math.round((kcal / 1000) * 14);
  const waterOz = Math.round((weightKg * 35) / 29.5735);
  return { goals: { kcal, protein, carbs, fat, fiber, waterOz }, estimated: true };
}

export const GOAL_FIELDS: { key: keyof Goals; label: string; unit: string; step: number; min: number; max: number }[] = [
  { key: 'kcal', label: 'Calories', unit: 'kcal', step: 50, min: 1000, max: 6000 },
  { key: 'protein', label: 'Protein', unit: 'g', step: 5, min: 20, max: 400 },
  { key: 'carbs', label: 'Carbs', unit: 'g', step: 5, min: 0, max: 800 },
  { key: 'fat', label: 'Fat', unit: 'g', step: 2, min: 10, max: 300 },
  { key: 'fiber', label: 'Fiber', unit: 'g', step: 1, min: 5, max: 100 },
  { key: 'waterOz', label: 'Water', unit: 'oz', step: 4, min: 20, max: 300 },
];

// ---- community labels & levels -------------------------------------------------------------

export type LabelDef = { id: LabelId; name: string; hint: string; unlock?: string };
export const LABELS: LabelDef[] = [
  { id: 'experience', name: 'Experience', hint: 'Show your current experience badge' },
  { id: 'level', name: 'Level', hint: 'Show your level name' },
  { id: 'goal', name: 'Goal', hint: 'Your main goal, as a label' },
  { id: 'peptide', name: 'Peptide', hint: 'The peptide you run most', unlock: 'Log a dose to unlock' },
  { id: 'stage', name: 'Stage', hint: 'Where you are in your cycle', unlock: 'Start a protocol to unlock' },
  { id: 'tenure', name: 'Tenure', hint: 'How long you have been tracking', unlock: 'Log your first dose to unlock' },
  { id: 'milestone', name: 'Milestone', hint: 'Doses logged, rounded down', unlock: 'Log 25 doses to unlock' },
  { id: 'anniversary', name: 'Anniversary', hint: 'Years with the app', unlock: 'Track for 6 months to unlock' },
];
export const MAX_LABELS = 4;

export const LEVELS: { name: string; xp: number }[] = [
  { name: 'Starter', xp: 0 },
  { name: 'Regular', xp: 25 },
  { name: 'Consistent', xp: 100 },
  { name: 'Dedicated', xp: 300 },
  { name: 'Veteran', xp: 1000 },
];

/** One XP per logged dose for now; the level is the highest threshold reached. */
export function levelFor(xp: number) {
  const index = LEVELS.reduce((acc, l, i) => (xp >= l.xp ? i : acc), 0);
  const next = LEVELS[index + 1];
  return { level: LEVELS[index], next, toNext: next ? next.xp - xp : 0 };
}
