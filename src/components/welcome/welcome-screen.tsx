import { useEffect, useState } from 'react';
import { StyleSheet, Text, useWindowDimensions, View, type NativeScrollEvent, type NativeSyntheticEvent } from 'react-native';
import Animated, {
  cancelAnimation,
  Easing,
  Extrapolation,
  interpolate,
  useAnimatedRef,
  useAnimatedScrollHandler,
  useAnimatedStyle,
  useDerivedValue,
  useFrameCallback,
  useReducedMotion,
  useSharedValue,
  withDelay,
  withTiming,
  type SharedValue,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { PressableScale } from '@/components/pressable-scale';
import { ShineButton } from '@/components/shine-button';
import { StageBackground } from '@/components/stage/stage-background';
import { Brand } from '@/constants/brand';
import { Colors, Spacing, Typeface } from '@/constants/theme';
import { useSplashPhase } from '@/lib/splash-state';

import { BrandRow } from './brand-row';
import { DEVICE_ASPECT, DeviceFrame, deviceMetrics } from './device-frame';
import { AssistantDemo } from './demos/assistant-demo';
import { ProtocolDemo } from './demos/protocol-demo';
import { ReconstitutionDemo } from './demos/reconstitution-demo';
import { DEMO_HEIGHT, DEMO_WIDTH } from './demos/shared';
import { Pagination } from './pagination';
import { AUTO_ADVANCE_MS, WELCOME_PAGES } from './welcome-copy';

const easeOut = Easing.out(Easing.cubic);
const ENTER_MS = 820;

// Vertical budget (pt). The device takes whatever is left between these.
const BRAND_ROW = 52;
const DEVICE_TO_TEXT = 26;
const TEXT_BLOCK = 134;
const TEXT_TO_ACTIONS = 8;
const ACTIONS_BLOCK = 132;

/**
 * Welcome carousel. A single device stays on stage while the screens inside it
 * swipe with your finger and the phone tilts in 3D; each page is a live, looping
 * demo of a core feature. Pages auto-advance; the active dot fills as a timer.
 */
export function WelcomeScreen() {
  const { width, height } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const reducedMotion = useReducedMotion();
  const splashPhase = useSplashPhase();

  // ---- layout ----
  const brandTop = insets.top + Spacing.two;
  const deviceTop = insets.top + BRAND_ROW;
  const actionsHeight = ACTIONS_BLOCK + Math.max(insets.bottom, Spacing.three);
  const available = height - deviceTop - DEVICE_TO_TEXT - TEXT_BLOCK - TEXT_TO_ACTIONS - actionsHeight;
  const deviceHeight = Math.min(Math.max(available, 300), 470);
  const device = deviceMetrics(deviceHeight / DEVICE_ASPECT);
  const demoScale = device.screenWidth / DEMO_WIDTH;
  const textTop = deviceTop + device.height + DEVICE_TO_TEXT;
  const stageCenter = { x: width / 2, y: deviceTop + device.height / 2 };

  // ---- pager ----
  const scrollRef = useAnimatedRef<Animated.ScrollView>();
  const scrollX = useSharedValue(0);
  const [page, setPage] = useState(0);
  const [dragging, setDragging] = useState(false);
  const onScroll = useAnimatedScrollHandler({
    onScroll: (e) => {
      scrollX.value = e.contentOffset.x;
    },
  });
  const settle = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    setPage(Math.round(e.nativeEvent.contentOffset.x / width));
    setDragging(false);
  };

  // ---- entrance, choreographed with the splash dissolve (the phase never returns to 'showing') ----
  const entered = splashPhase !== 'showing';

  const enterDevice = useSharedValue(0);
  const enterText = useSharedValue(0);
  const enterActions = useSharedValue(0);
  useEffect(() => {
    if (!entered) return;
    if (reducedMotion) {
      enterDevice.value = enterText.value = enterActions.value = 1;
      return;
    }
    enterDevice.value = withTiming(1, { duration: ENTER_MS, easing: easeOut });
    enterText.value = withDelay(180, withTiming(1, { duration: ENTER_MS, easing: easeOut }));
    enterActions.value = withDelay(340, withTiming(1, { duration: ENTER_MS, easing: easeOut }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [entered, reducedMotion]);

  // ---- auto-advance ----
  const autoProgress = useSharedValue(0);
  useEffect(() => {
    if (!entered || dragging) {
      cancelAnimation(autoProgress);
      return;
    }
    autoProgress.value = 0;
    autoProgress.value = withTiming(1, { duration: AUTO_ADVANCE_MS, easing: Easing.linear });
    const timer = setTimeout(() => {
      const next = (page + 1) % WELCOME_PAGES.length;
      scrollRef.current?.scrollTo({ x: next * width, animated: true });
      setPage(next);
    }, AUTO_ADVANCE_MS);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, entered, dragging, width]);

  // ---- 3D tilt: follows the swipe, breathes at rest ----
  const clock = useSharedValue(0);
  useFrameCallback((frame) => {
    clock.value = (frame.timeSinceFirstFrame ?? 0) / 1000;
  }, !reducedMotion);
  const rotateY = useDerivedValue(() => {
    const p = scrollX.value / width;
    const fraction = p - Math.round(p);
    const swing = -fraction * 26;
    const breathe = reducedMotion ? 0 : Math.sin(clock.value * 0.75) * 2.2;
    return (swing + breathe) * enterDevice.value;
  });
  const rotateX = useDerivedValue(() =>
    reducedMotion ? 0 : Math.sin(clock.value * 0.55 + 1.2) * 1.4 * enterDevice.value,
  );

  const brandStyle = useAnimatedStyle(() => ({
    opacity: enterText.value,
    transform: [{ translateY: -10 * (1 - enterText.value) }],
  }));
  const deviceStyle = useAnimatedStyle(() => ({
    opacity: enterDevice.value,
    transform: [{ translateY: 56 * (1 - enterDevice.value) }, { scale: 0.92 + 0.08 * enterDevice.value }],
  }));
  const screensStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: -(scrollX.value / width) * device.screenWidth }],
  }));
  const actionsStyle = useAnimatedStyle(() => ({
    opacity: enterActions.value,
    transform: [{ translateY: 24 * (1 - enterActions.value) }],
  }));

  return (
    <View style={styles.root}>
      <StageBackground width={width} height={height} center={stageCenter} opacity={enterDevice} />

      <Animated.View pointerEvents="none" style={[styles.brand, { top: brandTop }, brandStyle]}>
        <BrandRow />
      </Animated.View>

      <Animated.View pointerEvents="none" style={[styles.deviceWrap, { top: deviceTop }, deviceStyle]}>
        <DeviceFrame width={device.width} rotateY={rotateY} rotateX={rotateX}>
          <Animated.View style={[styles.screens, { width: device.screenWidth * WELCOME_PAGES.length }, screensStyle]}>
            {WELCOME_PAGES.map((p, i) => (
              <View key={p.key} style={{ width: device.screenWidth, height: device.screenHeight, overflow: 'hidden' }}>
                <View
                  style={{
                    width: DEMO_WIDTH,
                    height: DEMO_HEIGHT,
                    transform: [{ scale: demoScale }],
                    transformOrigin: 'top left',
                  }}>
                  {p.key === 'protocol' && <ProtocolDemo active={entered && page === i} />}
                  {p.key === 'reconstitute' && <ReconstitutionDemo active={entered && page === i} />}
                  {p.key === 'assistant' && <AssistantDemo active={entered && page === i} />}
                </View>
              </View>
            ))}
          </Animated.View>
        </DeviceFrame>
      </Animated.View>

      {/* Copy pager (transparent, captures swipes over the whole screen) */}
      <Animated.ScrollView
        ref={scrollRef}
        horizontal
        pagingEnabled
        bounces={false}
        showsHorizontalScrollIndicator={false}
        onScroll={onScroll}
        scrollEventThrottle={16}
        onScrollBeginDrag={() => setDragging(true)}
        onMomentumScrollEnd={settle}
        style={styles.pager}
        contentContainerStyle={{ width: width * WELCOME_PAGES.length }}>
        {WELCOME_PAGES.map((p, i) => (
          <PageCopy
            key={p.key}
            index={i}
            width={width}
            top={textTop}
            scrollX={scrollX}
            enter={enterText}
            headline={p.headline}
            subtitle={p.subtitle}
          />
        ))}
      </Animated.ScrollView>

      {/* Actions */}
      <Animated.View style={[styles.actions, { paddingBottom: Math.max(insets.bottom, Spacing.three) }, actionsStyle]}>
        <Pagination count={WELCOME_PAGES.length} scrollX={scrollX} pageWidth={width} progress={autoProgress} />
        <ShineButton label="Get Started" style={styles.cta} shineDelay={1400} onPress={() => {}} />
        <PressableScale style={styles.signIn} accessibilityRole="button" pressedScale={0.98} hitSlop={8} onPress={() => {}}>
          <Text style={styles.signInText}>
            Already have an account? <Text style={styles.signInLink}>Sign in</Text>
          </Text>
        </PressableScale>
      </Animated.View>
    </View>
  );
}

