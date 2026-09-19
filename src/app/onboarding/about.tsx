import { useRouter } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Pressable, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import Animated, { FadeIn, FadeInDown } from 'react-native-reanimated';

import { Dial } from '@/components/onboarding/dial';
import { ChoiceCard, hintStyle } from '@/components/onboarding/choices';
import { Gutter, OnboardingShell } from '@/components/onboarding/onboarding-shell';
import { TranscriptText, useTranscriptType, useTypewriter } from '@/components/onboarding/typewriter';
import { ShineButton } from '@/components/shine-button';
import { Spacing, Typeface } from '@/constants/theme';
import { onboardingStore, useOnboarding, type Sex } from '@/lib/onboarding-store';

const LINES = ['To tailor things\nto you\u2026', 'Tell us a little\nabout yourself.'] as const;

const SEXES: { id: Sex; label: string }[] = [
  { id: 'female', label: 'Female' },
  { id: 'male', label: 'Male' },
  { id: 'other', label: 'Other' },
  { id: 'unspecified', label: 'Prefer not to say' },
];

const AGE_MIN = 18;
const AGE_MAX = 90;
const DEFAULT_AGE = 30;

function formatAge(value: number) {
  'worklet';
  return { text: String(value), unit: 'years' };
}
const GRID_GAP = 12;
/** Pause between the line finishing and the form taking over. */
const FORM_DELAY = 640;

export default function AboutScreen() {
  const router = useRouter();
  const { width } = useWindowDimensions();
  const { age: savedAge, sex: savedSex } = useOnboarding();
  const returning = savedSex !== null;
  const [age, setAge] = useState(savedAge ?? DEFAULT_AGE);
  const [sex, setSex] = useState<Sex | null>(savedSex);
  const [form, setForm] = useState(returning);
  const type = useTranscriptType();

  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const onDone = useCallback(() => {
    timer.current = setTimeout(() => setForm(true), returning ? 0 : FORM_DELAY);
  }, [returning]);
  useEffect(() => () => {
    if (timer.current) clearTimeout(timer.current);
  }, []);

  const { typed, done, skip } = useTypewriter(LINES, { onDone });

  useEffect(() => {
    if (returning) skip();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const skipToForm = () => {
    skip();
    if (timer.current) clearTimeout(timer.current);
    setForm(true);
  };

  const cardWidth = (width - Gutter * 2 - GRID_GAP) / 2;
  const canContinue = sex !== null;
  const submit = () => {
    if (!canContinue) return;
    onboardingStore.set({ age, sex });
    router.push('/onboarding/body');
  };

  return (
    <OnboardingShell
      onBack={() => router.back()}
      onSkip={form ? undefined : skipToForm}
      step={7}
      footer={
        form ? (
          <Animated.View entering={returning ? undefined : FadeIn.delay(720).duration(420)}>
            <ShineButton label="Continue" disabled={!canContinue} onPress={submit} shineDelay={1200} />
          </Animated.View>
        ) : undefined
      }>
      <Pressable style={styles.flex} onPress={skip} disabled={done} accessible={false}>
        <TranscriptText paragraphs={LINES} typed={typed} title={form} titleTop={Math.round(Spacing.five * type.scale)}>
          {form ? (
            <View>
              <Animated.Text entering={returning ? undefined : FadeIn.delay(320).duration(400)} style={hintStyle}>
                This tunes dose guidance and reference ranges.
              </Animated.Text>

              <Animated.View entering={returning ? undefined : FadeInDown.delay(420).duration(460)} style={styles.section}>
                <Text style={styles.sectionLabel}>How old are you?</Text>
                <Dial
                  min={AGE_MIN}
                  max={AGE_MAX}
                  value={age}
                  onChange={setAge}
                  width={width - Gutter * 2}
                  format={formatAge}
                  major={10}
                  mid={5}
                  labelEvery={10}
                  label={String}
                  accessibilityLabel="Age"
                />
              </Animated.View>

              <Animated.View entering={returning ? undefined : FadeInDown.delay(560).duration(460)} style={styles.section}>
                <Text style={styles.sectionLabel}>Biological sex</Text>
                <View style={styles.grid} accessibilityRole="radiogroup">
                  {SEXES.map((option) => (
                    <ChoiceCard
                      key={option.id}
                      label={option.label}
                      selected={sex === option.id}
                      width={cardWidth}
                      height={58}
                      accessibilityRole="radio"
                      onPress={() => setSex(option.id)}
                    />
                  ))}
                </View>
              </Animated.View>
            </View>
          ) : null}
        </TranscriptText>
      </Pressable>
    </OnboardingShell>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  section: { marginTop: Spacing.four },
  sectionLabel: {
    color: 'rgba(242,242,244,0.72)',
    fontFamily: Typeface.bodySemiBold,
    fontSize: 14,
    letterSpacing: -0.1,
    marginBottom: Spacing.three,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: GRID_GAP,
  },
});
