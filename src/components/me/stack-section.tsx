import { useRouter } from 'expo-router';
import { SymbolView } from 'expo-symbols';
import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Animated, { FadeInDown, LinearTransition } from 'react-native-reanimated';

import { Vial } from '@/components/library/vial';
import { PressableScale } from '@/components/pressable-scale';
import { NumberSheet, Sheet } from '@/components/protocol/sheets';
import { ShineButton } from '@/components/shine-button';
import { Accent, Spacing, Typeface } from '@/constants/theme';
import { compoundById, compoundColor } from '@/lib/compounds';
import { compoundSummaries, describeFrequency, formatRelative, formatTime, useSchedule, type Protocol } from '@/lib/schedule';
import { formatMg } from '@/lib/schedule';
import { stockStatus, suggestedCompounds, useVials, vialsStore, type VialStock } from '@/lib/vials';

type Tab = 'protocols' | 'vials';
type Filter = 'all' | 'active' | 'paused';

/** My stack: every protocol with its status and next dose, and the vials on hand with what's left in them. */
export function StackSection() {
  const router = useRouter();
  const schedule = useSchedule();
  const vials = useVials();
  const [tab, setTab] = useState<Tab>('protocols');
  const [filter, setFilter] = useState<Filter>('all');
  const [adding, setAdding] = useState<{ compoundId: string; vialMg: number | null; bacMl: number | null } | 'pick' | null>(null);
  const now = new Date();
  const summaries = compoundSummaries(schedule, now);
  const protocols = schedule.protocols.filter((p) => filter === 'all' || (filter === 'paused' ? !!p.pausedAt : !p.pausedAt));
  const suggestions = suggestedCompounds(schedule, vials);

  return (
    <View style={styles.root}>
      <View style={styles.controls}>
        <View style={styles.segment}>
          {(['protocols', 'vials'] as Tab[]).map((t) => (
            <PressableScale key={t} onPress={() => setTab(t)} accessibilityRole="tab" accessibilityState={{ selected: tab === t }} pressedScale={0.97} style={[styles.segmentItem, tab === t && styles.segmentItemOn]}>
              <Text style={[styles.segmentText, tab === t && styles.segmentTextOn]}>{t === 'protocols' ? `Protocols · ${schedule.protocols.length}` : `Vials · ${vials.length}`}</Text>
            </PressableScale>
          ))}
        </View>
        {tab === 'protocols' && schedule.protocols.some((p) => p.pausedAt) ? (
          <PressableScale onPress={() => setFilter((f) => (f === 'all' ? 'active' : f === 'active' ? 'paused' : 'all'))} accessibilityRole="button" accessibilityLabel={`Filter: ${filter}`} hitSlop={6} style={styles.filter}>
            <SymbolView name="line.3.horizontal.decrease" size={11} weight="semibold" tintColor="rgba(242,242,244,0.7)" fallback={null} />
            <Text style={styles.filterText}>{filter === 'all' ? 'All' : filter === 'active' ? 'Active' : 'Paused'}</Text>
          </PressableScale>
        ) : null}
      </View>

      {tab === 'protocols' ? (
        <Animated.View layout={LinearTransition.duration(220)} style={styles.list}>
          {protocols.length === 0 ? (
            <View style={styles.empty}>
              <Text style={styles.emptyTitle}>{schedule.protocols.length ? 'Nothing here' : 'No protocols yet'}</Text>
              <Text style={styles.emptyText}>{schedule.protocols.length ? 'Change the filter to see the rest.' : 'A protocol is a compound (or a blend) on a schedule. Its doses land on your calendar.'}</Text>
            </View>
          ) : (
            protocols.map((p, i) => <ProtocolCard key={p.id} protocol={p} index={i} next={summaries.filter((s) => p.items.some((it) => it.id === s.key)).map((s) => s.nextDue).filter((d): d is Date => !!d).sort((a, b) => a.getTime() - b.getTime())[0] ?? null} now={now} onPress={() => router.push({ pathname: '/protocol/[id]', params: { id: p.id } })} />)
          )}
          <ShineButton label="Create new protocol" onPress={() => router.push('/protocol/new')} style={styles.cta} />
        </Animated.View>
      ) : (
        <Animated.View layout={LinearTransition.duration(220)} style={styles.list}>
          {suggestions.map((s) => {
            const c = compoundById(s.compoundId)!;
            return (
              <View key={s.compoundId} style={styles.suggestion}>
                <Vial color={compoundColor(c)} size={30} />
                <View style={styles.cardText}>
                  <Text style={styles.cardTitle}>{c.name}</Text>
                  <Text style={styles.cardMeta}>Suggested from {s.protocolName}</Text>
                </View>
                <PressableScale onPress={() => setAdding(s)} accessibilityRole="button" accessibilityLabel={`Add ${c.name} vials`} hitSlop={6} style={styles.addPill}>
                  <SymbolView name="plus" size={11} weight="bold" tintColor="#F5F5F7" fallback={null} />
                  <Text style={styles.addPillText}>Add</Text>
                </PressableScale>
              </View>
            );
          })}
          {vials.length === 0 && suggestions.length === 0 ? (
            <View style={styles.empty}>
              <Text style={styles.emptyTitle}>No vials tracked</Text>
              <Text style={styles.emptyText}>Add what you have on hand and every logged dose is subtracted, so you know when to reorder.</Text>
            </View>
          ) : null}
          {vials.map((v, i) => (
            <VialCard key={v.id} vial={v} index={i} status={stockStatus(v, schedule)} />
          ))}
          <ShineButton label="Add vials" onPress={() => setAdding('pick')} style={styles.cta} />
        </Animated.View>
      )}

      <AddVialSheet open={adding !== null} preset={adding === 'pick' ? null : adding} protocols={schedule.protocols} onClose={() => setAdding(null)} />
    </View>
  );
}

