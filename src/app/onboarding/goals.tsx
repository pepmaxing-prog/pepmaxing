import type { SFSymbol } from 'expo-symbols';
import { useRouter } from 'expo-router';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Pressable, StyleSheet, useWindowDimensions, View } from 'react-native';
import Animated, { FadeIn, FadeInDown } from 'react-native-reanimated';

import { ChoiceCard, hintStyle } from '@/components/onboarding/choices';
import { Gutter, OnboardingShell } from '@/components/onboarding/onboarding-shell';
import { TranscriptText, useTranscriptType, useTypewriter } from '@/components/onboarding/typewriter';
import { ShineButton } from '@/components/shine-button';
import { Spacing } from '@/constants/theme';
import { displayName, onboardingStore, useOnboarding } from '@/lib/onboarding-store';

type Goal = { id: string; label: string; caption: string; symbol: SFSymbol };

const GOALS: Goal[] = [
  { id: 'lose-weight', label: 'Lose Weight', caption: 'Appetite & fat loss', symbol: 'chart.line.downtrend.xyaxis' },
  { id: 'build-recover', label: 'Build & Recover', caption: 'Muscle & repair', symbol: 'dumbbell.fill' },
  { id: 'look-feel', label: 'Look & Feel Better', caption: 'Skin, hair & vitality', symbol: 'sun.max.fill' },
  { id: 'heal', label: 'Heal Faster', caption: 'Injury recovery', symbol: 'bandage.fill' },
  { id: 'think', label: 'Think Sharper', caption: 'Focus & memory', symbol: 'lightbulb.max.fill' },
  { id: 'sleep', label: 'Sleep Better', caption: 'Deep, restful nights', symbol: 'bed.double.fill' },
];

const GRID_GAP = 12;
/** Pause between the question finishing and the picker taking over. */
const PICKER_DELAY = 640;

export default function GoalsScreen() {
  const router = useRouter();
  const { width, height } = useWindowDimensions();
  const { name, spoken, goals: savedGoals } = useOnboarding();
  const [picked, setPicked] = useState<string[]>(savedGoals);
  const returning = savedGoals.length > 0;
  const [picker, setPicker] = useState(returning);
  const type = useTranscriptType();

  const greeting = useMemo(() => {
    const who = displayName(name) || 'there';
    return [...spoken, `Hello ${who},\nit's great to meet you!`, "Let's get to know you\na bit better.", 'What are your goals\nwith this app?'];
  }, [name, spoken]);
  const alreadyTyped = useMemo(() => spoken.reduce((n, p) => n + p.length, 0), [spoken]);

  const pickerTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const onDone = useCallback(() => {
    pickerTimer.current = setTimeout(() => setPicker(true), returning ? 0 : PICKER_DELAY);
  }, [returning]);
  useEffect(() => () => {
    if (pickerTimer.current) clearTimeout(pickerTimer.current);
  }, []);

  const { typed, done, skip } = useTypewriter(greeting, { initialCount: alreadyTyped, onDone });

  useEffect(() => {
    if (returning) skip();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Straight to the picker, without the pause the typed question normally gets.
  const skipToPicker = () => {
    skip();
    if (pickerTimer.current) clearTimeout(pickerTimer.current);
    setPicker(true);
  };

  const cardWidth = (width - Gutter * 2 - GRID_GAP) / 2;
  // Short screens drop the captions so three rows still clear the docked button.
  const compact = height < 700;

  const toggle = (id: string) => setPicked((cur) => (cur.includes(id) ? cur.filter((g) => g !== id) : [...cur, id]));

  const canContinue = picked.length >= 1;
  const submit = () => {
    if (!canContinue) return;
    onboardingStore.set({ goals: picked, spoken: greeting });
    router.push('/onboarding/research');
  };

  return (
    <OnboardingShell
      onBack={() => router.back()}
      onSkip={picker ? undefined : skipToPicker}
      step={2}
      footer={
        picker ? (
          <Animated.View entering={returning ? undefined : FadeIn.delay(640).duration(420)}>
            <ShineButton label="Continue" disabled={!canContinue} onPress={submit} shineDelay={1200} />
          </Animated.View>
        ) : undefined
      }>
      <Pressable style={styles.flex} onPress={skip} disabled={done} accessible={false}>
        <TranscriptText paragraphs={greeting} typed={typed} title={picker} titleTop={Math.round(Spacing.five * type.scale)}>
          {picker ? (
            <View>
              <Animated.Text entering={returning ? undefined : FadeIn.delay(320).duration(400)} style={hintStyle}>
                Pick as many as you like.
              </Animated.Text>
              <View style={styles.grid}>
                {GOALS.map((goal, i) => (
                  <ChoiceCard
                    key={goal.id}
                    symbol={goal.symbol}
                    label={goal.label}
                    caption={compact ? undefined : goal.caption}
                    selected={picked.includes(goal.id)}
                    width={cardWidth}
                    height={compact ? 96 : 138}
                    compact={compact}
                    onPress={() => toggle(goal.id)}
                    entering={returning ? undefined : FadeInDown.delay(400 + i * 55).duration(460)}
                  />
                ))}
              </View>
            </View>
          ) : null}
        </TranscriptText>
      </Pressable>
    </OnboardingShell>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  grid: {
    marginTop: Spacing.four,
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: GRID_GAP,
  },
});
