import { useSyncExternalStore } from 'react';

/**
 * Answers collected during onboarding. In-memory for now; persisted once the
 * data layer lands so a killed app resumes where it left off.
 */
export type OnboardingState = {
  name: string;
};

let state: OnboardingState = { name: '' };
const listeners = new Set<() => void>();

function emit() {
  listeners.forEach((l) => l());
}

export const onboardingStore = {
  get: () => state,
  set(patch: Partial<OnboardingState>) {
    state = { ...state, ...patch };
    emit();
  },
  reset() {
    state = { name: '' };
    emit();
  },
  subscribe(listener: () => void) {
    listeners.add(listener);
    return () => listeners.delete(listener);
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
