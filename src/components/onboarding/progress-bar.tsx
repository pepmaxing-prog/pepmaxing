import { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';

import { Accent, Colors } from '@/constants/theme';

/** Thin rail that fills as the questionnaire advances. `progress` is 0-1. */
export function ProgressBar({ progress }: { progress: number }) {
  const reducedMotion = useReducedMotion();
  const width = useSharedValue(progress);

  useEffect(() => {
    width.value = reducedMotion
      ? progress
      : withTiming(progress, { duration: 320, easing: Easing.out(Easing.cubic) });
  }, [progress, reducedMotion, width]);

  const fill = useAnimatedStyle(() => ({ width: `${Math.max(0, Math.min(1, width.value)) * 100}%` }));

  return (
    <View style={styles.rail}>
      <Animated.View style={[styles.fill, fill]} />
    </View>
  );
}

const styles = StyleSheet.create({
  rail: {
    height: 4,
    borderRadius: 2,
    backgroundColor: Colors.dark.backgroundSelected,
    overflow: 'hidden',
  },
  fill: { height: '100%', borderRadius: 2, backgroundColor: Accent.primary },
});
