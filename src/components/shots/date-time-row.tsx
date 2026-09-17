import DateTimePicker from '@react-native-community/datetimepicker';
import { useState } from 'react';
import { Platform, StyleSheet, Text, View } from 'react-native';

import { PressableScale } from '@/components/pressable-scale';
import { Field } from '@/components/ui/field';
import { Colors, Spacing, Typeface } from '@/constants/theme';
import { formatRelativeDay, fromDateKey, toDateKey, toTimeKey } from '@/lib/dates';

/**
 * Date + time entry. Android opens the pickers as dialogs on tap; iOS keeps them inline
 * so the whole sheet stays a single scroll.
 */
export function DateTimeRow({
  date,
  time,
  onChange,
}: {
  date: string;
  time: string;
  onChange: (next: { date: string; time: string }) => void;
}) {
  const [open, setOpen] = useState<'date' | 'time' | null>(null);
  const [hours, minutes] = time.split(':').map(Number);
  const value = fromDateKey(date);
  value.setHours(hours ?? 0, minutes ?? 0, 0, 0);
  const inline = Platform.OS === 'ios';

  return (
    <View style={styles.root}>
      <View style={styles.half}>
        <Field label="Date">
          {inline ? (
            <DateTimePicker
              value={value}
              mode="date"
              display="compact"
              themeVariant="dark"
              maximumDate={new Date()}
              onChange={(_, picked) => picked && onChange({ date: toDateKey(picked), time })}
            />
          ) : (
            <PressableScale style={styles.button} onPress={() => setOpen('date')} accessibilityRole="button">
              <Text style={styles.buttonLabel}>{formatRelativeDay(date)}</Text>
            </PressableScale>
          )}
        </Field>
      </View>

      <View style={styles.half}>
        <Field label="Time">
          {inline ? (
            <DateTimePicker
              value={value}
              mode="time"
              display="compact"
              themeVariant="dark"
              onChange={(_, picked) => picked && onChange({ date, time: toTimeKey(picked) })}
            />
          ) : (
            <PressableScale style={styles.button} onPress={() => setOpen('time')} accessibilityRole="button">
              <Text style={styles.buttonLabel}>{time}</Text>
            </PressableScale>
          )}
        </Field>
      </View>

      {!inline && open ? (
        <DateTimePicker
          value={value}
          mode={open}
          maximumDate={open === 'date' ? new Date() : undefined}
          onChange={(_, picked) => {
            setOpen(null);
            if (!picked) return;
            onChange(
              open === 'date'
                ? { date: toDateKey(picked), time }
                : { date, time: toTimeKey(picked) },
            );
          }}
        />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flexDirection: 'row', gap: Spacing.three },
  half: { flex: 1 },
  button: {
    backgroundColor: Colors.dark.backgroundElement,
    borderWidth: 1,
    borderColor: Colors.dark.border,
    borderRadius: 14,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.three,
  },
  buttonLabel: { color: Colors.dark.text, fontFamily: Typeface.body, fontSize: 16 },
});