function PageCopy({
  index,
  width,
  top,
  scrollX,
  enter,
  headline,
  subtitle,
}: {
  index: number;
  width: number;
  top: number;
  scrollX: SharedValue<number>;
  enter: SharedValue<number>;
  headline: string;
  subtitle: string;
}) {
  const style = useAnimatedStyle(() => {
    const offset = scrollX.value / width - index;
    return {
      opacity: interpolate(Math.abs(offset), [0, 0.6], [1, 0], Extrapolation.CLAMP) * enter.value,
      transform: [{ translateX: offset * -28 }, { translateY: 22 * (1 - enter.value) }],
    };
  });
  return (
    <View style={{ width, paddingTop: top }}>
      <Animated.View style={[styles.copy, style]}>
        <Text style={styles.headline}>{headline}</Text>
        <Text style={styles.subtitle}>{subtitle}</Text>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: Brand.black },
  brand: { position: 'absolute', left: 0, right: 0, alignItems: 'center' },
  deviceWrap: { position: 'absolute', left: 0, right: 0, alignItems: 'center' },
  screens: { flexDirection: 'row', flex: 1 },
  pager: { ...StyleSheet.absoluteFill },
  copy: { alignSelf: 'center', paddingHorizontal: Spacing.five, maxWidth: 380, gap: 10 },
  headline: {
    color: Colors.dark.text,
    fontFamily: Typeface.display,
    fontSize: 32,
    lineHeight: 37,
    letterSpacing: -1,
    textAlign: 'center',
  },
  subtitle: {
    color: '#A9ACB4',
    fontFamily: Typeface.body,
    fontSize: 14.5,
    lineHeight: 20,
    letterSpacing: -0.1,
    textAlign: 'center',
    maxWidth: 300,
  },
  actions: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    paddingHorizontal: Spacing.four,
    alignItems: 'center',
    gap: Spacing.three,
  },
  cta: { alignSelf: 'stretch', marginTop: Spacing.one },
  signIn: { paddingVertical: Spacing.one },
  signInText: { color: Colors.dark.textSecondary, fontFamily: Typeface.body, fontSize: 15 },
  signInLink: { color: Colors.dark.text, fontFamily: Typeface.bodySemiBold },
});
