import { SymbolView } from 'expo-symbols';
import { useEffect } from 'react';
import { Platform, StyleSheet, View } from 'react-native';
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

import { Accent } from '@/constants/theme';

const TILE = 188;
const DISC = 100;

/** Where each sparkle sits on the tile and how far into the twinkle cycle it starts. */
const SPARKLES = [
  { x: 30, y: 28, size: 22, delay: 0 },
  { x: 142, y: 24, size: 15, delay: 620 },
  { x: 154, y: 134, size: 19, delay: 1150 },
  { x: 26, y: 144, size: 13, delay: 380 },
];

/**
 * Referral hero: a gift floating on an emerald tile with sparkles that twinkle out of phase.
 * Motion is gentle and continuous; it stops entirely under Reduce Motion.
 */
export function ReferralArt() {
  const reducedMotion = useReducedMotion();
  const float = useSharedValue(0);

  useEffect(() => {
    if (reducedMotion) return;
    float.set(withRepeat(withSequence(withTiming(1, { duration: 1500, easing: Easing.inOut(Easing.sin) }), withTiming(0, { duration: 1500, easing: Easing.inOut(Easing.sin) })), -1, false));
    return () => cancelAnimation(float);
  }, [reducedMotion, float]);

  const discStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: -5 + float.get() * 10 }, { rotate: `${-2 + float.get() * 4}deg` }],
  }));
  const shadowStyle = useAnimatedStyle(() => ({
    opacity: 0.35 - float.get() * 0.15,
    transform: [{ scaleX: 1 - float.get() * 0.12 }],
  }));

  return (
    <View style={styles.wrap}>
      <View style={styles.tile}>
        <View style={styles.topEdge} />
        {SPARKLES.map((s) => (
          <Sparkle key={`${s.x}-${s.y}`} {...s} reducedMotion={reducedMotion} />
        ))}
        <Animated.View style={[styles.shadow, shadowStyle]} />
        <Animated.View style={[styles.disc, discStyle]}>
          <SymbolView name="gift.fill" size={48} weight="semibold" tintColor="#0B6B4F" fallback={<View style={styles.fallback} />} />
        </Animated.View>
      </View>
    </View>
  );
}

function Sparkle({ x, y, size, delay, reducedMotion }: (typeof SPARKLES)[number] & { reducedMotion: boolean }) {
  const glow = useSharedValue(reducedMotion ? 0.7 : 0.2);

  useEffect(() => {
    if (reducedMotion) return;
    glow.set(
      withDelay(
        delay,
        withRepeat(withSequence(withTiming(1, { duration: 700, easing: Easing.out(Easing.quad) }), withTiming(0.15, { duration: 1100, easing: Easing.in(Easing.quad) })), -1, false),
      ),
    );
    return () => cancelAnimation(glow);
  }, [reducedMotion, delay, glow]);

  const style = useAnimatedStyle(() => ({
    opacity: glow.get(),
    transform: [{ scale: 0.6 + glow.get() * 0.5 }, { rotate: `${glow.get() * 30}deg` }],
  }));

  return (
    <Animated.View style={[styles.sparkle, { left: x, top: y }, style]}>
      <SymbolView name="sparkle" size={size} weight="bold" tintColor="#FFFFFF" fallback={<View style={[styles.sparkleFallback, { width: size * 0.5, height: size * 0.5 }]} />} />
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  wrap: { alignItems: 'center' },
  tile: {
    width: TILE,
    height: TILE,
    borderRadius: 40,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    experimental_backgroundImage: 'linear-gradient(160deg, #16C08A 0%, #0D8A63 48%, #08503B 100%)',
    ...Platform.select({
      ios: { shadowColor: Accent.primary, shadowOpacity: 0.35, shadowRadius: 28, shadowOffset: { width: 0, height: 10 } },
      default: {},
    }),
  },
  topEdge: { position: 'absolute', top: 0, left: 40, right: 40, height: 1, backgroundColor: 'rgba(255,255,255,0.45)' },
  disc: {
    width: DISC,
    height: DISC,
    borderRadius: DISC / 2,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  shadow: {
    position: 'absolute',
    bottom: 26,
    width: DISC * 0.7,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#03170F',
  },
  sparkle: { position: 'absolute' },
  fallback: { width: 36, height: 36, borderRadius: 8, backgroundColor: '#0B6B4F' },
  sparkleFallback: { borderRadius: 999, backgroundColor: '#FFFFFF' },
});
