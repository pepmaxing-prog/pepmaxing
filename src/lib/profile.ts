import { currentUserId } from './auth';
import { onboardingStore, type OnboardingState } from './onboarding-store';
import { supabase, supabaseConfigured } from './supabase';

/** Columns of `public.profiles` (see supabase/migrations). Answers live in the `onboarding` JSON. */
type ProfileRow = {
  id: string;
  email: string | null;
  display_name: string | null;
  onboarding: Partial<OnboardingState>;
  onboarding_step: string | null;
  onboarding_completed_at: string | null;
  referral_code: string | null;
  units: OnboardingState['units'] | null;
};

const SYNC_FIELDS: (keyof OnboardingState)[] = [
  'name', 'spoken', 'goals', 'experience', 'motivations', 'age', 'sex', 'heightCm', 'weightKg',
  'units', 'reminders', 'account', 'referralCode', 'disclaimerAcceptedAt', 'step', 'completedAt',
];

function toRow(userId: string, state: OnboardingState, email: string | null, fullName: string | null): ProfileRow {
  const onboarding: Partial<OnboardingState> = {};
  for (const key of SYNC_FIELDS) (onboarding as Record<string, unknown>)[key] = state[key];
  return {
    id: userId,
    email,
    display_name: state.name || fullName,
    onboarding,
    onboarding_step: state.step,
    onboarding_completed_at: state.completedAt,
    referral_code: state.referralCode,
    units: state.units,
  };
}

/** Write the current answers to the signed-in user's profile. No-op when signed out. */
export async function pushProfile(details: { email?: string | null; fullName?: string | null } = {}): Promise<void> {
  if (!supabaseConfigured) return;
  const userId = await currentUserId();
  if (!userId) return;
  const row = toRow(userId, onboardingStore.get(), details.email ?? null, details.fullName ?? null);
  const { error } = await supabase().from('profiles').upsert(row, { onConflict: 'id' });
  if (error) throw error;
}

/**
 * After signing in: if this account already has onboarding progress (another device, a
 * reinstall) adopt it so they pick up where they left off; otherwise save what they answered here.
 * Returns the route to continue on.
 */
export async function reconcileProfile(details: { email: string | null; fullName: string | null }): Promise<{ step: string | null; completedAt: string | null }> {
  const userId = await currentUserId();
  const local = onboardingStore.get();
  if (!userId) return { step: local.step, completedAt: local.completedAt };
  const { data, error } = await supabase().from('profiles').select('onboarding, onboarding_step, onboarding_completed_at').eq('id', userId).maybeSingle();
  if (error) throw error;

  const remote = (data?.onboarding ?? null) as Partial<OnboardingState> | null;
  const remoteIsFurther = Boolean(data?.onboarding_completed_at) || (remote?.step && stepIndex(remote.step) > stepIndex(local.step));
  if (remote && remoteIsFurther) {
    onboardingStore.replace({ ...local, ...remote, account: local.account ?? remote.account ?? null, completedAt: data?.onboarding_completed_at ?? remote.completedAt ?? null });
  }
  await pushProfile(details);
  const now = onboardingStore.get();
  return { step: now.step, completedAt: now.completedAt };
}

/** Order of routes after the account step; anything unknown ranks lowest. */
const STEP_ORDER = [
  '/onboarding/welcome-back',
  '/onboarding/account',
  '/onboarding/referral',
  '/onboarding/ahead',
  '/onboarding/matching',
  '/onboarding/chaos',
  '/onboarding/precision',
  '/onboarding/paywall',
];
function stepIndex(step: string | null | undefined) {
  return step ? STEP_ORDER.indexOf(step) : -1;
}

let pushTimer: ReturnType<typeof setTimeout> | null = null;
/**
 * Keep the profile current while onboarding continues after sign-in. Debounced so a burst of
 * changes becomes one upsert; failures are swallowed because the local copy is authoritative.
 */
export function startProfileSync(): () => void {
  if (!supabaseConfigured) return () => {};
  const unsubscribe = onboardingStore.subscribe(() => {
    if (pushTimer) clearTimeout(pushTimer);
    pushTimer = setTimeout(() => {
      pushTimer = null;
      pushProfile().catch(() => {});
    }, 1200);
  });
  return () => {
    unsubscribe();
    if (pushTimer) clearTimeout(pushTimer);
  };
}
