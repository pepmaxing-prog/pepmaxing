import { DatePicker, Host } from '@expo/ui/swift-ui';
import { datePickerStyle } from '@expo/ui/swift-ui/modifiers';
import { SymbolView } from 'expo-symbols';
import { useState, type ReactNode } from 'react';
import { Modal, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import Animated, { useAnimatedStyle } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { PressableScale } from '@/components/pressable-scale';
import { ShineButton } from '@/components/shine-button';
import { Accent, Spacing, Typeface } from '@/constants/theme';
import { useKeyboardHeight } from '@/hooks/use-keyboard-height';
import { dateFromTimeKey, describeFrequency, parseDay, timeKeyFromDate, type Cycle, type DoseUnit, type Frequency } from '@/lib/schedule';

// ---- shell ---------------------------------------------------------------------------------

type SheetProps = { open: boolean; title: string; hint?: string; right?: ReactNode; onClose: () => void; children: ReactNode; footer?: ReactNode; keyboard?: boolean };

/** Bottom card on a dimmed scrim. With `keyboard` it rides up with the keyboard. */
export function Sheet({ open, title, hint, right, onClose, children, footer, keyboard }: SheetProps) {
  const insets = useSafeAreaInsets();
  const keyboardHeight = useKeyboardHeight();
  const lift = useAnimatedStyle(() => ({ transform: [{ translateY: keyboard ? -keyboardHeight.get() : 0 }] }));
  return (
    <Modal visible={open} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.scrim}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} accessibilityRole="button" accessibilityLabel="Close" />
        <Animated.View style={[styles.card, { marginBottom: Math.max(insets.bottom, Spacing.three) + Spacing.two }, lift]} accessibilityViewIsModal>
          <View style={styles.grab} />
          <View style={styles.titleRow}>
            <Text style={styles.title}>{title}</Text>
            {right}
          </View>
          {hint ? <Text style={styles.hint}>{hint}</Text> : null}
          {open ? children : null}
          {open ? footer : null}
        </Animated.View>
      </View>
    </Modal>
  );
}

function Actions({ onCancel, onDone, doneLabel = 'Done', doneDisabled }: { onCancel: () => void; onDone: () => void; doneLabel?: string; doneDisabled?: boolean }) {
  return (
    <View style={styles.actions}>
      <PressableScale onPress={onCancel} accessibilityRole="button" style={styles.cancel}>
        <Text style={styles.cancelText}>Cancel</Text>
      </PressableScale>
      <View style={styles.done}>
        <ShineButton label={doneLabel} onPress={onDone} disabled={doneDisabled} />
      </View>
    </View>
  );
}

// ---- number ---------------------------------------------------------------------------------

type NumberSheetProps = {
  open: boolean;
  title: string;
  hint?: string;
  value: number | null;
  unit: string;
  /** Offer a unit switch. */
  units?: DoseUnit[];
  /** Quick values, tappable, in the current unit. */
  presets?: number[];
  onClose: () => void;
  onDone: (value: number, unit: string) => void;
};

/** Amount entry: big number, unit chips, decimal keypad. Refuses zero and nonsense. */
export function NumberSheet({ open, title, hint, onClose, ...body }: NumberSheetProps) {
  return (
    <Sheet open={open} title={title} hint={hint} onClose={onClose} keyboard>
      <NumberBody {...body} title={title} onClose={onClose} />
    </Sheet>
  );
}

