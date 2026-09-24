import { Canvas, Circle, Group, RadialGradient, rect, RoundedRect, rrect, vec } from '@shopify/react-native-skia';
import type { BottomTabBarProps } from 'expo-router/js-tabs';
import { SymbolView, type SFSymbol } from 'expo-symbols';
import { useEffect } from 'react';
import { Platform, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import Animated, { cancelAnimation, Easing, interpolate, useAnimatedStyle, useDerivedValue, useReducedMotion, useSharedValue, withDelay, withRepeat, withSequence, withSpring, withTiming, type SharedValue } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { PressableScale } from '@/components/pressable-scale';
import { Accent, Spacing, Typeface } from '@/constants/theme';
import { ME_SECTIONS, meSection, useMeSection } from '@/lib/me-section';
import { quickActions, useQuickActionsOpen } from '@/lib/quick-actions';
import { ChatGlyph } from './chat-glyph';
import { QuickActionsOverlay } from './quick-actions-overlay';

const TABS: Record<string, { label: string; symbol: SFSymbol; active: SFSymbol }> = {
  home: { label: 'Home', symbol: 'house', active: 'house.fill' },
  library: { label: 'Library', symbol: 'books.vertical', active: 'books.vertical.fill' },
  chat: { label: 'Chat', symbol: 'bubble.left', active: 'bubble.left.fill' },
  me: { label: 'Me', symbol: 'person', active: 'person.fill' },
};

export const TAB_BAR_HEIGHT = 64;
const FAB = 60;

const HOME_BUTTON = TAB_BAR_HEIGHT;
const GAP = Spacing.two;
const SLIDE = 44;
const MORPH_MS = 320;

/**
 * Floating pill of tabs plus the emerald "+" that opens the quick-actions sheet. While the Me tab
 * is focused the bar morphs into the Me bar the way the reference does: the app tabs slide left
 * and fade as the Me sections slide in from the right, the pill's left edge moves over to make
 * room for a round Home button that scales in, and the "+" shrinks away while the pill stretches
 * into its place. One shared value drives all of it, so every part moves together.
 */
export function FloatingTabBar({ state, navigation }: BottomTabBarProps) {
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const bottom = Math.max(insets.bottom, Spacing.two) + Spacing.one;
  const section = useMeSection();
  const inMe = state.routes[state.index]?.name === 'me';
  const reducedMotion = useReducedMotion();
  const me = useSharedValue(inMe ? 1 : 0);
  useEffect(() => {
    me.set(withTiming(inMe ? 1 : 0, { duration: reducedMotion ? 0 : MORPH_MS, easing: Easing.inOut(Easing.cubic) }));
  }, [inMe, me, reducedMotion]);

  // Geometry of the bar: `[pill][gap][+]` when in the app, `[home][gap][pill]` when in Me.
  const barWidth = width - Spacing.three * 2;
  const appPillWidth = barWidth - GAP - FAB;
  const mePillWidth = barWidth - GAP - HOME_BUTTON;
  const pillStyle = useAnimatedStyle(() => ({
    left: interpolate(me.get(), [0, 1], [0, HOME_BUTTON + GAP]),
    width: interpolate(me.get(), [0, 1], [appPillWidth, mePillWidth]),
  }));
  const appTabsStyle = useAnimatedStyle(() => ({ opacity: 1 - me.get(), transform: [{ translateX: -SLIDE * me.get() }] }));
  const meTabsStyle = useAnimatedStyle(() => ({ opacity: me.get(), transform: [{ translateX: SLIDE * (1 - me.get()) }] }));
  const homeStyle = useAnimatedStyle(() => ({ opacity: me.get(), transform: [{ scale: 0.6 + 0.4 * me.get() }, { translateX: -12 * (1 - me.get()) }] }));
  const fabStyle = useAnimatedStyle(() => ({ opacity: 1 - me.get(), transform: [{ scale: 1 - 0.45 * me.get() }, { translateX: 16 * me.get() }] }));

  const go = (name: string) => {
    quickActions.close();
    const route = state.routes.find((r) => r.name === name);
    if (!route) return;
    const event = navigation.emit({ type: 'tabPress', target: route.key, canPreventDefault: true });
    if (!event.defaultPrevented) navigation.navigate(name);
  };

  return (
    <View style={[styles.wrap, { bottom, pointerEvents: 'box-none' }]}>
      <QuickActionsOverlay />
      <Animated.View style={[styles.homeButton, homeStyle, { pointerEvents: inMe ? 'auto' : 'none' }]}>
        <PressableScale onPress={() => go('home')} accessibilityRole="button" accessibilityLabel="Back to Home" accessibilityElementsHidden={!inMe} style={styles.homeHit}>
          <SymbolView name="house.fill" size={20} weight="medium" tintColor="rgba(242,242,244,0.85)" fallback={<View style={styles.fallback} />} />
        </PressableScale>
      </Animated.View>

      <Animated.View style={[styles.pill, pillStyle]}>
        <Animated.View style={[styles.layer, appTabsStyle, { pointerEvents: inMe ? 'none' : 'auto' }]} accessibilityElementsHidden={inMe}>
          {state.routes.map((route, index) => {
            const meta = TABS[route.name];
            if (!meta) return null;
            const focused = state.index === index;
            return (
              <PressableScale
                key={route.key}
                onPress={() => {
                  if (!focused) go(route.name);
                }}
                accessibilityRole="tab"
                accessibilityState={{ selected: focused }}
                accessibilityLabel={meta.label}
                style={styles.tab}>
                {route.name === 'chat' ? (
                  <ChatGlyph size={22} color={focused ? Accent.primary : 'rgba(242,242,244,0.6)'} filled={focused} />
                ) : (
                  <SymbolView name={focused ? meta.active : meta.symbol} size={20} weight="medium" tintColor={focused ? Accent.primary : 'rgba(242,242,244,0.55)'} fallback={<View style={[styles.fallback, focused && styles.fallbackOn]} />} />
                )}
                <Text style={[styles.label, focused && styles.labelOn]}>{meta.label}</Text>
              </PressableScale>
            );
          })}
        </Animated.View>
        <Animated.View style={[styles.layer, meTabsStyle, { pointerEvents: inMe ? 'auto' : 'none' }]} accessibilityElementsHidden={!inMe}>
          {ME_SECTIONS.map((s) => {
            const focused = section === s.id;
            return (
              <PressableScale key={s.id} onPress={() => meSection.set(s.id)} accessibilityRole="tab" accessibilityState={{ selected: focused }} accessibilityLabel={s.label} style={styles.tab}>
                <SymbolView name={focused ? s.active : s.symbol} size={20} weight="medium" tintColor={focused ? Accent.primary : 'rgba(242,242,244,0.55)'} fallback={<View style={[styles.fallback, focused && styles.fallbackOn]} />} />
                <Text style={[styles.label, focused && styles.labelOn]} numberOfLines={1}>
                  {s.label}
                </Text>
              </PressableScale>
            );
          })}
        </Animated.View>
      </Animated.View>

      <Animated.View style={[styles.fabSlot, fabStyle, { pointerEvents: inMe ? 'none' : 'box-none' }]} accessibilityElementsHidden={inMe}>
        <Fab />
      </Animated.View>
    </View>
  );
}

const PULSE_MS = 2200;

/** Scales in on arrival, then breathes: two halos take turns radiating out from the edge and fading. */
function Fab() {
  const reducedMotion = useReducedMotion();
  const open = useQuickActionsOpen();
  const press = useSharedValue(0);
  const openV = useSharedValue(0);
  const enter = useSharedValue(reducedMotion ? 1 : 0.86);
  const pulse = useSharedValue(0);

  useEffect(() => {
    openV.set(withTiming(open ? 1 : 0, { duration: 220, easing: Easing.out(Easing.cubic) }));
    press.set(0);
  }, [open, openV, press]);

  useEffect(() => {
    if (reducedMotion) return;
    enter.set(withDelay(250, withSpring(1, { damping: 14, stiffness: 170, mass: 0.8 })));
    pulse.set(withDelay(900, withRepeat(withSequence(withTiming(1, { duration: PULSE_MS, easing: Easing.out(Easing.quad) }), withTiming(0, { duration: 0 })), -1, false)));
    return () => {
      cancelAnimation(pulse);
      cancelAnimation(enter);
    };
  }, [reducedMotion, enter, pulse]);

  // Always fully opaque: if an animation ever fails to run, the button is still there at 86% size.
  // The button itself never rotates — the glyph morphs inside as vector geometry (see PlusGlyph).
  const style = useAnimatedStyle(() => ({
    transform: [{ scale: enter.get() * (1 - press.get() * 0.08) }],
  }));
  // The ripple starts just outside the button's edge and travels outward — it never overlaps the
  // face, so the silhouette stays sharp; a short fade-in keeps it from popping as a hard ring.
  const useHalo = (offset: number) =>
    useAnimatedStyle(() => {
      const t = (pulse.get() + offset) % 1;
      return { opacity: Math.min(1, t / 0.15) * (1 - t) * (1 - t), transform: [{ scale: HALO_SCALE_FROM + t * (HALO_SCALE_TO - HALO_SCALE_FROM) }] };
    });
  const haloA = useHalo(0);
  const haloB = useHalo(0.5);

  return (
    <PressableScale
      onPress={() => (quickActions.isOpen() ? quickActions.close() : quickActions.open())}
      onPressIn={() => press.set(withSpring(1, { damping: 18, stiffness: 300 }))}
      onPressOut={() => press.set(withSpring(0, { damping: 18, stiffness: 300 }))}
      accessibilityRole="button"
      accessibilityLabel={open ? 'Close quick actions' : 'Quick actions'}
      accessibilityState={{ expanded: open }}
      style={styles.fabGlow}>
      {reducedMotion || open ? null : (
        <>
          <Animated.View style={[styles.halo, haloA]}>
            <Halo />
          </Animated.View>
          <Animated.View style={[styles.halo, haloB]}>
            <Halo />
          </Animated.View>
        </>
      )}
      <Animated.View style={[styles.fab, style]}>
        <PlusGlyph progress={openV} />
      </Animated.View>
    </PressableScale>
  );
}

// Whole-point geometry so the bars land on device pixels at 2x and 3x.
const GLYPH = 28;
const BAR_LEN = 20;
const BAR_W = 4;
const HALO_SIZE = FAB * 2.6;
// Ring gradient (fractions of the halo radius): transparent core, peak at 0.5, gone by 0.8.
// At HALO_SCALE_FROM the transparent core already covers the button face (0.42 × 78 × 0.95 ≈ 31pt > 30pt).
const HALO_STOPS = [0, 0.42, 0.5, 0.8];
const HALO_SCALE_FROM = 0.95;
const HALO_SCALE_TO = 1.3;

/**
 * The "+" drawn as two vector bars in Skia so it stays pixel-sharp through the 45° morph into
 * an "×" (`progress` 0 → 1) — rotating a bitmap glyph is what left it soft before.
 */
function PlusGlyph({ progress }: { progress: SharedValue<number> }) {
  const c = GLYPH / 2;
  const transform = useDerivedValue(() => [{ rotate: progress.get() * (Math.PI / 4) }]);
  const h = rrect(rect(c - BAR_LEN / 2, c - BAR_W / 2, BAR_LEN, BAR_W), BAR_W / 2, BAR_W / 2);
  const v = rrect(rect(c - BAR_W / 2, c - BAR_LEN / 2, BAR_W, BAR_LEN), BAR_W / 2, BAR_W / 2);
  return (
    <Canvas style={styles.glyph}>
      <Group origin={vec(c, c)} transform={transform} color="#062B1F">
        <RoundedRect rect={h} />
        <RoundedRect rect={v} />
      </Group>
    </Canvas>
  );
}

/** A soft ring (peak alpha at half radius) that the pulse scales outward, drawn in Skia so the edges feather. */
function Halo() {
  const r = HALO_SIZE / 2;
  return (
    <Canvas style={styles.haloCanvas}>
      <Circle cx={r} cy={r} r={r}>
        <RadialGradient c={vec(r, r)} r={r} colors={['rgba(52,211,153,0)', 'rgba(52,211,153,0)', 'rgba(52,211,153,0.6)', 'rgba(52,211,153,0)']} positions={HALO_STOPS} />
      </Circle>
    </Canvas>
  );
}

const styles = StyleSheet.create({
  wrap: {
    position: 'absolute',
    left: Spacing.three,
    right: Spacing.three,
    height: TAB_BAR_HEIGHT,
  },
  homeButton: {
    position: 'absolute',
    left: 0,
    top: 0,
    width: HOME_BUTTON,
    height: HOME_BUTTON,
    borderRadius: HOME_BUTTON / 2,
    backgroundColor: 'rgba(22,26,24,0.94)',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(255,255,255,0.14)',
    ...Platform.select({ ios: { shadowColor: '#000', shadowOpacity: 0.35, shadowRadius: 14, shadowOffset: { width: 0, height: 8 } }, default: {} }),
  },
  homeHit: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  layer: { position: 'absolute', left: Spacing.one, right: Spacing.one, top: 0, bottom: 0, flexDirection: 'row', alignItems: 'center' },
  fabSlot: { position: 'absolute', right: 0, top: (TAB_BAR_HEIGHT - FAB) / 2 },
  pill: {
    position: 'absolute',
    top: 0,
    height: TAB_BAR_HEIGHT,
    borderRadius: TAB_BAR_HEIGHT / 2,
    overflow: 'hidden',
    backgroundColor: 'rgba(22,26,24,0.94)',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(255,255,255,0.14)',
    ...Platform.select({ ios: { shadowColor: '#000', shadowOpacity: 0.45, shadowRadius: 22, shadowOffset: { width: 0, height: 10 } }, default: {} }),
  },
  tab: { flex: 1, height: TAB_BAR_HEIGHT, alignItems: 'center', justifyContent: 'center', gap: 3 },
  label: { color: 'rgba(242,242,244,0.55)', fontFamily: Typeface.bodyMedium, fontSize: 10.5, letterSpacing: 0.1 },
  labelOn: { color: Accent.primary, fontFamily: Typeface.bodySemiBold },
  fallback: { width: 18, height: 18, borderRadius: 5, backgroundColor: 'rgba(242,242,244,0.4)' },
  fallbackOn: { backgroundColor: Accent.primary },
  fabGlow: { width: FAB, height: FAB },
  // Shadow lives on the solid disc (not the transparent wrapper) so iOS derives it from the rounded
  // rect instead of rasterising the pulsing halos every frame — cheaper, and the edge stays crisp.
  fab: {
    width: FAB,
    height: FAB,
    borderRadius: FAB / 2,
    backgroundColor: Accent.primary,
    alignItems: 'center',
    justifyContent: 'center',
    ...Platform.select({ ios: { shadowColor: Accent.primary, shadowOpacity: 0.4, shadowRadius: 14, shadowOffset: { width: 0, height: 6 } }, default: {} }),
  },
  glyph: { width: GLYPH, height: GLYPH },
  halo: { position: 'absolute', top: (FAB - HALO_SIZE) / 2, left: (FAB - HALO_SIZE) / 2, width: HALO_SIZE, height: HALO_SIZE, pointerEvents: 'none' },
  haloCanvas: { width: HALO_SIZE, height: HALO_SIZE },
});
