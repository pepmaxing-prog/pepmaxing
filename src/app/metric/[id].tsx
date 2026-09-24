import { useLocalSearchParams, useRouter } from 'expo-router';
import { SymbolView } from 'expo-symbols';
import { Alert, StyleSheet, Text, useWindowDimensions, View } from 'react-native';

import { Sparkline } from '@/components/me/sparkline';
import { PressableScale } from '@/components/pressable-scale';
import { SettingsPage } from '@/components/settings/settings-ui';
import { ShineButton } from '@/components/shine-button';
import { Accent, AppGutter, Spacing, Typeface } from '@/constants/theme';
import { healthStore, metricById, SCALE_LABELS, toDisplay, useHealth } from '@/lib/health';
import { useOnboarding } from '@/lib/onboarding-store';
import { formatDayTitle, formatTime, formatWhen, timeKeyFromDate } from '@/lib/schedule';

/** One metric: the trend, the numbers that matter, and every entry (swipe-free: tap the bin to delete). */
export default function MetricScreen() {
  const router = useRouter();
  const { width } = useWindowDimensions();
  const { id } = useLocalSearchParams<{ id: string }>();
  const metric = metricById(id);
  const entries = useHealth();
  const { units } = useOnboarding();
  const now = new Date();
  if (!metric) return <SettingsPage title="Metric" subtitle="unknown metric.">{null}</SettingsPage>;

  const mine = entries.filter((e) => e.metric === metric.id).sort((a, b) => a.at.localeCompare(b.at));
  const unit = metric.unit(units);
  const show = (v: number) => (metric.kind === 'scale' ? `${v} · ${SCALE_LABELS[v - 1]}` : `${Number(toDisplay(metric.id, v, units).toFixed(1))} ${unit}`);
  const latest = mine[mine.length - 1];
  const first = mine[0];
  const month = mine.filter((e) => now.getTime() - new Date(e.at).getTime() < 30 * 86_400_000);
  const change = latest && first && mine.length > 1 ? toDisplay(metric.id, latest.value, units) - toDisplay(metric.id, first.value, units) : null;
  const avg = month.length ? month.reduce((s, e) => s + toDisplay(metric.id, e.value, units), 0) / month.length : null;
  const remove = (entryId: string) =>
    Alert.alert('Delete this entry?', undefined, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: () => healthStore.remove(entryId) },
    ]);

  return (
    <SettingsPage title={metric.label} subtitle={latest ? `last logged ${formatWhen(new Date(latest.at), now).toLowerCase()}.` : 'nothing logged yet.'} footer={<ShineButton label={`Log ${metric.label.toLowerCase()}`} onPress={() => router.push({ pathname: '/health/[metric]', params: { metric: metric.id } })} />}>
      <View style={styles.hero}>
        {latest ? (
          <>
            <Text style={styles.heroValue}>{show(latest.value)}</Text>
            <View style={styles.facts}>
              <Fact label={mine.length > 1 ? `CHANGE · ${mine.length} ENTRIES` : 'CHANGE'} value={change != null ? `${change > 0 ? '+' : ''}${change.toFixed(metric.kind === 'scale' ? 0 : 1)}${metric.kind === 'scale' ? '' : ` ${unit}`}` : '—'} />
              <View style={styles.factDivider} />
              <Fact label="30-DAY AVERAGE" value={avg != null ? `${avg.toFixed(1)}${metric.kind === 'scale' ? ' / 5' : ` ${unit}`}` : '—'} />
            </View>
            {mine.length > 1 ? (
              <View style={styles.chart}>
                <Sparkline values={mine.slice(-40).map((e) => e.value)} width={width - AppGutter * 2 - Spacing.three * 2} height={90} color={Accent.primary} />
                <View style={styles.chartAxis}>
                  <Text style={styles.axisText}>{formatDayTitle(new Date(mine[Math.max(0, mine.length - 40)].at))}</Text>
                  <Text style={styles.axisText}>{formatDayTitle(new Date(latest.at))}</Text>
                </View>
              </View>
            ) : (
              <Text style={styles.hint}>A second entry draws the trend.</Text>
            )}
          </>
        ) : (
          <>
            <Text style={styles.heroDash}>—</Text>
            <Text style={styles.hint}>{metric.hint}</Text>
          </>
        )}
      </View>

      {mine.length ? (
        <>
          <Text style={styles.eyebrow}>ENTRIES</Text>
          <View style={styles.list}>
            {[...mine].reverse().map((e, i, arr) => (
              <View key={e.id} style={[styles.row, i < arr.length - 1 && styles.divider]}>
                <View style={styles.rowText}>
                  <Text style={styles.rowValue}>{show(e.value)}</Text>
                  <Text style={styles.rowMeta}>
                    {formatDayTitle(new Date(e.at))} · {formatTime(timeKeyFromDate(new Date(e.at)))}
                    {e.note ? ` · ${e.note}` : ''}
                  </Text>
                </View>
                <PressableScale onPress={() => remove(e.id)} accessibilityRole="button" accessibilityLabel="Delete entry" hitSlop={8} style={styles.trash}>
                  <SymbolView name="trash" size={14} weight="medium" tintColor="rgba(242,242,244,0.45)" fallback={null} />
                </PressableScale>
              </View>
            ))}
          </View>
        </>
      ) : null}
    </SettingsPage>
  );
}

