import { SymbolView, type SFSymbol } from 'expo-symbols';
import { useState } from 'react';
import { StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import Animated, { FadeIn, FadeInDown, LinearTransition } from 'react-native-reanimated';

import { Syringe } from '@/components/onboarding/syringe';
import { PressableScale } from '@/components/pressable-scale';
import { NumberSheet, OptionSheet } from '@/components/protocol/sheets';
import { SettingsPage } from '@/components/settings/settings-ui';
import { Brand } from '@/constants/brand';
import { Accent, AppGutter, Spacing, Typeface } from '@/constants/theme';
import { drawUnits, toMg, type DoseUnit } from '@/lib/schedule';

type SyringeSize = '0.3' | '0.5' | '1';
const SYRINGES: { id: SyringeSize; label: string; caption: string; units: number }[] = [
  { id: '0.3', label: '0.3 mL', caption: '30 units — finest markings, small doses', units: 30 },
  { id: '0.5', label: '0.5 mL', caption: '50 units — the everyday peptide syringe', units: 50 },
  { id: '1', label: '1 mL', caption: '100 units — larger volumes', units: 100 },
];
type SheetId = 'dose' | 'vial' | 'water' | 'syringe' | null;
const AMBER = '#FBBF24';
const RED = '#F87171';

/**
 * Reconstitution calculator: vial + water → concentration; dose → volume → units on the syringe.
 * The maths is deterministic; the notes say when a result is hard to measure accurately.
 */
export default function CalculatorScreen() {
  const { width } = useWindowDimensions();
  const [dose, setDose] = useState<{ value: number; unit: DoseUnit }>({ value: 250, unit: 'mcg' });
  const [vialMg, setVialMg] = useState(5);
  const [waterMl, setWaterMl] = useState(2);
  const [syringe, setSyringe] = useState<SyringeSize>('0.5');
  const [sheet, setSheet] = useState<SheetId>(null);
  const close = () => setSheet(null);
  const pick = <T,>(set: (v: T) => void) => (v: T) => {
    set(v);
    close();
  };

  const size = SYRINGES.find((s) => s.id === syringe)!;
  const doseMg = toMg(dose.value, dose.unit);
  const result = doseMg != null ? drawUnits(doseMg, vialMg, waterMl) : null;
  const units = result?.units ?? 0;
  const over = result ? result.units > size.units : false;
  const tiny = result ? result.units > 0 && result.units < 5 : false;
  const tone = over ? 'bad' : 'good';
  const syringeWidth = Math.min(width - AppGutter * 2 - Spacing.three * 2, 360);

  const note = over
    ? `${fmt(units)} units is more than this ${size.label} syringe holds. Use a bigger syringe or less water in the vial.`
    : tiny
      ? `${fmt(units)} units is a very small draw — hard to measure precisely. Reconstituting with less water gives a longer, easier pull.`
      : result
        ? `${vialMg} mg in ${waterMl} mL makes ${fmt(result.mgPerMl)} mg/mL. ${fmtDose(dose)} is ${result.ml.toFixed(2)} mL, which is ${fmt(units)} units on a U-100 syringe.`
        : 'Enter the dose in mg or mcg to calculate the draw.';

  return (
    <SettingsPage title="Calculator" subtitle="reconstitution dose.">
      <Animated.View entering={FadeIn.duration(320)} style={styles.stage}>
        <Syringe width={syringeWidth} units={units} tone={tone} maxUnits={size.units} guideUnits={over ? size.units : undefined} />
        <Text style={styles.drawLabel}>draw to</Text>
        <Animated.Text layout={LinearTransition.duration(200)} style={[styles.drawValue, over && styles.drawValueBad]}>
          {fmt(units)}
          <Text style={styles.drawUnit}> units</Text>
        </Animated.Text>
        <View style={styles.facts}>
          <Fact label="CONC." value={result ? `${fmt(result.mgPerMl)} mg/mL` : '—'} />
          <View style={styles.factDivider} />
          <Fact label="VOL." value={result ? `${result.ml.toFixed(2)} mL` : '—'} />
          <View style={styles.factDivider} />
          <Fact label="SYRINGE" value={size.label} />
        </View>
      </Animated.View>

      <Animated.View entering={FadeInDown.delay(80).duration(380)} style={styles.rows}>
        <Row symbol="scalemass.fill" label="Desired dose" value={fmtDose(dose)} onPress={() => setSheet('dose')} />
        <Row symbol="testtube.2" label="Vial amount" value={`${vialMg} mg`} onPress={() => setSheet('vial')} />
        <Row symbol="drop.fill" label="Bacteriostatic water" value={`${waterMl} mL`} onPress={() => setSheet('water')} />
        <Row symbol="syringe.fill" label="Syringe size" value={size.label} onPress={() => setSheet('syringe')} last />
      </Animated.View>

      <Animated.View entering={FadeInDown.delay(140).duration(380)} layout={LinearTransition.duration(220)} style={[styles.note, over && styles.noteBad, tiny && styles.noteWarn]}>
        <SymbolView name={over ? 'exclamationmark.triangle.fill' : tiny ? 'eye.trianglebadge.exclamationmark' : 'checkmark.seal.fill'} size={16} weight="semibold" tintColor={over ? RED : tiny ? AMBER : Accent.primary} fallback={null} />
        <Text style={styles.noteText}>{note}</Text>
      </Animated.View>

      <Text style={styles.disclaimer}>Arithmetic only. {Brand.name} does not recommend doses — confirm every number with your prescriber or pharmacist.</Text>

      <NumberSheet open={sheet === 'dose'} title="Desired dose" hint="Per injection." value={dose.value} unit={dose.unit} units={['mcg', 'mg']} presets={dose.unit === 'mg' ? [0.25, 0.5, 1, 2.5] : [100, 250, 500, 1000]} onClose={close} onDone={(v, u) => pick(setDose)({ value: v, unit: u as DoseUnit })} />
      <NumberSheet open={sheet === 'vial'} title="Vial amount" hint="Total peptide in the vial, as printed on the label." value={vialMg} unit="mg" presets={[2, 5, 10, 15]} onClose={close} onDone={pick(setVialMg)} />
      <NumberSheet open={sheet === 'water'} title="Bacteriostatic water" hint="How much you add to the vial. Less water means a shorter draw for the same dose." value={waterMl} unit="mL" presets={[1, 2, 3, 5]} onClose={close} onDone={pick(setWaterMl)} />
      <OptionSheet<SyringeSize> open={sheet === 'syringe'} title="Syringe size" hint="All U-100: one unit is 0.01 mL." options={SYRINGES} value={syringe} onClose={close} onSelect={pick(setSyringe)} />
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

function Row({ symbol, label, value, onPress, last }: { symbol: SFSymbol; label: string; value: string; onPress: () => void; last?: boolean }) {
  return (
    <PressableScale onPress={onPress} accessibilityRole="button" accessibilityLabel={`${label}, ${value}`} pressedScale={0.99} style={[styles.row, !last && styles.divider]}>
      <View style={styles.rowIcon}>
        <SymbolView name={symbol} size={14} weight="semibold" tintColor={Accent.primary} fallback={null} />
      </View>
      <Text style={styles.rowLabel}>{label}</Text>
      <View style={styles.rowValuePill}>
        <Text style={styles.rowValue}>{value}</Text>
        <SymbolView name="pencil" size={10} weight="semibold" tintColor={Accent.primary} fallback={null} />
      </View>
    </PressableScale>
  );
}

const fmt = (n: number) => (Number.isInteger(n) ? String(n) : String(Number(n.toFixed(n < 10 ? 2 : 1))));
const fmtDose = (d: { value: number; unit: DoseUnit }) => `${fmt(d.value)} ${d.unit}`;

const styles = StyleSheet.create({
  stage: { marginTop: Spacing.three, padding: Spacing.three, paddingBottom: Spacing.four, borderRadius: 24, backgroundColor: 'rgba(255,255,255,0.04)', borderWidth: StyleSheet.hairlineWidth, borderColor: 'rgba(255,255,255,0.1)', alignItems: 'center', gap: 2 },
  drawLabel: { marginTop: Spacing.two, color: 'rgba(242,242,244,0.5)', fontFamily: Typeface.body, fontSize: 13 },
  drawValue: { color: '#F5F5F7', fontFamily: Typeface.display, fontSize: 44, letterSpacing: -1.4, fontVariant: ['tabular-nums'] },
  drawValueBad: { color: RED },
  drawUnit: { color: 'rgba(242,242,244,0.6)', fontFamily: Typeface.bodyMedium, fontSize: 18, letterSpacing: 0 },
  facts: { marginTop: Spacing.three, flexDirection: 'row', alignItems: 'center', gap: Spacing.three },
  fact: { alignItems: 'center', gap: 2 },
  factLabel: { color: 'rgba(242,242,244,0.45)', fontFamily: Typeface.bodySemiBold, fontSize: 10, letterSpacing: 1 },
  factValue: { color: '#F2F2F4', fontFamily: Typeface.bodySemiBold, fontSize: 14.5, fontVariant: ['tabular-nums'] },
  factDivider: { width: StyleSheet.hairlineWidth, height: 26, backgroundColor: 'rgba(255,255,255,0.15)' },
  rows: { marginTop: Spacing.four, borderRadius: 20, backgroundColor: 'rgba(255,255,255,0.05)', borderWidth: StyleSheet.hairlineWidth, borderColor: 'rgba(255,255,255,0.1)', overflow: 'hidden' },
  row: { flexDirection: 'row', alignItems: 'center', gap: Spacing.two + Spacing.half, paddingHorizontal: Spacing.three, minHeight: 56 },
  divider: { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: 'rgba(255,255,255,0.08)' },
  rowIcon: { width: 28, height: 28, borderRadius: 8, backgroundColor: 'rgba(52,211,153,0.12)', alignItems: 'center', justifyContent: 'center' },
  rowLabel: { flex: 1, color: '#F2F2F4', fontFamily: Typeface.bodyMedium, fontSize: 15, letterSpacing: -0.2 },
  rowValuePill: { flexDirection: 'row', alignItems: 'center', gap: 6, height: 32, paddingHorizontal: 12, borderRadius: 16, backgroundColor: 'rgba(52,211,153,0.12)' },
  rowValue: { color: Accent.primary, fontFamily: Typeface.bodySemiBold, fontSize: 14, fontVariant: ['tabular-nums'] },
  note: { marginTop: Spacing.three, flexDirection: 'row', gap: Spacing.two, alignItems: 'flex-start', padding: Spacing.three, borderRadius: 18, backgroundColor: 'rgba(52,211,153,0.07)', borderWidth: StyleSheet.hairlineWidth, borderColor: 'rgba(52,211,153,0.25)' },
  noteWarn: { backgroundColor: 'rgba(251,191,36,0.08)', borderColor: 'rgba(251,191,36,0.3)' },
  noteBad: { backgroundColor: 'rgba(248,113,113,0.08)', borderColor: 'rgba(248,113,113,0.3)' },
  noteText: { flex: 1, color: 'rgba(242,242,244,0.75)', fontFamily: Typeface.body, fontSize: 13, lineHeight: 18 },
  disclaimer: { marginTop: Spacing.four, textAlign: 'center', color: 'rgba(242,242,244,0.4)', fontFamily: Typeface.body, fontSize: 11.5, lineHeight: 16 },
});
