import { useLocalSearchParams, useRouter } from 'expo-router';
import { SymbolView } from 'expo-symbols';
import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Animated, { FadeIn, FadeInDown, LinearTransition } from 'react-native-reanimated';

import { Vial, VialGlow } from '@/components/library/vial';
import { PressableScale } from '@/components/pressable-scale';
import { FrequencySheet, NumberSheet, OptionSheet, TimeSheet } from '@/components/protocol/sheets';
import { Row, Section, SettingsPage, ToggleRow } from '@/components/settings/settings-ui';
import { ShineButton } from '@/components/shine-button';
import { Accent, Spacing, Typeface } from '@/constants/theme';
import { compoundById, compoundCategoryById, compoundColor, type Compound } from '@/lib/compounds';
import { draftStore, useDraft } from '@/lib/protocol-draft';
import { ADMINISTRATIONS, describeFrequency, DOSE_UNITS, drawUnits, formatDose, formatTime, joinNames, toMg, type Administration } from '@/lib/schedule';

type SheetId = 'dose' | 'administration' | 'vial' | 'bac' | 'frequency' | 'time' | null;

/**
 * Per-compound settings inside a draft protocol: how it is taken, the dose, and — for
 * injections — the vial and water so we can say exactly how many units to draw.
 */
export default function EditCompoundScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const draft = useDraft();
  const item = draft.items.find((i) => i.id === id);
  const [sheet, setSheet] = useState<SheetId>(null);

  if (!item) {
    return (
      <SettingsPage title="Compound" subtitle="this compound is no longer in the protocol.">
        <ShineButton size="compact" label="Back" onPress={() => router.back()} />
      </SettingsPage>
    );
  }

  const compounds = item.compoundIds.map((cid) => compoundById(cid)).filter((x): x is Compound => !!x);
  const colors = compounds.map(compoundColor);
  const blend = item.compoundIds.length > 1;
  const title = blend ? draft.name || 'Blend' : compounds[0]?.name ?? 'Compound';
  const caption = blend ? `Blend of ${joinNames(compounds.map((c) => c.name))}` : compounds[0] ? compoundCategoryById(compounds[0].category).label : '';
  const injection = item.administration === 'injection';
  const doseMg = item.dose != null ? toMg(item.dose, item.unit) : null;
  const draw = injection && doseMg != null && item.vialMg && item.bacMl ? drawUnits(doseMg, item.vialMg, item.bacMl) : null;
  const custom = !!(item.frequency || item.time);
  const update = (patch: Parameters<typeof draftStore.updateItem>[1]) => draftStore.updateItem(item.id, patch);
  const close = () => setSheet(null);
  const apply = (patch: Parameters<typeof draftStore.updateItem>[1]) => {
    update(patch);
    close();
  };
  const removable = draft.mode === 'separate' && draft.items.length > 1;

  return (
    <SettingsPage title={title} footer={<ShineButton label="Done" onPress={() => router.back()} />}>
      <Animated.View entering={FadeIn.duration(320)} style={styles.hero}>
        <View style={styles.heroVial}>
          <VialGlow color={colors[0] ?? Accent.primary} colors={colors} size={150} />
          <Vial color={colors[0] ?? Accent.primary} colors={colors} size={72} level={0.66} />
        </View>
        <Text style={styles.heroCaption}>{caption}</Text>
        <Text style={styles.heroDose}>{item.dose == null ? 'No dose yet' : formatDose(item)}</Text>
      </Animated.View>

      <Section title="How you take it">
        <Row symbol="cross.vial.fill" label="Administration" value={ADMINISTRATIONS.find((a) => a.id === item.administration)?.label ?? '—'} onPress={() => setSheet('administration')} chevron />
        <Row symbol="scalemass.fill" label="Dose" value={item.dose == null ? 'Add dose' : formatDose(item)} onPress={() => setSheet('dose')} chevron last={!injection} />
        {injection ? (
          <>
            <Row symbol="testtube.2" label="Vial amount" value={item.vialMg ? `${item.vialMg} mg` : 'Add'} onPress={() => setSheet('vial')} chevron />
            <Row symbol="drop.fill" label="Bacteriostatic water" value={item.bacMl ? `${item.bacMl} mL` : 'Add'} onPress={() => setSheet('bac')} chevron last />
          </>
        ) : null}
      </Section>

      {injection ? (
        <Animated.View entering={FadeInDown.duration(320)} layout={LinearTransition.duration(220)} style={[styles.draw, draw && styles.drawReady]}>
          <View style={styles.drawIcon}>
            <SymbolView name="syringe.fill" size={18} weight="semibold" tintColor={draw ? Accent.primary : 'rgba(242,242,244,0.5)'} fallback={null} />
          </View>
          <View style={styles.drawText}>
            {draw ? (
              <>
                <Text style={styles.drawTitle}>
                  Draw {formatUnits(draw.units)} units
                  <Text style={styles.drawSub}> · {draw.ml.toFixed(2)} mL</Text>
                </Text>
                <Text style={styles.drawBody}>
                  {item.vialMg} mg in {item.bacMl} mL is {trim(draw.mgPerMl)} mg/mL, so {formatDose(item)} is {formatUnits(draw.units)} units on a U-100 syringe.
                </Text>
                {draw.units > 100 ? <Text style={styles.drawWarn}>That is more than one 1 mL syringe. Double-check the vial or the dose.</Text> : null}
              </>
            ) : (
              <>
                <Text style={styles.drawTitleDim}>Units to draw</Text>
                <Text style={styles.drawBody}>{doseMg == null && item.dose != null ? 'Switch the dose to mg or mcg to calculate the draw.' : 'Add the dose, the vial amount and the water and we will do the syringe maths.'}</Text>
              </>
            )}
          </View>
        </Animated.View>
      ) : null}

      <Section title="Schedule" hint={custom ? undefined : `Follows the protocol: ${describeFrequency(draft.frequency)} at ${formatTime(draft.time)}.`}>
        <ToggleRow
          label="Own schedule"
          caption="Different days or time from the rest of the protocol"
          value={custom}
          onChange={(on) => update(on ? { frequency: draft.frequency, time: draft.time } : { frequency: undefined, time: undefined })}
          last={!custom}
        />
        {custom ? (
          <>
            <Row symbol="repeat" label="Frequency" value={describeFrequency(item.frequency ?? draft.frequency)} onPress={() => setSheet('frequency')} chevron />
            <Row symbol="bell.fill" label="Reminder time" value={formatTime(item.time ?? draft.time)} onPress={() => setSheet('time')} chevron last />
          </>
        ) : null}
      </Section>

      {removable ? (
        <PressableScale
          onPress={() => {
            draftStore.removeCompound(item.compoundIds[0]);
            router.back();
          }}
          accessibilityRole="button"
          style={styles.remove}>
          <Text style={styles.removeText}>Remove from protocol</Text>
        </PressableScale>
      ) : null}

      <NumberSheet open={sheet === 'dose'} title="Dose" hint="Per administration." value={item.dose} unit={item.unit} units={DOSE_UNITS} onClose={close} onDone={(dose, unit) => apply({ dose, unit: unit as typeof item.unit })} />
      <NumberSheet open={sheet === 'vial'} title="Vial amount" hint="Total peptide in the vial, as printed on the label." value={item.vialMg} unit="mg" onClose={close} onDone={(vialMg) => apply({ vialMg })} />
      <NumberSheet open={sheet === 'bac'} title="Bacteriostatic water" hint="How much you added when reconstituting." value={item.bacMl} unit="mL" onClose={close} onDone={(bacMl) => apply({ bacMl })} />
      <OptionSheet<Administration> open={sheet === 'administration'} title="Administration" options={ADMINISTRATIONS} value={item.administration} onClose={close} onSelect={(administration) => apply({ administration })} />
      <FrequencySheet open={sheet === 'frequency'} value={item.frequency ?? draft.frequency} onClose={close} onDone={(frequency) => apply({ frequency })} />
      <TimeSheet open={sheet === 'time'} value={item.time ?? draft.time} onClose={close} onDone={(time) => apply({ time })} />
    </SettingsPage>
  );
}