function NumberBody({ title, value, unit, units, presets, onClose, onDone }: Omit<NumberSheetProps, 'open' | 'hint'>) {
  const [text, setText] = useState(value != null ? String(value) : '');
  const [chosenUnit, setChosenUnit] = useState(unit);
  const parsed = Number(text.replace(',', '.'));
  const valid = text.trim().length > 0 && Number.isFinite(parsed) && parsed > 0;
  const touched = text.trim().length > 0;
  return (
    <>
      {presets?.length ? (
        <View style={styles.presets}>
          {presets.map((p) => (
            <PressableScale key={p} onPress={() => setText(String(p))} accessibilityRole="button" accessibilityLabel={`${p} ${chosenUnit}`} style={[styles.preset, parsed === p && styles.presetOn]}>
              <Text style={[styles.presetText, parsed === p && styles.presetTextOn]}>{p}</Text>
            </PressableScale>
          ))}
        </View>
      ) : null}
      <View style={styles.numberRow}>
        <TextInput
          value={text}
          onChangeText={(t) => setText(t.replace(/[^0-9.,]/g, '').slice(0, 8))}
          keyboardType="decimal-pad"
          autoFocus
          selectTextOnFocus
          placeholder="0"
          placeholderTextColor="rgba(242,242,244,0.3)"
          style={styles.numberInput}
          accessibilityLabel={title}
        />
        <Text style={styles.numberUnit}>{chosenUnit}</Text>
      </View>
      {units && units.length > 1 ? (
        <View style={styles.units}>
          {units.map((u) => (
            <PressableScale key={u} onPress={() => setChosenUnit(u)} accessibilityRole="radio" accessibilityState={{ selected: u === chosenUnit }} style={[styles.unitChip, u === chosenUnit && styles.unitChipOn]}>
              <Text style={[styles.unitText, u === chosenUnit && styles.unitTextOn]}>{u}</Text>
            </PressableScale>
          ))}
        </View>
      ) : null}
      {touched && !valid ? <Text style={styles.error}>Enter an amount greater than 0.</Text> : null}
      <Actions onCancel={onClose} onDone={() => valid && onDone(Number(parsed.toFixed(4)), chosenUnit)} doneDisabled={!valid} />
    </>
  );
}

// ---- options -------------------------------------------------------------------------------

export type Option<T extends string> = { id: T; label: string; caption?: string };

export function OptionSheet<T extends string>({ open, title, hint, options, value, onClose, onSelect }: { open: boolean; title: string; hint?: string; options: Option<T>[]; value: T; onClose: () => void; onSelect: (id: T) => void }) {
  return (
    <Sheet open={open} title={title} hint={hint} onClose={onClose}>
      <View style={styles.list}>
        {options.map((o, i) => (
          <OptionRow key={o.id} label={o.label} caption={o.caption} selected={o.id === value} last={i === options.length - 1} onPress={() => onSelect(o.id)} />
        ))}
      </View>
    </Sheet>
  );
}

function OptionRow({ label, caption, selected, last, onPress }: { label: string; caption?: string; selected: boolean; last?: boolean; onPress: () => void }) {
  return (
    <PressableScale onPress={onPress} accessibilityRole="radio" accessibilityState={{ selected }} pressedScale={0.99} style={[styles.optionRow, !last && styles.divider]}>
      <View style={styles.optionText}>
        <Text style={[styles.optionLabel, selected && styles.optionLabelOn]}>{label}</Text>
        {caption ? <Text style={styles.optionCaption}>{caption}</Text> : null}
      </View>
      {selected ? <SymbolView name="checkmark" size={14} weight="bold" tintColor={Accent.primary} fallback={<Text style={{ color: Accent.primary }}>✓</Text>} /> : null}
    </PressableScale>
  );
}

// ---- frequency -----------------------------------------------------------------------------

const DAY_LETTERS = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];
type FreqKind = Frequency['kind'];
const FREQ_OPTIONS: Option<FreqKind>[] = [
  { id: 'daily', label: 'Every day' },
  { id: 'everyOtherDay', label: 'Every other day', caption: 'Counted from the start date' },
  { id: 'weekdays', label: 'Specific days', caption: 'Pick the days of the week' },
  { id: 'weekly', label: 'Once a week' },
  { id: 'everyN', label: 'Every N days' },
  { id: 'fiveTwo', label: '5 days on, 2 off', caption: 'Common for growth-hormone peptides' },
];

type FrequencyProps = { open: boolean; value: Frequency; onClose: () => void; onDone: (f: Frequency) => void };

export function FrequencySheet({ open, ...body }: FrequencyProps) {
  return (
    <Sheet open={open} title="Frequency" onClose={body.onClose}>
      <FrequencyBody {...body} />
    </Sheet>
  );
}

