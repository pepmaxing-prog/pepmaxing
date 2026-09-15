import { useEffect } from 'react';
import { Platform, StyleSheet, Text, View, type PressableProps, type StyleProp, type ViewStyle } from 'react-native';
import Animated, {
  cancelAnimation,
  Easing,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withDelay,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';

import { Brand } from '@/constants/brand';
import { Typeface } from '@/constants/theme';

import { PressableScale } from './pressable-scale';

type Props = Omit<PressableProps, 'style'> & {
  label: string;
  style?: StyleProp<ViewStyle>;
  /** Delay before the first sweep, e.g. to wait for an entrance animation. */
  shineDelay?: number;
};

const HEIGHT = 58;
const SWEEP_MS = 1100;
const SWEEP_EVERY_MS = 4200;

/** Primary call-to-action: a light surface with a slow specular sweep and a soft glow. */
export function ShineButton({ label, style, shineDelay = 0, ...pressable }: Props) {
  const reducedMotion = useReducedMotion();
  const sweep = useSharedValue(0);

  useEffect(() => {
    if (reducedMotion) return;
    sweep.value = withDelay(
      shineDelay,
      withRepeat(
        withSequence(
          withTiming(1, { duration: SWEEP_MS, easing: Easing.inOut(Easing.cubic) }),
          withDelay(SWEEP_EVERY_MS - SWEEP_MS, withTiming(0, { duration: 1 })),
        ),
        -1,
        false,
      ),
    );
    return () => cancelAnimation(sweep);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [reducedMotion, shineDelay]);

  const shineStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: -160 + sweep.value * 620 }, { skewX: '-22deg' }],
    opacity: sweep.value === 0 || sweep.value === 1 ? 0 : 1,
  }));

  return (
    <PressableScale accessibilityRole="button" {...pressable} style={[styles.glow, style]}>
      <View style={styles.surface}>
        <Animated.View pointerEvents="none" style={[styles.shine, shineStyle]} />
        <View pointerEvents="none" style={styles.topEdge} />
        <Text style={styles.label}>{label}</Text>
      </View>
    </PressableScale>
  );
}

const styles = StyleSheet.create({
  glow: {
    borderRadius: HEIGHT / 2,
    ...Platform.select({
      ios: {
        shadowColor: '#FFFFFF',
        shadowOpacity: 0.16,
        shadowRadius: 22,
        shadowOffset: { width: 0, height: 4 },
      },
      default: {},
    }),
  },
  surface: {
    height: HEIGHT,
    borderRadius: HEIGHT / 2,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
    experimental_backgroundImage: 'linear-gradient(180deg, #FFFFFF 0%, #F1F1F5 55%, #DEDEE5 100%)',
  },
  topEdge: {
    position: 'absolute',
    top: 0,
    left: HEIGHT / 2,
    right: HEIGHT / 2,
    height: 1,
    backgroundColor: 'rgba(255,255,255,0.9)',
  },
  shine: {
    position: 'absolute',
    top: -10,
    bottom: -10,
    width: 110,
    experimental_backgroundImage:
      'linear-gradient(90deg, rgba(255,255,255,0) 0%, rgba(255,255,255,0.85) 45%, rgba(255,255,255,0.95) 55%, rgba(255,255,255,0) 100%)',
  },
  label: {
    color: Brand.black,
    fontFamily: Typeface.bodyBold,
    fontSize: 17,
    letterSpacing: -0.2,
  },
});
