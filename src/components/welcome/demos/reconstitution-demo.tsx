import { Canvas, Circle, Group, Line, Path, Rect, RoundedRect, Skia, vec } from '@shopify/react-native-skia';
import { StyleSheet, Text, View } from 'react-native';
import Animated, {
  cancelAnimation,
  Easing,
  useAnimatedStyle,
  useDerivedValue,
  useSharedValue,
  withDelay,
  withSequence,
  withTiming,
  type SharedValue,
} from 'react-native-reanimated';

import { Typeface } from '@/constants/theme';

import { MockTabBar } from './mock-tab-bar';
import { AnimatedText, Demo, DemoHeader, MockStatusBar, useDemoLoop } from './shared';

const LOOP_MS = 5600;
const TARGET_UNITS = 50;
const INPUTS = [
  { label: 'Vial', value: '10 mg', hint: 'TB-500' },
  { label: 'Bacteriostatic water', value: '2 mL' },
  { label: 'Dose', value: '2.5 mg' },
] as const;
const INPUT_DURATION = 420;
const INPUT_STAGGER = 120;
const INPUTS_TOTAL = INPUT_DURATION + (INPUTS.length - 1) * INPUT_STAGGER;

// Syringe geometry (canvas units)
const CANVAS_W = 268;
const CANVAS_H = 96;
const BARREL_X = 44;
const BARREL_LEN = 188;
const BARREL_Y = 32;
const BARREL_H = 32;
const PX_PER_UNIT = (BARREL_LEN - 4) / 100;
const CENTER_Y = BARREL_Y + BARREL_H / 2;

const ticks = (() => {
  const path = Skia.Path.Make();
  for (let u = 0; u <= 100; u += 5) {
    const x = BARREL_X + 2 + u * PX_PER_UNIT;
    const h = u % 10 === 0 ? 11 : 6;
    path.moveTo(x, BARREL_Y + 1);
    path.lineTo(x, BARREL_Y + 1 + h);
  }
  return path;
})();

const easeOut = Easing.out(Easing.cubic);
const easeInOut = Easing.inOut(Easing.cubic);

export function ReconstitutionDemo({ active }: { active: boolean }) {
  const inputs = useSharedValue(0);
  const result = useSharedValue(0);
  const fill = useSharedValue(0);
  const mark = useSharedValue(0);

  useDemoLoop(
    active,
    LOOP_MS,
    () => {
      inputs.value = withTiming(1, { duration: INPUTS_TOTAL, easing: Easing.linear });
      result.value = withDelay(650, withTiming(1, { duration: 450, easing: easeOut }));
      fill.value = withDelay(800, withTiming(TARGET_UNITS / 100, { duration: 1400, easing: easeInOut }));
      mark.value = withDelay(
        2150,
        withSequence(withTiming(1, { duration: 260 }), withTiming(0.55, { duration: 600 })),
      );
    },
    () => {
      [inputs, result, fill, mark].forEach(cancelAnimation);
      inputs.value = 0;
      result.value = 0;
      fill.value = 0;
      mark.value = 0;
    },
  );

  const units = useDerivedValue(() => `${Math.round(fill.value * 100)}`);
  const liquidWidth = useDerivedValue(() => fill.value * 100 * PX_PER_UNIT);
  const sealX = useDerivedValue(() => BARREL_X + 2 + liquidWidth.value);
  const rodX = useDerivedValue(() => sealX.value + 7);
  const rodWidth = useDerivedValue(() => BARREL_X + BARREL_LEN + 12 + fill.value * 16 - rodX.value);
  const thumbX = useDerivedValue(() => rodX.value + rodWidth.value);
  const markOpacity = useDerivedValue(() => mark.value);
  const markX = BARREL_X + 2 + TARGET_UNITS * PX_PER_UNIT;

  const resultStyle = useAnimatedStyle(() => ({
    opacity: result.value,
    transform: [{ translateY: 16 * (1 - result.value) }],
  }));

  return (
    <View style={styles.screen}>
      <MockStatusBar />
      <DemoHeader title="Reconstitute" subtitle="Calculator" />

      <View style={styles.inputsCard}>
        {INPUTS.map((input, i) => (
          <InputRow key={input.label} index={i} progress={inputs} {...input} last={i === INPUTS.length - 1} />
        ))}
      </View>

      <Animated.View style={[styles.resultCard, resultStyle]}>
        <Text style={styles.resultLabel}>DRAW</Text>
        <View style={styles.resultRow}>
          <AnimatedText text={units} style={styles.resultNumber} />
          <Text style={styles.resultUnit}>units</Text>
        </View>
        <Text style={styles.resultDetail}>0.50 mL · 5 mg/mL · U-100 syringe</Text>

        <Canvas style={styles.syringe}>
          {/* needle + hub */}
          <Line p1={vec(8, CENTER_Y)} p2={vec(BARREL_X - 9, CENTER_Y)} color="rgba(255,255,255,0.75)" strokeWidth={1.3} />
          <RoundedRect x={BARREL_X - 9} y={CENTER_Y - 6} width={9} height={12} r={1.5} color="rgba(255,255,255,0.32)" />

          {/* glass barrel */}
          <RoundedRect x={BARREL_X} y={BARREL_Y} width={BARREL_LEN} height={BARREL_H} r={3} color="rgba(255,255,255,0.045)" />

          {/* liquid */}
          <Rect x={BARREL_X + 2} y={BARREL_Y + 2} width={liquidWidth} height={BARREL_H - 4} color="rgba(125,211,252,0.55)" />
          <Rect x={BARREL_X + 2} y={BARREL_Y + 4} width={liquidWidth} height={3} color="rgba(255,255,255,0.28)" />

          {/* plunger seal + rod + thumb rest */}
          <RoundedRect x={sealX} y={BARREL_Y + 2} width={7} height={BARREL_H - 4} r={1.5} color="#2C2C33" />
          <Rect x={rodX} y={CENTER_Y - 4} width={rodWidth} height={8} color="#3B3B44" />
          <RoundedRect x={thumbX} y={CENTER_Y - 13} width={5} height={26} r={2} color="#4A4A54" />

          {/* barrel outline, flange, graduations */}
          <RoundedRect x={BARREL_X} y={BARREL_Y} width={BARREL_LEN} height={BARREL_H} r={3} style="stroke" strokeWidth={1.4} color="rgba(255,255,255,0.55)" />
          <RoundedRect x={BARREL_X + BARREL_LEN - 2} y={CENTER_Y - 23} width={4} height={46} r={1.5} color="rgba(255,255,255,0.4)" />
          <Path path={ticks} style="stroke" strokeWidth={1} color="rgba(255,255,255,0.5)" />

          {/* target mark */}
          <Group opacity={markOpacity}>
            <Line p1={vec(markX, BARREL_Y - 6)} p2={vec(markX, BARREL_Y + BARREL_H + 6)} color={Demo.accent} strokeWidth={1.5} />
            <Circle cx={markX} cy={BARREL_Y - 10} r={3} color={Demo.accent} />
          </Group>
        </Canvas>
      </Animated.View>

      <Animated.View style={[styles.saveButton, resultStyle]}>
        <Text style={styles.saveText}>Save to protocol</Text>
      </Animated.View>
      <MockTabBar active={1} />
    </View>
  );
}

