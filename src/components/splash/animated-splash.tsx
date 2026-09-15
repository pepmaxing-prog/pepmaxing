import { Image } from 'expo-image';
import * as SplashScreen from 'expo-splash-screen';
import { useEffect, useRef, useState } from 'react';
import { Platform, StyleSheet, View } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withDelay,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import { scheduleOnRN } from 'react-native-worklets';

import { Brand, SplashMark } from '@/constants/brand';
import { Colors, Fonts, Spacing } from '@/constants/theme';

/**
 * Brand splash that takes over from the native launch screen.
 *
 * Frame 0 is pixel-identical to the native splash (black + centred mark) so the
 * hand-off is invisible. Once the mark has rendered we dismiss the native splash
 * and run the reveal: the mark breathes, the wordmark and tagline rise in, then
 * the whole overlay dissolves into the app.
 */
type Props = { onFinish?: () => void };

const MARK = SplashMark.imageWidth;
const GLYPH_HEIGHT = MARK * SplashMark.glyphHeightRatio;
const GLOW_SIZE = MARK * 1.9;
const WORDMARK_TOP = (MARK + GLYPH_HEIGHT) / 2 + Spacing.four;

const Timeline = {
  breatheUp: 380,
  breatheDown: 420,
  wordmarkDelay: 320,
  taglineDelay: 560,
  textDuration: 520,
  exitDelay: 1500,
  exitDuration: 480,
  reducedMotionHold: 700,
  reducedMotionExit: 300,
  /** Safety net in case `onDisplay` never fires (e.g. web). */
  displayFallback: 800,
} as const;

const easeOut = Easing.out(Easing.cubic);
const easeInOut = Easing.inOut(Easing.cubic);

export function AnimatedSplash({ onFinish }: Props) {
  const reducedMotion = useReducedMotion();
  const [visible, setVisible] = useState(true);
  const [ready, setReady] = useState(false);
  const startedRef = useRef(false);

  const markScale = useSharedValue(1);
  const glowOpacity = useSharedValue(0);
  const wordmark = useSharedValue(0);
  const tagline = useSharedValue(0);
  const exit = useSharedValue(0);

  const handleDisplayed = () => {
    if (startedRef.current) return;
    startedRef.current = true;
    SplashScreen.hideAsync().finally(() => setReady(true));
  };

  useEffect(() => {
    const fallback = setTimeout(handleDisplayed, Timeline.displayFallback);
    return () => clearTimeout(fallback);
  }, []);

  useEffect(() => {
    if (!ready) return;

    const finish = () => {
      setVisible(false);
      onFinish?.();
    };
    const onExitComplete = (finished?: boolean) => {
      if (finished) scheduleOnRN(finish);
    };

    if (reducedMotion) {
      wordmark.value = 1;
      tagline.value = 1;
      exit.value = withDelay(
        Timeline.reducedMotionHold,
        withTiming(1, { duration: Timeline.reducedMotionExit }, onExitComplete),
      );
      return;
    }

    markScale.value = withSequence(
      withTiming(1.05, { duration: Timeline.breatheUp, easing: easeOut }),
      withTiming(1, { duration: Timeline.breatheDown, easing: easeInOut }),
    );
    glowOpacity.value = withSequence(
      withTiming(0.7, { duration: Timeline.breatheUp + 120, easing: Easing.out(Easing.quad) }),
      withTiming(0.35, { duration: Timeline.breatheDown + 200, easing: Easing.inOut(Easing.quad) }),
    );
    wordmark.value = withDelay(
      Timeline.wordmarkDelay,
      withTiming(1, { duration: Timeline.textDuration, easing: easeOut }),
    );
    tagline.value = withDelay(
      Timeline.taglineDelay,
      withTiming(1, { duration: Timeline.textDuration, easing: easeOut }),
    );
    exit.value = withDelay(
      Timeline.exitDelay,
      withTiming(1, { duration: Timeline.exitDuration, easing: easeInOut }, onExitComplete),
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready, reducedMotion]);

  const overlayStyle = useAnimatedStyle(() => ({
    opacity: 1 - exit.value,
  }));
  const contentStyle = useAnimatedStyle(() => ({
    transform: [{ scale: 1 + 0.06 * exit.value }],
  }));
  const markStyle = useAnimatedStyle(() => ({
    transform: [{ scale: markScale.value }],
  }));
  const glowStyle = useAnimatedStyle(() => ({
    opacity: glowOpacity.value,
    transform: [{ scale: 0.85 + 0.15 * markScale.value }],
  }));
  const wordmarkStyle = useAnimatedStyle(() => ({
    opacity: wordmark.value,
    transform: [{ translateY: 14 * (1 - wordmark.value) }],
  }));
  const taglineStyle = useAnimatedStyle(() => ({
    opacity: tagline.value,
    transform: [{ translateY: 10 * (1 - tagline.value) }],
  }));

  if (!visible) return null;

  return (
    <Animated.View
      style={[styles.overlay, overlayStyle]}
      accessibilityRole="image"
      accessibilityLabel={`${Brand.name} — ${Brand.tagline}`}>
      <Animated.View style={[styles.content, contentStyle]}>
        <Animated.View style={[styles.glow, glowStyle]} />
        <Animated.View style={markStyle}>
          <Image
            source={require('@/assets/images/splash-icon.png')}
            style={styles.mark}
            contentFit="contain"
            cachePolicy="memory"
            priority="high"
            onDisplay={handleDisplayed}
          />
        </Animated.View>

        <View style={styles.text}>
          <Animated.Text style={[styles.wordmark, wordmarkStyle]}>{Brand.name}</Animated.Text>
          <Animated.Text style={[styles.tagline, taglineStyle]}>{Brand.tagline}</Animated.Text>
        </View>
      </Animated.View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFill,
    backgroundColor: Brand.black,
    alignItems: 'center',
    justifyContent: 'center',
    pointerEvents: 'none',
    zIndex: 1000,
    elevation: 1000,
  },
  content: {
    width: MARK,
    height: MARK,
    alignItems: 'center',
    justifyContent: 'center',
  },
  glow: {
    position: 'absolute',
    width: GLOW_SIZE,
    height: GLOW_SIZE,
    borderRadius: GLOW_SIZE / 2,
    experimental_backgroundImage:
      'radial-gradient(circle, rgba(255,255,255,0.16) 0%, rgba(255,255,255,0.05) 42%, rgba(255,255,255,0) 68%)',
  },
  mark: {
    width: MARK,
    height: MARK,
  },
  text: {
    position: 'absolute',
    top: WORDMARK_TOP,
    left: -MARK,
    right: -MARK,
    alignItems: 'center',
    gap: Spacing.two,
  },
  wordmark: {
    color: Brand.white,
    fontFamily: Fonts.sans,
    fontSize: 34,
    lineHeight: 40,
    fontWeight: '600',
    letterSpacing: Platform.select({ ios: -1.1, default: -0.6 }),
  },
  tagline: {
    color: Colors.dark.textSecondary,
    fontFamily: Fonts.sans,
    fontSize: 15,
    lineHeight: 20,
    fontWeight: '500',
    letterSpacing: 0.2,
  },
});
