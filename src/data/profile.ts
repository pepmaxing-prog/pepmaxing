import type { UserProfile } from './types';

/** The single local user until accounts exist; the id matches `users/{userId}` later. */
export const LOCAL_USER_ID = 'local';

export function ensureProfile(profile: UserProfile | null): UserProfile {
  return (
    profile ?? {
      id: LOCAL_USER_ID,
      name: '',
      age: null,
      height: null,
      sex: null,
      weightUnit: 'kg',
      lengthUnit: 'cm',
      createdAt: new Date().toISOString(),
    }
  );
}
