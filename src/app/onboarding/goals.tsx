import { useRouter } from 'expo-router';
import { useMemo } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { OnboardingShell } from '@/components/onboarding/onboarding-shell';
import { TypewriterText, useTypewriter } from '@/components/onboarding/typewriter';
import { Colors, Spacing, Typeface } from '@/constants/theme';
import { displayName, useOnboarding } from '@/lib/onboarding-store';

/** Step 2 placeholder: greets by name. The goal picker lands here next. */
export default function GoalsScreen() {
  const router = useRouter();
  const { name } = useOnboarding();
  const message = useMemo(
    () => [`Nice to meet you, ${displayName(name) || 'friend'}.`, "Let's set up your protocol."],
    [name],
  );
  const { typed, done } = useTypewriter(message);

  return (
    <OnboardingShell onBack={() => router.back()}>
      <View style={styles.body}>
        <TypewriterText paragraphs={message} typed={typed} done={done} />
        <Text style={styles.caption}>Next step coming soon.</Text>
      </View>
    </OnboardingShell>
  );
}

const styles = StyleSheet.create({
  body: { flex: 1, paddingTop: Spacing.five + Spacing.two },
  caption: {
    marginTop: Spacing.five,
    color: Colors.dark.textTertiary,
    fontFamily: Typeface.body,
    fontSize: 14,
  },
});
