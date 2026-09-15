import {
  Blur,
  BlurMask,
  Canvas,
  Circle,
  Group,
  LinearGradient,
  Paint,
  Path,
  RadialGradient,
  Rect,
  Skia,
  StrokeCap,
  StrokeJoin,
  useClock,
  usePathValue,
  vec,
  type SkPath,
} from '@shopify/react-native-skia';
import * as SplashScreen from 'expo-splash-screen';
import { useEffect, useMemo, useState } from 'react';
import { StyleSheet, useWindowDimensions, View } from 'react-native';
import Animated, {
  Easing,
  Extrapolation,
  interpolate,
  useAnimatedStyle,
  useDerivedValue,
  useReducedMotion,
  useSharedValue,
  withDelay,
  withSpring,
  withTiming,
  type SharedValue,
} from 'react-native-reanimated';
import { scheduleOnRN } from 'react-native-worklets';

import { MOTE_OPACITY, MOTES, motePosition, StageVignette } from '@/components/stage/stage';
import { Brand } from '@/constants/brand';
import { HEAD, HELIX_GLYPH, RIBBON_MAX_WIDTH } from '@/constants/helix-geometry';
import { Spacing, Typeface } from '@/constants/theme';

import {
  lookupSpine,
  markPath,
  ribbonBack,
  ribbonFront,
  sampleSpine,
  spineBack,
  spineFront,
} from './helix-paths';
import { Beat, CrownSpring } from './timeline';

/**
 * Cinematic brand splash, drawn with Skia on the UI thread.
 *
 * The native launch screen is pure black, so this overlay owns the whole reveal:
 * a point of light ignites at the base, the two ribbons of the helix draw upward
 * along their real spines and cross, the head lands with a spring and a bloom, a
 * specular sweep travels up the finished mark while the wordmark letters arrive,
 * then everything dissolves into the app.
 */
type Props = {
  ready?: boolean;
  /** Fires the moment the dissolve begins, so the screen underneath can start its entrance. */
  onExitStart?: () => void;
  onFinish?: () => void;
};

const INK = '#F5F5F7';
const GLYPH_HEIGHT = HELIX_GLYPH.bottom - HELIX_GLYPH.top;
const GLYPH_CENTER_Y = (HELIX_GLYPH.top + HELIX_GLYPH.bottom) / 2;
const REVEAL_STROKE = RIBBON_MAX_WIDTH + 36;
const LETTERS = Brand.name.split('');
const WORDMARK_TOTAL = Beat.wordmark.letterDuration + (LETTERS.length - 1) * Beat.wordmark.stagger;

const BACK_LUT = sampleSpine(spineBack);
const FRONT_LUT = sampleSpine(spineFront);

const riseEasing = Easing.bezier(0.22, 0.9, 0.18, 1);
const easeOut = Easing.out(Easing.cubic);
const easeInOut = Easing.inOut(Easing.cubic);

