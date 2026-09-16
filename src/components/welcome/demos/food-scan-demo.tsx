import {
  BlurMask,
  Canvas,
  Group,
  Line,
  LinearGradient,
  Path,
  RadialGradient,
  Rect,
  vec,
} from '@shopify/react-native-skia';
import { Image } from 'expo-image';
import { StyleSheet, Text, View } from 'react-native';
import Animated, {
  cancelAnimation,
  Easing,
  Extrapolation,
  interpolate,
  useAnimatedStyle,
  useDerivedValue,
  useSharedValue,
  withDelay,
  withSpring,
  withTiming,
  type SharedValue,
} from 'react-native-reanimated';

import { Typeface } from '@/constants/theme';

import { AnimatedText, Demo, DEMO_WIDTH, MockStatusBar, useDemoLoop } from './shared';

const LOOP_MS = 7200;
const VIEW_H = 420;
const FRAME = { left: 22, top: 84, size: 256 } as const;
/** Photo: CC0 poke bowl, see assets/images/demo/CREDITS.md. Cropped to the viewfinder's 5:7. */
const PHOTO = require('@/assets/images/demo/poke-bowl.jpg');

const MEAL = {
  title: 'Salmon & tuna poke bowl',
  kcal: 620,
  macros: [
    { label: 'Protein', grams: 38, color: Demo.accent },
    { label: 'Carbs', grams: 58, color: '#F5F5F7' },
    { label: 'Fat', grams: 24, color: '#8E9098' },
  ],
} as const;

/** Pin positions are in viewfinder coordinates, placed on the actual ingredients in the photo. */
const PINS = [
  { label: 'Salmon', x: 184, y: 272, at: 0 },
  { label: 'Tuna', x: 46, y: 146, at: 220 },
  { label: 'Avocado', x: 222, y: 152, at: 440 },
  { label: 'Seaweed', x: 64, y: 268, at: 660 },
] as const;
const PINS_START = 1400;
const PIN_DURATION = 460;
const PINS_TOTAL = PINS[PINS.length - 1].at + PIN_DURATION;

const easeInOut = Easing.inOut(Easing.cubic);

