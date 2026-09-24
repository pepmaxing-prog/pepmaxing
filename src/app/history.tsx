import { useRouter } from 'expo-router';
import { SymbolView } from 'expo-symbols';
import { StyleSheet, Text, View } from 'react-native';

import { PressableScale } from '@/components/pressable-scale';
import { SettingsPage } from '@/components/settings/settings-ui';
import { Accent, Spacing, Typeface } from '@/constants/theme';
import { addDays, dayKey, formatDayTitle, formatTime, loggedCount, parseDay, timeKeyFromDate, useSchedule, type DoseEvent } from '@/lib/schedule';
import { siteById } from '@/lib/sites';

/** Every dose that has been dealt with, newest first, grouped by day. Tap to edit the entry. */
export default function HistoryScreen() {
  const router = useRouter();
  const schedule = useSchedule();
  const today = dayKey(new Date());
  const yesterday = dayKey(addDays(new Date(), -1));
  const handled = schedule.doses.filter((d) => d.log).sort((a, b) => b.log!.at.localeCompare(a.log!.at));
  const groups = new Map<string, DoseEvent[]>();
  for (const d of handled) {
    const day = dayKey(new Date(d.log!.at));
    groups.set(day, [...(groups.get(day) ?? []), d]);
  }
  const count = loggedCount(schedule);
  const skipped = handled.length - count;

  return (
    <SettingsPage title="Dose history" subtitle={handled.length ? `${count} taken${skipped ? ` · ${skipped} skipped` : ''}.` : 'nothing logged yet.'}>
      {handled.length === 0 ? (
        <View style={styles.empty}>
          <Text style={styles.emptyTitle}>No doses logged yet</Text>
          <Text style={styles.emptyText}>Every dose you log — or skip — lands here with its time and site.</Text>
        </View>
      ) : null}
      {[...groups.entries()].map(([day, doses]) => (
        <View key={day}>
          <Text style={styles.eyebrow}>{day === today ? 'TODAY' : day === yesterday ? 'YESTERDAY' : formatDayTitle(parseDay(day)).toUpperCase()}</Text>
          <View style={styles.list}>
            {doses.map((d, i) => {
              const log = d.log!;
              const site = log.site ? siteById(log.site) : null;
              const at = new Date(log.at);
              return (
                <PressableScale
                  key={d.id}
                  onPress={() => router.push({ pathname: '/log/[id]', params: { id: d.id } })}
                  accessibilityRole="button"
                  accessibilityLabel={`${d.title}, ${log.skipped ? 'skipped' : `${d.amount} at ${formatTime(timeKeyFromDate(at))}${site ? `, ${site.label}` : ''}`}`}
                  pressedScale={0.99}
                  style={[styles.row, i < doses.length - 1 && styles.divider]}>
                  <View style={[styles.swatch, { backgroundColor: d.color }, log.skipped && styles.swatchSkipped]} />
                  <View style={styles.text}>
                    <Text style={[styles.title, log.skipped && styles.titleSkipped]} numberOfLines={1}>
                      {d.title}
                    </Text>
                    <Text style={styles.meta} numberOfLines={1}>
                      {log.skipped ? `Skipped · due ${d.time}` : `${log.dose != null && log.unit ? `${log.dose} ${log.unit}` : d.amount} · ${formatTime(timeKeyFromDate(at))}${site ? ` · ${site.short}` : d.administration === 'injection' || d.administration === 'pen' ? ' · no site' : ''}`}
                    </Text>
                    {log.note ? (
                      <Text style={styles.note} numberOfLines={2}>
                        {log.note}
                      </Text>
                    ) : null}
                  </View>
                  <SymbolView name={log.skipped ? 'forward.fill' : 'checkmark.circle.fill'} size={16} weight="semibold" tintColor={log.skipped ? 'rgba(242,242,244,0.35)' : Accent.primary} fallback={null} />
                </PressableScale>
              );
            })}
          </View>
        </View>
      ))}
    </SettingsPage>
  );
}

const styles = StyleSheet.create({
  eyebrow: { marginTop: Spacing.four, marginBottom: Spacing.one + Spacing.half, marginLeft: Spacing.one, color: 'rgba(242,242,244,0.45)', fontFamily: Typeface.bodySemiBold, fontSize: 11, letterSpacing: 1.1 },
  list: { borderRadius: 20, backgroundColor: 'rgba(255,255,255,0.05)', borderWidth: StyleSheet.hairlineWidth, borderColor: 'rgba(255,255,255,0.1)', overflow: 'hidden' },
  row: { flexDirection: 'row', alignItems: 'center', gap: Spacing.two + Spacing.half, paddingHorizontal: Spacing.three, minHeight: 58, paddingVertical: Spacing.two },
  divider: { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: 'rgba(255,255,255,0.08)' },
  swatch: { width: 4, height: 30, borderRadius: 2 },
  swatchSkipped: { opacity: 0.35 },
  text: { flex: 1, gap: 2 },
  title: { color: '#F5F5F7', fontFamily: Typeface.bodySemiBold, fontSize: 15, letterSpacing: -0.2 },
  titleSkipped: { color: 'rgba(242,242,244,0.6)' },
  meta: { color: 'rgba(242,242,244,0.55)', fontFamily: Typeface.body, fontSize: 13 },
  note: { color: 'rgba(242,242,244,0.45)', fontFamily: Typeface.body, fontSize: 12.5, lineHeight: 17 },
  empty: { marginTop: Spacing.six, alignItems: 'center', gap: Spacing.one },
  emptyTitle: { color: '#F5F5F7', fontFamily: Typeface.bodySemiBold, fontSize: 17, letterSpacing: -0.3 },
  emptyText: { color: 'rgba(242,242,244,0.55)', fontFamily: Typeface.body, fontSize: 14, textAlign: 'center', lineHeight: 20, paddingHorizontal: Spacing.three },
});
