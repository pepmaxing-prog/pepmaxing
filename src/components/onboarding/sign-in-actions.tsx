import { useRouter, type Href } from 'expo-router';
import { SymbolView } from 'expo-symbols';
import { useState } from 'react';
import { Linking, StyleSheet, Text, View } from 'react-native';
import Animated, { FadeIn } from 'react-native-reanimated';

import { GoogleMark } from '@/components/brand-marks';
import { PressableScale } from '@/components/pressable-scale';
import { ShineButton } from '@/components/shine-button';
import { Brand, Legal } from '@/constants/brand';
import { Spacing, Typeface } from '@/constants/theme';
import { AuthCancelledError, AuthNotConfiguredError, signInWith, type Provider } from '@/lib/auth';
import { onboardingStore } from '@/lib/onboarding-store';
import { reconcileProfile } from '@/lib/profile';

/** Where a signed-in user lands: the step they had reached, or the referral step right after sign-up. */
export function resumeRoute(step: string | null, completedAt: string | null): Href {
  if (completedAt) return '/home';
  if (step && step !== '/onboarding/account' && step !== '/onboarding/welcome-back') return step as Href;
  return '/onboarding/referral';
}

/**
 * Apple + Google buttons with the shared sign-in flow: authenticate, merge the profile with
 * whatever this account already saved, then continue where onboarding left off.
 */
export function SignInActions({ shineDelay = 1400 }: { shineDelay?: number }) {
  const router = useRouter();
  const [busy, setBusy] = useState<Provider | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const continueWith = async (provider: Provider) => {
    if (busy) return;
    setBusy(provider);
    setNotice(null);
    try {
      const signedIn = await signInWith(provider);
      const state = onboardingStore.get();
      onboardingStore.set({ account: provider, name: state.name || (signedIn.fullName?.split(/\s+/)[0] ?? '') });
      const { step, completedAt } = await reconcileProfile({ email: signedIn.email, fullName: signedIn.fullName });
      router.replace(resumeRoute(step, completedAt));
    } catch (error) {
      if (error instanceof AuthCancelledError) return;
      setNotice(error instanceof AuthNotConfiguredError ? 'Sign-in is being set up. Check back shortly.' : 'That didn\u2019t go through. Please try again.');
    } finally {
      setBusy(null);
    }
  };

  return (
    <Animated.View entering={FadeIn.delay(420).duration(480)} style={styles.actions}>
      <ShineButton
        label="Continue with Apple"
        icon={<SymbolView name="apple.logo" size={19} tintColor={Brand.black} weight="medium" fallback={<View style={styles.iconFallback} />} />}
        onPress={() => continueWith('apple')}
        disabled={busy !== null}
        shineDelay={shineDelay}
      />
      <PressableScale onPress={() => continueWith('google')} disabled={busy !== null} accessibilityRole="button" style={styles.secondary}>
        <View style={styles.secondaryRow}>
          <GoogleMark size={18} />
          <Text style={styles.secondaryLabel}>Continue with Google</Text>
        </View>
      </PressableScale>
      {notice ? (
        <Animated.Text entering={FadeIn.duration(240)} style={styles.notice}>
          {notice}
        </Animated.Text>
      ) : null}
      <Text style={styles.legal}>
        By continuing you agree to our <LegalLink label="Terms of Use" url={Legal.termsUrl} /> and <LegalLink label="Privacy Policy" url={Legal.privacyUrl} />.
      </Text>
    </Animated.View>
  );
}

function LegalLink({ label, url }: { label: string; url: string }) {
  return (
    <Text style={styles.legalLink} accessibilityRole={url ? 'link' : undefined} onPress={url ? () => Linking.openURL(url) : undefined} suppressHighlighting>
      {label}
    </Text>
  );
}

const styles = StyleSheet.create({
  actions: { gap: Spacing.two },
  iconFallback: { width: 16, height: 16, borderRadius: 8, backgroundColor: Brand.black },
  secondary: {
    height: 58,
    borderRadius: 29,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.22)',
  },
  secondaryRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  secondaryLabel: { color: '#F5F5F7', fontFamily: Typeface.bodyBold, fontSize: 17, letterSpacing: -0.2 },
  notice: { color: 'rgba(242,242,244,0.7)', fontFamily: Typeface.body, fontSize: 13, lineHeight: 18, textAlign: 'center' },
  legal: { marginTop: Spacing.one, color: 'rgba(242,242,244,0.42)', fontFamily: Typeface.body, fontSize: 12, lineHeight: 17, textAlign: 'center' },
  legalLink: { color: 'rgba(242,242,244,0.7)', textDecorationLine: 'underline' },
});
