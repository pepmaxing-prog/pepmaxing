import { Image } from 'expo-image';
import * as Notifications from 'expo-notifications';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Platform, StyleSheet, Text, View } from 'react-native';
import Animated, { FadeIn, FadeInDown } from 'react-native-reanimated';

import { hintStyle } from '@/components/onboarding/choices';
import { OnboardingShell } from '@/components/onboarding/onboarding-shell';
import { useTranscriptType } from '@/components/onboarding/typewriter';
import { PressableScale } from '@/components/pressable-scale';
import { ShineButton } from '@/components/shine-button';
import { Brand } from '@/constants/brand';
import { Spacing, Typeface } from '@/constants/theme';
import { onboardingStore, type ReminderChoice } from '@/lib/onboarding-store';

/** Primes for the system prompt with a preview of the reminder itself, then asks for real. */
export default function NotificationsScreen() {
  const router = useRouter();
  const type = useTranscriptType();
  const [asking, setAsking] = useState(false);

  const finish = (reminders: ReminderChoice) => {
    onboardingStore.set({ reminders });
    router.push('/onboarding/account');
  };

  const enable = async () => {
    if (asking) return;
    setAsking(true);
    try {
      const current = await Notifications.getPermissionsAsync();
      const settings = current.granted || current.status === 'granted' ? current : await Notifications.requestPermissionsAsync();
      finish(settings.granted || settings.ios?.status === Notifications.IosAuthorizationStatus.PROVISIONAL ? 'granted' : 'denied');
    } catch {
      finish('denied');
    } finally {
      setAsking(false);
    }
  };

  return (
    <OnboardingShell
      onBack={() => router.back()}
      step={10}
      footer={
        <Animated.View entering={FadeIn.delay(520).duration(420)} style={styles.actions}>
          <ShineButton label="Turn on reminders" onPress={enable} disabled={asking} shineDelay={1200} />
          <PressableScale onPress={() => finish('later')} accessibilityRole="button" style={styles.later}>
            <Text style={styles.laterLabel}>Maybe later</Text>
          </PressableScale>
        </Animated.View>
      }>
      <View style={{ paddingTop: Math.round(Spacing.five * type.scale) }}>
        <Animated.Text entering={FadeIn.duration(420)} style={type.text} accessibilityRole="header">
          {'Never miss\na dose.'}
        </Animated.Text>
        <Animated.Text entering={FadeIn.delay(120).duration(400)} style={hintStyle}>
          A nudge at the right time keeps a protocol on track. You can change this any time in Settings.
        </Animated.Text>

        <Animated.View entering={FadeInDown.delay(360).duration(520)} style={styles.banner} accessible accessibilityLabel="Example reminder">
          <Image source={require('@/assets/images/icon.png')} style={styles.appIcon} contentFit="cover" />
          <View style={styles.bannerText}>
            <View style={styles.bannerHeader}>
              <Text style={styles.bannerApp}>{Brand.name.toUpperCase()}</Text>
              <Text style={styles.bannerTime}>now</Text>
            </View>
            <Text style={styles.bannerTitle}>Time for BPC-157</Text>
            <Text style={styles.bannerBody}>250 mcg, morning dose. Tap to log it.</Text>
          </View>
        </Animated.View>

        <Animated.Text entering={FadeIn.delay(640).duration(400)} style={styles.footnote}>
          {Platform.OS === 'ios' ? 'iOS will ask you to confirm on the next screen.' : 'Android will ask you to confirm on the next screen.'}
        </Animated.Text>
      </View>
    </OnboardingShell>
  );
}

const styles = StyleSheet.create({
  banner: {
    marginTop: Spacing.five,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three - Spacing.one,
    padding: Spacing.three - Spacing.one,
    borderRadius: 24,
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(255,255,255,0.14)',
  },
  appIcon: { width: 40, height: 40, borderRadius: 10 },
  bannerText: { flex: 1, gap: 1 },
  bannerHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 2 },
  bannerApp: { color: 'rgba(242,242,244,0.55)', fontFamily: Typeface.bodyMedium, fontSize: 11, letterSpacing: 0.4 },
  bannerTime: { color: 'rgba(242,242,244,0.4)', fontFamily: Typeface.body, fontSize: 12 },
  bannerTitle: { color: '#F5F5F7', fontFamily: Typeface.bodySemiBold, fontSize: 15, letterSpacing: -0.2 },
  bannerBody: { color: 'rgba(242,242,244,0.78)', fontFamily: Typeface.body, fontSize: 14, letterSpacing: -0.1 },
  footnote: {
    marginTop: Spacing.four,
    color: 'rgba(242,242,244,0.4)',
    fontFamily: Typeface.body,
    fontSize: 13,
    lineHeight: 18,
  },
  actions: { gap: Spacing.one },
  later: { height: 44, alignItems: 'center', justifyContent: 'center' },
  laterLabel: { color: 'rgba(242,242,244,0.6)', fontFamily: Typeface.bodyMedium, fontSize: 15, letterSpacing: -0.1 },
});
