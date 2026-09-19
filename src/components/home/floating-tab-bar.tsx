import { Canvas, Circle, RadialGradient, vec } from '@shopify/react-native-skia';
import type { BottomTabBarProps } from 'expo-router/js-tabs';
import { SymbolView, type SFSymbol } from 'expo-symbols';
import { useEffect } from 'react';
import { Platform, StyleSheet, Text, View } from 'react-native';
import Animated, { cancelAnimation, Easing, useAnimatedStyle, useReducedMotion, useSharedValue, withDelay, withRepeat, withSequence, withSpring, withTiming } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { PressableScale } from '@/components/pressable-scale';
import { Accent, Spacing, Typeface } from '@/constants/theme';
import { quickActions } from '@/lib/quick-actions';

const TABS: Record<string, { label: string; symbol: SFSymbol; active: SFSymbol }> = {
  home: { label: 'Home', symbol: 'house', active: 'house.fill' },
  library: { label: 'Library', symbol: 'books.vertical', active: 'books.vertical.fill' },
  chat: { label: 'Chat', symbol: 'bubble.left', active: 'bubble.left.fill' },
  me: { label: 'Me', symbol: 'person', active: 'person.fill' },
};

export const TAB_BAR_HEIGHT = 64;
const FAB = 60;

/** Floating pill of tabs plus the emerald "+" that opens the quick-actions sheet. */
export function FloatingTabBar({ state, navigation }: BottomTabBarProps) {
  const insets = useSafeAreaInsets();
  const bottom = Math.max(insets.bottom, Spacing.two) + Spacing.one;

  return (
    <View style={[styles.wrap, { bottom }]} pointerEvents="box-none">
      <View style={styles.pill}>
        {state.routes.map((route, index) => {
          const meta = TABS[route.name];
          if (!meta) return null;
          const focused = state.index === index;
          return (
            <PressableScale
              key={route.key}
              onPress={() => {
                const event = navigation.emit({ type: 'tabPress', target: route.key, canPreventDefault: true });
                if (!focused && !event.defaultPrevented) navigation.navigate(route.name);
              }}
              accessibilityRole="tab"
              accessibilityState={{ selected: focused }}
              accessibilityLabel={meta.label}
              style={styles.tab}>
              <SymbolView
                name={focused ? meta.active : meta.symbol}
                size={20}
                weight="medium"
                tintColor={focused ? Accent.primary : 'rgba(242,242,244,0.55)'}
                fallback={<View style={[styles.fallback, focused && styles.fallbackOn]} />}
              />
              <Text style={[styles.label, focused && styles.labelOn]}>{meta.label}</Text>
            </PressableScale>
          );
        })}
      </View>
      <Fab />
    </View>
  );
}

const PULSE_MS = 2200;

/** Scales in on arrival, then breathes: two halos take turns radiating out from the edge and fading. */
function Fab() {
  const reducedMotion = useReducedMotion();
  const press = useSharedValue(0);
  const enter = useSharedValue(reducedMotion ? 1 : 0.86);
  const pulse = useSharedValue(0);

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
  const style = useAnimatedStyle(() => ({
    transform: [{ scale: enter.get() * (1 - press.get() * 0.08) }, { rotate: `${press.get() * 45}deg` }],
  }));
  const useHalo = (offset: number) =>
    useAnimatedStyle(() => {
      const t = (pulse.get() + offset) % 1;
      return { opacity: (1 - t) * (1 - t), transform: [{ scale: 0.5 + t * 0.7 }] };
    });
  const haloA = useHalo(0);
  const haloB = useHalo(0.5);

  return (
    <PressableScale
      onPress={() => quickActions.open()}
      onPressIn={() => press.set(withSpring(1, { damping: 18, stiffness: 300 }))}
      onPressOut={() => press.set(withSpring(0, { damping: 18, stiffness: 300 }))}
      accessibilityRole="button"
      accessibilityLabel="Quick actions"
      style={styles.fabGlow}>
      {reducedMotion ? null : (
        <>
          <Animated.View style={[styles.halo, haloA]}>
            <Halo />
          </Animated.View>
          <Animated.View style={[styles.halo, haloB]}>
            <Halo />
          </Animated.View>
        </>
      )}
      <Animated.View style={[styles.fab, style]} renderToHardwareTextureAndroid shouldRasterizeIOS={false}>
        <SymbolView name="plus" size={26} weight="bold" tintColor="#062B1F" resizeMode="scaleAspectFit" fallback={<Text style={styles.fabFallback}>+</Text>} />
      </Animated.View>
    </PressableScale>
  );
}

/** A soft ring (peak alpha at half radius) that the pulse scales outward, drawn in Skia so the edges feather. */
function Halo() {
  const size = FAB * 2.6;
  return (
    <Canvas style={{ width: size, height: size }}>
      <Circle cx={size / 2} cy={size / 2} r={size / 2}>
        <RadialGradient c={vec(size / 2, size / 2)} r={size / 2} colors={['rgba(52,211,153,0)', 'rgba(52,211,153,0.1)', 'rgba(52,211,153,0.75)', 'rgba(52,211,153,0)']} positions={[0, 0.34, 0.5, 0.82]} />
      </Circle>
    </Canvas>
  );
}

const styles = StyleSheet.create({
  wrap: {
    position: 'absolute',
    left: Spacing.three,
    right: Spacing.three,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
  },
  pill: {
    flex: 1,
    height: TAB_BAR_HEIGHT,
    borderRadius: TAB_BAR_HEIGHT / 2,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.one,
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
  fabGlow: {
    borderRadius: FAB / 2,
    ...Platform.select({ ios: { shadowColor: Accent.primary, shadowOpacity: 0.45, shadowRadius: 18, shadowOffset: { width: 0, height: 8 } }, default: {} }),
  },
  fab: { width: FAB, height: FAB, borderRadius: FAB / 2, backgroundColor: Accent.primary, alignItems: 'center', justifyContent: 'center' },
  halo: { position: 'absolute', top: -FAB * 0.8, left: -FAB * 0.8, width: FAB * 2.6, height: FAB * 2.6, pointerEvents: 'none' },
  fabFallback: { color: '#062B1F', fontSize: 28, lineHeight: 30, fontFamily: Typeface.bodyBold },
});