export function FoodScanDemo({ active }: { active: boolean }) {
  const frame = useSharedValue(0);
  const scan = useSharedValue(0);
  const pins = useSharedValue(0);
  const sheet = useSharedValue(0);
  const count = useSharedValue(0);

  useDemoLoop(
    active,
    LOOP_MS,
    () => {
      frame.value = withTiming(1, { duration: 480, easing: Easing.out(Easing.cubic) });
      scan.value = withDelay(420, withTiming(1, { duration: 1400, easing: easeInOut }));
      pins.value = withDelay(PINS_START, withTiming(1, { duration: PINS_TOTAL, easing: Easing.linear }));
      sheet.value = withDelay(2350, withSpring(1, { damping: 19, stiffness: 150, mass: 1 }));
      count.value = withDelay(2600, withTiming(1, { duration: 900, easing: Easing.out(Easing.cubic) }));
    },
    () => {
      [frame, scan, pins, sheet, count].forEach(cancelAnimation);
      frame.value = 0;
      scan.value = 0;
      pins.value = 0;
      sheet.value = 0;
      count.value = 0;
    },
  );

  const frameOpacity = useDerivedValue(() => frame.value);
  const frameTransform = useDerivedValue(() => [{ scale: 1.08 - 0.08 * frame.value }]);
  const scanY = useDerivedValue(() => FRAME.top + scan.value * FRAME.size);
  const scanOpacity = useDerivedValue(() =>
    interpolate(scan.value, [0, 0.05, 0.95, 1], [0, 1, 1, 0], Extrapolation.CLAMP),
  );
  const scanBandY = useDerivedValue(() => scanY.value - 46);
  const scanStart = useDerivedValue(() => vec(FRAME.left, scanY.value));
  const scanEnd = useDerivedValue(() => vec(FRAME.left + FRAME.size, scanY.value));
  const kcal = useDerivedValue(() => `${Math.round(count.value * MEAL.kcal)}`);

  const sheetStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: 300 * (1 - sheet.value) }],
  }));

  return (
    <View style={styles.screen}>
      <Image source={PHOTO} style={styles.viewfinder} contentFit="cover" cachePolicy="memory-disk" />
      <Canvas style={styles.viewfinder}>
        {/* Camera treatment: gentle darkening, edge vignette, and a scrim behind the header */}
        <Rect x={0} y={0} width={DEMO_WIDTH} height={VIEW_H} color="rgba(0,0,0,0.14)" />
        <Rect x={0} y={0} width={DEMO_WIDTH} height={VIEW_H}>
          <RadialGradient
            c={vec(DEMO_WIDTH / 2, FRAME.top + FRAME.size / 2)}
            r={300}
            colors={['rgba(0,0,0,0)', 'rgba(0,0,0,0.55)']}
            positions={[0.55, 1]}
          />
        </Rect>
        <Rect x={0} y={0} width={DEMO_WIDTH} height={120}>
          <LinearGradient start={vec(0, 0)} end={vec(0, 120)} colors={['rgba(0,0,0,0.72)', 'rgba(0,0,0,0)']} />
        </Rect>
        <Rect x={0} y={VIEW_H - 90} width={DEMO_WIDTH} height={90}>
          <LinearGradient start={vec(0, VIEW_H - 90)} end={vec(0, VIEW_H)} colors={['rgba(11,9,8,0)', 'rgba(11,9,8,1)']} />
        </Rect>

        {/* Scan frame */}
        <Group opacity={frameOpacity} origin={vec(FRAME.left + FRAME.size / 2, FRAME.top + FRAME.size / 2)} transform={frameTransform}>
          <Brackets />
        </Group>

        {/* Scan line */}
        <Group opacity={scanOpacity}>
          <Rect x={FRAME.left} y={scanBandY} width={FRAME.size} height={46}>
            <LinearGradient start={vec(0, 0)} end={vec(0, 46)} colors={['rgba(52,211,153,0)', 'rgba(52,211,153,0.22)']} />
          </Rect>
          <Line p1={scanStart} p2={scanEnd} strokeWidth={2} color={Demo.accent} />
          <Line p1={scanStart} p2={scanEnd} strokeWidth={6} color={Demo.accent} opacity={0.7}>
            <BlurMask blur={8} style="normal" />
          </Line>
        </Group>
      </Canvas>

      <MockStatusBar />
      <View style={styles.cameraHeader}>
        <View style={styles.iconButton}>
          <Text style={styles.iconButtonText}>×</Text>
        </View>
        <Text style={styles.cameraTitle}>Meal scan</Text>
        <View style={{ width: 30 }} />
      </View>

      {PINS.map((pin) => (
        <Pin key={pin.label} x={pin.x} y={pin.y} at={pin.at} label={pin.label} progress={pins} />
      ))}

      {/* Camera controls, covered once the results sheet rises */}
      <View style={styles.controls} pointerEvents="none">
        <Text style={styles.hint}>Hold steady over your plate</Text>
        <View style={styles.controlsRow}>
          <View style={styles.thumb}>
            <View style={styles.thumbInner} />
          </View>
          <View style={styles.shutter}>
            <View style={styles.shutterInner} />
          </View>
          <View style={styles.flash}>
            <Text style={styles.flashText}>⚡︎</Text>
          </View>
        </View>
      </View>

      <Animated.View style={[styles.sheet, sheetStyle]}>
        <View style={styles.handle} />
        <View style={styles.sheetHeader}>
          <View>
            <Text style={styles.mealTitle}>{MEAL.title}</Text>
            <View style={styles.kcalRow}>
              <AnimatedText text={kcal} style={styles.kcalValue} />
              <Text style={styles.kcalUnit}>kcal · 1 plate</Text>
            </View>
          </View>
          <View style={styles.confidence}>
            <View style={styles.confidenceDot} />
            <Text style={styles.confidenceText}>{PINS.length} items</Text>
          </View>
        </View>

        <View style={styles.macroBar}>
          {MEAL.macros.map((m) => (
            <View key={m.label} style={{ flex: m.grams, backgroundColor: m.color }} />
          ))}
        </View>
        <View style={styles.macros}>
          {MEAL.macros.map((m) => (
            <Macro key={m.label} label={m.label} grams={m.grams} color={m.color} count={count} />
          ))}
        </View>

        <View style={styles.logButton}>
          <Text style={styles.logText}>Log meal</Text>
        </View>
      </Animated.View>
    </View>
  );
}

