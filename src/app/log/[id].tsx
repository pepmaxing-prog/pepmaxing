import { useLocalSearchParams, useRouter } from 'expo-router';
import { SymbolView, type SFSymbol } from 'expo-symbols';
import { useState } from 'react';
import { Alert, ScrollView, StyleSheet, Text, TextInput, useWindowDimensions, View } from 'react-native';
import Animated, { FadeIn, FadeInDown } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Vial, VialGlow } from '@/components/library/vial';
import { PressableScale } from '@/components/pressable-scale';
import { NumberSheet, TimeSheet } from '@/components/protocol/sheets';
import { SiteSheet } from '@/components/protocol/site-sheet';
import { PageHeader } from '@/components/settings/settings-ui';
import { ShineButton } from '@/components/shine-button';
import { StageBackground } from '@/components/stage/stage-background';
import { Brand } from '@/constants/brand';
import { Accent, AppGutter, Spacing, Typeface } from '@/constants/theme';
import { compoundById, compoundColor, type Compound } from '@/lib/compounds';
import { dateFromTimeKey, DOSE_UNITS, formatDayTitle, formatDose, formatTime, parseDay, sameDay, scheduleStore, siteHistory, timeKeyFromDate, useSchedule, type DoseUnit } from '@/lib/schedule';
import { kindFor, siteById, type SiteId } from '@/lib/sites';
import { toast } from '@/lib/toast';

type SheetId = 'dose' | 'site' | 'time' | null;

/**
 * "Log your dose": confirm what was taken, where and when, then record it. Opened from a
 * schedule row or the "+" menu. Re-opening a logged dose lets you correct or remove the entry.
 */
