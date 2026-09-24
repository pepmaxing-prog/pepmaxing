import { useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, Text, TextInput, View } from 'react-native';
import Animated, { FadeIn, FadeInDown } from 'react-native-reanimated';

import { PressableScale } from '@/components/pressable-scale';
import { SettingsPage } from '@/components/settings/settings-ui';
import { ShineButton } from '@/components/shine-button';
import { Accent, Spacing, Typeface } from '@/constants/theme';
import { healthStore, latest, metricById, SCALE_LABELS, toDisplay, toStored, useHealth } from '@/lib/health';
import { useOnboarding } from '@/lib/onboarding-store';
import { toast } from '@/lib/toast';

/** One health metric at a time: a number with its unit, or a 1–5 scale. Saves and returns home. */
export default function LogHealthScreen() {
  const router = useRouter();
  const { metric: metricId } = useLocalSearchParams<{ metric: string }>();
  const { units } = useOnboarding();
  const entries = useHealth();
  const metric = metricById(metricId);
  const previous = metric ? latest(entries, metric.id) : undefined;
  const [text, setText] = useState(() => (metric && previous && metric.kind === 'number' ? String(Number(toDisplay(metric.id, previous.value, units).toFixed(1))) : ''));
  const [scale, setScale] = useState<number | null>(previous && metric?.kind === 'scale' ? previous.value : null);
  const [note, setNote] = useState('');

  if (!metric) {
    return (
      <SettingsPage title="Log health" subtitle="unknown metric.">
        <ShineButton size="compact" label="Back" onPress={() => router.back()} />
      </SettingsPage>
    );
  }

  const unit = metric.unit(units);
  const parsed = Number(text.replace(',', '.'));
  const numberValid = Number.isFinite(parsed) && parsed >= metric.min && parsed <= metric.max;
  const valid = metric.kind === 'scale' ? scale != null : text.trim().length > 0 && numberValid;
  const outOfRange = metric.kind === 'number' && text.trim().length > 0 && Number.isFinite(parsed) && !numberValid;

  const save = () => {
    const value = metric.kind === 'scale' ? scale! : toStored(metric.id, Number(parsed.toFixed(2)), units);
    healthStore.add(metric.id, value, note.trim() || undefined);
    const shown = metric.kind === 'scale' ? `${scale} / 5` : `${Number(parsed.toFixed(1))} ${unit}`;
    router.dismissAll();
    router.navigate('/(tabs)/home');
    toast.show(`Logged ${metric.label.toLowerCase()} · ${shown}`);
  };

  return (
    <SettingsPage title={metric.action} subtitle={metric.hint} footer={<ShineButton label="Save" onPress={save} disabled={!valid} />}>
      <Animated.View entering={FadeIn.duration(320)} style={styles.card}>
        {metric.kind === 'number' ? (
          <>
            <View style={styles.numberRow}>
              <TextInput
                value={text}
                onChangeText={(t) => setText(t.replace(/[^0-9.,]/g, '').slice(0, 6))}
                keyboardType="decimal-pad"
                autoFocus
                selectTextOnFocus
                placeholder="0"
                placeholderTextColor="rgba(242,242,244,0.3)"
                style={styles.numberInput}
                accessibilityLabel={metric.label}
              />
              <Text style={styles.numberUnit}>{unit}</Text>
            </View>
            {outOfRange ? <Text style={styles.error}>Enter a value between {metric.min} and {metric.max} {unit}.</Text> : null}
          </>
        ) : (
          <View style={styles.scale}>
            {SCALE_LABELS.map((label, i) => {
              const v = i + 1;
              const on = scale === v;
              return (
                <PressableScale key={v} onPress={() => setScale(v)} accessibilityRole="radio" accessibilityState={{ selected: on }} accessibilityLabel={`${v}, ${label}`} style={[styles.scaleItem, on && styles.scaleItemOn]}>
                  <Text style={[styles.scaleValue, on && styles.scaleValueOn]}>{v}</Text>
                  <Text style={[styles.scaleLabel, on && styles.scaleLabelOn]}>{label}</Text>
                </PressableScale>
              );
            })}
          </View>
        )}
      </Animated.View>

      {previous ? (
        <Animated.Text entering={FadeInDown.delay(80).duration(320)} style={styles.previous}>
          Last time: {metric.kind === 'scale' ? `${previous.value} / 5` : `${Number(toDisplay(metric.id, previous.value, units).toFixed(1))} ${unit}`} · {relative(previous.at)}
        </Animated.Text>
      ) : null}

      <Animated.View entering={FadeInDown.delay(120).duration(320)} style={styles.noteCard}>
        <Text style={styles.noteLabel}>NOTE</Text>
        <TextInput value={note} onChangeText={setNote} placeholder="Optional context — fasted, after training, new scale…" placeholderTextColor="rgba(242,242,244,0.35)" multiline maxLength={200} style={styles.noteInput} accessibilityLabel="Note" />
      </Animated.View>
    </SettingsPage>
  );
}