export function AnimatedSplash({ ready: assetsReady = true, onExitStart, onFinish }: Props) {
  const reducedMotion = useReducedMotion();
  const { width, height } = useWindowDimensions();
  const [visible, setVisible] = useState(true);
  const [displayed, setDisplayed] = useState(false);
  const ready = displayed && assetsReady;

  // Where the mark sits on screen. Slightly above centre so mark + wordmark read as one centred block.
  const layout = useMemo(() => {
    const markHeight = Math.min(Math.max(height * 0.19, 132), 176);
    const scale = markHeight / GLYPH_HEIGHT;
    const centerX = width / 2;
    const centerY = height / 2 - Spacing.five;
    return {
      markHeight,
      scale,
      centerX,
      centerY,
      transform: [
        { translateX: centerX - 500 * scale },
        { translateY: centerY - GLYPH_CENTER_Y * scale },
        { scale },
      ],
      wordmarkTop: centerY + markHeight / 2 + Spacing.four + 4,
    };
  }, [width, height]);

  const ignite = useSharedValue(0);
  const stage = useSharedValue(0);
  const reveal = useSharedValue(0);
  const crown = useSharedValue(0);
  const bloom = useSharedValue(0);
  const sweep = useSharedValue(0);
  const wordmark = useSharedValue(0);
  const exit = useSharedValue(0);
  const clock = useClock();

  useEffect(() => {
    if (!ready) return;

    const finish = () => {
      setVisible(false);
      onFinish?.();
    };
    const onExitComplete = (finished?: boolean) => {
      if (finished) scheduleOnRN(finish);
    };

    const exitAt = reducedMotion ? Beat.reducedMotion.hold : Beat.exit.at;
    const exitTimer = setTimeout(() => onExitStart?.(), exitAt);

    if (reducedMotion) {
      stage.value = 1;
      reveal.value = 1;
      crown.value = 1;
      wordmark.value = 1;
      exit.value = withDelay(
        Beat.reducedMotion.hold,
        withTiming(1, { duration: Beat.reducedMotion.exit }, onExitComplete),
      );
      return () => clearTimeout(exitTimer);
    }

    ignite.value = withDelay(Beat.ignite.at, withTiming(1, { duration: Beat.ignite.duration, easing: easeOut }));
    stage.value = withDelay(Beat.stage.at, withTiming(1, { duration: Beat.stage.duration, easing: easeOut }));
    reveal.value = withDelay(Beat.rise.at, withTiming(1, { duration: Beat.rise.duration, easing: riseEasing }));
    crown.value = withDelay(Beat.crown.at, withSpring(1, CrownSpring));
    bloom.value = withDelay(Beat.bloom.at, withTiming(1, { duration: Beat.bloom.duration, easing: easeOut }));
    sweep.value = withDelay(Beat.sweep.at, withTiming(1, { duration: Beat.sweep.duration, easing: easeInOut }));
    wordmark.value = withDelay(Beat.wordmark.at, withTiming(1, { duration: WORDMARK_TOTAL, easing: Easing.linear }));
    exit.value = withDelay(
      Beat.exit.at,
      withTiming(1, { duration: Beat.exit.duration, easing: easeInOut }, onExitComplete),
    );
    return () => clearTimeout(exitTimer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready, reducedMotion]);

  // ---- derived values feeding Skia (all on the UI thread) ----

  const igniteOpacity = useDerivedValue(() =>
    interpolate(ignite.value, [0, 0.35, 1], [0, 0.9, 0], Extrapolation.CLAMP) * (1 - exit.value),
  );
  const igniteRadius = useDerivedValue(() => 24 + ignite.value * 150);

  const clipBack = useDerivedValue(() => revealClip(spineBack, reveal.value));
  const clipFront = useDerivedValue(() => revealClip(spineFront, reveal.value));

  const tipOpacity = useDerivedValue(() =>
    interpolate(reveal.value, [0, 0.04, 0.82, 1], [0, 1, 1, 0], Extrapolation.CLAMP),
  );
  const backTip = useDerivedValue(() => lookupSpine(BACK_LUT, Math.min(1, reveal.value + 0.035)));
  const frontTip = useDerivedValue(() => lookupSpine(FRONT_LUT, Math.min(1, reveal.value + 0.035)));
  const backTipX = useDerivedValue(() => backTip.value.x);
  const backTipY = useDerivedValue(() => backTip.value.y);
  const frontTipX = useDerivedValue(() => frontTip.value.x);
  const frontTipY = useDerivedValue(() => frontTip.value.y);

  const headTransform = useDerivedValue(() => [{ scale: crown.value }]);
  const bloomRadius = useDerivedValue(() => 70 + bloom.value * 210);
  const bloomOpacity = useDerivedValue(() =>
    interpolate(bloom.value, [0, 0.12, 1], [0, 0.55, 0], Extrapolation.CLAMP),
  );

  const glowOpacity = useDerivedValue(
    () =>
      interpolate(reveal.value, [0, 0.15, 1], [0, 0.55, 0.42], Extrapolation.CLAMP) +
      interpolate(bloom.value, [0, 0.15, 1], [0, 0.35, 0], Extrapolation.CLAMP),
  );

  // Specular band travelling from bottom-left to top-right across the glyph.
  const SWEEP_DIR = { x: 0.62, y: -0.78 };
  const SWEEP_TRAVEL = 1150;
  const sweepStart = useDerivedValue(() => {
    const d = -SWEEP_TRAVEL / 2 + sweep.value * SWEEP_TRAVEL;
    return vec(500 + SWEEP_DIR.x * (d - 130), GLYPH_CENTER_Y + SWEEP_DIR.y * (d - 130));
  });
  const sweepEnd = useDerivedValue(() => {
    const d = -SWEEP_TRAVEL / 2 + sweep.value * SWEEP_TRAVEL;
    return vec(500 + SWEEP_DIR.x * (d + 130), GLYPH_CENTER_Y + SWEEP_DIR.y * (d + 130));
  });
  const sweepOpacity = useDerivedValue(() =>
    interpolate(sweep.value, [0, 0.1, 0.9, 1], [0, 1, 1, 0], Extrapolation.CLAMP),
  );

  const stageOpacity = useDerivedValue(() => stage.value * (1 - exit.value));
  const particleOpacity = useDerivedValue(() => stage.value * (1 - exit.value) * MOTE_OPACITY);
  const particles = usePathValue((builder) => {
    'worklet';
    const t = clock.value / 1000;
    for (let i = 0; i < MOTES.length; i++) {
      const { x, y } = motePosition(MOTES[i], t, width, height);
      builder.addCircle(x, y, MOTES[i].radius);
    }
  });

  // ---- RN-side styles ----

  const overlayStyle = useAnimatedStyle(() => ({ opacity: 1 - exit.value }));
  const contentStyle = useAnimatedStyle(() => ({ transform: [{ scale: 1 + 0.05 * exit.value }] }));

  if (!visible) return null;

  return (
    <Animated.View
      style={[styles.overlay, overlayStyle]}
      onLayout={() => {
        if (!displayed) SplashScreen.hideAsync().finally(() => setDisplayed(true));
      }}
      accessibilityRole="image"
      accessibilityLabel={Brand.name}>
      <Animated.View style={[styles.content, contentStyle]}>
        <Canvas style={styles.canvas}>
          {/* Stage: a barely-there vignette so the mark has somewhere to stand */}
          <Rect x={0} y={0} width={width} height={height} opacity={stageOpacity}>
            <RadialGradient
              c={vec(layout.centerX, layout.centerY)}
              r={height * StageVignette.radiusRatio}
              colors={[...StageVignette.colors]}
              positions={[...StageVignette.positions]}
            />
          </Rect>

          <Path path={particles} color={INK} opacity={particleOpacity} />

          <Group transform={layout.transform}>
            {/* Ignition at the base of the mark */}
            <Circle cx={HELIX_GLYPH.base.x} cy={HELIX_GLYPH.base.y} r={igniteRadius} opacity={igniteOpacity}>
              <RadialGradient
                c={vec(HELIX_GLYPH.base.x, HELIX_GLYPH.base.y)}
                r={igniteRadius}
                colors={['rgba(255,255,255,0.9)', 'rgba(255,255,255,0.25)', 'rgba(255,255,255,0)']}
                positions={[0, 0.3, 1]}
              />
            </Circle>

            {/* Bloom: a blurred copy of everything revealed so far */}
            <Group opacity={glowOpacity} layer={<Paint><Blur blur={16} /></Paint>}>
              <Ribbons clipBack={clipBack} clipFront={clipFront} color="#FFFFFF" />
              <Group transform={headTransform} origin={vec(HEAD.cx, HEAD.cy)}>
                <Circle cx={HEAD.cx} cy={HEAD.cy} r={HEAD.r} color="#FFFFFF" />
              </Group>
            </Group>

            {/* The mark itself */}
            <Ribbons clipBack={clipBack} clipFront={clipFront} color={INK} />
            <Group transform={headTransform} origin={vec(HEAD.cx, HEAD.cy)}>
              <Circle cx={HEAD.cx} cy={HEAD.cy} r={HEAD.r} color={INK} />
            </Group>

            {/* Bloom flash when the head lands */}
            <Circle cx={HEAD.cx} cy={HEAD.cy} r={bloomRadius} opacity={bloomOpacity}>
              <RadialGradient
                c={vec(HEAD.cx, HEAD.cy)}
                r={bloomRadius}
                colors={['rgba(255,255,255,0.85)', 'rgba(255,255,255,0.18)', 'rgba(255,255,255,0)']}
                positions={[0, 0.35, 1]}
              />
            </Circle>

            {/* Light at the growing tip of each ribbon */}
            <TipLight x={backTipX} y={backTipY} opacity={tipOpacity} />
            <TipLight x={frontTipX} y={frontTipY} opacity={tipOpacity} />

            {/* Specular sweep across the finished mark */}
            <Group clip={markPath} opacity={sweepOpacity}>
              <Rect x={150} y={100} width={700} height={860}>
                <LinearGradient
                  start={sweepStart}
                  end={sweepEnd}
                  colors={['rgba(255,255,255,0)', 'rgba(255,255,255,0.95)', 'rgba(255,255,255,0)']}
                  positions={[0.2, 0.5, 0.8]}
                />
              </Rect>
            </Group>
            <Group opacity={sweepOpacity} layer={<Paint><Blur blur={22} /></Paint>}>
              <Group clip={markPath}>
                <Rect x={150} y={100} width={700} height={860}>
                  <LinearGradient
                    start={sweepStart}
                    end={sweepEnd}
                    colors={['rgba(255,255,255,0)', 'rgba(255,255,255,0.7)', 'rgba(255,255,255,0)']}
                    positions={[0.25, 0.5, 0.75]}
                  />
                </Rect>
              </Group>
            </Group>
          </Group>
        </Canvas>

        <View style={[styles.text, { top: layout.wordmarkTop }]}>
          <View style={styles.wordmark} accessible accessibilityLabel={Brand.name}>
            {LETTERS.map((letter, i) => (
              <Letter key={`${letter}-${i}`} index={i} progress={wordmark}>
                {letter}
              </Letter>
            ))}
          </View>
        </View>
      </Animated.View>
    </Animated.View>
  );
}

/**
 * The portion of a spine drawn so far, thickened into a clip region. Computed on the
 * UI thread each frame — two tiny path ops, far cheaper than layer-based masking.
 */
function revealClip(spine: SkPath, t: number): SkPath {
  'worklet';
  const trimmed = Skia.Path.Trim(spine, 0, Math.max(t, 0.002), false) ?? spine;
  return (
    Skia.Path.Stroke(trimmed, { width: REVEAL_STROKE, cap: StrokeCap.Round, join: StrokeJoin.Round }) ?? trimmed
  );
}

/** Both ribbons, each revealed along its own spine. */
function Ribbons({
  clipBack,
  clipFront,
  color,
}: {
  clipBack: SharedValue<SkPath>;
  clipFront: SharedValue<SkPath>;
  color: string;
}) {
  return (
    <>
      <Group clip={clipBack}>
        <Path path={ribbonBack} color={color} />
      </Group>
      <Group clip={clipFront}>
        <Path path={ribbonFront} color={color} />
      </Group>
    </>
  );
}

function TipLight({
  x,
  y,
  opacity,
}: {
  x: SharedValue<number>;
  y: SharedValue<number>;
  opacity: SharedValue<number>;
}) {
  return (
    <Group opacity={opacity}>
      <Circle cx={x} cy={y} r={46} color="#FFFFFF" opacity={0.55}>
        <BlurMask blur={26} style="normal" />
      </Circle>
      <Circle cx={x} cy={y} r={14} color="#FFFFFF">
        <BlurMask blur={6} style="normal" />
      </Circle>
    </Group>
  );
}

function Letter({
  index,
  progress,
  children,
}: {
  index: number;
  progress: SharedValue<number>;
  children: string;
}) {
  const style = useAnimatedStyle(() => {
    const elapsed = progress.value * WORDMARK_TOTAL - index * Beat.wordmark.stagger;
    const local = Math.min(Math.max(elapsed / Beat.wordmark.letterDuration, 0), 1);
    const eased = 1 - Math.pow(1 - local, 3);
    return {
      opacity: eased,
      transform: [{ translateY: 14 * (1 - eased) }, { scale: 0.94 + 0.06 * eased }],
    };
  });
  return <Animated.Text style={[styles.letter, style]}>{children}</Animated.Text>;
}

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFill,
    backgroundColor: Brand.black,
    pointerEvents: 'none',
    zIndex: 1000,
    elevation: 1000,
  },
  content: {
    flex: 1,
  },
  canvas: {
    ...StyleSheet.absoluteFill,
  },
  text: {
    position: 'absolute',
    left: 0,
    right: 0,
    alignItems: 'center',
    gap: Spacing.two + 2,
  },
  wordmark: {
    flexDirection: 'row',
    alignItems: 'baseline',
  },
  letter: {
    color: INK,
    fontFamily: Typeface.display,
    fontSize: 36,
    lineHeight: 42,
    letterSpacing: -1.3,
  },
});
