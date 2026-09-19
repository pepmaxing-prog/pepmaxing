import { useRouter } from 'expo-router';
import { StyleSheet, View } from 'react-native';
import Animated, { FadeIn, FadeInDown } from 'react-native-reanimated';

import { OnboardingShell } from '@/components/onboarding/onboarding-shell';
import { SignInActions } from '@/components/onboarding/sign-in-actions';
import { SignInBackdrop } from '@/components/onboarding/sign-in-backdrop';
import { useTranscriptType } from '@/components/onboarding/typewriter';
import { Spacing, Typeface } from '@/constants/theme';

export default function AccountScreen() {
  const router = useRouter();
  const type = useTranscriptType();

  return (
    <OnboardingShell onBack={() => router.back()} step={11} backdrop={<SignInBackdrop />} footer={<SignInActions />}>
      <View style={styles.copy}>
        <Animated.Text entering={FadeInDown.delay(120).duration(520)} style={type.text} accessibilityRole="header">
          {'Save your\nprogress.'}
        </Animated.Text>
        <Animated.Text entering={FadeIn.delay(300).duration(480)} style={styles.subtitle}>
          Protocols, doses and results, backed up and in sync on every device.
        </Animated.Text>
      </View>
    </OnboardingShell>
  );
}

const styles = StyleSheet.create({
  copy: { flex: 1, justifyContent: 'flex-end', paddingBottom: Spacing.four },
  subtitle: {
    marginTop: Spacing.three,
    color: 'rgba(242,242,244,0.72)',
    fontFamily: Typeface.body,
    fontSize: 16,
    lineHeight: 23,
    letterSpacing: -0.15,
  },
});