function ProtocolCard({ protocol, index, next, now, onPress }: { protocol: Protocol; index: number; next: Date | null; now: Date; onPress: () => void }) {
  const paused = !!protocol.pausedAt;
  return (
    <Animated.View entering={FadeInDown.delay(index * 40).duration(340)}>
      <PressableScale onPress={onPress} accessibilityRole="button" accessibilityLabel={`${protocol.name}, ${paused ? 'paused' : 'active'}`} pressedScale={0.985} style={styles.card}>
        <View style={styles.cardHead}>
          <Text style={styles.cardTitle} numberOfLines={1}>
            {protocol.name}
          </Text>
          <View style={[styles.status, paused && styles.statusPaused]}>
            <Text style={[styles.statusText, paused && styles.statusTextPaused]}>{paused ? 'Paused' : 'Active'}</Text>
          </View>
        </View>
        <View style={styles.compounds}>
          {protocol.items.flatMap((it) => it.compoundIds).map((id) => {
            const c = compoundById(id);
            return (
              <View key={id} style={styles.compound}>
                <View style={[styles.dot, { backgroundColor: c ? compoundColor(c) : Accent.primary }]} />
                <Text style={styles.compoundText}>{c?.name ?? id}</Text>
              </View>
            );
          })}
        </View>
        <View style={styles.cardFoot}>
          <SymbolView name="clock" size={11} weight="semibold" tintColor="rgba(242,242,244,0.45)" fallback={null} />
          <Text style={styles.cardMeta} numberOfLines={1}>
            {paused ? `Paused ${formatRelative(new Date(protocol.pausedAt!), now)}` : next ? `Next ${formatRelative(next, now)}` : 'Nothing scheduled'} · {describeFrequency(protocol.frequency)} at {formatTime(protocol.time)}
          </Text>
        </View>
      </PressableScale>
    </Animated.View>
  );
}

