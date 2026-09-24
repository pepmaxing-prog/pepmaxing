import { useRouter } from 'expo-router';
import { SymbolView, type SFSymbol } from 'expo-symbols';
import { useCallback, useEffect, useState } from 'react';
import { Alert, ScrollView, StyleSheet, Text, TextInput, useWindowDimensions, View } from 'react-native';
import Animated, { Easing, FadeIn, FadeInDown, useAnimatedStyle, useReducedMotion, useSharedValue, withDelay, withSpring, withTiming } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Vial } from '@/components/library/vial';
import { ParticleField } from '@/components/onboarding/particle-field';
import { PressableScale } from '@/components/pressable-scale';
import { CycleSheet, DateSheet, FrequencySheet, TimeSheet } from '@/components/protocol/sheets';
import { PageHeader } from '@/components/settings/settings-ui';
import { ShineButton } from '@/components/shine-button';
import { StageBackground } from '@/components/stage/stage-background';
import { Brand } from '@/constants/brand';
import { Accent, AppGutter, Spacing, Typeface } from '@/constants/theme';
import { compoundById, compoundColor, type Compound } from '@/lib/compounds';
import { peptideById } from '@/lib/peptides';
import { draftComplete, draftStore, toProtocol, useDraft } from '@/lib/protocol-draft';
import { dayKey, describeCycle, describeFrequency, formatDate, formatDose, formatTime, joinNames, parseDay, scheduleStore, useSchedule, type ProtocolItem } from '@/lib/schedule';
import { toast } from '@/lib/toast';

type SheetId = 'frequency' | 'time' | 'date' | 'cycle' | null;

/**
 * The protocol form: one card per compound (dose badge, tap to edit), then name, frequency,
 * reminder time, start date, cycle and notes for the whole protocol. Create puts every dose on
 * the calendar.
 */
