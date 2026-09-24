import { SymbolView } from 'expo-symbols';
import { useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { Row, Section, SettingsPage } from '@/components/settings/settings-ui';
import { ShineButton } from '@/components/shine-button';
import { Accent, Spacing, Typeface } from '@/constants/theme';
import { getPlans, purchasesConfigured, type Plan } from '@/lib/purchases';

/** Plan management. Until RevenueCat is wired this is a read-only Free card plus the plan previews. */
export default function PlanScreen() {
  const [plans, setPlans] = useState<Plan[]>([]);
  const [notice, setNotice] = useState(false);

  useEffect(() => {
    getPlans().then(setPlans);
  }, []);

  return (
    <SettingsPage title="Manage plan" subtitle="your subscription.">
      <Section title="Current">
        <Row symbol="checkmark.seal.fill" label="Pepmaxing Free" caption="Onboarding, library and tracking basics." value="Active" last />
      </Section>

      <Section title="Pepmaxing Pro" hint={purchasesConfigured ? undefined : 'Billing is not wired up yet — these are the plans we are building towards. Prices are placeholders.'}>
        {plans.map((p, i) => (
          <View key={p.id} style={[styles.planRow, i < plans.length - 1 && styles.divider]}>
            <View style={styles.planText}>
              <View style={styles.planNameRow}>
                <Text style={styles.planName}>{p.title}</Text>
                {p.badge ? (
                  <View style={styles.badge}>
                    <Text style={styles.badgeText}>{p.badge.toUpperCase()}</Text>
                  </View>
                ) : null}
              </View>
              <Text style={styles.planCaption}>
                {p.perMonth}
                {p.compareAt ? ` · was ${p.compareAt}` : ''}
              </Text>
            </View>
            <Text style={styles.planPrice}>{p.price}</Text>
          </View>
        ))}
      </Section>

      <View style={styles.upgradeWrap}>
        <ShineButton label="Upgrade" onPress={() => setNotice(true)} shineDelay={1200} />
        {notice ? <Text style={styles.notice}>Purchases are being set up — billing arrives with App Store integration.</Text> : null}
        <View style={styles.upgradeNote}>
          <SymbolView name="lock.fill" size={11} weight="semibold" tintColor="rgba(242,242,244,0.4)" fallback={null} />
          <Text style={styles.upgradeNoteText}>Checkout arrives with App Store billing.</Text>
        </View>
      </View>
    </SettingsPage>
  );
}

const styles = StyleSheet.create({
  planRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.three, paddingHorizontal: Spacing.three, paddingVertical: Spacing.three },
  divider: { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: 'rgba(255,255,255,0.08)' },
  planText: { flex: 1, gap: 3 },
  planNameRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  planName: { color: '#F5F5F7', fontFamily: Typeface.bodySemiBold, fontSize: 15, letterSpacing: -0.2 },
  badge: { paddingHorizontal: 7, paddingVertical: 2, borderRadius: 6, backgroundColor: 'rgba(52,211,153,0.16)' },
  badgeText: { color: Accent.primary, fontFamily: Typeface.bodySemiBold, fontSize: 10, letterSpacing: 0.6 },
  planCaption: { color: 'rgba(242,242,244,0.5)', fontFamily: Typeface.body, fontSize: 12.5 },
  planPrice: { color: '#F5F5F7', fontFamily: Typeface.bodySemiBold, fontSize: 15 },
  upgradeWrap: { marginTop: Spacing.four, gap: Spacing.two, alignItems: 'center' },
  notice: { color: 'rgba(242,242,244,0.6)', fontFamily: Typeface.body, fontSize: 12.5, textAlign: 'center' },
  upgradeNote: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  upgradeNoteText: { color: 'rgba(242,242,244,0.45)', fontFamily: Typeface.body, fontSize: 12.5 },
});
