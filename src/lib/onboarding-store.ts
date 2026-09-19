import AsyncStorage from '@react-native-async-storage/async-storage';
import { useSyncExternalStore } from 'react';

/** How familiar the user says they are with peptides; shapes the copy on later steps. */
export type Experience = 'curious' | 'starting' | 'experienced' | 'seasoned';
export type Sex = 'female' | 'male' | 'other' | 'unspecified';
export type Units = 'imperial' | 'metric';
export type ReminderChoice = 'granted' | 'denied' | 'later';
export type AccountChoice = 'apple' | 'google';

/**
 * Answers collected during onboarding. Mirrored to AsyncStorage on every change so a
 * killed app resumes at `step`, and pushed to the user's profile once they have signed in.
 */
export type OnboardingState = {
  name: string;
  /** Finished typewriter lines, carried into the next step so the transcript continues. */
  spoken: string[];
  goals: string[];
  experience: Experience | null;
  /**
   * Answers to the follow-up question, which is tailored to `experience`
   * (what would help / what's holding you back / what's missing). The reassurance
   * step replies to the first one.
   */
  motivations: string[];
  age: number | null;
  sex: Sex | null;
  /** Stored metric regardless of the unit system shown. */
  heightCm: number | null;
  weightKg: number | null;
  units: Units;
  reminders: ReminderChoice | null;
  account: AccountChoice | null;
  /** Referral code entered (uppercased), or null when skipped. */
  referralCode: string | null;
  /** Accepted the "educational content, not medical advice" notice. */
  disclaimerAcceptedAt: string | null;
  /** Last onboarding route reached, so the app can resume there. */
  step: string | null;
  completedAt: string | null;
};

const initial: OnboardingState = {
  name: '',
  spoken: [],
  goals: [],
  experience: null,
  motivations: [],
  age: null,
  sex: null,
  heightCm: null,
  weightKg: null,
  units: /-(US|LR|MM)$/i.test(Intl.DateTimeFormat().resolvedOptions().locale) ? 'imperial' : 'metric',
  reminders: null,
  account: null,
  referralCode: null,
  disclaimerAcceptedAt: null,
  step: null,
  completedAt: null,
};

const STORAGE_KEY = 'pepmaxing.onboarding.v1';

let state: OnboardingState = initial;
let hydrated = false;
const listeners = new Set<() => void>();

function emit() {
  listeners.forEach((l) => l());
}

let saveTimer: ReturnType<typeof setTimeout> | null = null;
function scheduleSave() {
  if (saveTimer) clearTimeout(saveTimer);
  saveTimer = setTimeout(() => {
    saveTimer = null;
    AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(state)).catch(() => {});
  }, 150);
}

export const onboardingStore = {
  get: () => state,
  set(patch: Partial<OnboardingState>) {
    state = { ...state, ...patch };
    emit();
    scheduleSave();
  },
  /** Adopt a full snapshot (e.g. the profile fetched after signing in on a new device). */
  replace(next: OnboardingState) {
    state = { ...initial, ...next };
    emit();
    scheduleSave();
  },
  reset() {
    state = initial;
    emit();
    AsyncStorage.removeItem(STORAGE_KEY).catch(() => {});
  },
  subscribe(listener: () => void) {
    listeners.add(listener);
    return () => listeners.delete(listener);
  },
  /** Loads the saved answers once, before the first route is chosen. Safe to call repeatedly. */
  async hydrate(): Promise<OnboardingState> {
    if (hydrated) return state;
    try {
      const raw = await AsyncStorage.getItem(STORAGE_KEY);
      if (raw) state = { ...initial, ...(JSON.parse(raw) as Partial<OnboardingState>) };
    } catch {
      // A corrupt or unreadable snapshot just means starting over.
    }
    hydrated = true;
    emit();
    return state;
  },
};

export function useOnboarding(): OnboardingState {
  return useSyncExternalStore(onboardingStore.subscribe, onboardingStore.get, onboardingStore.get);
}

/** First name only, trimmed and title-cased for greetings. */
export function displayName(name: string) {
  const first = name.trim().split(/\s+/)[0] ?? '';
  return first ? first[0].toUpperCase() + first.slice(1) : '';
}
