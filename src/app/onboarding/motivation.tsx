import { useRouter } from 'expo-router';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Pressable, StyleSheet, useWindowDimensions, View } from 'react-native';
import Animated, { FadeIn, FadeInDown } from 'react-native-reanimated';

import { ChoiceRow, hintStyle } from '@/components/onboarding/choices';
import { OnboardingShell } from '@/components/onboarding/onboarding-shell';
import { TranscriptText, useTranscriptType, useTypewriter } from '@/components/onboarding/typewriter';
import { ShineButton } from '@/components/shine-button';
import { Spacing } from '@/constants/theme';
import { onboardingStore, useOnboarding, type Experience } from '@/lib/onboarding-store';

export type Option = { id: string; label: string; exclusive?: boolean };

type Script = {
  /** Two short reactions to the level they picked, then the question that becomes the title. */
  lines: [string, string, string];
  options: Option[];
};

/** Picking it clears everything else. */
export const NONE = 'none';

/**
 * One follow-up question per level. The ids double as keys into the reassurance
 * step's answers, so every option gets a direct reply on the next screen.
 */
export const SCRIPTS: Record<Experience, Script> = {
  curious: {
    lines: ['Curious is the best\nplace to begin.', 'We\u2019ll keep it clear,\nno jargon.', 'What would help\nyou most right now?'],
    options: [
      { id: 'how-it-works', label: 'How peptides actually work' },
      { id: 'safety', label: 'What\u2019s safe for me' },
      { id: 'first-step', label: 'A clear first step' },
      { id: 'plain-english', label: 'No-jargon explanations' },
      { id: 'sourcing', label: 'Sourcing I can trust' },
      { id: 'stories', label: 'Stories from real users' },
    ],
  },
  starting: {
    lines: ['Sounds like you\u2019ve done\nyour homework.', 'That already puts you\nahead of most.', 'Anything still\nholding you back?'],
    options: [
      { id: 'which', label: 'Which peptide is right for me' },
      { id: 'dosing', label: 'Dosing without the guesswork' },
      { id: 'mixing', label: 'Mixing and measuring correctly' },
      { id: 'source', label: 'Finding a legitimate source' },
      { id: 'side-effects', label: 'Side effects and safety' },
      { id: 'results', label: 'Whether it\u2019ll actually work' },
      { id: NONE, label: 'Nothing \u2014 I feel ready', exclusive: true },
    ],
  },
  experienced: {
    lines: ['You\u2019ve been here before.', 'We\u2019ll build on what\nyou already know.', 'What would make\nthis cycle better?'],
    options: [
      { id: 'dose-tuning', label: 'Dialling in my doses' },
      { id: 'stacking', label: 'Stacking safely' },
      { id: 'early-signs', label: 'Catching side effects early' },
      { id: 'planning', label: 'Smarter cycle planning' },
      { id: 'trends', label: 'Seeing trends over time' },
      { id: 'consistency', label: 'Staying consistent' },
    ],
  },
  seasoned: {
    lines: ['A seasoned hand.', 'Let\u2019s make managing it\neffortless.', 'What do you want\nmore of?'],
    options: [
      { id: 'multi-protocol', label: 'Managing several protocols' },
      { id: 'inventory', label: 'Exact inventory & reconstitution' },
      { id: 'analytics', label: 'Deeper analytics' },
      { id: 'labs', label: 'Lab work next to my logs' },
      { id: 'fast-logging', label: 'Fast, frictionless logging' },
      { id: 'export', label: 'Exporting or sharing data' },
    ],
  },
};

/** Pause between the question finishing and the list taking over. */
const PICKER_DELAY = 640;

export default function MotivationScreen() {
  const router = useRouter();
  const { height } = useWindowDimensions();
  const { experience, motivations: saved } = useOnboarding();
  const script = SCRIPTS[experience ?? 'curious'];
  const [picked, setPicked] = useState<string[]>(saved);
  const returning = saved.length > 0;
  const [picker, setPicker] = useState(returning);
  const type = useTranscriptType();

  const lines = useMemo(() => [...script.lines], [script]);

  const pickerTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const onDone = useCallback(() => {
    pickerTimer.current = setTimeout(() => setPicker(true), returning ? 0 : PICKER_DELAY);
  }, [returning]);
  useEffect(() => () => {
    if (pickerTimer.current) clearTimeout(pickerTimer.current);
  }, []);

  const { typed, done, skip } = useTypewriter(lines, { onDone });

  useEffect(() => {
    if (returning) skip();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const skipToPicker = () => {
    skip();
    if (pickerTimer.current) clearTimeout(pickerTimer.current);
    setPicker(true);
  };

  const compact = height < 700;
  const toggle = (option: Option) =>
    setPicked((cur) => {
      if (option.exclusive) return cur.includes(option.id) ? [] : [option.id];
      const others = cur.filter((id) => !script.options.find((o) => o.id === id)?.exclusive);
      return others.includes(option.id) ? others.filter((id) => id !== option.id) : [...others, option.id];
    });

  const canContinue = picked.length >= 1;
  const submit = () => {
    if (!canContinue) return;
    onboardingStore.set({ motivations: picked });
    router.push('/onboarding/reassurance');
  };

  return (
    <OnboardingShell
      onBack={() => router.back()}
      onSkip={picker ? undefined : skipToPicker}
      step={5}
      footer={
        picker ? (
          <Animated.View entering={returning ? undefined : FadeIn.delay(640).duration(420)}>
            <ShineButton label="Continue" disabled={!canContinue} onPress={submit} shineDelay={1200} />
          </Animated.View>
        ) : undefined
      }>
      <Pressable style={styles.flex} onPress={skip} disabled={done} accessible={false}>
        <TranscriptText paragraphs={lines} typed={typed} title={picker} titleTop={Math.round(Spacing.five * type.scale)}>
          {picker ? (
            <View>
              <Animated.Text entering={returning ? undefined : FadeIn.delay(320).duration(400)} style={hintStyle}>
                Pick as many as you like.
              </Animated.Text>
              <View style={[styles.list, { gap: compact ? Spacing.one + Spacing.half : Spacing.two + Spacing.half }]}>
                {script.options.map((option, i) => (
                  <ChoiceRow
                    key={option.id}
                    label={option.label}
                    selected={picked.includes(option.id)}
                    compact={compact}
                    onPress={() => toggle(option)}
                    entering={returning ? undefined : FadeInDown.delay(400 + i * 50).duration(440)}
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
  list: {
    marginTop: Spacing.four,
  },
});
