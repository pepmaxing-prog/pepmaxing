/**
 * Domain model. Field names and nesting mirror the Firestore layout
 * (`users/{userId}`, `users/{userId}/shots/{shotId}`, ...) so the local repository can be
 * swapped for a Firestore one without touching screens.
 */

export type WeightUnit = 'kg' | 'lb';
export type LengthUnit = 'cm' | 'in';
export type DosageUnit = 'mg' | 'mcg' | 'iu' | 'ml' | 'units';

export const INJECTION_SITES = [
  'abdomenLeft',
  'abdomenRight',
  'thighLeft',
  'thighRight',
  'armLeft',
  'armRight',
  'glutealLeft',
  'glutealRight',
] as const;
export type InjectionSite = (typeof INJECTION_SITES)[number];

export const MEASUREMENT_TYPES = ['weight', 'bodyFat', 'waist', 'neck', 'hip'] as const;
export type MeasurementType = (typeof MEASUREMENT_TYPES)[number];

/** 1 = barely felt it, 5 = rough. */
export type PainLevel = 1 | 2 | 3 | 4 | 5;

export type UserProfile = {
  id: string;
  name: string;
  age: number | null;
  /** Always stored in cm; `lengthUnit` only controls display. */
  height: number | null;
  /** Biological sex — required by the US Navy body-fat formula. */
  sex: 'male' | 'female' | null;
  weightUnit: WeightUnit;
  lengthUnit: LengthUnit;
  createdAt: string;
};

export type Shot = {
  id: string;
  medicationId: string;
  /** ISO calendar date, `YYYY-MM-DD`, in the user's local zone. */
  date: string;
  /** Local wall-clock time, `HH:mm`. */
  time: string;
  dosageAmount: number;
  dosageUnit: DosageUnit;
  injectionSite: InjectionSite;
  painLevel: PainLevel;
  notes: string;
  createdAt: string;
  updatedAt: string;
};

export type Measurement = {
  id: string;
  type: MeasurementType;
  value: number;
  unit: WeightUnit | LengthUnit | '%';
  /** ISO timestamp. */
  timestamp: string;
};

export type MedicationCategory = 'glp1' | 'peptide' | 'other';

/** Global, app-owned catalogue (`medications/{medicationId}`). Bundled until Firestore exists. */
export type Medication = {
  id: string;
  name: string;
  halfLifeHours: number;
  defaultUnit: DosageUnit;
  category: MedicationCategory;
  /** Typical maintenance dose, in `defaultUnit` — used to sanity-check entries. */
  typicalDose?: number;
  /** Highest dose we will accept without warning, in `defaultUnit`. */
  maxDose?: number;
};

export type SubscriptionStatus = 'none' | 'trialing' | 'active' | 'expired';

/** `subscriptions/{userId}` — server-written in production, mocked locally today. */
export type Subscription = {
  status: SubscriptionStatus;
  plan: 'monthly' | 'yearly' | null;
  expiresAt: string | null;
};

export type OnboardingAnswers = {
  goal: 'loseFat' | 'buildMuscle' | 'recover' | 'longevity' | null;
  experience: 'new' | 'restarting' | 'experienced' | null;
  /** Declared dosing rhythm — overrides the cadence inferred from the log. */
  cadence: 'daily' | 'weekly' | null;
  primaryMedicationId: string | null;
  startingWeight: number | null;
  goalWeight: number | null;
};

export type ShotDraft = Omit<Shot, 'id' | 'createdAt' | 'updatedAt'>;
export type MeasurementDraft = Omit<Measurement, 'id'>;
