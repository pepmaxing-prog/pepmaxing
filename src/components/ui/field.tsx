import type { ReactNode } from 'react';
import { StyleSheet, Text, TextInput, View, type TextInputProps } from 'react-native';

import { PressableScale } from '@/components/pressable-scale';
import { Accent, Colors, Spacing, Typeface } from '@/constants/theme';

export function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <View style={styles.field}>
      <Text style={styles.label}>{label}</Text>
      {children}
    </View>
  );
}

export function TextField({ style, ...rest }: TextInputProps) {
  return (
    <TextInput
      placeholderTextColor={Colors.dark.textTertiary}
      style={[styles.input, style]}
      {...rest}
    />
  );
}

export type ChipOption<T extends string | number> = { value: T; label: string };

/** Wrapping single-select chips — used for medication, site, pain and unit pickers. */
export function ChipGroup<T extends string | number>({
  options,
  value,
  onChange,
}: {
  options: ChipOption<T>[];
  /** Null renders the group with nothing selected. */
  value: T | null;
  onChange: (value: T) => void;
}) {
  return (
    <View style={styles.chips}>
      {options.map((option) => {
        const selected = option.value === value;
        return (
          <PressableScale
            key={String(option.value)}
            accessibilityRole="button"
            accessibilityState={{ selected }}
            style={[styles.chip, selected && styles.chipSelected]}
            onPress={() => onChange(option.value)}>
            <Text style={[styles.chipLabel, selected && styles.chipLabelSelected]}>{option.label}</Text>
          </PressableScale>
        );
      })}
    </View>
  );
}

export function Row({ children }: { children: ReactNode }) {
  return <View style={styles.row}>{children}</View>;
}

const styles = StyleSheet.create({
  field: { gap: Spacing.two },
  label: {
    color: Colors.dark.textTertiary,
    fontFamily: Typeface.bodyMedium,
    fontSize: 12,
    letterSpacing: 0.8,
    textTransform: 'uppercase',
  },
  input: {
    backgroundColor: Colors.dark.backgroundElement,
    borderWidth: 1,
    borderColor: Colors.dark.border,
    borderRadius: 14,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.three,
    color: Colors.dark.text,
    fontFamily: Typeface.body,
    fontSize: 16,
  },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.two },
  chip: {
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: Colors.dark.border,
    backgroundColor: Colors.dark.backgroundElement,
  },
  chipSelected: { borderColor: Accent.primary, backgroundColor: Accent.primarySoft },
  chipLabel: { color: Colors.dark.textSecondary, fontFamily: Typeface.bodyMedium, fontSize: 14 },
  chipLabelSelected: { color: Colors.dark.text },
  row: { flexDirection: 'row', gap: Spacing.three },
});