function InputRow({
  index,
  progress,
  label,
  value,
  hint,
  last,
}: {
  index: number;
  progress: SharedValue<number>;
  label: string;
  value: string;
  hint?: string;
  last: boolean;
}) {
  const style = useAnimatedStyle(() => {
    const elapsed = progress.value * INPUTS_TOTAL - index * INPUT_STAGGER;
    const local = Math.min(Math.max(elapsed / INPUT_DURATION, 0), 1);
    const eased = 1 - Math.pow(1 - local, 3);
    return { opacity: eased, transform: [{ translateX: 22 * (1 - eased) }] };
  });
  return (
    <Animated.View style={[styles.inputRow, !last && styles.inputDivider, style]}>
      <View style={{ flex: 1 }}>
        <Text style={styles.inputLabel}>{label}</Text>
        {hint ? <Text style={styles.inputHint}>{hint}</Text> : null}
      </View>
      <Text style={styles.inputValue}>{value}</Text>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: Demo.bg },
  inputsCard: {
    marginHorizontal: 16,
    marginTop: 6,
    borderRadius: 20,
    backgroundColor: Demo.card,
    borderWidth: 1,
    borderColor: Demo.border,
    paddingHorizontal: 16,
  },
  inputRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 13 },
  inputDivider: { borderBottomWidth: 1, borderBottomColor: Demo.border },
  inputLabel: { color: Demo.text, fontFamily: Typeface.bodyMedium, fontSize: 14 },
  inputHint: { color: Demo.muted, fontFamily: Typeface.body, fontSize: 11.5, marginTop: 1 },
  inputValue: { color: Demo.text, fontFamily: Typeface.bodySemiBold, fontSize: 14.5, letterSpacing: -0.2 },
  resultCard: {
    marginHorizontal: 16,
    marginTop: 12,
    paddingHorizontal: 16,
    paddingTop: 14,
    paddingBottom: 10,
    borderRadius: 22,
    backgroundColor: Demo.cardRaised,
    borderWidth: 1,
    borderColor: Demo.border,
  },
  resultLabel: { color: Demo.faint, fontFamily: Typeface.bodySemiBold, fontSize: 11, letterSpacing: 0.9 },
  resultRow: { flexDirection: 'row', alignItems: 'baseline', gap: 6, marginTop: 4 },
  resultNumber: { fontSize: 44, letterSpacing: -1.8, lineHeight: 50, minWidth: 60 },
  resultUnit: { color: Demo.muted, fontFamily: Typeface.bodyMedium, fontSize: 16 },
  resultDetail: { color: Demo.muted, fontFamily: Typeface.body, fontSize: 12, marginTop: 2 },
  syringe: { width: CANVAS_W, height: CANVAS_H, alignSelf: 'center', marginTop: 4 },
  saveButton: {
    marginHorizontal: 16,
    marginTop: 14,
    height: 46,
    borderRadius: 23,
    backgroundColor: Demo.text,
    alignItems: 'center',
    justifyContent: 'center',
  },
  saveText: { color: '#000', fontFamily: Typeface.bodySemiBold, fontSize: 14.5, letterSpacing: -0.2 },
});