function Fact({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.fact}>
      <Text style={styles.factLabel}>{label}</Text>
      <Text style={styles.factValue}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  hero: { marginTop: Spacing.three, padding: Spacing.three, borderRadius: 22, backgroundColor: 'rgba(255,255,255,0.05)', borderWidth: StyleSheet.hairlineWidth, borderColor: 'rgba(255,255,255,0.1)', gap: Spacing.three },
  heroValue: { color: '#F5F5F7', fontFamily: Typeface.display, fontSize: 36, letterSpacing: -1 },
  heroDash: { color: 'rgba(242,242,244,0.35)', fontFamily: Typeface.display, fontSize: 36 },
  facts: { flexDirection: 'row', alignItems: 'center', gap: Spacing.three },
  fact: { flex: 1, gap: 2 },
  factLabel: { color: 'rgba(242,242,244,0.45)', fontFamily: Typeface.bodySemiBold, fontSize: 10, letterSpacing: 1 },
  factValue: { color: '#F2F2F4', fontFamily: Typeface.bodySemiBold, fontSize: 15, fontVariant: ['tabular-nums'] },
  factDivider: { width: StyleSheet.hairlineWidth, height: 28, backgroundColor: 'rgba(255,255,255,0.15)' },
  chart: { gap: 4 },
  chartAxis: { flexDirection: 'row', justifyContent: 'space-between' },
  axisText: { color: 'rgba(242,242,244,0.45)', fontFamily: Typeface.body, fontSize: 11 },
  hint: { color: 'rgba(242,242,244,0.55)', fontFamily: Typeface.body, fontSize: 13.5, lineHeight: 19 },
  eyebrow: { marginTop: Spacing.four, marginBottom: Spacing.one + Spacing.half, marginLeft: Spacing.one, color: 'rgba(242,242,244,0.45)', fontFamily: Typeface.bodySemiBold, fontSize: 11, letterSpacing: 1.1 },
  list: { borderRadius: 20, backgroundColor: 'rgba(255,255,255,0.05)', borderWidth: StyleSheet.hairlineWidth, borderColor: 'rgba(255,255,255,0.1)', overflow: 'hidden' },
  row: { flexDirection: 'row', alignItems: 'center', gap: Spacing.two, paddingHorizontal: Spacing.three, minHeight: 56, paddingVertical: Spacing.two },
  divider: { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: 'rgba(255,255,255,0.08)' },
  rowText: { flex: 1, gap: 2 },
  rowValue: { color: '#F5F5F7', fontFamily: Typeface.bodySemiBold, fontSize: 15, fontVariant: ['tabular-nums'] },
  rowMeta: { color: 'rgba(242,242,244,0.5)', fontFamily: Typeface.body, fontSize: 12.5 },
  trash: { width: 32, height: 32, alignItems: 'center', justifyContent: 'center' },
});