function VialCard({ vial, index, status }: { vial: VialStock; index: number; status: ReturnType<typeof stockStatus> }) {
  const c = compoundById(vial.compoundId);
  const unit = c && (c.id === 'hcg' || c.id === 'somatropin') ? 'IU' : 'mg';
  const fmt = (v: number) => (unit === 'mg' ? formatMg(v) : `${Number(v.toFixed(0))} IU`);
  const fraction = status.totalMg ? status.remainingMg / status.totalMg : 0;
  const low = status.dosesLeft != null && status.dosesLeft <= 3;
  return (
    <Animated.View entering={FadeInDown.delay(index * 40).duration(340)} style={styles.card}>
      <View style={styles.cardHead}>
        <View style={styles.vialHead}>
          <Vial color={c ? compoundColor(c) : Accent.primary} size={30} level={Math.max(0.08, fraction)} />
          <View style={styles.cardText}>
            <Text style={styles.cardTitle} numberOfLines={1}>
              {c?.name ?? vial.compoundId}
            </Text>
            <Text style={styles.cardMeta}>
              {vial.count} × {vial.vialMg} {unit}
              {vial.bacMl ? ` · ${vial.bacMl} mL water` : ''}
            </Text>
          </View>
        </View>
        <PressableScale onPress={() => vialsStore.remove(vial.id)} accessibilityRole="button" accessibilityLabel="Remove this stock" hitSlop={8} style={styles.trash}>
          <SymbolView name="trash" size={14} weight="medium" tintColor="rgba(242,242,244,0.45)" fallback={null} />
        </PressableScale>
      </View>
      <View style={styles.track}>
        <View style={[styles.trackFill, { width: `${Math.max(2, fraction * 100)}%`, backgroundColor: low ? '#FBBF24' : Accent.primary }]} />
      </View>
      <View style={styles.cardFoot}>
        <Text style={[styles.cardMeta, low && { color: '#FBBF24' }]} numberOfLines={1}>
          ~{fmt(status.remainingMg)} left of {fmt(status.totalMg)}
          {status.dosesLeft != null ? ` · about ${status.dosesLeft} dose${status.dosesLeft === 1 ? '' : 's'}` : ''}
          {low ? ' · reorder soon' : ''}
        </Text>
        <View style={styles.stepper}>
          <PressableScale onPress={() => vialsStore.update(vial.id, { count: Math.max(1, vial.count - 1) })} disabled={vial.count <= 1} accessibilityRole="button" accessibilityLabel="One vial fewer" hitSlop={6} style={[styles.stepButton, vial.count <= 1 && { opacity: 0.35 }]}>
            <SymbolView name="minus" size={11} weight="bold" tintColor="#F5F5F7" fallback={null} />
          </PressableScale>
          <PressableScale onPress={() => vialsStore.update(vial.id, { count: vial.count + 1 })} accessibilityRole="button" accessibilityLabel="One more vial" hitSlop={6} style={styles.stepButton}>
            <SymbolView name="plus" size={11} weight="bold" tintColor="#F5F5F7" fallback={null} />
          </PressableScale>
        </View>
      </View>
    </Animated.View>
  );
}

function AddVialSheet({ open, preset, protocols, onClose }: { open: boolean; preset: { compoundId: string; vialMg: number | null; bacMl: number | null } | null; protocols: Protocol[]; onClose: () => void }) {
  return (
    <Sheet open={open} title="Add vials" hint="What is on hand. Every logged dose is subtracted from it." onClose={onClose}>
      <AddVialBody preset={preset} protocols={protocols} onClose={onClose} />
    </Sheet>
  );
}

