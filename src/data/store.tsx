import { createContext, use, useCallback, useEffect, useMemo, useState, type ReactNode } from 'react';

import { LocalRepository } from './local-repository';
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

type StoreValue = {
  ready: boolean;
  data: AppData;
  addShot(draft: ShotDraft): Promise<Shot>;
  updateShot(id: string, patch: Partial<ShotDraft>): Promise<void>;
  deleteShot(id: string): Promise<void>;
  addMeasurement(draft: MeasurementDraft): Promise<Measurement>;
  deleteMeasurement(id: string): Promise<void>;
  saveProfile(profile: UserProfile): Promise<void>;
  setSubscription(subscription: Subscription): Promise<void>;
  setOnboarding(state: { completed: boolean; answers: OnboardingAnswers }): Promise<void>;
  reset(): Promise<void>;
};

const StoreContext = createContext<StoreValue | null>(null);

/**
 * Single source of truth for app data. The repository owns persistence; this holds the
 * in-memory snapshot React renders from and re-publishes it after every write.
 */
export function StoreProvider({
  children,
  repository,
}: {
  children: ReactNode;
  repository?: Repository;
}) {
  const repo = useMemo(() => repository ?? new LocalRepository(), [repository]);
  const [data, setData] = useState<AppData>(EMPTY_DATA);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let active = true;
    repo.load().then((loaded) => {
      if (!active) return;
      setData({ ...loaded });
      setReady(true);
    });
    return () => {
      active = false;
    };
  }, [repo]);

  const refresh = useCallback(async () => {
    setData({ ...(await repo.load()) });
  }, [repo]);

  const value = useMemo<StoreValue>(
    () => ({
      ready,
      data,
      async addShot(draft) {
        const shot = await repo.addShot(draft);
        await refresh();
        return shot;
      },
      async updateShot(id, patch) {
        await repo.updateShot(id, patch);
        await refresh();
      },
      async deleteShot(id) {
        await repo.deleteShot(id);
        await refresh();
      },
      async addMeasurement(draft) {
        const measurement = await repo.addMeasurement(draft);
        await refresh();
        return measurement;
      },
      async deleteMeasurement(id) {
        await repo.deleteMeasurement(id);
        await refresh();
      },
      async saveProfile(profile) {
        await repo.saveProfile(profile);
        await refresh();
      },
      async setSubscription(subscription) {
        await repo.setSubscription(subscription);
        await refresh();
      },
      async setOnboarding(state) {
        await repo.setOnboarding(state);
        await refresh();
      },
      async reset() {
        await repo.reset();
        await refresh();
      },
    }),
    [data, ready, refresh, repo],
  );

  return <StoreContext value={value}>{children}</StoreContext>;
}

export function useStore(): StoreValue {
  const value = use(StoreContext);
  if (!value) throw new Error('useStore must be used inside <StoreProvider>');
  return value;
}

export function useShots(): Shot[] {
  return useStore().data.shots;
}

export function useMeasurements(): Measurement[] {
  return useStore().data.measurements;
}

export function useProfile(): UserProfile | null {
  return useStore().data.profile;
}

export function useSubscription(): Subscription {
  return useStore().data.subscription;
}
