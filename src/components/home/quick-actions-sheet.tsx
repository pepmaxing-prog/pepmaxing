import { SymbolView, type SFSymbol } from 'expo-symbols';
import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, { FadeIn, FadeOut, SlideInDown, SlideOutDown } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { PressableScale } from '@/components/pressable-scale';
import { Accent, Spacing, Typeface } from '@/constants/theme';
import { quickActions, useQuickActionsOpen } from '@/lib/quick-actions';

const ACTIONS: { id: string; symbol: SFSymbol; title: string; text: string }[] = [
  { id: 'protocol', symbol: 'syringe.fill', title: 'New protocol', text: 'Peptide, dose, schedule and reminders.' },
  { id: 'log', symbol: 'checkmark.circle.fill', title: 'Log a dose', text: 'Record one now, on or off schedule.' },
  { id: 'calc', symbol: 'function', title: 'Reconstitution calculator', text: 'Vial, water, dose \u2192 units to draw.' },
];

/** The "+" sheet. Actions route into their builders once those exist; for now they say so. */
export function QuickActionsSheet() {
  const open = useQuickActionsOpen();
  const insets = useSafeAreaInsets();
  const [pending, setPending] = useState<string | null>(null);

  if (!open) return null;
  const close = () => {
    setPending(null);
    quickActions.close();
  };

  return (
    <Animated.View entering={FadeIn.duration(180)} exiting={FadeOut.duration(160)} style={styles.scrim}>
      <Pressable style={styles.scrimTap} onPress={close} accessibilityLabel="Dismiss" />
      <Animated.View entering={SlideInDown.duration(320)} exiting={SlideOutDown.duration(240)} style={[styles.sheet, { paddingBottom: Math.max(insets.bottom, Spacing.three) }]} accessibilityViewIsModal>
        <View style={styles.grab} />
        {ACTIONS.map((a) => (
          <PressableScale key={a.id} onPress={() => setPending(a.id)} accessibilityRole="button" style={styles.row}>
            <View style={styles.disc}>
              <SymbolView name={a.symbol} size={19} weight="semibold" tintColor={Accent.primary} fallback={<View style={styles.discFallback} />} />
            </View>
            <View style={styles.rowText}>
              <Text style={styles.rowTitle}>{a.title}</Text>
              <Text style={styles.rowCaption}>{pending === a.id ? 'Coming in the next update.' : a.text}</Text>
            </View>
            <SymbolView name="chevron.right" size={13} weight="semibold" tintColor="rgba(242,242,244,0.35)" fallback={null} />
          </PressableScale>
        ))}
      </Animated.View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  scrim: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.55)' },
  scrimTap: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 },
  sheet: {
    marginHorizontal: Spacing.two,
    marginBottom: Spacing.two,
    padding: Spacing.two,
    paddingTop: Spacing.one,
    borderRadius: 28,
    backgroundColor: '#121614',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(255,255,255,0.14)',
    gap: 4,
  },
  grab: { alignSelf: 'center', width: 36, height: 4, borderRadius: 2, backgroundColor: 'rgba(255,255,255,0.22)', marginBottom: Spacing.two },
  row: { flexDirection: 'row', alignItems: 'center', gap: Spacing.three, padding: Spacing.two + Spacing.half, borderRadius: 18 },
  disc: { width: 44, height: 44, borderRadius: 22, backgroundColor: 'rgba(52,211,153,0.12)', alignItems: 'center', justifyContent: 'center' },
  discFallback: { width: 16, height: 16, borderRadius: 8, backgroundColor: Accent.primary },
  rowText: { flex: 1, gap: 2 },
  rowTitle: { color: '#F5F5F7', fontFamily: Typeface.bodySemiBold, fontSize: 16, letterSpacing: -0.2 },
  rowCaption: { color: 'rgba(242,242,244,0.55)', fontFamily: Typeface.body, fontSize: 13, letterSpacing: -0.1 },
});
