import type {
  Measurement,
  MeasurementDraft,
  OnboardingAnswers,
  Shot,
  ShotDraft,
  Subscription,
  UserProfile,
} from './types';

export type AppData = {
  profile: UserProfile | null;
  shots: Shot[];
  measurements: Measurement[];
  subscription: Subscription;
  onboarding: { completed: boolean; answers: OnboardingAnswers };
};

/**
 * The only way screens touch persistence. `LocalRepository` implements it on device storage
 * today; a `FirestoreRepository` writing to `users/{userId}/...` can replace it without any
 * screen changes.
 */
export interface Repository {
  load(): Promise<AppData>;

  saveProfile(profile: UserProfile): Promise<void>;

  addShot(draft: ShotDraft): Promise<Shot>;
  updateShot(id: string, patch: Partial<ShotDraft>): Promise<Shot | null>;
  deleteShot(id: string): Promise<void>;

  addMeasurement(draft: MeasurementDraft): Promise<Measurement>;
  deleteMeasurement(id: string): Promise<void>;

  setSubscription(subscription: Subscription): Promise<void>;
  setOnboarding(state: { completed: boolean; answers: OnboardingAnswers }): Promise<void>;

  reset(): Promise<void>;
}

export const EMPTY_ANSWERS: OnboardingAnswers = {
  goal: null,
  experience: null,
  primaryMedicationId: null,
  startingWeight: null,
  goalWeight: null,
};

export const EMPTY_DATA: AppData = {
  profile: null,
  shots: [],
  measurements: [],
  subscription: { status: 'none', plan: null, expiresAt: null },
  onboarding: { completed: false, answers: EMPTY_ANSWERS },
};
