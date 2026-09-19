import { useRouter } from 'expo-router';
import { StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import Animated, { FadeIn } from 'react-native-reanimated';

import { ChaosCollage } from '@/components/onboarding/chaos-collage';
import { hintStyle } from '@/components/onboarding/choices';
import { Gutter, OnboardingShell } from '@/components/onboarding/onboarding-shell';
import { useTranscriptType } from '@/components/onboarding/typewriter';
import { ShineButton } from '@/components/shine-button';
import { Accent, Spacing } from '@/constants/theme';

/** The problem statement: a protocol spread across disconnected tools. */
export default function ChaosScreen() {
  const router = useRouter();
  const { width, height } = useWindowDimensions();
  const type = useTranscriptType();
  const stageWidth = width - Gutter * 2;
  const stageHeight = Math.min(Math.round(height * 0.46), 400);

  return (
    <OnboardingShell
      step={15}
      footer={
        <Animated.View entering={FadeIn.delay(900).duration(420)}>
          <ShineButton label="Continue" onPress={() => router.push('/onboarding/precision')} shineDelay={1400} />
        </Animated.View>
      }>
      <View style={{ paddingTop: Math.round(Spacing.five * type.scale) }}>
        <Animated.Text entering={FadeIn.duration(420)} style={type.text} accessibilityRole="header">
          Your protocol lives in{'\n'}
          <Text style={styles.accent}>six places</Text>.
        </Animated.Text>
        <Animated.Text entering={FadeIn.delay(140).duration(400)} style={hintStyle}>
          None of it connects. That’s how cycles break.
        </Animated.Text>
        <View style={styles.stage}>
          <ChaosCollage width={stageWidth} height={stageHeight} />
        </View>
      </View>
    </OnboardingShell>
  );
}

const styles = StyleSheet.create({
  accent: { color: Accent.primary },
  stage: { marginTop: Spacing.five },
});