export default function LogDoseScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { width, height } = useWindowDimensions();
  const { id } = useLocalSearchParams<{ id: string }>();
  const schedule = useSchedule();
  const dose = schedule.doses.find((d) => d.id === id);
  const protocol = schedule.protocols.find((p) => p.id === dose?.protocolId);
  const item = protocol?.items.find((i) => i.id === dose?.itemId);
  const existing = dose?.log;

  const [amount, setAmount] = useState<{ dose: number; unit: DoseUnit } | null>(() => (existing?.dose != null ? { dose: existing.dose, unit: existing.unit ?? item?.unit ?? 'mg' } : item?.dose != null ? { dose: item.dose, unit: item.unit } : null));
  const [site, setSite] = useState<SiteId | null>((existing?.site as SiteId | undefined) ?? null);
  const [time, setTime] = useState(() => (existing ? timeKeyFromDate(new Date(existing.at)) : timeKeyFromDate(new Date())));
  const [note, setNote] = useState(existing?.note ?? '');
  const [sheet, setSheet] = useState<SheetId>(null);

  if (!dose || !protocol || !item) {
    return (
      <View style={styles.root}>
        <PageHeader title="Log your dose" close />
        <Text style={styles.missing}>This dose is no longer on the schedule.</Text>
      </View>
    );
  }

  const compounds = item.compoundIds.map((cid) => compoundById(cid)).filter((x): x is Compound => !!x);
  const colors = compounds.map(compoundColor);
  const kind = kindFor(item.administration);
  const day = parseDay(dose.day);
  const today = sameDay(day, new Date());
  const history = siteHistory(schedule).filter((h) => h.administration === item.administration);
  const chosenSite = site ? siteById(site) : null;
  const close = () => setSheet(null);
  const pickAmount = (v: number, unit: string) => {
    setAmount({ dose: v, unit: unit as DoseUnit });
    close();
  };
  const pickTime = (t: string) => {
    setTime(t);
    close();
  };
  const pickSite = (s: SiteId) => {
    setSite(s);
    close();
  };

  const finish = (message: string, undo: () => void) => {
    router.dismissAll();
    router.navigate('/(tabs)/home');
    toast.show(message, { label: 'Undo', onPress: undo });
  };
  const log = () => {
    const at = dateFromTimeKey(time, day);
    scheduleStore.logDose(dose.id, { at, site: site ?? undefined, dose: amount?.dose, unit: amount?.unit, note: note.trim() || undefined });
    finish(`Logged ${dose.title}${chosenSite ? ` · ${chosenSite.short}` : ''}`, () => scheduleStore.unlog(dose.id));
  };
  const skip = () =>
    Alert.alert('Skip this dose?', 'It stays on your record as skipped, so your history is honest and your streak is not broken by a planned miss.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Skip',
        style: 'destructive',
        onPress: () => {
          scheduleStore.skipDose(dose.id, note.trim() || undefined);
          finish(`Skipped ${dose.title}`, () => scheduleStore.unlog(dose.id));
        },
      },
    ]);
  const remove = () =>
    Alert.alert('Remove this log?', 'The dose goes back to being due.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Remove',
        style: 'destructive',
        onPress: () => {
          scheduleStore.unlog(dose.id);
          router.back();
        },
      },
    ]);

  return (
    <View style={styles.root}>
      <StageBackground width={width} height={height} center={{ x: width / 2, y: height * 0.12 }} />
      <PageHeader title={existing ? 'Edit log' : 'Log your dose'} close />
      <ScrollView keyboardShouldPersistTaps="handled" keyboardDismissMode="on-drag" showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: AppGutter, paddingBottom: 170 + Math.max(insets.bottom, Spacing.three) }}>
        <Animated.View entering={FadeIn.duration(320)} style={styles.hero}>
          <View style={styles.heroVial}>
            <VialGlow color={colors[0] ?? Accent.primary} colors={colors} size={120} />
            <Vial color={colors[0] ?? Accent.primary} colors={colors} size={58} level={0.66} />
          </View>
          <View style={styles.heroText}>
            <Text style={styles.heroTitle} numberOfLines={1}>
              {dose.title}
            </Text>
            <Text style={styles.heroSub} numberOfLines={1}>
              {dose.subtitle ?? compounds.map((c) => c.name).join(' · ')}
            </Text>
            <Text style={styles.heroWhen}>
              {today ? 'Today' : formatDayTitle(day)} · due {dose.time}
              {existing?.skipped ? ' · skipped' : ''}
            </Text>
          </View>
        </Animated.View>

        <Animated.View entering={FadeInDown.delay(60).duration(380)} style={styles.cards}>
          <Field symbol="scalemass.fill" label="DOSE" value={amount ? formatDose(amount) : 'Set the amount'} hint={amount && item.dose != null && (amount.dose !== item.dose || amount.unit !== item.unit) ? `Planned ${formatDose(item)}` : undefined} onPress={() => setSheet('dose')} />
          {kind ? <Field symbol="figure.stand" label="SITE" value={chosenSite?.label ?? 'Choose site'} placeholder={!chosenSite} hint={chosenSite ? undefined : 'Rotating sites keeps absorption even'} onPress={() => setSheet('site')} /> : null}
          <Field symbol="clock.fill" label="TIME" value={formatTime(time)} onPress={() => setSheet('time')} />
          <View style={styles.noteCard}>
            <Text style={styles.fieldLabel}>NOTE</Text>
            <TextInput value={note} onChangeText={setNote} placeholder="Optional — how it went, any reaction." placeholderTextColor="rgba(242,242,244,0.35)" multiline maxLength={300} style={styles.noteInput} accessibilityLabel="Note" />
          </View>
        </Animated.View>

        {existing ? (
          <PressableScale onPress={remove} accessibilityRole="button" style={styles.remove}>
            <Text style={styles.removeText}>Remove this log</Text>
          </PressableScale>
        ) : (
          <PressableScale onPress={skip} accessibilityRole="button" style={styles.remove}>
            <Text style={styles.skipText}>Skip this dose</Text>
          </PressableScale>
        )}
      </ScrollView>

      <View style={[styles.footer, { paddingBottom: Math.max(insets.bottom, Spacing.three) }]}>
        <ShineButton label={existing ? 'Update log' : 'Log dose'} icon={<SymbolView name="checkmark" size={17} weight="bold" tintColor={Brand.black} fallback={null} />} onPress={log} disabled={!amount} shineDelay={1200} />
      </View>

      <NumberSheet open={sheet === 'dose'} title="Dose taken" hint="Adjust if it differed from the plan." value={amount?.dose ?? item.dose} unit={amount?.unit ?? item.unit} units={DOSE_UNITS} onClose={close} onDone={pickAmount} />
      <TimeSheet open={sheet === 'time'} value={time} onClose={close} onDone={pickTime} />
      {kind ? <SiteSheet open={sheet === 'site'} kind={kind} value={site} history={history} onClose={close} onDone={pickSite} /> : null}
    </View>
  );
}