function relative(iso: string): string {
  const days = Math.round((Date.now() - new Date(iso).getTime()) / 86_400_000);
  if (days <= 0) return 'today';
  if (days === 1) return 'yesterday';
  if (days < 14) return `${days} days ago`;
  return `${Math.round(days / 7)} weeks ago`;
}

const styles = StyleSheet.create({
  card: { marginTop: Spacing.four, padding: Spacing.four, borderRadius: 24, backgroundColor: 'rgba(255,255,255,0.05)', borderWidth: StyleSheet.hairlineWidth, borderColor: 'rgba(255,255,255,0.1)' },
  numberRow: { flexDirection: 'row', alignItems: 'baseline', justifyContent: 'center', gap: 8 },
  numberInput: { minWidth: 80, textAlign: 'center', color: '#F5F5F7', fontFamily: Typeface.display, fontSize: 56, letterSpacing: -1.6, padding: 0 },
  numberUnit: { color: 'rgba(242,242,244,0.55)', fontFamily: Typeface.bodyMedium, fontSize: 20 },
  error: { marginTop: Spacing.two, textAlign: 'center', color: '#F87171', fontFamily: Typeface.body, fontSize: 12.5 },
  scale: { flexDirection: 'row', gap: Spacing.one },
  scaleItem: { flex: 1, alignItems: 'center', gap: 4, paddingVertical: Spacing.three, borderRadius: 16, backgroundColor: 'rgba(255,255,255,0.05)', borderWidth: StyleSheet.hairlineWidth, borderColor: 'rgba(255,255,255,0.12)' },
  scaleItemOn: { backgroundColor: 'rgba(52,211,153,0.16)', borderColor: 'rgba(52,211,153,0.6)' },
  scaleValue: { color: 'rgba(242,242,244,0.8)', fontFamily: Typeface.display, fontSize: 22, letterSpacing: -0.5 },
  scaleValueOn: { color: Accent.primary },
  scaleLabel: { color: 'rgba(242,242,244,0.45)', fontFamily: Typeface.bodyMedium, fontSize: 10.5 },
  scaleLabelOn: { color: 'rgba(242,242,244,0.85)' },
  previous: { marginTop: Spacing.three, textAlign: 'center', color: 'rgba(242,242,244,0.5)', fontFamily: Typeface.body, fontSize: 13 },
  noteCard: { marginTop: Spacing.four, padding: Spacing.three, borderRadius: 20, backgroundColor: 'rgba(255,255,255,0.05)', borderWidth: StyleSheet.hairlineWidth, borderColor: 'rgba(255,255,255,0.1)', gap: 6 },
  noteLabel: { color: 'rgba(242,242,244,0.45)', fontFamily: Typeface.bodySemiBold, fontSize: 10.5, letterSpacing: 1 },
  noteInput: { minHeight: 40, textAlignVertical: 'top', color: '#F5F5F7', fontFamily: Typeface.body, fontSize: 14.5, lineHeight: 20 },
});
