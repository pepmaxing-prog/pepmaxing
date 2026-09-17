import { useRouter } from 'expo-router';
import { useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ShineButton } from '@/components/shine-button';
import { ChipGroup, Field, Row, TextField } from '@/components/ui/field';
import { Brand } from '@/constants/brand';
import { Colors, Spacing, Typeface } from '@/constants/theme';
import { ensureProfile } from '@/data/profile';
import { useStore } from '@/data/store';
import { cmToFeetInches, feetInchesToCm } from '@/lib/units';

type Sex = 'male' | 'female';

/** Name, sex, age and height — the inputs the body-fat estimate needs. */
export default function DetailsScreen() {
  const router = useRouter();
  const { data, saveProfile } = useStore();
  const profile = ensureProfile(data.profile);
  const imperial = profile.lengthUnit === 'in';
  const initialHeight = profile.height ? cmToFeetInches(profile.height) : null;

  const [name, setName] = useState(profile.name);
  const [sex, setSex] = useState<Sex | null>(profile.sex);
  const [age, setAge] = useState(profile.age ? String(profile.age) : '');
  const [heightCm, setHeightCm] = useState(profile.height ? String(Math.round(profile.height)) : '');
  const [feet, setFeet] = useState(initialHeight ? String(initialHeight.feet) : '');
  const [inches, setInches] = useState(initialHeight ? String(initialHeight.inches) : '');

  const insets = useSafeAreaInsets();

  const save = async () => {
    const height = imperial
      ? feet || inches
        ? feetInchesToCm(Number(feet) || 0, Number(inches) || 0)
        : null
      : heightCm
        ? Number(heightCm)
        : null;
    await saveProfile({
      ...profile,
      name: name.trim(),
      sex,
      age: age ? Number(age) : null,
      height: height && Number.isFinite(height) && height > 0 ? height : null,
    });
    router.back();
  };

  return (
    <KeyboardAvoidingView
      style={styles.root}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={insets.top}>
      <ScrollView
        contentContainerStyle={[styles.body, { paddingBottom: insets.bottom + Spacing.five }]}
        keyboardShouldPersistTaps="handled">
        <Text style={styles.title}>Your details</Text>
        <Text style={styles.hint}>
          Sex and height are only used locally, to turn tape measurements into a body-fat estimate.
        </Text>

        <Field label="Name">
          <TextField value={name} onChangeText={setName} placeholder="Optional" />
        </Field>

        <Field label="Sex">
          <ChipGroup<Sex>
            options={[
              { value: 'male', label: 'Male' },
              { value: 'female', label: 'Female' },
            ]}
            value={sex}
            onChange={setSex}
          />
        </Field>

        <Field label="Age">
          <TextField value={age} onChangeText={setAge} keyboardType="number-pad" placeholder="—" />
        </Field>

        {imperial ? (
          <Field label="Height">
            <Row>
              <View style={styles.half}>
                <TextField
                  value={feet}
                  onChangeText={setFeet}
                  keyboardType="number-pad"
                  placeholder="ft"
                  accessibilityLabel="Height feet"
                />
              </View>
              <View style={styles.half}>
                <TextField
                  value={inches}
                  onChangeText={setInches}
                  keyboardType="number-pad"
                  placeholder="in"
                  accessibilityLabel="Height inches"
                />
              </View>
            </Row>
          </Field>
        ) : (
          <Field label="Height (cm)">
            <TextField
              value={heightCm}
              onChangeText={setHeightCm}
              keyboardType="number-pad"
              placeholder="—"
            />
          </Field>
        )}

        <ShineButton label="Save" onPress={save} />
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
  hint: { color: Colors.dark.textSecondary, fontFamily: Typeface.body, fontSize: 14, lineHeight: 20 },
  half: { flex: 1 },
});
