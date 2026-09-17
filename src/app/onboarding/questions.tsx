import { useRouter } from 'expo-router';
import { useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import Animated, { FadeIn, FadeOut } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { OptionCard } from '@/components/onboarding/option-card';
import { ProgressBar } from '@/components/onboarding/progress-bar';
import { PressableScale } from '@/components/pressable-scale';
import { ShineButton } from '@/components/shine-button';
import { Card } from '@/components/ui/card';
import { TextField } from '@/components/ui/field';
import { Accent, Colors, MaxContentWidth, Spacing, Typeface } from '@/constants/theme';
import { MEDICATIONS } from '@/data/medications';
import { ONBOARDING_STEPS, type OnboardingStep } from '@/data/onboarding-copy';
import { ensureProfile } from '@/data/profile';
import { useStore } from '@/data/store';
import type { OnboardingAnswers } from '@/data/types';
import { lbToKg } from '@/lib/units';

export default function QuestionsScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { data, setOnboarding, addMeasurement, saveProfile } = useStore();

  const [index, setIndex] = useState(0);
  const [answers, setAnswers] = useState<OnboardingAnswers>(data.onboarding.answers);
  const [draft, setDraft] = useState('');

  const step = ONBOARDING_STEPS[index];
  const weightUnit = data.profile?.weightUnit ?? 'kg';

  function set<K extends keyof OnboardingAnswers>(key: K, value: OnboardingAnswers[K]) {
    setAnswers((current) => ({ ...current, [key]: value }));
  }

  async function advance() {
    if (step.kind === 'number') {
      const parsed = Number.parseFloat(draft.replace(',', '.'));
      if (!Number.isFinite(parsed) || parsed <= 0) return;
      const kg = weightUnit === 'lb' ? lbToKg(parsed) : parsed;
      set(step.id, kg);
      setDraft('');
      if (step.id === 'startingWeight') {
        await addMeasurement({
          type: 'weight',
          value: kg,
          unit: 'kg',
          timestamp: new Date().toISOString(),
        });
      }
    }

    if (index + 1 < ONBOARDING_STEPS.length) {
      setIndex(index + 1);
      return;
    }

    // Answers are kept even though onboarding is only marked complete after the paywall,
    // so a user who quits here resumes with their protocol already known.
    await saveProfile(ensureProfile(data.profile));
    await setOnboarding({ completed: false, answers });
    router.replace('/onboarding/personalizing');
  }

  function back() {
    if (index === 0) {
      router.back();
      return;
    }
    setDraft('');
    setIndex(index - 1);
  }

  const canContinue = isAnswered(step, answers, draft);

  return (
    <KeyboardAvoidingView
      style={styles.root}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <View style={[styles.header, { paddingTop: insets.top + Spacing.two }]}>
        <PressableScale accessibilityRole="button" onPress={back} style={styles.back}>
          <Text style={styles.backLabel}>Back</Text>
        </PressableScale>
        <View style={styles.progress}>
          <ProgressBar progress={(index + 1) / ONBOARDING_STEPS.length} />
        </View>
      </View>

      <ScrollView
        contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 120 }]}
        keyboardShouldPersistTaps="handled">
        <Animated.View key={step.id} entering={FadeIn.duration(220)} exiting={FadeOut.duration(120)} style={styles.step}>
          {step.kind === 'education' ? (
            <>
              <Text style={styles.headline}>{step.headline}</Text>
              <Card style={styles.eduCard}>
                <Text style={styles.body}>{step.body}</Text>
                <Text style={styles.source}>{step.source}</Text>
              </Card>
            </>
          ) : null}

          {step.kind === 'proof' ? (
            <>
              <Text style={styles.headline}>{step.headline}</Text>
              <View style={styles.quotes}>
                {step.quotes.map((quote) => (
                  <Card key={quote.name} style={styles.quoteCard}>
                    <Text style={styles.stars}>★★★★★</Text>
                    <Text style={styles.body}>“{quote.text}”</Text>
                    <Text style={styles.source}>{quote.name}</Text>
                  </Card>
                ))}
              </View>
            </>
          ) : null}

          {step.kind === 'choice' ? (
            <>
              <Text style={styles.headline}>{step.question}</Text>
              {step.detail ? <Text style={styles.subtitle}>{step.detail}</Text> : null}
              <View style={styles.options}>
                {step.options.map((option) => (
                  <OptionCard
                    key={option.value}
                    label={option.label}
                    detail={option.detail}
                    selected={answers[step.id] === option.value}
                    onPress={() => set(step.id, option.value)}
                  />
                ))}
              </View>
            </>
          ) : null}

          {step.kind === 'medication' ? (
            <>
              <Text style={styles.headline}>{step.question}</Text>
              {step.detail ? <Text style={styles.subtitle}>{step.detail}</Text> : null}
              <View style={styles.options}>
                {MEDICATIONS.map((medication) => (
                  <OptionCard
                    key={medication.id}
                    label={medication.name}
                    detail={`${Math.round(medication.halfLifeHours / 24)}-day half-life`}
                    selected={answers.primaryMedicationId === medication.id}
                    onPress={() => set('primaryMedicationId', medication.id)}
                  />
                ))}
              </View>
            </>
          ) : null}

          {step.kind === 'number' ? (
            <>
              <Text style={styles.headline}>{step.question}</Text>
              {step.detail ? <Text style={styles.subtitle}>{step.detail}</Text> : null}
              <View style={styles.numberRow}>
                <TextField
                  style={styles.numberInput}
                  value={draft}
                  onChangeText={setDraft}
                  keyboardType="decimal-pad"
                  autoFocus
                  placeholder="0"
                  onSubmitEditing={() => void advance()}
                />
                <Text style={styles.unit}>{weightUnit}</Text>
              </View>
            </>
          ) : null}
        </Animated.View>
      </ScrollView>

      <View style={[styles.footer, { paddingBottom: insets.bottom + Spacing.three }]}>
        <ShineButton
          label={index + 1 === ONBOARDING_STEPS.length ? 'Build my plan' : 'Continue'}
          disabled={!canContinue}
          style={!canContinue ? styles.disabled : undefined}
          onPress={() => void advance()}
        />
      </View>
    </KeyboardAvoidingView>
  );
}

