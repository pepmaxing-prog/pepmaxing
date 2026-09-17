import { useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ShineButton } from '@/components/shine-button';
import { Card } from '@/components/ui/card';
import { ChipGroup, Field, TextField } from '@/components/ui/field';
import { ListRow, RowDivider } from '@/components/ui/list-row';
import { Brand } from '@/constants/brand';
import { Colors, Spacing, Typeface } from '@/constants/theme';
import { MEASUREMENT_LABELS } from '@/data/labels';
import { ensureProfile } from '@/data/profile';
import { useMeasurements, useStore } from '@/data/store';
import { MEASUREMENT_TYPES, type MeasurementType } from '@/data/types';
import { inToCm, lbToKg } from '@/lib/units';

/** Values are stored in kg / cm / % regardless of the unit the user types in. */
function toStored(type: MeasurementType, value: number, weightUnit: string, lengthUnit: string) {
  if (type === 'bodyFat') return { value, unit: '%' as const };
  if (type === 'weight') {
    return { value: weightUnit === 'lb' ? lbToKg(value) : value, unit: 'kg' as const };
  }
  return { value: lengthUnit === 'in' ? inToCm(value) : value, unit: 'cm' as const };
}

export default function MeasureScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ type?: string }>();
  const { data, addMeasurement, deleteMeasurement } = useStore();
  const measurements = useMeasurements();
  const profile = ensureProfile(data.profile);

  const initialType = MEASUREMENT_TYPES.find((type) => type === params.type) ?? 'weight';
  const [type, setType] = useState<MeasurementType>(initialType);
  const [amount, setAmount] = useState('');

  const unitLabel =
    type === 'bodyFat' ? '%' : type === 'weight' ? profile.weightUnit : profile.lengthUnit;
  const parsed = Number(amount.replace(',', '.'));
  const valid = Number.isFinite(parsed) && parsed > 0;
  const history = measurements.filter((entry) => entry.type === type).slice(0, 5);

  const save = async () => {
    if (!valid) return;
    const stored = toStored(type, parsed, profile.weightUnit, profile.lengthUnit);
    await addMeasurement({ type, ...stored, timestamp: new Date().toISOString() });
    router.back();
  };

  const insets = useSafeAreaInsets();

  return (
    <KeyboardAvoidingView
      style={styles.root}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView
        contentContainerStyle={[styles.body, { paddingBottom: insets.bottom + Spacing.five }]}
        keyboardShouldPersistTaps="handled">
        <Text style={styles.title}>Log a measurement</Text>

        <Field label="What">
          <ChipGroup<MeasurementType>
            options={MEASUREMENT_TYPES.map((value) => ({
              value,
              label: MEASUREMENT_LABELS[value],
            }))}
            value={type}
            onChange={(next) => {
              setType(next);
              setAmount('');
            }}
          />
        </Field>

        <Field label={`Value (${unitLabel})`}>
          <TextField
            value={amount}
            onChangeText={setAmount}
            keyboardType="decimal-pad"
            placeholder={type === 'bodyFat' ? '18.5' : '0'}
            autoFocus
          />
        </Field>

        {history.length > 0 ? (
          <View style={styles.section}>
            <Text style={styles.sectionLabel}>Recent</Text>
            <Card style={styles.list}>
              {history.map((entry, index) => (
                <View key={entry.id}>
                  {index > 0 ? <RowDivider /> : null}
                  <ListRow
                    label={`${entry.value.toFixed(1)} ${entry.unit}`}
                    detail={new Date(entry.timestamp).toLocaleDateString()}
                    value="Delete"
                    onPress={() => void deleteMeasurement(entry.id)}
                  />
                </View>
              ))}
            </Card>
          </View>
        ) : null}

        <ShineButton
          label="Save"
          onPress={save}
          disabled={!valid}
          style={!valid && styles.disabled}
        />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: Brand.black },
  body: { padding: Spacing.four, gap: Spacing.four },
  title: {
    color: Colors.dark.text,
    fontFamily: Typeface.display,
    fontSize: 24,
    letterSpacing: -0.6,
  },
  section: { gap: Spacing.two },
  sectionLabel: {
    color: Colors.dark.textTertiary,
    fontFamily: Typeface.bodyMedium,
    fontSize: 12,
    letterSpacing: 0.8,
    textTransform: 'uppercase',
  },
  list: { paddingVertical: Spacing.one },
  disabled: { opacity: 0.4 },
});
