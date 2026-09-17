import { useRouter } from 'expo-router';
import { Alert, Linking, StyleSheet, Text, View } from 'react-native';

import { ListRow, RowDivider } from '@/components/ui/list-row';
import { Card, CardTitle, SectionLabel } from '@/components/ui/card';
import { ChipGroup } from '@/components/ui/field';
import { Screen } from '@/components/ui/screen';
import { reviewUrl, supportUrl } from '@/constants/support';
import { Accent, Colors, Spacing, Typeface } from '@/constants/theme';
import { MEASUREMENT_LABELS } from '@/data/labels';
import { ensureProfile } from '@/data/profile';
import { useMeasurements, useStore } from '@/data/store';
import { MEASUREMENT_TYPES, type LengthUnit, type WeightUnit } from '@/data/types';
import { bodyComposition, fatLossShare } from '@/lib/body-composition';
import { baselineMeasurements, bodyFatPercentFor, latestMeasurements } from '@/lib/progress';
import { formatLength, formatWeight } from '@/lib/units';

const SUBSCRIPTION_LABELS = {
  none: 'Free',
  trialing: 'Trial',
  active: 'Active',
  expired: 'Expired',
} as const;

export default function ProfileScreen() {
  const router = useRouter();
  const { data, saveProfile, reset } = useStore();
  const measurements = useMeasurements();
  const profile = ensureProfile(data.profile);

  const latest = latestMeasurements(measurements);
  const baseline = baselineMeasurements(measurements);
  const bodyFat = bodyFatPercentFor(latest, data.profile);
  const baselineBodyFat = bodyFatPercentFor(baseline, data.profile);

  const lean =
    latest.weight && bodyFat != null
      ? bodyComposition(latest.weight.value, bodyFat).leanMassKg
      : null;
  const fatShare =
    latest.weight && baseline.weight && bodyFat != null && baselineBodyFat != null
      ? fatLossShare(
          { weightKg: baseline.weight.value, bodyFatPercent: baselineBodyFat },
          { weightKg: latest.weight.value, bodyFatPercent: bodyFat },
        )
      : null;

  const rate = reviewUrl();
  const support = supportUrl();

  const confirmReset = () =>
    Alert.alert('Erase all data?', 'Shots, measurements and settings are deleted from this device.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Erase', style: 'destructive', onPress: () => void reset() },
    ]);

  return (
    <Screen title="Profile" subtitle="Measurements, units and account">
      <View style={styles.section}>
        <SectionLabel>Body</SectionLabel>
        <Card style={styles.card}>
          <View style={styles.bodyHeader}>
            <View style={styles.bodyMain}>
              <Text style={styles.bodyValue}>
                {bodyFat != null ? `${bodyFat.toFixed(1)}%` : '—'}
              </Text>
              <Text style={styles.bodyLabel}>
                {latest.bodyFat ? 'Body fat, logged' : 'Body fat, tape estimate'}
              </Text>
            </View>
            {lean != null ? (
              <View style={styles.bodyMain}>
                <Text style={styles.bodyValue}>{formatWeight(lean, profile.weightUnit, 1)}</Text>
                <Text style={styles.bodyLabel}>Lean mass</Text>
              </View>
            ) : null}
          </View>
          {fatShare != null ? (
            <Text style={styles.fatShare}>
              {Math.round(fatShare * 100)}% of the weight you lost was fat.
            </Text>
          ) : bodyFat == null ? (
            <Text style={styles.hint}>
              Log waist and neck (plus hip for women) and set your height and sex to estimate body
              fat without calipers.
            </Text>
          ) : null}
          <RowDivider />
          {MEASUREMENT_TYPES.map((type) => {
            const entry = latest[type];
            return (
              <ListRow
                key={type}
                label={MEASUREMENT_LABELS[type]}
                value={entry ? formatMeasurement(entry.value, entry.unit, profile) : '—'}
                onPress={() => router.push(`/measure?type=${type}`)}
              />
            );
          })}
        </Card>
      </View>

      <View style={styles.section}>
        <SectionLabel>Units</SectionLabel>
        <Card style={styles.card}>
          <Text style={styles.unitLabel}>Weight</Text>
          <ChipGroup<WeightUnit>
            options={[
              { value: 'kg', label: 'Kilograms' },
              { value: 'lb', label: 'Pounds' },
            ]}
            value={profile.weightUnit}
            onChange={(weightUnit) => void saveProfile({ ...profile, weightUnit })}
          />
          <Text style={styles.unitLabel}>Length</Text>
          <ChipGroup<LengthUnit>
            options={[
              { value: 'cm', label: 'Centimetres' },
              { value: 'in', label: 'Inches' },
            ]}
            value={profile.lengthUnit}
            onChange={(lengthUnit) => void saveProfile({ ...profile, lengthUnit })}
          />
        </Card>
      </View>

      <View style={styles.section}>
        <SectionLabel>Subscription</SectionLabel>
        <Card style={styles.card}>
          <View style={styles.subscriptionHeader}>
            <CardTitle>Pepmaxing Pro</CardTitle>
            <Text
              style={[
                styles.status,
                data.subscription.status === 'active' && styles.statusActive,
              ]}>
              {SUBSCRIPTION_LABELS[data.subscription.status]}
            </Text>
          </View>
          <Text style={styles.hint}>
            {data.subscription.expiresAt
              ? `Renews ${new Date(data.subscription.expiresAt).toLocaleDateString()}`
              : 'Billing is not connected yet — status is read from the local store.'}
          </Text>
        </Card>
      </View>

      <View style={styles.section}>
        <SectionLabel>About</SectionLabel>
        <Card style={styles.card}>
          <ListRow
            label="Your details"
            detail="Name, sex, age, height"
            onPress={() => router.push('/details')}
          />
          <RowDivider />
          <ListRow
            label="Rate us"
            detail={rate ? undefined : 'Available once the App Store listing is live'}
            onPress={rate ? () => void Linking.openURL(rate) : undefined}
          />
          <RowDivider />
          <ListRow
            label="Contact us"
            detail={support ? undefined : 'Available once the support inbox is set up'}
            onPress={support ? () => void Linking.openURL(support) : undefined}
          />
          <RowDivider />
          <ListRow label="Erase all data" destructive onPress={confirmReset} />
        </Card>
      </View>
    </Screen>
  );
}