/** Education and proof steps are read-only; questions need a value before moving on. */
function isAnswered(step: OnboardingStep, answers: OnboardingAnswers, draft: string): boolean {
  if (step.kind === 'education' || step.kind === 'proof') return true;
  if (step.kind === 'number') {
    const parsed = Number.parseFloat(draft.replace(',', '.'));
    return Number.isFinite(parsed) && parsed > 0;
  }
  return answers[step.id] != null;
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: Colors.dark.background },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
    paddingHorizontal: Spacing.four,
    paddingBottom: Spacing.three,
  },
  back: { paddingVertical: Spacing.two, paddingRight: Spacing.two },
  backLabel: { color: Colors.dark.textTertiary, fontFamily: Typeface.bodyMedium, fontSize: 15 },
  progress: { flex: 1 },
  content: {
    paddingHorizontal: Spacing.four,
    paddingTop: Spacing.four,
    alignSelf: 'center',
    width: '100%',
    maxWidth: MaxContentWidth,
  },
  step: { gap: Spacing.three },
  headline: {
    color: Colors.dark.text,
    fontFamily: Typeface.display,
    fontSize: 30,
    lineHeight: 36,
    letterSpacing: -0.6,
  },
  subtitle: { color: Colors.dark.textSecondary, fontFamily: Typeface.body, fontSize: 15, lineHeight: 22 },
  options: { gap: Spacing.two, marginTop: Spacing.two },
  eduCard: { gap: Spacing.three, marginTop: Spacing.two },
  quotes: { gap: Spacing.two, marginTop: Spacing.two },
  quoteCard: { gap: Spacing.two },
  stars: { color: Accent.primary, fontSize: 13, letterSpacing: 2 },
  body: { color: Colors.dark.textSecondary, fontFamily: Typeface.body, fontSize: 15, lineHeight: 23 },
  source: { color: Colors.dark.textTertiary, fontFamily: Typeface.bodyMedium, fontSize: 13 },
  numberRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.three, marginTop: Spacing.two },
  numberInput: { flex: 1, fontFamily: Typeface.display, fontSize: 28 },
  unit: { color: Colors.dark.textSecondary, fontFamily: Typeface.bodyMedium, fontSize: 18 },
  footer: {
    paddingHorizontal: Spacing.four,
    paddingTop: Spacing.three,
    backgroundColor: Colors.dark.background,
  },
  disabled: { opacity: 0.4 },
});
