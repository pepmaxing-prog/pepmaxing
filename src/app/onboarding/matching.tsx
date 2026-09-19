import { useRouter } from 'expo-router';
import { SymbolView } from 'expo-symbols';
import { useEffect, useRef, useState } from 'react';
import { StyleSheet, useWindowDimensions, View } from 'react-native';
import Animated, {
  Easing,
  FadeInDown,
  FadeOutUp,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withDelay,
  withSequence,
  withSpring,
  withTiming,
} from 'react-native-reanimated';

import { Gutter, OnboardingShell } from '@/components/onboarding/onboarding-shell';
import { ParticleField } from '@/components/onboarding/particle-field';
import { Typeface } from '@/constants/theme';
import { useSplashPhase } from '@/lib/splash-state';

/** Caption beats, ms from mount. The last one lands with the check. */
const CAPTIONS: { at: number; text: string }[] = [
  { at: 0, text: 'Dialing in your protocol\u2026' },
  { at: 1600, text: 'Matching you with research\u2026' },
  { at: 3200, text: 'Almost ready.' },
  { at: 4750, text: 'Ready!' },
];
const CONTRACT_START = 1600;
const CONTRACT_MS = 2900;
const COLLAPSE_MS = 250;
const READY_AT = CONTRACT_START + CONTRACT_MS + COLLAPSE_MS;
/** How long "Ready!" holds before the next chapter. */
const HOLD_MS = 1500;

export default function MatchingScreen() {
  const router = useRouter();
  const reducedMotion = useReducedMotion();
  // Only relevant when the app boots straight onto this step: wait for the splash to lift.
  const started = useSplashPhase() !== 'showing';
  const { width, height } = useWindowDimensions();
  const [beat, setBeat] = useState(reducedMotion ? CAPTIONS.length - 1 : 0);
  const ready = beat === CAPTIONS.length - 1;

  const spread = useSharedValue(reducedMotion ? 0 : 1);
  const burst = useSharedValue(0);
  const check = useSharedValue(reducedMotion ? 1 : 0);
  const tint = useSharedValue(1);
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);

  useEffect(() => {
    if (!started) return;
    if (reducedMotion) {
      const t = setTimeout(() => router.replace('/onboarding/chaos'), HOLD_MS);
      return () => clearTimeout(t);
    }
    // Ring holds, tightens with an ease-in, then snaps to a point.
    spread.set(
      withDelay(
        CONTRACT_START,
        withSequence(withTiming(0.08, { duration: CONTRACT_MS, easing: Easing.in(Easing.cubic) }), withTiming(0, { duration: COLLAPSE_MS, easing: Easing.in(Easing.quad) })),
      ),
    );
    check.set(withDelay(READY_AT, withSpring(1, { damping: 12, stiffness: 180, mass: 0.6 })));
    burst.set(withDelay(READY_AT, withTiming(1, { duration: 1200, easing: Easing.out(Easing.cubic) })));
    timers.current = CAPTIONS.slice(1).map((c, i) => setTimeout(() => setBeat(i + 1), c.at));
    timers.current.push(setTimeout(() => router.replace('/onboarding/chaos'), READY_AT + HOLD_MS));
    return () => timers.current.forEach(clearTimeout);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [reducedMotion, started]);

  const skip = () => {
    timers.current.forEach(clearTimeout);
    spread.set(withTiming(0, { duration: 300, easing: Easing.in(Easing.quad) }));
    check.set(withDelay(300, withSpring(1, { damping: 12, stiffness: 180, mass: 0.6 })));
    burst.set(withDelay(300, withTiming(1, { duration: 1200, easing: Easing.out(Easing.cubic) })));
    setBeat(CAPTIONS.length - 1);
    timers.current = [setTimeout(() => router.replace('/onboarding/chaos'), 300 + HOLD_MS)];
  };

  const checkStyle = useAnimatedStyle(() => ({
    opacity: check.get(),
    transform: [{ scale: 0.4 + check.get() * 0.6 }],
  }));

  const fieldHeight = Math.round(height * 0.5);
  return (
    <OnboardingShell step={14} onSkip={ready ? undefined : skip} tint={tint}>
      <View style={styles.stage}>
        <View style={{ width, height: fieldHeight, marginHorizontal: -Gutter }}>
          <ParticleField width={width} height={fieldHeight} spread={spread} burst={burst} />
          <Animated.View style={[styles.check, { left: width / 2 - CHECK / 2, top: fieldHeight / 2 - CHECK / 2 }, checkStyle]}>
            <SymbolView name="checkmark" size={26} weight="bold" tintColor="#F5F5F7" fallback={<View style={styles.checkFallback} />} />
          </Animated.View>
        </View>
        <View style={styles.captionSlot}>
          <Animated.Text
            key={beat}
            entering={reducedMotion ? undefined : FadeInDown.duration(380)}
            exiting={reducedMotion ? undefined : FadeOutUp.duration(320)}
            style={styles.caption}
            accessibilityLiveRegion="polite">
            {CAPTIONS[beat].text}
          </Animated.Text>
        </View>
      </View>
    </OnboardingShell>
  );
}

const CHECK = 64;

const styles = StyleSheet.create({
  stage: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  check: {
    position: 'absolute',
    width: CHECK,
    height: CHECK,
    borderRadius: CHECK / 2,
    backgroundColor: 'rgba(255,255,255,0.18)',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(255,255,255,0.35)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkFallback: { width: 20, height: 20, borderRadius: 4, backgroundColor: '#F5F5F7' },
  captionSlot: { height: 44, marginTop: -8, alignItems: 'center', justifyContent: 'center' },
  caption: {
    color: '#F5F5F7',
    fontFamily: Typeface.bodySemiBold,
    fontSize: 16,
    letterSpacing: -0.2,
    textAlign: 'center',
  },
});
