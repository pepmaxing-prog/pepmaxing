import { SymbolView } from 'expo-symbols';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { PressableScale } from '@/components/pressable-scale';
import { ShineButton } from '@/components/shine-button';
import { Accent, Colors, MaxContentWidth, Spacing, Typeface } from '@/constants/theme';
import { PAYWALL_FEATURES, PAYWALL_PLANS } from '@/data/onboarding-copy';
import { useStore } from '@/data/store';

const TRIAL_DAYS = 7;

/**
 * Purchase UI only. No billing SDK is wired up yet (needs RevenueCat/App Store product IDs),
 * so "Start free trial" records a local trial and the flow continues either way.
 */
export default function PaywallScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { data, setOnboarding, setSubscription } = useStore();
  const [plan, setPlan] = useState<'monthly' | 'yearly'>('yearly');
  const [busy, setBusy] = useState(false);

  async function finish(subscribed: boolean) {
    if (busy) return;
    setBusy(true);
    if (subscribed) {
      const expiresAt = new Date(Date.now() + TRIAL_DAYS * 24 * 60 * 60 * 1000).toISOString();
      await setSubscription({ status: 'trialing', plan, expiresAt });
    }
    await setOnboarding({ completed: true, answers: data.onboarding.answers });
    router.replace('/(tabs)');
  }

  return (
    <View style={styles.root}>
      <ScrollView
        contentContainerStyle={[
          styles.content,
          { paddingTop: insets.top + Spacing.four, paddingBottom: Spacing.four },
        ]}>
        <Text style={styles.headline}>Your plan is ready.</Text>
        <Text style={styles.subtitle}>
          Pepmaxing Pro keeps your protocol, your levels and your body composition in one place.
        </Text>

        <View style={styles.features}>
          {PAYWALL_FEATURES.map((feature) => (
            <View key={feature} style={styles.feature}>
              <SymbolView
                name="checkmark.circle.fill"
                size={20}
                tintColor={Accent.primary}
                fallback={<View style={styles.tick} />}
              />
              <Text style={styles.featureLabel}>{feature}</Text>
            </View>
          ))}
        </View>

        <View style={styles.plans}>
          {PAYWALL_PLANS.map((option) => {
            const selected = option.id === plan;
            return (
              <PressableScale
                key={option.id}
                accessibilityRole="button"
                accessibilityState={{ selected }}
                style={[styles.plan, selected && styles.planSelected]}
                onPress={() => setPlan(option.id)}>
                <View style={styles.planText}>
                  <Text style={[styles.planTitle, selected && styles.planTitleSelected]}>
                    {option.title}
                  </Text>
                  <Text style={styles.planDetail}>{option.detail}</Text>
                </View>
                <Text style={[styles.planPrice, selected && styles.planTitleSelected]}>
                  {option.price}
                </Text>
                {option.badge ? (
                  <View style={styles.badge}>
                    <Text style={styles.badgeLabel}>{option.badge}</Text>
                  </View>
                ) : null}
              </PressableScale>
            );
          })}
        </View>
      </ScrollView>

      <View style={[styles.footer, { paddingBottom: insets.bottom + Spacing.three }]}>
        <ShineButton label={`Start ${TRIAL_DAYS}-day free trial`} onPress={() => void finish(true)} />
        <View style={styles.links}>
          <PressableScale accessibilityRole="button" onPress={() => void finish(false)}>
            <Text style={styles.link}>Continue without Pro</Text>
          </PressableScale>
          <Text style={styles.linkDivider}>·</Text>
          <PressableScale accessibilityRole="button" onPress={() => void finish(false)}>
            <Text style={styles.link}>Restore</Text>
          </PressableScale>
        </View>
        <Text style={styles.disclaimer}>
          Billing is not connected yet — nothing is charged and the trial is recorded on this
          device.
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: Colors.dark.background },
  content: {
    paddingHorizontal: Spacing.four,
    gap: Spacing.three,
    width: '100%',
    maxWidth: MaxContentWidth,
    alignSelf: 'center',
  },
  headline: {
    color: Colors.dark.text,
    fontFamily: Typeface.display,
    fontSize: 32,
    letterSpacing: -0.8,
  },
  subtitle: {
    color: Colors.dark.textSecondary,
    fontFamily: Typeface.body,
    fontSize: 15,
    lineHeight: 22,
  },
  features: { gap: Spacing.two, marginTop: Spacing.two },
  feature: { flexDirection: 'row', alignItems: 'center', gap: Spacing.three },
  tick: { width: 18, height: 18, borderRadius: 9, backgroundColor: Accent.primary },
  featureLabel: { flex: 1, color: Colors.dark.text, fontFamily: Typeface.body, fontSize: 15 },
  plans: { gap: Spacing.two, marginTop: Spacing.three },
  plan: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
    padding: Spacing.three,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: Colors.dark.border,
    backgroundColor: Colors.dark.backgroundElement,
  },
  planSelected: { borderColor: Accent.primary, backgroundColor: Accent.primarySoft },
  planText: { flex: 1, gap: Spacing.half },
  planTitle: { color: Colors.dark.textSecondary, fontFamily: Typeface.bodySemiBold, fontSize: 17 },
  planTitleSelected: { color: Colors.dark.text },
  planDetail: { color: Colors.dark.textTertiary, fontFamily: Typeface.body, fontSize: 13 },
  planPrice: { color: Colors.dark.textSecondary, fontFamily: Typeface.bodySemiBold, fontSize: 17 },
  badge: {
    position: 'absolute',
    top: -10,
    right: Spacing.three,
    paddingHorizontal: Spacing.two,
    paddingVertical: 2,
    borderRadius: 999,
    backgroundColor: Accent.primary,
  },
  badgeLabel: { color: Colors.dark.background, fontFamily: Typeface.bodySemiBold, fontSize: 11 },
  footer: { paddingHorizontal: Spacing.four, paddingTop: Spacing.three, gap: Spacing.three },
  links: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: Spacing.two },
  link: { color: Colors.dark.textSecondary, fontFamily: Typeface.bodyMedium, fontSize: 14 },
  linkDivider: { color: Colors.dark.textTertiary },
  disclaimer: {
    color: Colors.dark.textTertiary,
    fontFamily: Typeface.body,
    fontSize: 12,
    lineHeight: 17,
    textAlign: 'center',
  },
});
