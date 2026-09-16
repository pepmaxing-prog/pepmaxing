import { useRouter } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { Pressable, StyleSheet, TextInput, View } from 'react-native';
import Animated, { Easing, useAnimatedStyle, useSharedValue, withDelay, withTiming } from 'react-native-reanimated';

import { OnboardingShell } from '@/components/onboarding/onboarding-shell';
import { TypewriterText, useTypewriter } from '@/components/onboarding/typewriter';
import { ShineButton } from '@/components/shine-button';
import { Brand } from '@/constants/brand';
import { Colors, Spacing, Typeface } from '@/constants/theme';
import { onboardingStore, useOnboarding } from '@/lib/onboarding-store';

const MESSAGE = [
  `Hello and welcome to ${Brand.name}.`,
  "We're excited to start this journey with you.",
  'What should we call you?',
] as const;

export default function NameScreen() {
  const router = useRouter();
  const { name: savedName } = useOnboarding();
  const [name, setName] = useState(savedName);
  const inputRef = useRef<TextInput>(null);
  const reveal = useSharedValue(0);

  const onDone = () => {
    reveal.set(withDelay(120, withTiming(1, { duration: 620, easing: Easing.out(Easing.cubic) })));
    setTimeout(() => inputRef.current?.focus(), 420);
  };

  const { typed, done, skip } = useTypewriter(MESSAGE, { onDone });

  // If the user is returning to this step, don't make them sit through the typing again.
  const returning = savedName.length > 0;
  useEffect(() => {
    if (returning) skip();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const trimmed = name.trim();
  const canContinue = trimmed.length >= 1;

  const submit = () => {
    if (!canContinue) return;
    onboardingStore.set({ name: trimmed });
    router.push('/onboarding/goals');
  };

  const revealStyle = useAnimatedStyle(() => ({
    opacity: reveal.value,
    transform: [{ translateY: 18 * (1 - reveal.value) }],
  }));

  return (
    <OnboardingShell
      onBack={() => router.back()}
      footer={
        <Animated.View style={revealStyle}>
          <ShineButton label="Continue" disabled={!canContinue} onPress={submit} shineDelay={800} />
        </Animated.View>
      }>
      <Pressable style={styles.body} onPress={done ? () => inputRef.current?.focus() : skip} accessible={false}>
        <TypewriterText paragraphs={MESSAGE} typed={typed} done={done} hideCaret={name.length > 0} />

        <Animated.View style={[styles.field, revealStyle]} pointerEvents={done ? 'auto' : 'none'}>
          <TextInput
            ref={inputRef}
            value={name}
            onChangeText={setName}
            onSubmitEditing={submit}
            placeholder="Your name"
            placeholderTextColor={Colors.dark.textTertiary}
            style={styles.input}
            autoCapitalize="words"
            autoCorrect={false}
            autoComplete="given-name"
            textContentType="givenName"
            returnKeyType="done"
            enablesReturnKeyAutomatically
            keyboardAppearance="dark"
            selectionColor="#F5F5F7"
            cursorColor="#F5F5F7"
            maxLength={40}
            accessibilityLabel="Your name"
          />
          <View style={[styles.underline, name.length > 0 && styles.underlineActive]} />
        </Animated.View>
      </Pressable>
    </OnboardingShell>
  );
}

const styles = StyleSheet.create({
  body: { flex: 1, paddingTop: Spacing.five + Spacing.two },
  field: { marginTop: Spacing.five },
  input: {
    color: '#F5F5F7',
    fontFamily: Typeface.display,
    fontSize: 30,
    letterSpacing: -0.8,
    paddingVertical: Spacing.two,
    paddingHorizontal: 0,
  },
  underline: { height: 1.5, borderRadius: 1, backgroundColor: 'rgba(255,255,255,0.22)' },
  underlineActive: { backgroundColor: '#F5F5F7' },
});