function Field({ symbol, label, value, hint, placeholder, onPress }: { symbol: SFSymbol; label: string; value: string; hint?: string; placeholder?: boolean; onPress: () => void }) {
  return (
    <PressableScale onPress={onPress} accessibilityRole="button" accessibilityLabel={`${label.toLowerCase()}, ${value}`} pressedScale={0.985} style={styles.field}>
      <View style={styles.fieldIcon}>
        <SymbolView name={symbol} size={15} weight="semibold" tintColor={Accent.primary} fallback={null} />
      </View>
      <View style={styles.fieldText}>
        <Text style={styles.fieldLabel}>{label}</Text>
        <Text style={[styles.fieldValue, placeholder && styles.fieldPlaceholder]} numberOfLines={1}>
          {value}
        </Text>
        {hint ? <Text style={styles.fieldHint}>{hint}</Text> : null}
      </View>
      <View style={styles.edit}>
        <SymbolView name="pencil" size={11} weight="semibold" tintColor="rgba(242,242,244,0.8)" fallback={null} />
        <Text style={styles.editText}>Edit</Text>
      </View>
    </PressableScale>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: Brand.black },
  missing: { margin: AppGutter, color: 'rgba(242,242,244,0.6)', fontFamily: Typeface.body, fontSize: 15 },
  hero: { flexDirection: 'row', alignItems: 'center', gap: Spacing.two, marginTop: Spacing.one },
  heroVial: { width: 120, height: 120, alignItems: 'center', justifyContent: 'center', marginLeft: -Spacing.four },
  heroText: { flex: 1, gap: 3 },
  heroTitle: { color: '#F5F5F7', fontFamily: Typeface.display, fontSize: 26, letterSpacing: -0.7 },
  heroSub: { color: 'rgba(242,242,244,0.6)', fontFamily: Typeface.bodyMedium, fontSize: 13.5 },
  heroWhen: { color: 'rgba(242,242,244,0.45)', fontFamily: Typeface.body, fontSize: 12.5 },
  cards: { gap: Spacing.two, marginTop: Spacing.two },
  field: { flexDirection: 'row', alignItems: 'center', gap: Spacing.three, padding: Spacing.three, borderRadius: 20, backgroundColor: 'rgba(255,255,255,0.05)', borderWidth: StyleSheet.hairlineWidth, borderColor: 'rgba(255,255,255,0.1)' },
  fieldIcon: { width: 34, height: 34, borderRadius: 10, backgroundColor: 'rgba(52,211,153,0.12)', alignItems: 'center', justifyContent: 'center' },
  fieldText: { flex: 1, gap: 2 },
  fieldLabel: { color: 'rgba(242,242,244,0.45)', fontFamily: Typeface.bodySemiBold, fontSize: 10.5, letterSpacing: 1 },
  fieldValue: { color: '#F5F5F7', fontFamily: Typeface.bodySemiBold, fontSize: 17, letterSpacing: -0.3 },
  fieldPlaceholder: { color: 'rgba(242,242,244,0.55)', fontFamily: Typeface.bodyMedium },
  fieldHint: { color: 'rgba(242,242,244,0.45)', fontFamily: Typeface.body, fontSize: 12 },
  edit: { flexDirection: 'row', alignItems: 'center', gap: 4, height: 30, paddingHorizontal: 11, borderRadius: 15, borderWidth: StyleSheet.hairlineWidth, borderColor: 'rgba(255,255,255,0.25)' },
  editText: { color: 'rgba(242,242,244,0.85)', fontFamily: Typeface.bodySemiBold, fontSize: 12.5 },
  noteCard: { padding: Spacing.three, borderRadius: 20, backgroundColor: 'rgba(255,255,255,0.05)', borderWidth: StyleSheet.hairlineWidth, borderColor: 'rgba(255,255,255,0.1)', gap: 6 },
  noteInput: { minHeight: 44, textAlignVertical: 'top', color: '#F5F5F7', fontFamily: Typeface.body, fontSize: 14.5, lineHeight: 20 },
  remove: { alignSelf: 'center', marginTop: Spacing.four, height: 40, paddingHorizontal: Spacing.three, alignItems: 'center', justifyContent: 'center' },
  removeText: { color: '#F87171', fontFamily: Typeface.bodySemiBold, fontSize: 14 },
  skipText: { color: 'rgba(242,242,244,0.6)', fontFamily: Typeface.bodySemiBold, fontSize: 14 },
  footer: { position: 'absolute', left: 0, right: 0, bottom: 0, paddingHorizontal: AppGutter, paddingTop: Spacing.four, experimental_backgroundImage: 'linear-gradient(180deg, rgba(0,0,0,0) 0%, rgba(0,0,0,0.9) 25%, #000 100%)' },
});