export default function ProtocolScheduleScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { width, height } = useWindowDimensions();
  const draft = useDraft();
  const schedule = useSchedule();
  const [sheet, setSheet] = useState<SheetId>(null);
  const [created, setCreated] = useState<string | null>(null);

  const compounds = draft.compoundIds.map((id) => compoundById(id)).filter((x): x is Compound => !!x);
  const complete = draftComplete(draft);
  const missing = draft.items.filter((i) => i.dose == null).length;
  const prescription = compounds.some((c) => c.kind === 'brand' || c.kind === 'hormone' || (c.peptideId && peptideById(c.peptideId)?.status === 'approved'));

  const create = () => {
    if (!complete) return;
    const overlap = compounds.filter((c) => schedule.protocols.some((p) => p.items.some((i) => i.compoundIds.includes(c.id))));
    const go = () => {
      const protocol = toProtocol(draft);
      scheduleStore.addProtocol(protocol);
      setCreated(protocol.name);
    };
    if (overlap.length) {
      Alert.alert(`Already tracking ${joinNames(overlap.map((c) => c.name))}`, 'You have a protocol with this compound. Create another one anyway?', [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Create anyway', onPress: go },
      ]);
    } else go();
  };

  const close = () => setSheet(null);
  const apply = (patch: Parameters<typeof draftStore.update>[0]) => {
    draftStore.update(patch);
    setSheet(null);
  };

  const finish = useCallback(() => {
    draftStore.reset();
    router.dismissAll();
    router.navigate('/(tabs)/home');
    if (created) toast.show(`Created ${created}`);
  }, [router, created]);

  return (
    <View style={styles.root}>
      <StageBackground width={width} height={height} center={{ x: width / 2, y: height * 0.15 }} />
      <PageHeader title="New protocol" right={<Text style={styles.step}>Step {draft.compoundIds.length > 1 ? 3 : 2}</Text>} />
      <ScrollView keyboardShouldPersistTaps="handled" keyboardDismissMode="on-drag" showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 150 + Math.max(insets.bottom, Spacing.three) }}>
        <Animated.View entering={FadeIn.duration(320)} style={styles.titleBlock}>
          <Text style={styles.title} accessibilityRole="header">
            Set the schedule
          </Text>
          <Text style={styles.subtitle}>dose, timing and start.</Text>
        </Animated.View>

        <Animated.View entering={FadeInDown.delay(60).duration(380)}>
          <View style={styles.eyebrowRow}>
            <Text style={styles.eyebrow}>{draft.mode === 'blend' ? 'BLEND' : draft.items.length === 1 ? 'COMPOUND' : 'COMPOUNDS'}</Text>
            {missing ? <Text style={styles.eyebrowWarn}>{missing === 1 ? 'Tap a card to set its dose' : `${missing} doses to set`}</Text> : <Text style={styles.eyebrowMeta}>Tap a card to edit</Text>}
          </View>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.cards} keyboardShouldPersistTaps="handled">
            {draft.items.map((item) => (
              <CompoundCard key={item.id} item={item} blend={draft.mode === 'blend'} name={draft.mode === 'blend' ? draft.name : undefined} removable={draft.mode === 'separate' && draft.items.length > 1} onPress={() => router.push({ pathname: '/protocol/compound/[id]', params: { id: item.id } })} onRemove={() => draftStore.removeCompound(item.compoundIds[0])} />
            ))}
            <PressableScale onPress={() => router.push({ pathname: '/protocol/new', params: { add: '1' } })} accessibilityRole="button" accessibilityLabel="Add a compound" style={styles.addCard}>
              <View style={styles.addDisc}>
                <SymbolView name="plus" size={16} weight="bold" tintColor={Accent.primary} fallback={<Text style={styles.addPlus}>+</Text>} />
              </View>
              <Text style={styles.addText}>Add{'\n'}compound</Text>
            </PressableScale>
          </ScrollView>
        </Animated.View>

        <Animated.View entering={FadeInDown.delay(120).duration(380)} style={styles.section}>
          <Text style={styles.eyebrow}>PROTOCOL</Text>
          <View style={styles.card}>
            <View style={[styles.row, styles.divider]}>
              <RowIcon symbol="textformat" />
              <Text style={styles.rowLabel}>Name</Text>
              <TextInput
                value={draft.name}
                onChangeText={(name) => draftStore.update({ name })}
                placeholder="My protocol"
                placeholderTextColor="rgba(242,242,244,0.35)"
                maxLength={40}
                returnKeyType="done"
                selectTextOnFocus
                accessibilityLabel="Protocol name"
                style={styles.nameInput}
              />
            </View>
            <Row symbol="repeat" label="Frequency" value={describeFrequency(draft.frequency)} onPress={() => setSheet('frequency')} />
            <Row symbol="bell.fill" label="Reminder time" value={formatTime(draft.time)} onPress={() => setSheet('time')} />
            <Row symbol="calendar" label="Start date" value={draft.startDate === dayKey(new Date()) ? 'Today' : formatDate(parseDay(draft.startDate))} onPress={() => setSheet('date')} />
            <Row symbol="arrow.2.circlepath" label="Cycle" value={describeCycle(draft.cycle)} onPress={() => setSheet('cycle')} last />
          </View>
        </Animated.View>

        <Animated.View entering={FadeInDown.delay(180).duration(380)} style={styles.section}>
          <Text style={styles.eyebrow}>NOTES</Text>
          <View style={[styles.card, styles.notesCard]}>
            <TextInput
              value={draft.notes}
              onChangeText={(notes) => draftStore.update({ notes })}
              placeholder="Anything to remember — source, lot number, how you feel on it."
              placeholderTextColor="rgba(242,242,244,0.35)"
              multiline
              maxLength={600}
              accessibilityLabel="Notes"
              style={styles.notes}
            />
          </View>
        </Animated.View>
      </ScrollView>

      <View style={[styles.footer, { paddingBottom: Math.max(insets.bottom, Spacing.three) }]}>
        <ShineButton label={complete ? 'Create protocol' : missing ? (missing === 1 ? 'Set the dose to continue' : 'Set every dose to continue') : 'Name it to continue'} onPress={create} disabled={!complete} shineDelay={1400} />
        <Text style={styles.disclaimer}>
          {prescription ? 'Prescription medicines need a prescriber. Dosing and monitoring must be directed by a licensed clinician.' : `${Brand.name} tracks what you decide with your clinician. It is not medical advice.`}
        </Text>
      </View>

      <FrequencySheet open={sheet === 'frequency'} value={draft.frequency} onClose={close} onDone={(frequency) => apply({ frequency })} />
      <TimeSheet open={sheet === 'time'} value={draft.time} onClose={close} onDone={(time) => apply({ time })} />
      <DateSheet open={sheet === 'date'} value={draft.startDate} onClose={close} onDone={(date) => apply({ startDate: dayKey(date) })} />
      <CycleSheet open={sheet === 'cycle'} value={draft.cycle} onClose={close} onDone={(cycle) => apply({ cycle })} />

      {created ? <Created name={created} onDone={finish} /> : null}
    </View>
  );
}

