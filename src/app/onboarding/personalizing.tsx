import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Animated, { FadeIn } from 'react-native-reanimated';

import { ProgressBar } from '@/components/onboarding/progress-bar';
import { Colors, MaxContentWidth, Spacing, Typeface } from '@/constants/theme';
import { PERSONALIZING_LINES, PERSONALIZING_MS } from '@/data/onboarding-copy';

const STEP_MS = PERSONALIZING_MS / PERSONALIZING_LINES.length;

/**
 * Deliberate pause between the questionnaire and the paywall: the plan is assembled from
 * answers that are already stored, so this is pacing rather than computation.
 */
export default function PersonalizingScreen() {
  const router = useRouter();
  const [line, setLine] = useState(0);

  useEffect(() => {
    const timers = PERSONALIZING_LINES.map((_, index) =>
      setTimeout(() => setLine(index), index * STEP_MS),
    );
    const done = setTimeout(() => router.replace('/onboarding/paywall'), PERSONALIZING_MS);
    return () => {
      timers.forEach(clearTimeout);
      clearTimeout(done);
    };
  }, [router]);

  const progress = (line + 1) / PERSONALIZING_LINES.length;

  return (
    <View style={styles.root}>
      <View style={styles.body}>
        <Text style={styles.percent}>{Math.round(progress * 100)}%</Text>
        <Text style={styles.headline}>Building your plan</Text>
        <ProgressBar progress={progress} />
        <Animated.Text key={line} entering={FadeIn.duration(260)} style={styles.line}>
          {PERSONALIZING_LINES[line]}…
        </Animated.Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: Colors.dark.background,
    justifyContent: 'center',
    paddingHorizontal: Spacing.four,
  },
  body: { gap: Spacing.three, width: '100%', maxWidth: MaxContentWidth, alignSelf: 'center' },
  percent: {
    color: Colors.dark.text,
    fontFamily: Typeface.display,
    fontSize: 56,
    letterSpacing: -1.5,
  },
  headline: { color: Colors.dark.text, fontFamily: Typeface.displayMedium, fontSize: 20 },
  line: { color: Colors.dark.textSecondary, fontFamily: Typeface.body, fontSize: 15 },
});
