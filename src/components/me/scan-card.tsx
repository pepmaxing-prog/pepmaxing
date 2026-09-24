import { Canvas, Circle, RadialGradient, vec } from '@shopify/react-native-skia';
import { useRouter } from 'expo-router';
import { SymbolView } from 'expo-symbols';
import { useEffect } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Animated, { Easing, cancelAnimation, useAnimatedStyle, useReducedMotion, useSharedValue, withRepeat, withSequence, withTiming } from 'react-native-reanimated';

import { PressableScale } from '@/components/pressable-scale';
import { Accent, Spacing, Typeface } from '@/constants/theme';

const FRAME = 64;
const SWEEP_MS = 1800;

/**
 * The scan entry at the top of Nutrition: a viewfinder with a slow scanning line, the promise in
 * one line (exact numbers, not guesses), and the two ways in. Tapping the card opens the barcode
 * scanner; the pills pick a mode.
 */
export function ScanCard() {
  const router = useRouter();
  const reducedMotion = useReducedMotion();
  const sweep = useSharedValue(0);

  useEffect(() => {
    if (reducedMotion) {
      sweep.set(0.5);
      return;
    }
    sweep.set(withRepeat(withSequence(withTiming(1, { duration: SWEEP_MS, easing: Easing.inOut(Easing.sin) }), withTiming(0, { duration: SWEEP_MS, easing: Easing.inOut(Easing.sin) })), -1, false));
    return () => cancelAnimation(sweep);
  }, [reducedMotion, sweep]);

  const lineStyle = useAnimatedStyle(() => ({ transform: [{ translateY: 8 + sweep.get() * (FRAME - 18) }] }));
  const open = (mode: 'barcode' | 'label') => router.push({ pathname: '/food/scan', params: { mode } });

  return (
    <PressableScale onPress={() => open('barcode')} accessibilityRole="button" accessibilityLabel="Scan to log. Barcode or nutrition label — exact numbers from the package." pressedScale={0.985} style={styles.card}>
      <Canvas style={styles.glow} pointerEvents="none">
        <Circle cx={70} cy={50} r={150}>
          <RadialGradient c={vec(70, 50)} r={150} colors={['rgba(52,211,153,0.30)', 'rgba(52,211,153,0.10)', 'rgba(52,211,153,0)']} positions={[0, 0.45, 1]} />
        </Circle>
      </Canvas>
      <View style={styles.row}>
        <View style={styles.frame} accessibilityElementsHidden>
          {(['tl', 'tr', 'bl', 'br'] as const).map((c) => (
            <View key={c} style={[styles.corner, styles[c]]} />
          ))}
          <View style={styles.bars}>
            {[3, 1.5, 2.5, 1.5, 3.5, 1.5, 2].map((w, i) => (
              <View key={i} style={[styles.bar, { width: w * 1.6, opacity: 0.55 + (i % 3) * 0.15 }]} />
            ))}
          </View>
          <Animated.View style={[styles.line, lineStyle]} />
        </View>
        <View style={styles.text}>
          <Text style={styles.title}>Scan to log</Text>
          <Text style={styles.sub}>Exact numbers from the package — no guessing.</Text>
          <View style={styles.pills}>
            <PressableScale onPress={() => open('barcode')} accessibilityRole="button" accessibilityLabel="Scan a barcode" pressedScale={0.96} style={styles.pill}>
              <SymbolView name="barcode" size={12} weight="semibold" tintColor="#0B0F0D" fallback={null} />
              <Text style={styles.pillText}>Barcode</Text>
            </PressableScale>
            <PressableScale onPress={() => open('label')} accessibilityRole="button" accessibilityLabel="Read a nutrition label" pressedScale={0.96} style={[styles.pill, styles.pillGhost]}>
              <SymbolView name="doc.text.viewfinder" size={12} weight="semibold" tintColor="#F5F5F7" fallback={null} />
              <Text style={[styles.pillText, styles.pillGhostText]}>Nutrition label</Text>
            </PressableScale>
          </View>
        </View>
      </View>
    </PressableScale>
  );
}

const CORNER = 14;
const styles = StyleSheet.create({
  card: { borderRadius: 24, overflow: 'hidden', backgroundColor: 'rgba(255,255,255,0.05)', borderWidth: StyleSheet.hairlineWidth, borderColor: 'rgba(52,211,153,0.35)', marginTop: Spacing.two },
  glow: { position: 'absolute', left: 0, top: 0, right: 0, bottom: 0 },
  row: { flexDirection: 'row', alignItems: 'center', gap: Spacing.three, padding: Spacing.three },
  frame: { width: FRAME, height: FRAME, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  corner: { position: 'absolute', width: CORNER, height: CORNER, borderColor: Accent.primary, borderWidth: 2 },
  tl: { top: 0, left: 0, borderRightWidth: 0, borderBottomWidth: 0, borderTopLeftRadius: 6 },
  tr: { top: 0, right: 0, borderLeftWidth: 0, borderBottomWidth: 0, borderTopRightRadius: 6 },
  bl: { bottom: 0, left: 0, borderRightWidth: 0, borderTopWidth: 0, borderBottomLeftRadius: 6 },
  br: { bottom: 0, right: 0, borderLeftWidth: 0, borderTopWidth: 0, borderBottomRightRadius: 6 },
  bars: { flexDirection: 'row', alignItems: 'center', gap: 3, height: 26 },
  bar: { height: '100%', borderRadius: 1, backgroundColor: '#F5F5F7' },
  line: { position: 'absolute', left: 6, right: 6, top: 0, height: 2, borderRadius: 1, backgroundColor: Accent.primary, shadowColor: Accent.primary, shadowOpacity: 0.9, shadowRadius: 6, shadowOffset: { width: 0, height: 0 } },
  text: { flex: 1, gap: 3 },
  title: { color: '#F5F5F7', fontFamily: Typeface.display, fontSize: 19, letterSpacing: -0.5 },
  sub: { color: 'rgba(242,242,244,0.6)', fontFamily: Typeface.body, fontSize: 12.5, lineHeight: 17 },
  pills: { flexDirection: 'row', gap: Spacing.one, marginTop: Spacing.two },
  pill: { flexDirection: 'row', alignItems: 'center', gap: 5, height: 30, paddingHorizontal: 11, borderRadius: 15, backgroundColor: Accent.primary },
  pillText: { color: '#0B0F0D', fontFamily: Typeface.bodySemiBold, fontSize: 12.5 },
  pillGhost: { backgroundColor: 'rgba(255,255,255,0.1)', borderWidth: StyleSheet.hairlineWidth, borderColor: 'rgba(255,255,255,0.18)' },
  pillGhostText: { color: '#F5F5F7' },
});
