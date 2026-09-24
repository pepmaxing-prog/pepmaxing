import AsyncStorage from '@react-native-async-storage/async-storage';
import { useSyncExternalStore } from 'react';

import { dayKey } from './schedule';

import type { FoodItem } from './foods';

/** One eaten thing. Macros in grams, energy in kcal. */
export type Meal = { id: string; name: string; kcal: number; protein: number; carbs: number; fat: number; fiber: number; at: string; foodId?: string; grams?: number };

export type NutritionDoc = {
  meals: Meal[];
  /** Water drunk per local day, in millilitres. */
  water: Record<string, number>;
  /** Food ids, most recently logged first. */
  recents: string[];
  favourites: string[];
  /** Library / packaged foods the user has used, kept so recents and favourites render offline. */
  known: Record<string, FoodItem>;
};

const KEY = 'pepmaxing.nutrition.v1';
const EMPTY: NutritionDoc = { meals: [], water: {}, recents: [], favourites: [], known: {} };
let state: NutritionDoc = EMPTY;
let hydrated: Promise<void> | null = null;
const listeners = new Set<() => void>();
const emit = () => listeners.forEach((l) => l());
const persist = () => AsyncStorage.setItem(KEY, JSON.stringify(state)).catch(() => {});
const uid = () => `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;
const set = (next: NutritionDoc) => {
  state = next;
  emit();
  persist();
};

export const nutritionStore = {
  get: () => state,
  hydrate(): Promise<void> {
    if (!hydrated) {
      hydrated = AsyncStorage.getItem(KEY)
        .then((raw) => {
          if (!raw) return;
          const saved = JSON.parse(raw) as Partial<NutritionDoc>;
          state = { meals: saved.meals ?? [], water: saved.water ?? {}, recents: saved.recents ?? [], favourites: saved.favourites ?? [], known: saved.known ?? {} };
          emit();
        })
        .catch(() => {});
    }
    return hydrated;
  },
  addMeal(meal: Omit<Meal, 'id' | 'at'> & { at?: Date }, food?: FoodItem): Meal {
    const entry: Meal = { ...meal, id: uid(), at: (meal.at ?? new Date()).toISOString() };
    const recents = food ? [food.id, ...state.recents.filter((id) => id !== food.id)].slice(0, 24) : state.recents;
    const known = food && food.source !== 'curated' ? { ...state.known, [food.id]: food } : state.known;
    set({ ...state, meals: [entry, ...state.meals], recents, known });
    return entry;
  },
  toggleFavourite(food: FoodItem) {
    const on = state.favourites.includes(food.id);
    const known = !on && food.source !== 'curated' ? { ...state.known, [food.id]: food } : state.known;
    set({ ...state, favourites: on ? state.favourites.filter((id) => id !== food.id) : [food.id, ...state.favourites], known });
  },
  /** The −/+ steppers adjust one "Quick adds" line for today instead of creating a meal per tap. */
  adjustQuick(delta: Partial<Pick<Meal, 'kcal' | 'protein' | 'carbs' | 'fat' | 'fiber'>>, day = dayKey(new Date())) {
    const existing = state.meals.find((m) => m.foodId === 'quick' && dayKey(new Date(m.at)) === day);
    const base = existing ?? { id: uid(), name: 'Quick adds', kcal: 0, protein: 0, carbs: 0, fat: 0, fiber: 0, at: new Date().toISOString(), foodId: 'quick' };
    const next: Meal = { ...base, kcal: Math.max(0, base.kcal + (delta.kcal ?? 0)), protein: Math.max(0, base.protein + (delta.protein ?? 0)), carbs: Math.max(0, base.carbs + (delta.carbs ?? 0)), fat: Math.max(0, base.fat + (delta.fat ?? 0)), fiber: Math.max(0, base.fiber + (delta.fiber ?? 0)) };
    const empty = next.kcal === 0 && next.protein === 0 && next.carbs === 0 && next.fat === 0 && next.fiber === 0;
    const others = state.meals.filter((m) => m.id !== base.id);
    set({ ...state, meals: empty ? others : [next, ...others] });
  },
  removeMeal(id: string) {
    set({ ...state, meals: state.meals.filter((m) => m.id !== id) });
  },
  /** Adds (or removes, when negative) millilitres for a day; never below zero. */
  addWater(ml: number, day = dayKey(new Date())) {
    set({ ...state, water: { ...state.water, [day]: Math.max(0, (state.water[day] ?? 0) + ml) } });
  },
  replace(next: NutritionDoc) {
    set({ meals: [...next.meals].sort((a, b) => b.at.localeCompare(a.at)), water: next.water, recents: next.recents ?? [], favourites: next.favourites ?? [], known: next.known ?? {} });
  },
  reset() {
    set(EMPTY);
  },
  subscribe(listener: () => void) {
    listeners.add(listener);
    nutritionStore.hydrate();
    return () => listeners.delete(listener);
  },
};

export function useNutrition(): NutritionDoc {
  return useSyncExternalStore(nutritionStore.subscribe, nutritionStore.get, nutritionStore.get);
}

/** Meals eaten on a local day. */
export const mealsOn = (doc: NutritionDoc, day: Date) => doc.meals.filter((m) => dayKey(new Date(m.at)) === dayKey(day));

export function totalsOf(meals: Meal[]) {
  return meals.reduce((t, m) => ({ kcal: t.kcal + m.kcal, protein: t.protein + m.protein, carbs: t.carbs + m.carbs, fat: t.fat + m.fat, fiber: t.fiber + m.fiber }), { kcal: 0, protein: 0, carbs: 0, fat: 0, fiber: 0 });
}

export const ML_PER_OZ = 29.5735;
