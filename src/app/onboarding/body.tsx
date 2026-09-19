import { useRouter } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import Animated, { FadeIn, FadeInDown } from 'react-native-reanimated';

import { hintStyle } from '@/components/onboarding/choices';
import { Dial } from '@/components/onboarding/dial';
import { Gutter, OnboardingShell } from '@/components/onboarding/onboarding-shell';
import { useTranscriptType } from '@/components/onboarding/typewriter';
import { PressableScale } from '@/components/pressable-scale';
import { ShineButton } from '@/components/shine-button';
import { Accent, Spacing, Typeface } from '@/constants/theme';
import { onboardingStore, useOnboarding, type Units } from '@/lib/onboarding-store';

const DEFAULT_HEIGHT_CM = 170;
const DEFAULT_WEIGHT_KG = 75;

/** Dial ranges per unit system: inches and pounds, or centimetres and kilograms. */
const RANGES = {
  imperial: { height: [48, 95], weight: [80, 400] },
  metric: { height: [120, 240], weight: [35, 180] },
} as const;

const cmToIn = (cm: number) => Math.round(cm / 2.54);
const inToCm = (inches: number) => Math.round(inches * 2.54);
const kgToLb = (kg: number) => Math.round(kg * 2.20462);
const lbToKg = (lb: number) => Math.round(lb / 2.20462);

function formatFeetInches(inches: number) {
  'worklet';
  return { text: `${Math.floor(inches / 12)}\u2032${inches % 12}\u2033` };
}
function formatCm(cm: number) {
  'worklet';
  return { text: String(cm), unit: 'cm' };
}
function formatLb(lb: number) {
  'worklet';
  return { text: String(lb), unit: 'lb' };
}
function formatKg(kg: number) {
  'worklet';
  return { text: String(kg), unit: 'kg' };
}

export default function BodyScreen() {
  const router = useRouter();
  const { width } = useWindowDimensions();
  const saved = useOnboarding();
  const type = useTranscriptType();
  const [units, setUnits] = useState<Units>(saved.units);
  const [heightCm, setHeightCm] = useState(saved.heightCm ?? DEFAULT_HEIGHT_CM);
  const [weightKg, setWeightKg] = useState(saved.weightKg ?? DEFAULT_WEIGHT_KG);
  const dialWidth = width - Gutter * 2;
  const imperial = units === 'imperial';

  const submit = () => {
    onboardingStore.set({ heightCm, weightKg, units });
    router.push('/onboarding/tour');
  };

  return (
    <OnboardingShell
      onBack={() => router.back()}
      step={8}
      footer={
        <Animated.View entering={FadeIn.delay(520).duration(420)}>
          <ShineButton label="Continue" onPress={submit} shineDelay={1200} />
        </Animated.View>
      }>
      <View style={{ paddingTop: Math.round(Spacing.five * type.scale) }}>
        <Animated.Text entering={FadeIn.duration(420)} style={type.text} accessibilityRole="header">
          {'Your height\nand weight.'}
        </Animated.Text>
        <Animated.View entering={FadeIn.delay(120).duration(400)} style={styles.hintRow}>
          <Text style={[hintStyle, styles.hint]}>For dose ranges and progress.</Text>
          <UnitToggle value={units} onChange={setUnits} />
        </Animated.View>

        <Animated.View entering={FadeInDown.delay(220).duration(460)} style={styles.section}>
          <Text style={styles.sectionLabel}>How tall are you?</Text>
          {imperial ? (
            <Dial
              key="in"
              min={RANGES.imperial.height[0]}
              max={RANGES.imperial.height[1]}
              value={cmToIn(heightCm)}
              onChange={(inches) => setHeightCm(inToCm(inches))}
              width={dialWidth}
              format={formatFeetInches}
              major={12}
              mid={6}
              labelEvery={12}
              label={(inches) => `${inches / 12}\u2032`}
              readoutWidth={124}
              accessibilityLabel="Height"
            />
          ) : (
            <Dial
              key="cm"
              min={RANGES.metric.height[0]}
              max={RANGES.metric.height[1]}
              value={heightCm}
              onChange={setHeightCm}
              width={dialWidth}
              format={formatCm}
              major={10}
              mid={5}
              labelEvery={10}
              label={String}
              readoutWidth={96}
              accessibilityLabel="Height"
            />
          )}
        </Animated.View>

        <Animated.View entering={FadeInDown.delay(340).duration(460)} style={styles.section}>
          <Text style={styles.sectionLabel}>What do you weigh?</Text>
          {imperial ? (
            <Dial
              key="lb"
              min={RANGES.imperial.weight[0]}
              max={RANGES.imperial.weight[1]}
              value={kgToLb(weightKg)}
              onChange={(lb) => setWeightKg(lbToKg(lb))}
              width={dialWidth}
              format={formatLb}
              major={10}
              mid={5}
              labelEvery={20}
              label={String}
              readoutWidth={96}
              accessibilityLabel="Weight"
            />
          ) : (
            <Dial
              key="kg"
              min={RANGES.metric.weight[0]}
              max={RANGES.metric.weight[1]}
              value={weightKg}
              onChange={setWeightKg}
              width={dialWidth}
              format={formatKg}
              major={10}
              mid={5}
              labelEvery={10}
              label={String}
              readoutWidth={96}
              accessibilityLabel="Weight"
            />
          )}
        </Animated.View>
      </View>
    </OnboardingShell>
  );
}

/** Two-way segmented control: ft · lb versus cm · kg. */
function UnitToggle({ value, onChange }: { value: Units; onChange: (units: Units) => void }) {
  return (
    <View style={styles.toggle} accessibilityRole="radiogroup">
      {(['imperial', 'metric'] as const).map((option) => {
        const on = value === option;
        return (
          <PressableScale
            key={option}
            onPress={() => onChange(option)}
            accessibilityRole="radio"
            accessibilityState={{ selected: on }}
            style={[styles.toggleItem, on && styles.toggleItemOn]}>
            <Text style={[styles.toggleLabel, on && styles.toggleLabelOn]}>{option === 'imperial' ? 'ft \u00b7 lb' : 'cm \u00b7 kg'}</Text>
          </PressableScale>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  hintRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: Spacing.three },
  hint: { flex: 1, marginTop: Spacing.two + Spacing.half },
  section: { marginTop: Spacing.four },
  sectionLabel: {
    color: 'rgba(242,242,244,0.72)',
    fontFamily: Typeface.bodySemiBold,
    fontSize: 14,
    letterSpacing: -0.1,
    marginBottom: Spacing.two,
  },
  toggle: {
    marginTop: Spacing.two + Spacing.half,
    flexDirection: 'row',
    padding: 3,
    borderRadius: 14,
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  toggleItem: { paddingHorizontal: 12, height: 30, borderRadius: 11, alignItems: 'center', justifyContent: 'center' },
  toggleItemOn: { backgroundColor: 'rgba(52,211,153,0.16)' },
  toggleLabel: { color: 'rgba(242,242,244,0.55)', fontFamily: Typeface.bodyMedium, fontSize: 13, letterSpacing: -0.1 },
  toggleLabelOn: { color: Accent.primary },
});
