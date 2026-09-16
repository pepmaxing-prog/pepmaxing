import {
  BlurMask,
  Canvas,
  Circle,
  Group,
  Line,
  LinearGradient,
  Path,
  RadialGradient,
  Rect,
  RoundedRect,
  vec,
} from '@shopify/react-native-skia';
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

const LOOP_MS = 7000;
const VIEW_H = 420;
const FRAME = { left: 34, top: 78, size: 232 } as const;
const PLATE = { x: 150, y: 205, r: 112 } as const;

const MEAL = {
  title: 'Grilled salmon bowl',
  kcal: 612,
  macros: [
    { label: 'Protein', grams: 46, color: Demo.accent },
    { label: 'Carbs', grams: 42, color: '#F5F5F7' },
    { label: 'Fat', grams: 28, color: '#8E9098' },
  ],
} as const;

const PINS = [
  { label: 'Salmon', x: 150, y: 168, at: 0 },
  { label: 'Quinoa', x: 96, y: 258, at: 250 },
  { label: 'Asparagus', x: 222, y: 200, at: 500 },
] as const;
const PINS_START = 1350;
const PIN_DURATION = 460;
const PINS_TOTAL = PINS[PINS.length - 1].at + PIN_DURATION;

/** Pseudo-random grain dots for the quinoa. Deterministic so the illustration never flickers. */
const GRAINS = Array.from({ length: 26 }, (_, i) => {
  const a = (i * 137.5 * Math.PI) / 180;
  const r = 6 + ((i * 7919) % 100) / 100 * 24;
  return { x: 96 + Math.cos(a) * r * 1.35, y: 252 + Math.sin(a) * r * 0.85 };
});

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
      <Canvas style={styles.viewfinder}>
        {/* Table surface */}
        <Rect x={0} y={0} width={DEMO_WIDTH} height={VIEW_H}>
          <LinearGradient start={vec(0, 0)} end={vec(DEMO_WIDTH, VIEW_H)} colors={['#3B302A', '#231C18', '#120E0B']} />
        </Rect>

        {/* Plate */}
        <Circle cx={PLATE.x} cy={PLATE.y + 10} r={PLATE.r + 4} color="rgba(0,0,0,0.5)">
          <BlurMask blur={20} style="normal" />
        </Circle>
        <Circle cx={PLATE.x} cy={PLATE.y} r={PLATE.r}>
          <RadialGradient c={vec(PLATE.x - 20, PLATE.y - 30)} r={PLATE.r * 1.3} colors={['#F7F4EF', '#E9E4DC', '#D8D2C8']} />
        </Circle>
        <Circle cx={PLATE.x} cy={PLATE.y} r={PLATE.r - 14} style="stroke" strokeWidth={1.5} color="rgba(0,0,0,0.06)" />

        {/* Quinoa */}
        <Path path="M62 240 C70 214 112 210 130 228 C150 246 142 282 112 288 C84 294 52 270 62 240 Z" color="rgba(0,0,0,0.12)">
          <BlurMask blur={6} style="normal" />
        </Path>
        <Path path="M62 240 C70 214 112 210 130 228 C150 246 142 282 112 288 C84 294 52 270 62 240 Z">
          <RadialGradient c={vec(98, 246)} r={44} colors={['#F1E4C4', '#E3CFA4']} />
        </Path>
        {GRAINS.map((g, i) => (
          <Circle key={i} cx={g.x} cy={g.y} r={1.9} color="#CDB183" />
        ))}

        {/* Asparagus */}
        <Group origin={vec(212, 214)} transform={[{ rotate: 0.56 }]}>
          {[0, 11, 22, 33].map((dx, i) => (
            <Group key={dx}>
              <RoundedRect x={196 + dx} y={160 + (i % 2) * 6} width={7} height={104} r={3.5}>
                <LinearGradient start={vec(196 + dx, 160)} end={vec(203 + dx, 160)} colors={['#86C284', '#5B9A59', '#487F47']} />
              </RoundedRect>
              <RoundedRect x={195 + dx} y={156 + (i % 2) * 6} width={9} height={16} r={4.5} color="#3F7A40" />
            </Group>
          ))}
        </Group>

        {/* Salmon */}
        <Group origin={vec(150, 196)} transform={[{ rotate: -0.28 }]}>
          <RoundedRect x={94} y={166} width={112} height={64} r={18} color="rgba(0,0,0,0.25)">
            <BlurMask blur={8} style="normal" />
          </RoundedRect>
          <RoundedRect x={94} y={168} width={112} height={62} r={18} color="#B24A33" />
          <RoundedRect x={94} y={165} width={112} height={62} r={18}>
            <LinearGradient start={vec(94, 165)} end={vec(206, 227)} colors={['#F7A088', '#EC7A57', '#DB6244']} />
          </RoundedRect>
          <Path path="M104 184 C128 172 160 206 194 190" style="stroke" strokeWidth={2.5} strokeCap="round" color="rgba(255,225,210,0.7)" />
          <Path path="M106 200 C132 190 160 220 192 206" style="stroke" strokeWidth={2.5} strokeCap="round" color="rgba(255,225,210,0.6)" />
          <Path path="M112 214 C136 206 158 228 186 218" style="stroke" strokeWidth={2} strokeCap="round" color="rgba(255,225,210,0.5)" />
          <RoundedRect x={94} y={165} width={112} height={62} r={18} style="stroke" strokeWidth={1} color="rgba(255,255,255,0.18)" />
        </Group>

        {/* Cherry tomatoes */}
        {[
          { x: 200, y: 274, r: 12 },
          { x: 222, y: 288, r: 10 },
        ].map((t) => (
          <Group key={t.x}>
            <Circle cx={t.x} cy={t.y + 3} r={t.r} color="rgba(0,0,0,0.25)">
              <BlurMask blur={5} style="normal" />
            </Circle>
            <Circle cx={t.x} cy={t.y} r={t.r}>
              <RadialGradient c={vec(t.x - 3, t.y - 4)} r={t.r * 1.4} colors={['#FF7B6B', '#E24A3E', '#B9302A']} />
            </Circle>
            <Circle cx={t.x - t.r * 0.35} cy={t.y - t.r * 0.4} r={t.r * 0.28} color="rgba(255,255,255,0.55)" />
            <Circle cx={t.x} cy={t.y - t.r + 1} r={2.4} color="#4E8A4C" />
          </Group>
        ))}

        {/* Lemon wedge */}
        <Path path="M96 302 A16 16 0 0 1 128 302 Z" color="#F6D65B" />
        <Path path="M96 302 A16 16 0 0 1 128 302 Z" style="stroke" strokeWidth={2} color="#E9BC2C" />
        <Line p1={vec(112, 302)} p2={vec(100, 292)} strokeWidth={1} color="rgba(255,250,220,0.8)" />
        <Line p1={vec(112, 302)} p2={vec(112, 286)} strokeWidth={1} color="rgba(255,250,220,0.8)" />
        <Line p1={vec(112, 302)} p2={vec(124, 292)} strokeWidth={1} color="rgba(255,250,220,0.8)" />

        {/* Camera vignette */}
        <Rect x={0} y={0} width={DEMO_WIDTH} height={VIEW_H}>
          <RadialGradient c={vec(PLATE.x, PLATE.y)} r={270} colors={['rgba(0,0,0,0)', 'rgba(0,0,0,0.65)']} positions={[0.5, 1]} />
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
            <Text style={styles.confidenceText}>3 items</Text>
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
