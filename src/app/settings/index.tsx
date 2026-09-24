import Constants from 'expo-constants';
import { useRouter } from 'expo-router';
import { SymbolView } from 'expo-symbols';
import { useEffect, useState } from 'react';
import { ActionSheetIOS, Alert, Linking, Platform, StyleSheet, Text, View } from 'react-native';
import Animated, { FadeIn } from 'react-native-reanimated';

import { PressableScale } from '@/components/pressable-scale';
import { Row, Section, SettingsPage } from '@/components/settings/settings-ui';
import { Brand, Legal } from '@/constants/brand';
import { Accent, Spacing, Typeface } from '@/constants/theme';
import { currentAccount, deleteAccount, signOut } from '@/lib/account';
import { useOnboarding } from '@/lib/onboarding-store';
import { AVATAR_TINTS, AVATARS, estimateGoals, levelFor, usePreferences } from '@/lib/preferences';
import { loggedCount, useSchedule } from '@/lib/schedule';
import { wipeEverywhere } from '@/lib/sync';

export default function SettingsScreen() {
  const router = useRouter();
  const onboarding = useOnboarding();
  const prefs = usePreferences();
  const schedule = useSchedule();
  const [account, setAccount] = useState<{ email: string | null; provider: string | null }>({ email: null, provider: null });
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    currentAccount().then(setAccount);
  }, []);

  const xp = loggedCount(schedule);
  const { level } = levelFor(xp);
  const { goals, estimated } = prefs.customGoals ? { goals: prefs.customGoals, estimated: false } : estimateGoals(onboarding);
  const avatarIndex = Math.max(0, AVATARS.indexOf(prefs.avatar as (typeof AVATARS)[number]));
  const tint = AVATAR_TINTS[avatarIndex % AVATAR_TINTS.length];
  const version = `${Constants.expoConfig?.version ?? '1.0.0'}${Constants.expoConfig?.ios?.buildNumber ? ` (${Constants.expoConfig.ios.buildNumber})` : ''}`;

  const leave = async (action: () => Promise<void>) => {
    if (busy) return;
    setBusy(true);
    try {
      await action();
      router.replace('/');
    } catch {
      Alert.alert('Something went wrong', 'Please try again in a moment.');
      setBusy(false);
    }
  };
  const confirmSignOut = () =>
    Alert.alert('Sign out?', 'Your data stays on your account. Sign back in any time to pick up where you left off.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Sign out', style: 'destructive', onPress: () => leave(signOut) },
    ]);
  const confirmDelete = () =>
    Alert.alert('Delete your account?', 'This permanently removes your account and everything in it. There is no undo.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete account', style: 'destructive', onPress: () => leave(deleteAccount) },
    ]);
  const confirmReset = () =>
    Alert.alert('Reset all data?', 'Clears protocols, dose logs, health entries, chats, saved peptides and preferences from your account — on this device and in the cloud. Your account stays.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Reset', style: 'destructive', onPress: () => void wipeEverywhere() },
    ]);
  const appearance = () => {
    const options = ['System', 'Light', 'Dark', 'Cancel'];
    if (Platform.OS === 'ios') {
      ActionSheetIOS.showActionSheetWithOptions({ options, cancelButtonIndex: 3, title: 'Appearance', message: 'Light and system themes are on the way. Dark is the current look.' }, () => {});
    } else {
      Alert.alert('Appearance', 'Light and system themes are on the way.');
    }
  };
  const contact = () => {
    if (!Legal.supportEmail) {
      Alert.alert('Contact', 'Support email is being set up. Use Submit feedback for now.');
      return;
    }
    Linking.openURL(`mailto:${Legal.supportEmail}?subject=${encodeURIComponent(`${Brand.name} support`)}`);
  };

  return (
    <SettingsPage title="Settings" subtitle="account & preferences.">
      <Animated.View entering={FadeIn.duration(360)}>
        <PressableScale onPress={() => router.push('/settings/profile')} accessibilityRole="button" accessibilityLabel="Community profile" style={styles.profile}>
          <View style={[styles.avatar, { backgroundColor: `${tint}26` }]}>
            <SymbolView name={prefs.avatar as never} size={22} weight="semibold" tintColor={tint} fallback={<Text style={[styles.avatarText, { color: tint }]}>{prefs.username.slice(0, 2).toUpperCase()}</Text>} />
          </View>
          <View style={styles.profileText}>
            <Text style={styles.profileName} numberOfLines={1}>
              {prefs.username || '…'}
            </Text>
            <Text style={styles.profileMeta}>
              {level.name} · {xp} XP
            </Text>
            <Text style={styles.profileHint}>Pick an icon & labels for your posts</Text>
          </View>
          <SymbolView name="chevron.right" size={12} weight="semibold" tintColor="rgba(242,242,244,0.35)" fallback={null} />
        </PressableScale>
      </Animated.View>

      <View style={styles.goalsBlock}>
        <View style={styles.goalsHeader}>
          <Text style={styles.sectionTitle}>DAILY GOALS</Text>
          {estimated ? <Text style={styles.estimated}>estimated for you</Text> : prefs.customGoals ? <Text style={styles.estimated}>custom</Text> : <Text style={styles.estimated}>reference defaults</Text>}
        </View>
        <View style={styles.goalsCard}>
          <View style={styles.goalsTop}>
            <Text style={styles.kcal}>
              {goals.kcal.toLocaleString()} <Text style={styles.kcalUnit}>kcal / day</Text>
            </Text>
            <PressableScale onPress={() => router.push('/settings/goals')} accessibilityRole="button" style={styles.adjust}>
              <SymbolView name="slider.horizontal.3" size={12} weight="semibold" tintColor={Accent.primary} fallback={null} />
              <Text style={styles.adjustText}>Adjust</Text>
            </PressableScale>
          </View>
          <View style={styles.macros}>
            {[
              [`${goals.protein}g`, 'Protein'],
              [`${goals.carbs}g`, 'Carbs'],
              [`${goals.fat}g`, 'Fat'],
              [`${goals.fiber}g`, 'Fiber'],
              [`${goals.waterOz}oz`, 'Water'],
            ].map(([v, l]) => (
              <View key={l} style={styles.macro}>
                <Text style={styles.macroValue}>{v}</Text>
                <Text style={styles.macroLabel}>{l.toUpperCase()}</Text>
              </View>
            ))}
          </View>
        </View>
      </View>

      <Section title="App">
        <Row symbol="chart.bar.fill" label="Tracked metrics" caption="What we chart for you" onPress={() => router.push('/settings/metrics')} chevron />
        <Row symbol="circle.lefthalf.filled" label="Appearance" value="Dark" onPress={appearance} chevron />
        <Row symbol="bell.fill" label="Notification settings" onPress={() => router.push('/settings/notifications')} chevron last />
      </Section>

      <Section title="Account">
        <Row symbol="envelope.fill" label="Email" value={account.email ?? '—'} />
        <Row symbol="creditcard.fill" label="Manage plan" value="Free" onPress={() => router.push('/settings/plan')} chevron />
        <Row symbol="rectangle.portrait.and.arrow.right" label="Sign out" onPress={confirmSignOut} tone="danger" chevron />
        <Row symbol="trash.fill" label="Delete account" onPress={confirmDelete} tone="danger" chevron last />
      </Section>

      <Section title="Support">
        <Row symbol="text.bubble.fill" label="Submit feedback" onPress={() => router.push('/settings/feedback')} chevron />
        <Row symbol="envelope.open.fill" label="Contact us" onPress={contact} chevron dim={!Legal.supportEmail} />
        <Row symbol="lock.fill" label="Privacy policy" onPress={Legal.privacyUrl ? () => Linking.openURL(Legal.privacyUrl) : undefined} chevron dim={!Legal.privacyUrl} />
        <Row symbol="doc.text.fill" label="Terms of use" onPress={Legal.termsUrl ? () => Linking.openURL(Legal.termsUrl) : undefined} chevron dim={!Legal.termsUrl} last />
      </Section>

      <Section title="Data">
        <Row symbol="arrow.counterclockwise" label="Reset all data" caption="Clears this device, keeps your account" onPress={confirmReset} tone="danger" chevron last />
      </Section>

      <Text style={styles.version}>
        {Brand.name} v{version}
      </Text>
    </SettingsPage>
  );
}