function FrequencyBody({ value, onClose, onDone }: Omit<FrequencyProps, 'open'>) {
  const [draft, setDraft] = useState<Frequency>(value);
  const pick = (kind: FreqKind) => {
    if (kind === 'weekdays') setDraft({ kind, days: draft.kind === 'weekdays' ? draft.days : [1, 3, 5] });
    else if (kind === 'weekly') setDraft({ kind, day: draft.kind === 'weekly' ? draft.day : new Date().getDay() });
    else if (kind === 'everyN') setDraft({ kind, n: draft.kind === 'everyN' ? draft.n : 3 });
    else setDraft({ kind });
  };
  const valid = draft.kind !== 'weekdays' || draft.days.length > 0;
  return (
    <>
      <View style={styles.list}>
        {FREQ_OPTIONS.map((o, i) => (
          <OptionRow key={o.id} label={o.label} caption={o.caption} selected={o.id === draft.kind} last={i === FREQ_OPTIONS.length - 1} onPress={() => pick(o.id)} />
        ))}
      </View>
      {draft.kind === 'weekdays' || draft.kind === 'weekly' ? (
        <View style={styles.days}>
          {DAY_LETTERS.map((letter, day) => {
            const on = draft.kind === 'weekdays' ? draft.days.includes(day) : draft.day === day;
            return (
              <PressableScale
                key={day}
                onPress={() => setDraft(draft.kind === 'weekdays' ? { kind: 'weekdays', days: on ? draft.days.filter((d) => d !== day) : [...draft.days, day] } : { kind: 'weekly', day })}
                accessibilityRole="checkbox"
                accessibilityState={{ checked: on }}
                accessibilityLabel={['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'][day]}
                style={[styles.day, on && styles.dayOn]}>
                <Text style={[styles.dayText, on && styles.dayTextOn]}>{letter}</Text>
              </PressableScale>
            );
          })}
        </View>
      ) : null}
      {draft.kind === 'everyN' ? <Stepper label="Every" value={draft.n} unit={draft.n === 1 ? 'day' : 'days'} min={2} max={30} onChange={(n) => setDraft({ kind: 'everyN', n })} /> : null}
      <Text style={styles.summary}>{valid ? describeFrequency(draft) : 'Pick at least one day.'}</Text>
      <Actions onCancel={onClose} onDone={() => valid && onDone(draft)} doneDisabled={!valid} />
    </>
  );
}

// ---- cycle ---------------------------------------------------------------------------------

type CycleProps = { open: boolean; value: Cycle; onClose: () => void; onDone: (c: Cycle) => void };

export function CycleSheet({ open, ...body }: CycleProps) {
  return (
    <Sheet open={open} title="Cycle" hint="Run for a stretch, then pause. Doses pause automatically in the off weeks." onClose={body.onClose}>
      <CycleBody {...body} />
    </Sheet>
  );
}

function CycleBody({ value, onClose, onDone }: Omit<CycleProps, 'open'>) {
  const [on, setOn] = useState(value?.onWeeks ?? 8);
  const [off, setOff] = useState(value?.offWeeks ?? 4);
  const [cycling, setCycling] = useState(!!value);
  return (
    <>
      <View style={styles.list}>
        <OptionRow label="Continuous" caption="No breaks" selected={!cycling} onPress={() => setCycling(false)} />
        <OptionRow label="On / off cycle" caption={`${on} weeks on, ${off} off`} selected={cycling} last onPress={() => setCycling(true)} />
      </View>
      {cycling ? (
        <View style={styles.steppers}>
          <Stepper label="On" value={on} unit={on === 1 ? 'week' : 'weeks'} min={1} max={52} onChange={setOn} />
          <Stepper label="Off" value={off} unit={off === 1 ? 'week' : 'weeks'} min={1} max={52} onChange={setOff} />
        </View>
      ) : null}
      <Actions onCancel={onClose} onDone={() => onDone(cycling ? { onWeeks: on, offWeeks: off } : null)} />
    </>
  );
}

function Stepper({ label, value, unit, min, max, onChange }: { label: string; value: number; unit: string; min: number; max: number; onChange: (v: number) => void }) {
  return (
    <View style={styles.stepper}>
      <Text style={styles.stepperLabel}>{label}</Text>
      <View style={styles.stepperControls}>
        <PressableScale onPress={() => onChange(Math.max(min, value - 1))} disabled={value <= min} accessibilityRole="button" accessibilityLabel={`Decrease ${label}`} style={[styles.stepButton, value <= min && styles.stepButtonDim]}>
          <SymbolView name="minus" size={13} weight="bold" tintColor="#F5F5F7" fallback={<Text style={styles.stepGlyph}>−</Text>} />
        </PressableScale>
        <Text style={styles.stepperValue}>
          {value} <Text style={styles.stepperUnit}>{unit}</Text>
        </Text>
        <PressableScale onPress={() => onChange(Math.min(max, value + 1))} disabled={value >= max} accessibilityRole="button" accessibilityLabel={`Increase ${label}`} style={[styles.stepButton, value >= max && styles.stepButtonDim]}>
          <SymbolView name="plus" size={13} weight="bold" tintColor="#F5F5F7" fallback={<Text style={styles.stepGlyph}>+</Text>} />
        </PressableScale>
      </View>
    </View>
  );
}

