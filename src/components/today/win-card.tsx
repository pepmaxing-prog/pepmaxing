import { SymbolView } from 'expo-symbols';
import { useEffect } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withSequence,
  withTiming,
} from 'react-native-reanimated';

import { Card } from '@/components/ui/card';
import { Accent, Colors, Spacing, Typeface } from '@/constants/theme';
import type { Milestone } from '@/lib/adherence';

/** A win worth noticing: pops once on arrival, then sits quietly above the fold. */
export function WinCard({ milestone }: { milestone: Milestone }) {
  const reducedMotion = useReducedMotion();
  const scale = useSharedValue(reducedMotion ? 1 : 0.94);

  useEffect(() => {
    if (reducedMotion) return;
    scale.value = withSequence(
      withTiming(1.03, { duration: 260, easing: Easing.out(Easing.cubic) }),
      withTiming(1, { duration: 200, easing: Easing.out(Easing.cubic) }),
    );
  }, [milestone.id, reducedMotion, scale]);

  const style = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));

  return (
    <Animated.View style={style}>
      <Card style={styles.card}>
        <SymbolView
          name="trophy.fill"
          size={22}
          tintColor={Accent.primary}
          fallback={<View style={styles.fallback} />}
        />
        <View style={styles.text}>
          <Text style={styles.label}>{milestone.label}</Text>
          <Text style={styles.detail}>{milestone.detail}</Text>
        </View>
      </Card>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
    borderColor: Accent.primary,
    backgroundColor: Accent.primarySoft,
  },
  fallback: { width: 18, height: 18, borderRadius: 9, backgroundColor: Accent.primary },
  text: { flex: 1, gap: 2 },
  label: { color: Colors.dark.text, fontFamily: Typeface.bodySemiBold, fontSize: 15 },
  detail: { color: Colors.dark.textSecondary, fontFamily: Typeface.body, fontSize: 13 },
});