function Brackets() {
  const { left, top, size } = FRAME;
  const arm = 24;
  const right = left + size;
  const bottom = top + size;
  const corners = [
    `M${left} ${top + arm} L${left} ${top} L${left + arm} ${top}`,
    `M${right - arm} ${top} L${right} ${top} L${right} ${top + arm}`,
    `M${right} ${bottom - arm} L${right} ${bottom} L${right - arm} ${bottom}`,
    `M${left + arm} ${bottom} L${left} ${bottom} L${left} ${bottom - arm}`,
  ];
  return (
    <>
      {corners.map((d) => (
        <Path key={d} path={d} style="stroke" strokeWidth={2.5} strokeCap="round" strokeJoin="round" color="#F5F5F7" />
      ))}
    </>
  );
}

function Pin({
  x,
  y,
  at,
  label,
  progress,
}: {
  x: number;
  y: number;
  at: number;
  label: string;
  progress: SharedValue<number>;
}) {
  const style = useAnimatedStyle(() => {
    const local = Math.min(Math.max((progress.value * PINS_TOTAL - at) / PIN_DURATION, 0), 1);
    // ease-out-back: a small overshoot so each pin "lands"
    const t = local - 1;
    const pop = 1 + 2.7 * t * t * t + 1.7 * t * t;
    return {
      opacity: Math.min(local * 2.5, 1),
      transform: [{ scale: 0.6 + 0.4 * pop }],
    };
  });
  return (
    <Animated.View pointerEvents="none" style={[styles.pin, { left: x, top: y }, style]}>
      <View style={styles.pinLabel}>
        <View style={styles.pinLabelDot} />
        <Text style={styles.pinLabelText}>{label}</Text>
      </View>
      <View style={styles.pinStem} />
      <View style={styles.pinDot} />
    </Animated.View>
  );
}