// ---- time & date (native SwiftUI pickers) ----------------------------------------------------

type TimeProps = { open: boolean; value: string; onClose: () => void; onDone: (hhmm: string) => void };

export function TimeSheet({ open, ...body }: TimeProps) {
  return (
    <Sheet open={open} title="Reminder time" hint="When the dose is due each day it is scheduled." onClose={body.onClose}>
      <TimeBody {...body} />
    </Sheet>
  );
}

function TimeBody({ value, onClose, onDone }: Omit<TimeProps, 'open'>) {
  const [date, setDate] = useState(() => dateFromTimeKey(value));
  return (
    <>
      <Host style={styles.timeHost} colorScheme="dark">
        <DatePicker selection={date} displayedComponents={['hourAndMinute']} onDateChange={setDate} modifiers={[datePickerStyle('wheel')]} />
      </Host>
      <Actions onCancel={onClose} onDone={() => onDone(timeKeyFromDate(date))} />
    </>
  );
}

type DateProps = { open: boolean; value: string; onClose: () => void; onDone: (day: Date) => void };

export function DateSheet({ open, ...body }: DateProps) {
  return (
    <Sheet open={open} title="Start date" hint="The first day doses appear on your calendar." onClose={body.onClose}>
      <DateBody {...body} />
    </Sheet>
  );
}

function DateBody({ value, onClose, onDone }: Omit<DateProps, 'open'>) {
  const [date, setDate] = useState(() => parseDay(value));
  return (
    <>
      <Host style={styles.dateHost} colorScheme="dark">
        <DatePicker selection={date} displayedComponents={['date']} onDateChange={setDate} modifiers={[datePickerStyle('graphical')]} />
      </Host>
      <Actions onCancel={onClose} onDone={() => onDone(date)} />
    </>
  );
}