function AddVialBody({ preset, protocols, onClose }: { preset: { compoundId: string; vialMg: number | null; bacMl: number | null } | null; protocols: Protocol[]; onClose: () => void }) {
  const options = [...new Set(protocols.flatMap((p) => p.items.filter((i) => i.compoundIds.length === 1 && i.administration === 'injection').map((i) => i.compoundIds[0])))];
  const [compoundId, setCompoundId] = useState<string | null>(preset?.compoundId ?? options[0] ?? null);
  const [vialMg, setVialMg] = useState<number | null>(preset?.vialMg ?? protocols.flatMap((p) => p.items).find((i) => i.compoundIds[0] === compoundId)?.vialMg ?? null);
  const [count, setCount] = useState(1);
  const [editing, setEditing] = useState(false);
  const compound = compoundId ? compoundById(compoundId) : undefined;
  const unit = compound && (compound.id === 'hcg' || compound.id === 'somatropin') ? 'IU' : 'mg';
  const item = protocols.flatMap((p) => p.items).find((i) => i.compoundIds[0] === compoundId);
  const save = () => {
    if (!compoundId || !vialMg) return;
    vialsStore.add({ compoundId, vialMg, count, bacMl: item?.bacMl ?? preset?.bacMl ?? null, openedAt: new Date().toISOString() });
    onClose();
  };
  return (
    <View style={styles.form}>
      {options.length > 1 ? (
        <View style={styles.chips}>
          {options.map((id) => {
            const c = compoundById(id);
            const on = id === compoundId;
            return (
              <PressableScale
                key={id}
                onPress={() => {
                  setCompoundId(id);
                  setVialMg(protocols.flatMap((p) => p.items).find((i) => i.compoundIds[0] === id)?.vialMg ?? null);
                }}
                accessibilityRole="radio"
                accessibilityState={{ selected: on }}
                style={[styles.chip, on && styles.chipOn]}>
                <Text style={[styles.chipText, on && styles.chipTextOn]}>{c?.name ?? id}</Text>
              </PressableScale>
            );
          })}
        </View>
      ) : compound ? (
        <Text style={styles.formTitle}>{compound.name}</Text>
      ) : (
        <Text style={styles.emptyText}>Add an injectable protocol first — vials are tracked per compound.</Text>
      )}
      <PressableScale onPress={() => setEditing(true)} accessibilityRole="button" accessibilityLabel="Amount per vial" pressedScale={0.99} style={styles.formRow}>
        <Text style={styles.formLabel}>Per vial</Text>
        <Text style={[styles.formValue, !vialMg && { color: '#FBBF24' }]}>{vialMg ? `${vialMg} ${unit}` : 'Set amount'}</Text>
      </PressableScale>
      <View style={styles.formRow}>
        <Text style={styles.formLabel}>Vials</Text>
        <View style={styles.stepper}>
          <PressableScale onPress={() => setCount((c) => Math.max(1, c - 1))} disabled={count <= 1} accessibilityRole="button" accessibilityLabel="Fewer" hitSlop={6} style={[styles.stepButton, count <= 1 && { opacity: 0.35 }]}>
            <SymbolView name="minus" size={11} weight="bold" tintColor="#F5F5F7" fallback={null} />
          </PressableScale>
          <Text style={styles.count}>{count}</Text>
          <PressableScale onPress={() => setCount((c) => Math.min(50, c + 1))} accessibilityRole="button" accessibilityLabel="More" hitSlop={6} style={styles.stepButton}>
            <SymbolView name="plus" size={11} weight="bold" tintColor="#F5F5F7" fallback={null} />
          </PressableScale>
        </View>
      </View>
      <ShineButton label={compound ? `Add ${count} × ${compound.name}` : 'Add vials'} onPress={save} disabled={!compoundId || !vialMg} />
      <NumberSheet
        open={editing}
        title="Amount per vial"
        hint="As printed on the label."
        value={vialMg}
        unit={unit}
        presets={unit === 'mg' ? [2, 5, 10, 15] : [5000, 10000]}
        onClose={() => setEditing(false)}
        onDone={(v) => {
          setVialMg(v);
          setEditing(false);
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { gap: Spacing.two },
  controls: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: Spacing.two },
  segment: { flexDirection: 'row', padding: 3, borderRadius: 14, backgroundColor: 'rgba(255,255,255,0.06)', borderWidth: StyleSheet.hairlineWidth, borderColor: 'rgba(255,255,255,0.1)' },
  segmentItem: { height: 34, paddingHorizontal: 14, borderRadius: 11, alignItems: 'center', justifyContent: 'center' },
  segmentItemOn: { backgroundColor: 'rgba(52,211,153,0.16)' },
  segmentText: { color: 'rgba(242,242,244,0.6)', fontFamily: Typeface.bodySemiBold, fontSize: 13 },
  segmentTextOn: { color: Accent.primary },
  filter: { flexDirection: 'row', alignItems: 'center', gap: 5, height: 32, paddingHorizontal: 11, borderRadius: 16, backgroundColor: 'rgba(255,255,255,0.06)' },
  filterText: { color: 'rgba(242,242,244,0.8)', fontFamily: Typeface.bodyMedium, fontSize: 12.5 },
  list: { gap: Spacing.two, marginTop: Spacing.one },
  card: { padding: Spacing.three, borderRadius: 20, backgroundColor: 'rgba(255,255,255,0.05)', borderWidth: StyleSheet.hairlineWidth, borderColor: 'rgba(255,255,255,0.1)', gap: Spacing.two },
  cardHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: Spacing.two },
  cardTitle: { color: '#F5F5F7', fontFamily: Typeface.bodySemiBold, fontSize: 16.5, letterSpacing: -0.3, flexShrink: 1 },
  cardText: { flex: 1, gap: 2 },
  cardMeta: { color: 'rgba(242,242,244,0.5)', fontFamily: Typeface.body, fontSize: 12.5, flexShrink: 1 },
  status: { height: 24, paddingHorizontal: 9, borderRadius: 12, backgroundColor: 'rgba(52,211,153,0.14)', alignItems: 'center', justifyContent: 'center' },
  statusPaused: { backgroundColor: 'rgba(251,191,36,0.14)' },
  statusText: { color: Accent.primary, fontFamily: Typeface.bodySemiBold, fontSize: 11.5 },
  statusTextPaused: { color: '#FBBF24' },
  compounds: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.two },
  compound: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  dot: { width: 7, height: 7, borderRadius: 3.5 },
  compoundText: { color: 'rgba(242,242,244,0.8)', fontFamily: Typeface.bodyMedium, fontSize: 12.5 },
  cardFoot: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  vialHead: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: Spacing.two },
  trash: { width: 32, height: 32, alignItems: 'center', justifyContent: 'center' },
  track: { height: 5, borderRadius: 2.5, backgroundColor: 'rgba(255,255,255,0.1)', overflow: 'hidden' },
  trackFill: { height: '100%', borderRadius: 2.5 },
  stepper: { flexDirection: 'row', alignItems: 'center', gap: Spacing.one, marginLeft: 'auto' },
  stepButton: { width: 28, height: 28, borderRadius: 14, backgroundColor: 'rgba(255,255,255,0.1)', alignItems: 'center', justifyContent: 'center' },
  count: { minWidth: 22, textAlign: 'center', color: '#F5F5F7', fontFamily: Typeface.bodySemiBold, fontSize: 14, fontVariant: ['tabular-nums'] },
  suggestion: { flexDirection: 'row', alignItems: 'center', gap: Spacing.two, padding: Spacing.three, borderRadius: 20, borderWidth: 1.5, borderStyle: 'dashed', borderColor: 'rgba(255,255,255,0.18)' },
  addPill: { flexDirection: 'row', alignItems: 'center', gap: 4, height: 30, paddingHorizontal: 11, borderRadius: 15, backgroundColor: 'rgba(255,255,255,0.1)' },
  addPillText: { color: '#F5F5F7', fontFamily: Typeface.bodySemiBold, fontSize: 12.5 },
  empty: { alignItems: 'center', gap: 6, paddingVertical: Spacing.five, paddingHorizontal: Spacing.three },
  emptyTitle: { color: '#F5F5F7', fontFamily: Typeface.bodySemiBold, fontSize: 16, letterSpacing: -0.3 },
  emptyText: { color: 'rgba(242,242,244,0.55)', fontFamily: Typeface.body, fontSize: 13.5, lineHeight: 19, textAlign: 'center' },
  cta: { marginTop: Spacing.one },
  form: { gap: Spacing.two },
  formTitle: { color: '#F5F5F7', fontFamily: Typeface.bodySemiBold, fontSize: 16 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.one },
  chip: { height: 32, paddingHorizontal: 12, borderRadius: 16, backgroundColor: 'rgba(255,255,255,0.06)', borderWidth: StyleSheet.hairlineWidth, borderColor: 'rgba(255,255,255,0.14)', alignItems: 'center', justifyContent: 'center' },
  chipOn: { backgroundColor: 'rgba(52,211,153,0.16)', borderColor: 'rgba(52,211,153,0.5)' },
  chipText: { color: 'rgba(242,242,244,0.75)', fontFamily: Typeface.bodyMedium, fontSize: 13 },
  chipTextOn: { color: Accent.primary },
  formRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', minHeight: 50, paddingHorizontal: Spacing.three, borderRadius: 14, backgroundColor: 'rgba(255,255,255,0.05)', borderWidth: StyleSheet.hairlineWidth, borderColor: 'rgba(255,255,255,0.1)' },
  formLabel: { color: 'rgba(242,242,244,0.75)', fontFamily: Typeface.bodyMedium, fontSize: 14.5 },
  formValue: { color: Accent.primary, fontFamily: Typeface.bodySemiBold, fontSize: 14.5 },
});