function formatMeasurement(
  value: number,
  unit: string,
  profile: { weightUnit: WeightUnit; lengthUnit: LengthUnit },
): string {
  if (unit === '%') return `${value.toFixed(1)}%`;
  if (unit === 'kg') return formatWeight(value, profile.weightUnit);
  return formatLength(value, profile.lengthUnit);
}

const styles = StyleSheet.create({
  section: { gap: Spacing.two },
  card: { gap: Spacing.two },
  bodyHeader: { flexDirection: 'row', gap: Spacing.five },
  bodyMain: { gap: 2 },
  bodyValue: {
    color: Colors.dark.text,
    fontFamily: Typeface.display,
    fontSize: 28,
    letterSpacing: -0.8,
  },
  bodyLabel: { color: Colors.dark.textTertiary, fontFamily: Typeface.body, fontSize: 12 },
  fatShare: { color: Accent.primary, fontFamily: Typeface.bodyMedium, fontSize: 14 },
  hint: { color: Colors.dark.textSecondary, fontFamily: Typeface.body, fontSize: 13, lineHeight: 19 },
  unitLabel: { color: Colors.dark.textTertiary, fontFamily: Typeface.bodyMedium, fontSize: 12 },
  subscriptionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  status: { color: Colors.dark.textSecondary, fontFamily: Typeface.bodySemiBold, fontSize: 13 },
  statusActive: { color: Accent.primary },
});
