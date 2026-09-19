import * as AppleAuthentication from 'expo-apple-authentication';
import * as Linking from 'expo-linking';
import * as WebBrowser from 'expo-web-browser';

import { supabase, supabaseConfigured } from './supabase';

export type Provider = 'apple' | 'google';

/** True once the Supabase project keys are present in the environment (`.env.local`). */
export const authConfigured = supabaseConfigured;

export class AuthNotConfiguredError extends Error {
  constructor() {
    super('Sign-in is not configured: set EXPO_PUBLIC_SUPABASE_URL and EXPO_PUBLIC_SUPABASE_ANON_KEY.');
    this.name = 'AuthNotConfiguredError';
  }
}

/** The person dismissed the provider's sheet; not an error worth showing. */
export class AuthCancelledError extends Error {
  constructor() {
    super('Sign-in cancelled.');
    this.name = 'AuthCancelledError';
  }
}

export type SignedIn = {
  userId: string;
  email: string | null;
  /** Apple only sends the name on the very first sign-in; Google puts it in user metadata. */
  fullName: string | null;
};

export async function signInWith(provider: Provider): Promise<SignedIn> {
  if (!authConfigured) throw new AuthNotConfiguredError();
  return provider === 'apple' ? signInWithApple() : signInWithGoogle();
}

/** Native Sign in with Apple; the identity token is exchanged for a Supabase session. */
async function signInWithApple(): Promise<SignedIn> {
  let credential: AppleAuthentication.AppleAuthenticationCredential;
  try {
    credential = await AppleAuthentication.signInAsync({
      requestedScopes: [AppleAuthentication.AppleAuthenticationScope.FULL_NAME, AppleAuthentication.AppleAuthenticationScope.EMAIL],
    });
  } catch (error) {
    if ((error as { code?: string }).code === 'ERR_REQUEST_CANCELED') throw new AuthCancelledError();
    throw error;
  }
  if (!credential.identityToken) throw new Error('Apple returned no identity token.');

  const client = supabase();
  const { data, error } = await client.auth.signInWithIdToken({ provider: 'apple', token: credential.identityToken });
  if (error) throw error;
  const fullName = credential.fullName ? AppleAuthentication.formatFullName(credential.fullName).trim() : '';
  // Apple sends the name only on the first authorisation, so keep it on the auth user too (Supabase's guidance).
  if (fullName) {
    await client.auth
      .updateUser({ data: { full_name: fullName, given_name: credential.fullName?.givenName ?? null, family_name: credential.fullName?.familyName ?? null } })
      .catch(() => {});
  }
  return { userId: data.user.id, email: data.user.email ?? credential.email ?? null, fullName: fullName || null };
}

/** Google through Supabase's OAuth (PKCE) in a system auth session, finishing on `pepmaxing://auth/callback`. */
async function signInWithGoogle(): Promise<SignedIn> {
  const redirectTo = Linking.createURL('auth/callback');
  const client = supabase();
  const { data, error } = await client.auth.signInWithOAuth({
    provider: 'google',
    options: { redirectTo, skipBrowserRedirect: true, queryParams: { access_type: 'offline', prompt: 'select_account' } },
  });
  if (error) throw error;
  if (!data.url) throw new Error('Supabase returned no authorization URL.');

  const result = await WebBrowser.openAuthSessionAsync(data.url, redirectTo, { preferEphemeralSession: false });
  if (result.type !== 'success') throw new AuthCancelledError();

  const params = new URL(result.url).searchParams;
  const oauthError = params.get('error_description') ?? params.get('error');
  if (oauthError) throw new Error(oauthError);
  const code = params.get('code');
  if (!code) throw new Error('No authorization code in the callback.');

  const exchange = await client.auth.exchangeCodeForSession(code);
  if (exchange.error) throw exchange.error;
  const user = exchange.data.user;
  const meta = user.user_metadata as { full_name?: string; name?: string };
  return { userId: user.id, email: user.email ?? null, fullName: meta.full_name ?? meta.name ?? null };
}

/** Current session's user id, or null when signed out / unconfigured. */
export async function currentUserId(): Promise<string | null> {
  if (!authConfigured) return null;
  const { data } = await supabase().auth.getSession();
  return data.session?.user.id ?? null;
}