function CompoundCard({ item, blend, name, removable, onPress, onRemove }: { item: ProtocolItem; blend: boolean; name?: string; removable: boolean; onPress: () => void; onRemove: () => void }) {
  const compounds = item.compoundIds.map((id) => compoundById(id)).filter((x): x is Compound => !!x);
  const colors = compounds.map(compoundColor);
  const title = blend ? name || 'Blend' : compounds[0]?.name ?? '—';
  const missing = item.dose == null;
  return (
    <PressableScale onPress={onPress} accessibilityRole="button" accessibilityLabel={`${title}, ${missing ? 'no dose set' : formatDose(item)}`} pressedScale={0.98} style={[styles.compoundCard, missing && styles.compoundCardMissing]}>
      {removable ? (
        <PressableScale onPress={onRemove} hitSlop={8} accessibilityRole="button" accessibilityLabel={`Remove ${title}`} style={styles.remove}>
          <SymbolView name="xmark" size={9} weight="bold" tintColor="rgba(242,242,244,0.7)" fallback={<Text style={styles.removeGlyph}>×</Text>} />
        </PressableScale>
      ) : null}
      <Vial color={colors[0] ?? Accent.primary} colors={colors} size={48} level={0.66} />
      <Text style={styles.compoundName} numberOfLines={1}>
        {title}
      </Text>
      {blend ? (
        <Text style={styles.compoundSub} numberOfLines={1}>
          {compounds.map((c) => c.name).join(' · ')}
        </Text>
      ) : null}
      <View style={[styles.doseBadge, missing ? styles.doseBadgeMissing : { backgroundColor: `${colors[0] ?? Accent.primary}1F` }]}>
        <Text style={[styles.doseBadgeText, missing ? styles.doseBadgeTextMissing : { color: colors[0] ?? Accent.primary }]}>{missing ? 'Add dose' : formatDose(item)}</Text>
      </View>
      <Text style={styles.compoundMeta} numberOfLines={1}>
        {item.frequency || item.time ? 'Custom schedule' : 'Follows protocol'}
      </Text>
    </PressableScale>
  );
}

function RowIcon({ symbol }: { symbol: SFSymbol }) {
  return (
    <View style={styles.rowIcon}>
      <SymbolView name={symbol} size={14} weight="semibold" tintColor={Accent.primary} fallback={<View style={styles.rowIconFallback} />} />
    </View>
  );
}

function Row({ symbol, label, value, onPress, last }: { symbol: SFSymbol; label: string; value: string; onPress: () => void; last?: boolean }) {
  return (
    <PressableScale onPress={onPress} accessibilityRole="button" accessibilityLabel={`${label}, ${value}`} pressedScale={0.99} style={[styles.row, !last && styles.divider]}>
      <RowIcon symbol={symbol} />
      <Text style={styles.rowLabel}>{label}</Text>
      <Text style={styles.rowValue} numberOfLines={1}>
        {value}
      </Text>
      <SymbolView name="chevron.right" size={12} weight="semibold" tintColor="rgba(242,242,244,0.35)" fallback={null} />
    </PressableScale>
  );
}

const CHECK = 84;
const HOLD_MS = 1500;

