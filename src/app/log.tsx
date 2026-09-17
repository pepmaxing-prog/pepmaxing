import { useLocalSearchParams, useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import { Alert, KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { PressableScale } from '@/components/pressable-scale';
import { ShineButton } from '@/components/shine-button';
import { DateTimeRow } from '@/components/shots/date-time-row';
import { ChipGroup, Field, Row, TextField } from '@/components/ui/field';
import { Brand } from '@/constants/brand';
import { Colors, Spacing, Typeface } from '@/constants/theme';
import { INJECTION_SITE_LABELS, PAIN_LABELS, suggestNextSite } from '@/data/labels';
import { MEDICATIONS, getMedication } from '@/data/medications';
import { useShots, useStore } from '@/data/store';
import { INJECTION_SITES, type DosageUnit, type InjectionSite, type PainLevel } from '@/data/types';
import { toDateKey, toTimeKey } from '@/lib/dates';
import { checkDose } from '@/lib/levels';

const UNITS: DosageUnit[] = ['mg', 'mcg', 'iu', 'ml', 'units'];
const PAIN_LEVELS: PainLevel[] = [1, 2, 3, 4, 5];

/** Quick-add (and edit) sheet for a single injection. */
export default function LogShotScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id?: string }>();
  const shots = useShots();
  const { addShot, updateShot, deleteShot } = useStore();

  const existing = id ? shots.find((shot) => shot.id === id) : undefined;
  const now = new Date();
  const suggestedSite = useMemo(
    () => suggestNextSite(shots.slice(0, INJECTION_SITES.length).map((shot) => shot.injectionSite), INJECTION_SITES),
    [shots],
  );

  const [medicationId, setMedicationId] = useState(
    existing?.medicationId ?? shots[0]?.medicationId ?? MEDICATIONS[0].id,
  );
  const [when, setWhen] = useState({
    date: existing?.date ?? toDateKey(now),
    time: existing?.time ?? toTimeKey(now),
  });
  const [amount, setAmount] = useState(existing ? String(existing.dosageAmount) : '');
  const [unit, setUnit] = useState<DosageUnit>(
    existing?.dosageUnit ?? getMedication(medicationId)?.defaultUnit ?? 'mg',
  );
  const [site, setSite] = useState<InjectionSite>(existing?.injectionSite ?? suggestedSite);
  const [pain, setPain] = useState<PainLevel>(existing?.painLevel ?? 1);
  const [notes, setNotes] = useState(existing?.notes ?? '');
  const [saving, setSaving] = useState(false);

  const insets = useSafeAreaInsets();
  const parsedAmount = Number.parseFloat(amount.replace(',', '.'));
  const validAmount = Number.isFinite(parsedAmount) && parsedAmount > 0;
  const warning = validAmount ? checkDose(medicationId, parsedAmount, unit) : null;

  async function save() {
    if (!validAmount || saving) return;
    setSaving(true);
    const draft = {
      medicationId,
      date: when.date,
      time: when.time,
      dosageAmount: parsedAmount,
      dosageUnit: unit,
      injectionSite: site,
      painLevel: pain,
      notes: notes.trim(),
    };
    if (existing) await updateShot(existing.id, draft);
    else await addShot(draft);
    router.back();
  }

  function confirmDelete() {
    if (!existing) return;
    Alert.alert('Delete this shot?', 'It will be removed from your history and level estimate.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          await deleteShot(existing.id);
          router.back();
        },
      },
    ]);
  }

  return (
    <KeyboardAvoidingView
      style={styles.root}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={insets.top}>
      <ScrollView
        contentContainerStyle={[styles.body, { paddingBottom: insets.bottom + Spacing.six }]}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}>
        <Text style={styles.title}>{existing ? 'Edit shot' : 'Log a shot'}</Text>

        <Field label="Medication">
          <ChipGroup
            options={MEDICATIONS.map((medication) => ({ value: medication.id, label: medication.name }))}
            value={medicationId}
            onChange={(next) => {
              setMedicationId(next);
              const defaultUnit = getMedication(next)?.defaultUnit;
              if (defaultUnit && !existing) setUnit(defaultUnit);
            }}
          />
        </Field>

        <DateTimeRow date={when.date} time={when.time} onChange={setWhen} />

        <Field label="Dosage">
          <Row>
            <View style={styles.amount}>
              <TextField
                value={amount}
                onChangeText={setAmount}
                keyboardType="decimal-pad"
                placeholder="0"
                inputMode="decimal"
                accessibilityLabel="Dosage amount"
              />
            </View>
          </Row>
          <ChipGroup
            options={UNITS.map((value) => ({ value, label: value }))}
            value={unit}
            onChange={setUnit}
          />
          {warning ? <Text style={styles.warning}>{warning.message}</Text> : null}
        </Field>

        <Field label="Injection site">
          <ChipGroup
            options={INJECTION_SITES.map((value) => ({ value, label: INJECTION_SITE_LABELS[value] }))}
            value={site}
            onChange={setSite}
          />
        </Field>

        <Field label="Pain level">
          <ChipGroup
            options={PAIN_LEVELS.map((value) => ({ value, label: `${value} · ${PAIN_LABELS[value]}` }))}
            value={pain}
            onChange={setPain}
          />
        </Field>

        <Field label="Notes">
          <TextField
            value={notes}
            onChangeText={setNotes}
            placeholder="Anything worth remembering"
            multiline
            style={styles.notes}
          />
        </Field>

        <ShineButton
          label={existing ? 'Save changes' : 'Save shot'}
          onPress={save}
          disabled={!validAmount || saving}
          style={!validAmount && styles.disabled}
        />

        {existing ? (
          <PressableScale accessibilityRole="button" style={styles.delete} onPress={confirmDelete}>
            <Text style={styles.deleteLabel}>Delete shot</Text>
          </PressableScale>
        ) : null}
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
    fontSize: 26,
    letterSpacing: -0.8,
  },
  amount: { flex: 1 },
  notes: { minHeight: 88, textAlignVertical: 'top' },
  warning: { color: '#FBBF24', fontFamily: Typeface.bodyMedium, fontSize: 13 },
  disabled: { opacity: 0.4 },
  delete: { alignSelf: 'center', paddingVertical: Spacing.two },
  deleteLabel: { color: '#F87171', fontFamily: Typeface.bodyMedium, fontSize: 15 },
});