function Macro({ label, grams, color, count }: { label: string; grams: number; color: string; count: SharedValue<number> }) {
  const value = useDerivedValue(() => `${Math.round(count.value * grams)}`);
  return (
    <View style={styles.macro}>
      <View style={styles.macroLabelRow}>
        <View style={[styles.macroSwatch, { backgroundColor: color }]} />
        <Text style={styles.macroLabel}>{label}</Text>
      </View>
      <View style={styles.macroValueRow}>
        <AnimatedText text={value} style={styles.macroValue} />
        <Text style={styles.macroUnit}>g</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#0B0908' },
  viewfinder: { position: 'absolute', top: 0, left: 0, width: DEMO_WIDTH, height: VIEW_H },
  cameraHeader: {
    marginTop: 2,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  iconButton: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: 'rgba(0,0,0,0.45)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.14)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconButtonText: { color: Demo.text, fontSize: 17, lineHeight: 19, fontFamily: Typeface.bodyMedium, marginTop: -1 },
  cameraTitle: { color: Demo.text, fontFamily: Typeface.bodySemiBold, fontSize: 14, letterSpacing: -0.2 },
  pin: { position: 'absolute', width: 0, alignItems: 'center' },
  pinLabel: {
    position: 'absolute',
    bottom: 22,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    height: 26,
    borderRadius: 13,
    backgroundColor: 'rgba(8,8,10,0.86)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.16)',
  },
  pinLabelDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: Demo.accent },
  pinLabelText: { color: Demo.text, fontFamily: Typeface.bodySemiBold, fontSize: 11.5 },
  pinStem: { position: 'absolute', bottom: 6, width: 1.5, height: 16, backgroundColor: 'rgba(255,255,255,0.7)' },
  pinDot: {
    position: 'absolute',
    top: -5,
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: Demo.accent,
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },
  controls: { position: 'absolute', left: 0, right: 0, top: VIEW_H + 22, alignItems: 'center', gap: 22 },
  hint: { color: Demo.muted, fontFamily: Typeface.bodyMedium, fontSize: 12.5 },
  controlsRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 44 },
  shutter: {
    width: 68,
    height: 68,
    borderRadius: 34,
    borderWidth: 3.5,
    borderColor: '#F5F5F7',
    alignItems: 'center',
    justifyContent: 'center',
  },
  shutterInner: { width: 54, height: 54, borderRadius: 27, backgroundColor: '#F5F5F7' },
  thumb: {
    width: 36,
    height: 36,
    borderRadius: 9,
    borderWidth: 1.5,
    borderColor: 'rgba(255,255,255,0.35)',
    padding: 3,
  },
  thumbInner: { flex: 1, borderRadius: 6, backgroundColor: '#3B302A' },
  flash: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.08)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  flashText: { color: Demo.text, fontSize: 15 },
  sheet: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    height: 262,
    paddingHorizontal: 18,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    backgroundColor: '#101013',
    borderTopWidth: 1,
    borderColor: Demo.border,
  },
  handle: { alignSelf: 'center', width: 36, height: 4, borderRadius: 2, backgroundColor: '#2A2A31', marginTop: 8, marginBottom: 12 },
  sheetHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  mealTitle: { color: Demo.text, fontFamily: Typeface.display, fontSize: 17, letterSpacing: -0.4 },
  kcalRow: { flexDirection: 'row', alignItems: 'baseline', gap: 5, marginTop: 2 },
  kcalValue: { fontSize: 22, letterSpacing: -0.7, lineHeight: 26, minWidth: 40 },
  kcalUnit: { color: Demo.muted, fontFamily: Typeface.body, fontSize: 12 },
  confidence: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    height: 26,
    borderRadius: 13,
    backgroundColor: Demo.card,
    borderWidth: 1,
    borderColor: Demo.border,
    marginTop: 2,
  },
  confidenceDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: Demo.accent },
  confidenceText: { color: Demo.muted, fontFamily: Typeface.bodyMedium, fontSize: 11 },
  macroBar: { flexDirection: 'row', height: 6, borderRadius: 3, overflow: 'hidden', gap: 2, marginTop: 14 },
  macros: { flexDirection: 'row', gap: 8, marginTop: 12 },
  macro: {
    flex: 1,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 14,
    backgroundColor: Demo.card,
    borderWidth: 1,
    borderColor: Demo.border,
  },
  macroLabelRow: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  macroSwatch: { width: 6, height: 6, borderRadius: 3 },
  macroLabel: { color: Demo.muted, fontFamily: Typeface.bodyMedium, fontSize: 11 },
  macroValueRow: { flexDirection: 'row', alignItems: 'baseline', gap: 2, marginTop: 4 },
  macroValue: { fontSize: 20, letterSpacing: -0.6, lineHeight: 24, minWidth: 26 },
  macroUnit: { color: Demo.muted, fontFamily: Typeface.body, fontSize: 12 },
  logButton: {
    marginTop: 14,
    height: 44,
    borderRadius: 22,
    backgroundColor: Demo.text,
    alignItems: 'center',
    justifyContent: 'center',
  },
  logText: { color: '#000', fontFamily: Typeface.bodySemiBold, fontSize: 14.5, letterSpacing: -0.2 },
});
