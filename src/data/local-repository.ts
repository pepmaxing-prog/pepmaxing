import AsyncStorage from '@react-native-async-storage/async-storage';

import { EMPTY_DATA, type AppData, type Repository } from './repository';
import type {
  Measurement,
  MeasurementDraft,
  OnboardingAnswers,
  Shot,
  ShotDraft,
  Subscription,
  UserProfile,
} from './types';

const STORAGE_KEY = 'pepmaxing.appdata.v1';

export interface KeyValueStore {
  getItem(key: string): Promise<string | null>;
  setItem(key: string, value: string): Promise<void>;
  removeItem(key: string): Promise<void>;
}

export function createId(): string {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

/**
 * Offline-first repository. The whole dataset is a single JSON blob: it is small (a few
 * hundred rows at most) and always read as a unit, which keeps writes atomic.
 */
export class LocalRepository implements Repository {
  private cache: AppData | null = null;

  constructor(private readonly storage: KeyValueStore = AsyncStorage) {}

  async load(): Promise<AppData> {
    if (this.cache) return this.cache;
    const raw = await this.storage.getItem(STORAGE_KEY);
    this.cache = raw ? merge(raw) : structuredClone(EMPTY_DATA);
    return this.cache;
  }

  async saveProfile(profile: UserProfile): Promise<void> {
    const data = await this.load();
    data.profile = profile;
    await this.flush();
  }

  async addShot(draft: ShotDraft): Promise<Shot> {
    const data = await this.load();
    const now = new Date().toISOString();
    const shot: Shot = { ...draft, id: createId(), createdAt: now, updatedAt: now };
    data.shots = sortShots([shot, ...data.shots]);
    await this.flush();
    return shot;
  }

  async updateShot(id: string, patch: Partial<ShotDraft>): Promise<Shot | null> {
    const data = await this.load();
    const index = data.shots.findIndex((shot) => shot.id === id);
    if (index === -1) return null;
    const updated: Shot = { ...data.shots[index], ...patch, updatedAt: new Date().toISOString() };
    data.shots[index] = updated;
    data.shots = sortShots(data.shots);
    await this.flush();
    return updated;
  }

  async deleteShot(id: string): Promise<void> {
    const data = await this.load();
    data.shots = data.shots.filter((shot) => shot.id !== id);
    await this.flush();
  }

  async addMeasurement(draft: MeasurementDraft): Promise<Measurement> {
    const data = await this.load();
    const measurement: Measurement = { ...draft, id: createId() };
    data.measurements = [measurement, ...data.measurements].sort((a, b) =>
      b.timestamp.localeCompare(a.timestamp),
    );
    await this.flush();
    return measurement;
  }

  async deleteMeasurement(id: string): Promise<void> {
    const data = await this.load();
    data.measurements = data.measurements.filter((measurement) => measurement.id !== id);
    await this.flush();
  }

  async setSubscription(subscription: Subscription): Promise<void> {
    const data = await this.load();
    data.subscription = subscription;
    await this.flush();
  }

  async setOnboarding(state: { completed: boolean; answers: OnboardingAnswers }): Promise<void> {
    const data = await this.load();
    data.onboarding = state;
    await this.flush();
  }

  async reset(): Promise<void> {
    this.cache = structuredClone(EMPTY_DATA);
    await this.storage.removeItem(STORAGE_KEY);
  }

  private async flush(): Promise<void> {
    if (!this.cache) return;
    await this.storage.setItem(STORAGE_KEY, JSON.stringify(this.cache));
  }
}

/** Newest first — every list in the app reads in this order. */
function sortShots(shots: Shot[]): Shot[] {
  return [...shots].sort((a, b) => `${b.date}T${b.time}`.localeCompare(`${a.date}T${a.time}`));
}

/** Tolerate partial or older payloads rather than wiping someone's log. */
function merge(raw: string): AppData {
  try {
    const parsed = JSON.parse(raw) as Partial<AppData>;
    return {
      ...structuredClone(EMPTY_DATA),
      ...parsed,
      shots: sortShots(parsed.shots ?? []),
      measurements: parsed.measurements ?? [],
      subscription: parsed.subscription ?? EMPTY_DATA.subscription,
      onboarding: parsed.onboarding ?? EMPTY_DATA.onboarding,
    };
  } catch {
    return structuredClone(EMPTY_DATA);
  }
}
