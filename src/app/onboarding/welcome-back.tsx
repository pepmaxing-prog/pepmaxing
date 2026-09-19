import { StyleSheet, View } from 'react-native';
import Animated, { FadeIn, FadeInDown } from 'react-native-reanimated';

import { OnboardingShell } from '@/components/onboarding/onboarding-shell';
import { SignInActions } from '@/components/onboarding/sign-in-actions';
import { SignInBackdrop } from '@/components/onboarding/sign-in-backdrop';
import { useTranscriptType } from '@/components/onboarding/typewriter';
import { BrandRow } from '@/components/welcome/brand-row';
import { Spacing, Typeface } from '@/constants/theme';
import { displayName, useOnboarding } from '@/lib/onboarding-store';

/**
 * Shown on launch to someone who created their account but left before finishing onboarding.
 * Signing in again carries them straight back to the step they stopped on.
 */
export default function WelcomeBackScreen() {
  const type = useTranscriptType();
  const { name } = useOnboarding();
  const first = displayName(name);

  return (
    <OnboardingShell backdrop={<SignInBackdrop firstClip={1} />} footer={<SignInActions shineDelay={1200} />}>
      <Animated.View entering={FadeIn.duration(480)} style={styles.brand}>
        <BrandRow />
      </Animated.View>
      <View style={styles.copy}>
        <Animated.Text entering={FadeInDown.delay(120).duration(520)} style={[type.text, styles.center]} accessibilityRole="header">
          {first ? `Welcome back,\n${first}.` : 'Welcome back.'}
        </Animated.Text>
        <Animated.Text entering={FadeIn.delay(300).duration(480)} style={styles.subtitle}>
          Sign in to pick up where you left off.
        </Animated.Text>
        <Animated.Text entering={FadeIn.delay(420).duration(480)} style={styles.detail}>
          Your answers so far are saved. You’ll land on the exact step you stopped on.
        </Animated.Text>
      </View>
    </OnboardingShell>
  );
}

const styles = StyleSheet.create({
  brand: { alignItems: 'center', marginTop: Spacing.one },
  copy: { flex: 1, justifyContent: 'flex-end', alignItems: 'center', paddingBottom: Spacing.four },
  center: { textAlign: 'center' },
  subtitle: {
    marginTop: Spacing.three,
    color: 'rgba(242,242,244,0.85)',
    fontFamily: Typeface.body,
    fontSize: 19,
    lineHeight: 26,
    letterSpacing: -0.2,
    textAlign: 'center',
  },
  detail: {
    marginTop: Spacing.two,
    color: 'rgba(242,242,244,0.6)',
    fontFamily: Typeface.body,
    fontSize: 14.5,
    lineHeight: 20,
    letterSpacing: -0.1,
    textAlign: 'center',
    paddingHorizontal: Spacing.two,
  },
});
