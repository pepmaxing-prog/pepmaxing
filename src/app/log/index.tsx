import { useRouter } from 'expo-router';
import { SymbolView } from 'expo-symbols';
import { StyleSheet, Text, View } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';

import { Vial } from '@/components/library/vial';
import { PressableScale } from '@/components/pressable-scale';
import { SettingsPage } from '@/components/settings/settings-ui';
import { ShineButton } from '@/components/shine-button';
import { Accent, Spacing, Typeface } from '@/constants/theme';
import { dosesOn, useSchedule } from '@/lib/schedule';

/** "Log a dose" from the "+" menu: today's doses, open ones first. */
export default function LogChooserScreen() {
  const router = useRouter();
  const schedule = useSchedule();
  const today = dosesOn(schedule, new Date());
  const open = today.filter((d) => !d.log);
  const done = today.filter((d) => d.log);

  return (
    <SettingsPage title="Log a dose" subtitle={open.length ? `${open.length} still due today.` : 'everything due today is handled.'}>
      {today.length === 0 ? (
        <View style={styles.empty}>
          <Text style={styles.emptyTitle}>Nothing scheduled today</Text>
          <Text style={styles.emptyText}>Doses appear here on the days your protocols call for them.</Text>
          <ShineButton label="Create a protocol" onPress={() => router.replace('/protocol/new')} style={styles.emptyButton} />
        </View>
      ) : null}
      {open.length ? (
        <>
          <Text style={styles.eyebrow}>DUE</Text>
          <View style={styles.list}>
            {open.map((d, i) => (
              <Animated.View key={d.id} entering={FadeInDown.delay(i * 50).duration(340)}>
                <PressableScale onPress={() => router.push({ pathname: '/log/[id]', params: { id: d.id } })} accessibilityRole="button" accessibilityLabel={`Log ${d.title}, ${d.amount} at ${d.time}`} pressedScale={0.985} style={styles.row}>
                  <Vial color={d.color} size={34} />
                  <View style={styles.text}>
                    <Text style={styles.title} numberOfLines={1}>
                      {d.title}
                    </Text>
                    <Text style={styles.meta} numberOfLines={1}>
                      {d.subtitle ? `${d.subtitle} · ` : ''}
                      {d.amount} · {d.time}
                    </Text>
                  </View>
                  <View style={styles.logPill}>
                    <Text style={styles.logText}>Log</Text>
                  </View>
                </PressableScale>
              </Animated.View>
            ))}
          </View>
        </>
      ) : null}
      {done.length ? (
        <>
          <Text style={styles.eyebrow}>{open.length ? 'ALREADY HANDLED' : 'TODAY'}</Text>
          <View style={styles.list}>
            {done.map((d) => (
              <PressableScale key={d.id} onPress={() => router.push({ pathname: '/log/[id]', params: { id: d.id } })} accessibilityRole="button" accessibilityLabel={`${d.title}, ${d.log?.skipped ? 'skipped' : 'logged'}`} pressedScale={0.985} style={[styles.row, styles.rowDone]}>
                <Vial color={d.color} size={34} />
                <View style={styles.text}>
                  <Text style={[styles.title, styles.titleDone]} numberOfLines={1}>
                    {d.title}
                  </Text>
                  <Text style={styles.meta} numberOfLines={1}>
                    {d.log?.skipped ? 'Skipped' : `Logged · ${d.amount}`}
                  </Text>
                </View>
                <SymbolView name={d.log?.skipped ? 'forward.fill' : 'checkmark.circle.fill'} size={18} weight="semibold" tintColor={d.log?.skipped ? 'rgba(242,242,244,0.4)' : Accent.primary} fallback={null} />
              </PressableScale>
            ))}
          </View>
        </>
      ) : null}
    </SettingsPage>
  );
}

const styles = StyleSheet.create({
  eyebrow: { marginTop: Spacing.four, marginBottom: Spacing.one + Spacing.half, marginLeft: Spacing.one, color: 'rgba(242,242,244,0.45)', fontFamily: Typeface.bodySemiBold, fontSize: 11, letterSpacing: 1.1 },
  list: { gap: Spacing.two },
  row: { flexDirection: 'row', alignItems: 'center', gap: Spacing.two + Spacing.half, padding: Spacing.three, borderRadius: 18, backgroundColor: 'rgba(255,255,255,0.05)', borderWidth: StyleSheet.hairlineWidth, borderColor: 'rgba(255,255,255,0.1)' },
  rowDone: { opacity: 0.7 },
  text: { flex: 1, gap: 2 },
  title: { color: '#F5F5F7', fontFamily: Typeface.bodySemiBold, fontSize: 15, letterSpacing: -0.2 },
  titleDone: { color: 'rgba(242,242,244,0.8)' },
  meta: { color: 'rgba(242,242,244,0.55)', fontFamily: Typeface.body, fontSize: 13 },
  logPill: { height: 32, paddingHorizontal: 14, borderRadius: 16, backgroundColor: Accent.primary, alignItems: 'center', justifyContent: 'center' },
  logText: { color: '#062B1F', fontFamily: Typeface.bodySemiBold, fontSize: 13.5 },
  empty: { marginTop: Spacing.six, alignItems: 'center', gap: Spacing.one },
  emptyTitle: { color: '#F5F5F7', fontFamily: Typeface.bodySemiBold, fontSize: 17, letterSpacing: -0.3 },
  emptyText: { color: 'rgba(242,242,244,0.55)', fontFamily: Typeface.body, fontSize: 14, textAlign: 'center', lineHeight: 20 },
  emptyButton: { alignSelf: 'stretch', marginTop: Spacing.three },
});
