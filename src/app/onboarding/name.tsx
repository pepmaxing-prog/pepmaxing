import { useRouter } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Keyboard, Pressable, StyleSheet, TextInput } from 'react-native';
import Animated, { FadeIn } from 'react-native-reanimated';

import { OnboardingShell } from '@/components/onboarding/onboarding-shell';
import { TranscriptText, useTranscriptType, useTypewriter } from '@/components/onboarding/typewriter';
import { Brand } from '@/constants/brand';
import { onboardingStore, useOnboarding } from '@/lib/onboarding-store';

const MESSAGE = [
  `Hello and welcome\nto ${Brand.name}.`,
  "We're excited to start\nthis journey with you.",
  'What should we\ncall you?',
] as const;

export default function NameScreen() {
  const router = useRouter();
  const { name: savedName } = useOnboarding();
  const [name, setName] = useState(savedName);
  const inputRef = useRef<TextInput>(null);
  const type = useTranscriptType();

  // If the user is returning to this step, don't make them sit through the typing again.
  const returning = savedName.length > 0;

  const onDone = useCallback(() => {
    if (returning) return;
    setTimeout(() => inputRef.current?.focus(), 360);
  }, [returning]);

  const { typed, done, skip } = useTypewriter(MESSAGE, { onDone });

  useEffect(() => {
    if (returning) skip();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const submit = () => {
    const trimmed = name.trim();
    if (!trimmed) return;
    Keyboard.dismiss();
    onboardingStore.set({ name: trimmed, spoken: [...MESSAGE] });
    router.push('/onboarding/goals');
  };

  return (
    <OnboardingShell onSkip={done ? undefined : skip}>
      <Pressable style={styles.flex} onPress={done ? () => inputRef.current?.focus() : skip} accessible={false}>
        <TranscriptText paragraphs={MESSAGE} typed={typed} avoidKeyboard>
          {done ? (
            <Animated.View entering={returning ? undefined : FadeIn.duration(360)}>
              <TextInput
                ref={inputRef}
                value={name}
                onChangeText={setName}
                onSubmitEditing={submit}
                style={[type.text, styles.input, { height: type.text.lineHeight + 8 }]}
                autoCapitalize="words"
                autoCorrect={false}
                autoComplete="given-name"
                textContentType="givenName"
                returnKeyType="go"
                keyboardAppearance="dark"
                selectionColor={type.text.color}
                cursorColor={type.text.color}
                maxLength={40}
                accessibilityLabel="Your name"
              />
            </Animated.View>
          ) : null}
        </TranscriptText>
      </Pressable>
    </OnboardingShell>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  input: {
    paddingVertical: 4,
    paddingHorizontal: 0,
    textAlignVertical: 'top',
  },
});
