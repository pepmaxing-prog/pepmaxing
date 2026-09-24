import { useLocalSearchParams, useRouter } from 'expo-router';
import { SymbolView } from 'expo-symbols';
import { Alert, StyleSheet, Text, View } from 'react-native';

import { Vial, VialGlow } from '@/components/library/vial';
import { PressableScale } from '@/components/pressable-scale';
import { Row, Section, SettingsPage } from '@/components/settings/settings-ui';
import { ShineButton } from '@/components/shine-button';
import { Accent, Spacing, Typeface } from '@/constants/theme';
import { compoundById, compoundColor } from '@/lib/compounds';
import { describeCycle, describeFrequency, formatDate, formatDose, formatRelative, formatTime, parseDay, scheduleStore, useSchedule } from '@/lib/schedule';
import { toast } from '@/lib/toast';

/** One protocol: what it is, how it runs, its history so far — pause it or delete it. */
export default function ProtocolScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const schedule = useSchedule();
  const protocol = schedule.protocols.find((p) => p.id === id);
  if (!protocol) return <SettingsPage title="Protocol" subtitle="this protocol no longer exists.">{null}</SettingsPage>;

  const now = new Date();
  const doses = schedule.doses.filter((d) => d.protocolId === protocol.id);
  const taken = doses.filter((d) => d.logged).length;
  const skipped = doses.filter((d) => d.log?.skipped).length;
  const next = doses.find((d) => !d.log && new Date(`${d.day}T${d.timeKey}:00`) >= now);
  const paused = !!protocol.pausedAt;
  const colors = protocol.items.flatMap((i) => i.compoundIds).map((cid) => (compoundById(cid) ? compoundColor(compoundById(cid)!) : protocol.color));

  const togglePause = () => {
    scheduleStore.pauseProtocol(protocol.id, !paused);
    toast.show(paused ? `Resumed ${protocol.name}` : `Paused ${protocol.name}`);
  };
  const remove = () =>
    Alert.alert(`Delete ${protocol.name}?`, `Its ${taken} logged dose${taken === 1 ? '' : 's'} go too. This can't be undone.`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: () => {
          scheduleStore.removeProtocol(protocol.id);
          router.back();
          toast.show(`Deleted ${protocol.name}`);
        },
      },
    ]);

  return (
    <SettingsPage title={protocol.name} subtitle={paused ? `paused ${formatRelative(new Date(protocol.pausedAt!), now)}.` : next ? `next dose ${formatRelative(new Date(`${next.day}T${next.timeKey}:00`), now)}.` : 'nothing scheduled.'} footer={<ShineButton label={paused ? 'Resume protocol' : 'Pause protocol'} onPress={togglePause} />}>
      <View style={styles.hero}>
        <View style={styles.heroVial}>
          <VialGlow color={colors[0] ?? protocol.color} colors={colors} size={120} />
          <Vial color={colors[0] ?? protocol.color} colors={protocol.mode === 'blend' ? colors : undefined} size={56} level={0.66} />
        </View>
        <View style={styles.heroText}>
          {protocol.items.map((item) => (
            <View key={item.id} style={styles.itemRow}>
              <Text style={styles.itemName} numberOfLines={1}>
                {item.compoundIds.map((cid) => compoundById(cid)?.name ?? cid).join(' + ')}
              </Text>
              <Text style={styles.itemDose}>
                {formatDose(item)} · {item.administration}
                {item.vialMg && item.bacMl ? ` · ${item.vialMg} mg in ${item.bacMl} mL` : ''}
              </Text>
            </View>
          ))}
          <View style={[styles.status, paused && styles.statusPaused]}>
            <Text style={[styles.statusText, paused && styles.statusTextPaused]}>{paused ? 'Paused' : 'Active'}</Text>
          </View>
        </View>
      </View>

      <Section title="Schedule">
        <Row symbol="repeat" label="Frequency" value={describeFrequency(protocol.frequency)} />
        <Row symbol="clock.fill" label="Reminder time" value={formatTime(protocol.time)} />
        <Row symbol="calendar" label="Started" value={formatDate(parseDay(protocol.startDate))} />
        <Row symbol="arrow.triangle.2.circlepath" label="Cycle" value={describeCycle(protocol.cycle)} last={!protocol.notes} />
        {protocol.notes ? <Row symbol="note.text" label="Notes" caption={protocol.notes} last /> : null}
      </Section>

      <Section title="So far">
        <Row symbol="checkmark.circle.fill" label="Doses taken" value={String(taken)} />
        <Row symbol="forward.fill" label="Skipped" value={String(skipped)} />
        <Row symbol="list.bullet" label="Dose history" onPress={() => router.push('/history')} chevron last />
      </Section>

      <Text style={styles.note}>Changing the dose or schedule: create a new protocol from the same compound and delete this one — editing in place is coming. Pausing keeps your history and stops new doses from being scheduled.</Text>

      <PressableScale onPress={remove} accessibilityRole="button" style={styles.delete}>
        <SymbolView name="trash" size={14} weight="semibold" tintColor="#F87171" fallback={null} />
        <Text style={styles.deleteText}>Delete protocol</Text>
      </PressableScale>
    </SettingsPage>
  );
}

const styles = StyleSheet.create({
  hero: { flexDirection: 'row', alignItems: 'center', gap: Spacing.two, marginTop: Spacing.two },
  heroVial: { width: 120, height: 120, alignItems: 'center', justifyContent: 'center', marginLeft: -Spacing.four },
  heroText: { flex: 1, gap: Spacing.one + Spacing.half },
  itemRow: { gap: 1 },
  itemName: { color: '#F5F5F7', fontFamily: Typeface.bodySemiBold, fontSize: 16, letterSpacing: -0.3 },
  itemDose: { color: 'rgba(242,242,244,0.55)', fontFamily: Typeface.body, fontSize: 12.5 },
  status: { alignSelf: 'flex-start', height: 24, paddingHorizontal: 9, borderRadius: 12, backgroundColor: 'rgba(52,211,153,0.14)', alignItems: 'center', justifyContent: 'center', marginTop: 2 },
  statusPaused: { backgroundColor: 'rgba(251,191,36,0.14)' },
  statusText: { color: Accent.primary, fontFamily: Typeface.bodySemiBold, fontSize: 11.5 },
  statusTextPaused: { color: '#FBBF24' },
  note: { marginTop: Spacing.four, color: 'rgba(242,242,244,0.45)', fontFamily: Typeface.body, fontSize: 12.5, lineHeight: 17 },
  delete: { alignSelf: 'center', flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: Spacing.three, height: 40, paddingHorizontal: Spacing.three },
  deleteText: { color: '#F87171', fontFamily: Typeface.bodySemiBold, fontSize: 14 },
});
