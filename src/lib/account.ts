import { onboardingStore } from './onboarding-store';
import { supabase, supabaseConfigured } from './supabase';
import { flushSync, resetLocalStores } from './sync';

export type AccountInfo = { email: string | null; provider: string | null };

/** Who is signed in on this device, from the stored session. */
export async function currentAccount(): Promise<AccountInfo> {
  if (!supabaseConfigured) return { email: null, provider: null };
  const { data } = await supabase().auth.getSession();
  const user = data.session?.user;
  return { email: user?.email ?? null, provider: (user?.app_metadata?.provider as string | undefined) ?? null };
}

/** Clears everything on the device. The cloud copy stays, so signing in again restores it. */
async function forgetDevice() {
  if (supabaseConfigured) await supabase().auth.signOut({ scope: 'local' }).catch(() => {});
  onboardingStore.reset();
  resetLocalStores();
}

export async function signOut(): Promise<void> {
  // Anything still pending goes up first, so nothing typed in the last seconds is lost.
  await flushSync().catch(() => {});
  await forgetDevice();
}

/**
 * Permanently deletes the account through the `delete-account` Edge Function (service role
 * stays server-side), then forgets the device. Apple token revocation is a follow-up.
 */
export async function deleteAccount(): Promise<void> {
  if (supabaseConfigured) {
    const { error } = await supabase().functions.invoke('delete-account', { method: 'POST' });
    if (error) throw error;
  }
  await forgetDevice();
}
