import { useRouter, type Href } from 'expo-router';
import { SymbolView, type SFSymbol } from 'expo-symbols';
import { useState } from 'react';
import { Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, { FadeIn, FadeInUp, FadeOut, useReducedMotion } from 'react-native-reanimated';

import { PressableScale } from '@/components/pressable-scale';
import { Accent, Spacing, Typeface } from '@/constants/theme';
import { METRIC_DEFS } from '@/lib/health';
import { quickActions, useQuickActionsOpen } from '@/lib/quick-actions';

type Action = { id: string; symbol: SFSymbol; title: string; color: string; fg: string; href?: Href; submenu?: 'health' };

/** Closest to the FAB last: the stack cascades upward out of the button. */
const ACTIONS: Action[] = [
  { id: 'calc', symbol: 'function', title: 'Open calculator', color: '#3A4149', fg: '#F2F2F4', href: '/calculator' },
  { id: 'health', symbol: 'heart.fill', title: 'Log health', color: '#B83A67', fg: '#FFFFFF', submenu: 'health' },
  { id: 'dose', symbol: 'syringe.fill', title: 'Log dose', color: '#6C5CE7', fg: '#FFFFFF', href: '/log' },
  { id: 'vials', symbol: 'testtube.2', title: 'Add vials', color: '#3D7FC4', fg: '#FFFFFF' },
  { id: 'protocol', symbol: 'list.clipboard.fill', title: 'Create protocol', color: Accent.primary, fg: '#062B1F', href: '/protocol/new' },
];

const HEALTH = '#B83A67';
/** The health sub-menu, in the same rose as its parent pill. */
const HEALTH_SYMBOLS: Record<string, SFSymbol> = { weight: 'scalemass.fill', bodyFat: 'percent', leanMass: 'figure.arms.open', waist: 'ruler', mood: 'face.smiling', energy: 'bolt.fill' };
const HEALTH_ACTIONS: Action[] = [
  ...METRIC_DEFS.map<Action>((m) => ({ id: m.id, symbol: HEALTH_SYMBOLS[m.id] ?? 'heart.fill', title: m.action, color: HEALTH, fg: '#FFFFFF', href: { pathname: '/health/[metric]', params: { metric: m.id } } })),
  { id: 'back', symbol: 'chevron.left', title: 'Back', color: '#3A4149', fg: '#F2F2F4' },
];

/**
 * The "+" overlay: a dimming scrim plus a right-aligned stack of action pills that rises above
 * the FAB. Rendered inside the floating tab bar so the bar and button stay above the scrim.
 * Actions route into their builders once those exist; until then a pill says so in place.
 */
export function QuickActionsOverlay() {
  const open = useQuickActionsOpen();
  return open ? <OverlayBody /> : null;
}

/** Mounted only while open, so the sub-menu always starts back at the main list. */
function OverlayBody() {
  const reducedMotion = useReducedMotion();
  const [menu, setMenu] = useState<'main' | 'health'>('main');
  const actions = menu === 'health' ? HEALTH_ACTIONS : ACTIONS;

  return (
    <>
      <Animated.View entering={FadeIn.duration(180)} exiting={FadeOut.duration(160)} style={styles.scrim} accessibilityViewIsModal>
        <Pressable style={StyleSheet.absoluteFill} onPress={quickActions.close} accessibilityRole="button" accessibilityLabel="Close quick actions" />
      </Animated.View>
      <View key={menu} style={styles.stack}>
        {actions.map((a, i) => (
          <ActionPill key={a.id} action={a} delay={(actions.length - 1 - i) * 40} reducedMotion={reducedMotion} onSubmenu={setMenu} />
        ))}
      </View>
    </>
  );
}

function ActionPill({ action, delay, reducedMotion, onSubmenu }: { action: Action; delay: number; reducedMotion: boolean; onSubmenu: (m: 'main' | 'health') => void }) {
  const router = useRouter();
  const [soon, setSoon] = useState(false);
  const go = () => {
    if (action.submenu) {
      onSubmenu(action.submenu);
      return;
    }
    if (action.id === 'back') {
      onSubmenu('main');
      return;
    }
    if (!action.href) {
      setSoon(true);
      return;
    }
    quickActions.close();
    router.push(action.href);
  };
  return (
    <Animated.View entering={reducedMotion ? FadeIn.duration(150) : FadeInUp.delay(delay).springify().damping(19).stiffness(280)} exiting={FadeOut.duration(120)}>
      <PressableScale
        onPress={go}
        accessibilityRole="button"
        accessibilityLabel={action.title}
        style={[styles.pill, { backgroundColor: action.color }]}>
        <View style={styles.disc}>
          <SymbolView name={action.symbol} size={16} weight="semibold" tintColor={action.fg} fallback={<View style={[styles.discFallback, { backgroundColor: action.fg }]} />} />
        </View>
        <Text style={[styles.pillLabel, { color: action.fg }]}>{soon ? 'Coming soon' : action.title}</Text>
      </PressableScale>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  // Covers the whole screen: the tab bar's wrap sits 16pt in from the edges and ~46pt above the bottom.
  scrim: { position: 'absolute', top: -2000, bottom: -100, left: -Spacing.three, right: -Spacing.three, backgroundColor: 'rgba(0,0,0,0.55)' },
  // bottom: '100%' anchors the stack's base to the top edge of the 64pt-tall bar, plus a gap.
  stack: { position: 'absolute', right: 0, bottom: '100%', marginBottom: Spacing.two + Spacing.half, gap: 10, alignItems: 'flex-end', pointerEvents: 'box-none' },
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    height: 50,
    paddingLeft: 8,
    paddingRight: 18,
    borderRadius: 16,
    ...Platform.select({ ios: { shadowColor: '#000', shadowOpacity: 0.35, shadowRadius: 12, shadowOffset: { width: 0, height: 6 } }, default: {} }),
  },
  disc: { width: 34, height: 34, borderRadius: 17, backgroundColor: 'rgba(0,0,0,0.22)', alignItems: 'center', justifyContent: 'center' },
  discFallback: { width: 12, height: 12, borderRadius: 6 },
  pillLabel: { fontFamily: Typeface.bodySemiBold, fontSize: 15.5, letterSpacing: -0.2 },
});