const styles = StyleSheet.create({
  profile: {
    marginTop: Spacing.four,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
    padding: Spacing.three,
    borderRadius: 22,
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  avatar: { width: 50, height: 50, borderRadius: 25, alignItems: 'center', justifyContent: 'center' },
  avatarText: { fontFamily: Typeface.bodyBold, fontSize: 16 },
  profileText: { flex: 1, gap: 2 },
  profileName: { color: '#F5F5F7', fontFamily: Typeface.bodySemiBold, fontSize: 16, letterSpacing: -0.3 },
  profileMeta: { color: 'rgba(242,242,244,0.7)', fontFamily: Typeface.bodyMedium, fontSize: 12.5 },
  profileHint: { color: 'rgba(242,242,244,0.45)', fontFamily: Typeface.body, fontSize: 12 },
  goalsBlock: { marginTop: Spacing.four },
  goalsHeader: { flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: Spacing.one + Spacing.half, marginHorizontal: Spacing.one },
  sectionTitle: { color: 'rgba(242,242,244,0.45)', fontFamily: Typeface.bodySemiBold, fontSize: 11, letterSpacing: 1.1 },
  estimated: { color: 'rgba(242,242,244,0.4)', fontFamily: Typeface.body, fontSize: 12 },
  goalsCard: { padding: Spacing.three, borderRadius: 20, backgroundColor: 'rgba(255,255,255,0.05)', borderWidth: StyleSheet.hairlineWidth, borderColor: 'rgba(255,255,255,0.1)', gap: Spacing.three },
  goalsTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  kcal: { color: '#F5F5F7', fontFamily: Typeface.bodyBold, fontSize: 24, letterSpacing: -0.6 },
  kcalUnit: { color: 'rgba(242,242,244,0.5)', fontFamily: Typeface.body, fontSize: 13, letterSpacing: 0 },
  adjust: { flexDirection: 'row', alignItems: 'center', gap: 5, height: 30, paddingHorizontal: 12, borderRadius: 15, backgroundColor: 'rgba(52,211,153,0.14)' },
  adjustText: { color: Accent.primary, fontFamily: Typeface.bodySemiBold, fontSize: 12.5 },
  macros: { flexDirection: 'row', justifyContent: 'space-between' },
  macro: { alignItems: 'center', gap: 2 },
  macroValue: { color: '#F2F2F4', fontFamily: Typeface.bodySemiBold, fontSize: 14.5, letterSpacing: -0.2 },
  macroLabel: { color: 'rgba(242,242,244,0.45)', fontFamily: Typeface.bodyMedium, fontSize: 9.5, letterSpacing: 0.7 },
  version: { marginTop: Spacing.five, textAlign: 'center', color: 'rgba(242,242,244,0.35)', fontFamily: Typeface.body, fontSize: 12 },
});