const formatUnits = (u: number) => (Number.isInteger(u) ? String(u) : u.toFixed(1).replace(/\.0$/, ''));
const trim = (n: number) => String(Number(n.toFixed(3)));

const styles = StyleSheet.create({
  hero: { marginTop: Spacing.three, alignItems: 'center' },
  heroVial: { width: 150, height: 150, alignItems: 'center', justifyContent: 'center' },
  heroCaption: { marginTop: -Spacing.three, color: 'rgba(242,242,244,0.55)', fontFamily: Typeface.bodyMedium, fontSize: 13 },
  heroDose: { marginTop: 4, color: '#F5F5F7', fontFamily: Typeface.display, fontSize: 26, letterSpacing: -0.7 },
  draw: { marginTop: Spacing.three, flexDirection: 'row', gap: Spacing.three, padding: Spacing.three, borderRadius: 20, backgroundColor: 'rgba(255,255,255,0.04)', borderWidth: StyleSheet.hairlineWidth, borderColor: 'rgba(255,255,255,0.1)' },
  drawReady: { backgroundColor: 'rgba(52,211,153,0.08)', borderColor: 'rgba(52,211,153,0.3)' },
  drawIcon: { width: 38, height: 38, borderRadius: 19, backgroundColor: 'rgba(255,255,255,0.06)', alignItems: 'center', justifyContent: 'center' },
  drawText: { flex: 1, gap: 4 },
  drawTitle: { color: '#F5F5F7', fontFamily: Typeface.bodySemiBold, fontSize: 17, letterSpacing: -0.3 },
  drawTitleDim: { color: 'rgba(242,242,244,0.75)', fontFamily: Typeface.bodySemiBold, fontSize: 15, letterSpacing: -0.2 },
  drawSub: { color: 'rgba(242,242,244,0.55)', fontFamily: Typeface.body, fontSize: 14 },
  drawBody: { color: 'rgba(242,242,244,0.6)', fontFamily: Typeface.body, fontSize: 13, lineHeight: 18 },
  drawWarn: { color: '#FBBF24', fontFamily: Typeface.bodyMedium, fontSize: 12.5, lineHeight: 17 },
  remove: { marginTop: Spacing.four, alignSelf: 'center', height: 44, paddingHorizontal: Spacing.four, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
  removeText: { color: '#F87171', fontFamily: Typeface.bodySemiBold, fontSize: 14.5 },
});