/** Full-screen confirmation: confetti burst, spring-in check, the protocol's name, then on to home. */
function Created({ name, onDone }: { name: string; onDone: () => void }) {
  const reducedMotion = useReducedMotion();
  const { width, height } = useWindowDimensions();
  const spread = useSharedValue(0);
  const burst = useSharedValue(0);
  const check = useSharedValue(reducedMotion ? 1 : 0);

  useEffect(() => {
    if (!reducedMotion) {
      check.set(withDelay(80, withSpring(1, { damping: 12, stiffness: 180, mass: 0.6 })));
      burst.set(withDelay(80, withTiming(1, { duration: 1200, easing: Easing.out(Easing.cubic) })));
    }
    const t = setTimeout(onDone, HOLD_MS + 200);
    return () => clearTimeout(t);
  }, [reducedMotion, check, burst, onDone]);

  const checkStyle = useAnimatedStyle(() => ({ opacity: check.get(), transform: [{ scale: 0.4 + check.get() * 0.6 }] }));
  const fieldHeight = Math.round(height * 0.5);
  return (
    <Animated.View entering={FadeIn.duration(220)} style={styles.createdRoot} accessibilityViewIsModal accessibilityLiveRegion="polite">
      <View style={{ width, height: fieldHeight }}>
        <ParticleField width={width} height={fieldHeight} spread={spread} burst={burst} />
        <Animated.View style={[styles.createdCheck, { left: width / 2 - CHECK / 2, top: fieldHeight / 2 - CHECK / 2 }, checkStyle]}>
          <SymbolView name="checkmark" size={34} weight="bold" tintColor="#062B1F" fallback={<View style={styles.createdCheckFallback} />} />
        </Animated.View>
      </View>
      <Animated.Text entering={FadeInDown.delay(260).duration(380)} style={styles.createdName}>
        {name}
      </Animated.Text>
      <Animated.Text entering={FadeInDown.delay(340).duration(380)} style={styles.createdText}>
        Protocol created. Every dose is on your calendar.
      </Animated.Text>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: Brand.black },
  step: { color: 'rgba(242,242,244,0.5)', fontFamily: Typeface.bodySemiBold, fontSize: 12.5 },
  titleBlock: { paddingHorizontal: AppGutter, marginTop: Spacing.two },
  title: { color: '#F5F5F7', fontFamily: Typeface.display, fontSize: 30, letterSpacing: -0.9 },
  subtitle: { marginTop: 4, color: 'rgba(242,242,244,0.55)', fontFamily: Typeface.body, fontSize: 14.5, letterSpacing: -0.1 },
  eyebrowRow: { marginTop: Spacing.four, marginBottom: Spacing.two, paddingHorizontal: AppGutter + Spacing.one, flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between' },
  eyebrow: { color: 'rgba(242,242,244,0.45)', fontFamily: Typeface.bodySemiBold, fontSize: 11, letterSpacing: 1.1 },
  eyebrowMeta: { color: 'rgba(242,242,244,0.4)', fontFamily: Typeface.body, fontSize: 12 },
  eyebrowWarn: { color: '#FBBF24', fontFamily: Typeface.bodyMedium, fontSize: 12 },
  cards: { paddingHorizontal: AppGutter, gap: Spacing.two, flexDirection: 'row' },
  compoundCard: { width: 138, padding: Spacing.three, paddingTop: Spacing.three + Spacing.half, borderRadius: 20, backgroundColor: 'rgba(255,255,255,0.05)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)', alignItems: 'center', gap: 6 },
  compoundCardMissing: { borderColor: 'rgba(251,191,36,0.45)' },
  remove: { position: 'absolute', top: 8, right: 8, width: 22, height: 22, borderRadius: 11, backgroundColor: 'rgba(255,255,255,0.1)', alignItems: 'center', justifyContent: 'center' },
  removeGlyph: { color: 'rgba(242,242,244,0.7)', fontSize: 13, lineHeight: 15 },
  compoundName: { marginTop: 4, color: '#F5F5F7', fontFamily: Typeface.bodySemiBold, fontSize: 14.5, letterSpacing: -0.3, textAlign: 'center' },
  compoundSub: { marginTop: -4, color: 'rgba(242,242,244,0.5)', fontFamily: Typeface.body, fontSize: 11.5, textAlign: 'center' },
  doseBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 9 },
  doseBadgeMissing: { backgroundColor: 'rgba(251,191,36,0.14)' },
  doseBadgeText: { fontFamily: Typeface.bodySemiBold, fontSize: 12.5 },
  doseBadgeTextMissing: { color: '#FBBF24' },
  compoundMeta: { color: 'rgba(242,242,244,0.45)', fontFamily: Typeface.body, fontSize: 11.5 },
  section: { marginTop: Spacing.four, paddingHorizontal: AppGutter, gap: Spacing.one + Spacing.half },
  card: { marginTop: Spacing.half, borderRadius: 20, backgroundColor: 'rgba(255,255,255,0.05)', borderWidth: StyleSheet.hairlineWidth, borderColor: 'rgba(255,255,255,0.1)', overflow: 'hidden' },
  row: { flexDirection: 'row', alignItems: 'center', gap: Spacing.two + Spacing.half, paddingHorizontal: Spacing.three, minHeight: 54 },
  divider: { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: 'rgba(255,255,255,0.08)' },
  rowIcon: { width: 28, height: 28, borderRadius: 8, backgroundColor: 'rgba(52,211,153,0.12)', alignItems: 'center', justifyContent: 'center' },
  rowIconFallback: { width: 10, height: 10, borderRadius: 5, backgroundColor: Accent.primary },
  rowLabel: { color: '#F2F2F4', fontFamily: Typeface.bodyMedium, fontSize: 15, letterSpacing: -0.2 },
  rowValue: { flex: 1, textAlign: 'right', color: 'rgba(242,242,244,0.55)', fontFamily: Typeface.body, fontSize: 14 },
  nameInput: { flex: 1, textAlign: 'right', color: '#F5F5F7', fontFamily: Typeface.bodySemiBold, fontSize: 15, paddingVertical: 14 },
  notesCard: { padding: Spacing.three },
  notes: { minHeight: 72, textAlignVertical: 'top', color: '#F5F5F7', fontFamily: Typeface.body, fontSize: 14.5, lineHeight: 20 },
  footer: { position: 'absolute', left: 0, right: 0, bottom: 0, paddingHorizontal: AppGutter, paddingTop: Spacing.four, gap: Spacing.two, experimental_backgroundImage: 'linear-gradient(180deg, rgba(0,0,0,0) 0%, rgba(0,0,0,0.9) 22%, #000 100%)' },
  disclaimer: { textAlign: 'center', color: 'rgba(242,242,244,0.42)', fontFamily: Typeface.body, fontSize: 11.5, lineHeight: 16, paddingHorizontal: Spacing.two },
  addCard: { width: 108, borderRadius: 20, borderWidth: 1.5, borderStyle: 'dashed', borderColor: 'rgba(52,211,153,0.4)', alignItems: 'center', justifyContent: 'center', gap: Spacing.two, padding: Spacing.three },
  addDisc: { width: 36, height: 36, borderRadius: 18, backgroundColor: 'rgba(52,211,153,0.14)', alignItems: 'center', justifyContent: 'center' },
  addPlus: { color: Accent.primary, fontFamily: Typeface.bodyBold, fontSize: 18 },
  addText: { color: Accent.primary, fontFamily: Typeface.bodySemiBold, fontSize: 12.5, textAlign: 'center', lineHeight: 16 },
  createdRoot: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.92)', alignItems: 'center', justifyContent: 'center' },
  createdCheck: { position: 'absolute', width: CHECK, height: CHECK, borderRadius: CHECK / 2, backgroundColor: Accent.primary, alignItems: 'center', justifyContent: 'center' },
  createdCheckFallback: { width: 26, height: 26, borderRadius: 6, backgroundColor: '#062B1F' },
  createdName: { marginTop: -Spacing.six, color: '#F5F5F7', fontFamily: Typeface.display, fontSize: 30, letterSpacing: -0.9, textAlign: 'center' },
  createdText: { marginTop: Spacing.two, color: 'rgba(242,242,244,0.65)', fontFamily: Typeface.body, fontSize: 15, textAlign: 'center', paddingHorizontal: AppGutter },
});
