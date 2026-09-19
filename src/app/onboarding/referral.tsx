import { useRouter } from 'expo-router';
import { useState } from 'react';
import { KeyboardAvoidingView, Platform, StyleSheet, Text, TextInput, View } from 'react-native';
import Animated, { FadeIn, FadeInDown } from 'react-native-reanimated';

import { hintStyle } from '@/components/onboarding/choices';
import { OnboardingShell } from '@/components/onboarding/onboarding-shell';
import { ReferralArt } from '@/components/onboarding/referral-art';
import { useTranscriptType } from '@/components/onboarding/typewriter';
import { PressableScale } from '@/components/pressable-scale';
import { ShineButton } from '@/components/shine-button';
import { Spacing, Typeface } from '@/constants/theme';
import { onboardingStore, useOnboarding } from '@/lib/onboarding-store';

/** Codes are letters and digits, 4–12 long; we uppercase as they type. */
const CODE_PATTERN = /^[A-Z0-9]{4,12}$/;

export default function ReferralScreen() {
  const router = useRouter();
  const type = useTranscriptType();
  const { referralCode } = useOnboarding();
  const [code, setCode] = useState(referralCode ?? '');
  const normalized = code.trim().toUpperCase().replace(/[^A-Z0-9]/g, '');
  const valid = CODE_PATTERN.test(normalized);

  const next = (value: string | null) => {
    onboardingStore.set({ referralCode: value });
    router.push('/onboarding/ahead');
  };

  return (
    <OnboardingShell
      step={12}
      footer={
        <Animated.View entering={FadeIn.delay(420).duration(420)} style={styles.actions}>
          <ShineButton label="Apply code" disabled={!valid} onPress={() => next(normalized)} shineDelay={1200} />
          <PressableScale onPress={() => next(null)} accessibilityRole="button" style={styles.skip}>
            <Text style={styles.skipLabel}>I don’t have one</Text>
          </PressableScale>
        </Animated.View>
      }>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.flex}>
        <View style={{ paddingTop: Math.round(Spacing.five * type.scale) }}>
          <Animated.Text entering={FadeIn.duration(420)} style={type.text} accessibilityRole="header">
            {'Got a referral\ncode?'}
          </Animated.Text>
          <Animated.Text entering={FadeIn.delay(120).duration(400)} style={hintStyle}>
            From a friend or a creator. Skip it if you don’t have one.
          </Animated.Text>

          <Animated.View entering={FadeInDown.delay(260).duration(560)} style={styles.art}>
            <ReferralArt />
          </Animated.View>

          <Animated.View entering={FadeInDown.delay(360).duration(480)}>
            <TextInput
              value={code}
              onChangeText={(value) => setCode(value.toUpperCase())}
              placeholder="ENTER CODE"
              placeholderTextColor="rgba(242,242,244,0.32)"
              autoCapitalize="characters"
              autoCorrect={false}
              autoComplete="off"
              spellCheck={false}
              maxLength={12}
              returnKeyType="done"
              onSubmitEditing={() => valid && next(normalized)}
              accessibilityLabel="Referral code"
              style={[styles.input, valid && styles.inputValid]}
            />
          </Animated.View>
        </View>
      </KeyboardAvoidingView>
    </OnboardingShell>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  art: { marginTop: Spacing.five },
  input: {
    marginTop: Spacing.five,
    height: 60,
    borderRadius: 18,
    paddingHorizontal: Spacing.four,
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.14)',
    color: '#F5F5F7',
    fontFamily: Typeface.bodySemiBold,
    fontSize: 20,
    letterSpacing: 3,
    textAlign: 'center',
  },
  inputValid: { borderColor: 'rgba(52,211,153,0.6)' },
  actions: { gap: Spacing.one },
  skip: { height: 44, alignItems: 'center', justifyContent: 'center' },
  skipLabel: { color: 'rgba(242,242,244,0.6)', fontFamily: Typeface.bodyMedium, fontSize: 15, letterSpacing: -0.1 },
});