const styles = StyleSheet.create({
  scrim: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.62)' },
  card: { marginHorizontal: Spacing.two, paddingHorizontal: Spacing.four, paddingBottom: Spacing.four, paddingTop: Spacing.two, borderRadius: 28, backgroundColor: '#121614', borderWidth: StyleSheet.hairlineWidth, borderColor: 'rgba(255,255,255,0.14)', gap: Spacing.three },
  grab: { alignSelf: 'center', width: 36, height: 4, borderRadius: 2, backgroundColor: 'rgba(255,255,255,0.22)' },
  titleRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: Spacing.two },
  title: { color: '#F5F5F7', fontFamily: Typeface.display, fontSize: 22, letterSpacing: -0.5, flexShrink: 1 },
  hint: { marginTop: -Spacing.two, color: 'rgba(242,242,244,0.55)', fontFamily: Typeface.body, fontSize: 13.5, lineHeight: 19 },
  actions: { flexDirection: 'row', alignItems: 'center', gap: Spacing.two, marginTop: Spacing.one },
  cancel: { height: 52, paddingHorizontal: Spacing.four, borderRadius: 26, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(255,255,255,0.08)' },
  cancelText: { color: '#F5F5F7', fontFamily: Typeface.bodySemiBold, fontSize: 15 },
  done: { flex: 1 },
  numberRow: { flexDirection: 'row', alignItems: 'baseline', justifyContent: 'center', gap: 8, paddingVertical: Spacing.two },
  numberInput: { minWidth: 60, textAlign: 'center', color: '#F5F5F7', fontFamily: Typeface.display, fontSize: 52, letterSpacing: -1.5, padding: 0 },
  numberUnit: { color: 'rgba(242,242,244,0.55)', fontFamily: Typeface.bodyMedium, fontSize: 20 },
  units: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: Spacing.one },
  presets: { flexDirection: 'row', justifyContent: 'center', gap: Spacing.one },
  preset: { minWidth: 56, height: 34, paddingHorizontal: 12, borderRadius: 17, backgroundColor: 'rgba(255,255,255,0.06)', borderWidth: StyleSheet.hairlineWidth, borderColor: 'rgba(255,255,255,0.14)', alignItems: 'center', justifyContent: 'center' },
  presetOn: { backgroundColor: Accent.primary, borderColor: Accent.primary },
  presetText: { color: 'rgba(242,242,244,0.8)', fontFamily: Typeface.bodySemiBold, fontSize: 13.5, fontVariant: ['tabular-nums'] },
  presetTextOn: { color: '#062B1F' },
  unitChip: { height: 34, paddingHorizontal: 14, borderRadius: 17, backgroundColor: 'rgba(255,255,255,0.06)', borderWidth: StyleSheet.hairlineWidth, borderColor: 'rgba(255,255,255,0.14)', alignItems: 'center', justifyContent: 'center' },
  unitChipOn: { backgroundColor: 'rgba(52,211,153,0.16)', borderColor: 'rgba(52,211,153,0.6)' },
  unitText: { color: 'rgba(242,242,244,0.75)', fontFamily: Typeface.bodySemiBold, fontSize: 13.5 },
  unitTextOn: { color: Accent.primary },
  error: { textAlign: 'center', color: '#F87171', fontFamily: Typeface.body, fontSize: 12.5 },
  summary: { textAlign: 'center', color: 'rgba(242,242,244,0.6)', fontFamily: Typeface.bodyMedium, fontSize: 13.5 },
  list: { borderRadius: 18, backgroundColor: 'rgba(255,255,255,0.05)', borderWidth: StyleSheet.hairlineWidth, borderColor: 'rgba(255,255,255,0.1)', overflow: 'hidden' },
  optionRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.two, paddingHorizontal: Spacing.three, minHeight: 52, paddingVertical: Spacing.one + Spacing.half },
  divider: { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: 'rgba(255,255,255,0.08)' },
  optionText: { flex: 1, gap: 2 },
  optionLabel: { color: 'rgba(242,242,244,0.85)', fontFamily: Typeface.bodyMedium, fontSize: 15, letterSpacing: -0.2 },
  optionLabelOn: { color: '#F5F5F7', fontFamily: Typeface.bodySemiBold },
  optionCaption: { color: 'rgba(242,242,244,0.5)', fontFamily: Typeface.body, fontSize: 12.5 },
  days: { flexDirection: 'row', justifyContent: 'space-between' },
  day: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(255,255,255,0.06)', borderWidth: StyleSheet.hairlineWidth, borderColor: 'rgba(255,255,255,0.14)' },
  dayOn: { backgroundColor: Accent.primary, borderColor: Accent.primary },
  dayText: { color: 'rgba(242,242,244,0.75)', fontFamily: Typeface.bodySemiBold, fontSize: 14 },
  dayTextOn: { color: '#062B1F' },
  steppers: { gap: Spacing.two },
  stepper: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: Spacing.three, height: 54, borderRadius: 18, backgroundColor: 'rgba(255,255,255,0.05)', borderWidth: StyleSheet.hairlineWidth, borderColor: 'rgba(255,255,255,0.1)' },
  stepperLabel: { color: 'rgba(242,242,244,0.85)', fontFamily: Typeface.bodyMedium, fontSize: 15 },
  stepperControls: { flexDirection: 'row', alignItems: 'center', gap: Spacing.two },
  stepButton: { width: 32, height: 32, borderRadius: 16, backgroundColor: 'rgba(255,255,255,0.08)', alignItems: 'center', justifyContent: 'center' },
  stepButtonDim: { opacity: 0.4 },
  stepGlyph: { color: '#F5F5F7', fontSize: 16 },
  stepperValue: { minWidth: 92, textAlign: 'center', color: '#F5F5F7', fontFamily: Typeface.bodySemiBold, fontSize: 15, fontVariant: ['tabular-nums'] },
  stepperUnit: { color: 'rgba(242,242,244,0.5)', fontFamily: Typeface.body, fontSize: 13 },
  timeHost: { height: 200 },
  dateHost: { height: 340 },
});
