import { Canvas, Circle, Path, Skia } from '@shopify/react-native-skia';
import { SymbolView } from 'expo-symbols';
import { useEffect, type ReactNode } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Animated, { Easing, useAnimatedStyle, useReducedMotion, useSharedValue, withDelay, withRepeat, withSequence, withTiming } from 'react-native-reanimated';

import { Accent, Typeface } from '@/constants/theme';

const INK = '#F2F2F4';
const MUTED = 'rgba(242,242,244,0.55)';
const RED = '#F87171';

type Placement = { x: number; y: number; w: number; rotate: number; delay: number };

/** Six disconnected fragments of a protocol, scattered like paper on a desk. Positions are fractions of the stage. */
export function ChaosCollage({ width, height }: { width: number; height: number }) {
  const place = (p: Omit<Placement, 'w'> & { w: number }): Placement => ({ ...p, x: p.x * width, y: p.y * height, w: p.w * width });
  return (
    <View style={{ width, height }}>
      <Fragment {...place({ x: 0.02, y: 0.02, w: 0.5, rotate: -6, delay: 0 })}>
        <CalendarCard />
      </Fragment>
      <Fragment {...place({ x: 0.55, y: 0.0, w: 0.46, rotate: 5, delay: 120 })}>
        <NotesCard />
      </Fragment>
      <Fragment {...place({ x: -0.02, y: 0.38, w: 0.42, rotate: 4, delay: 240 })}>
        <TrendCard />
      </Fragment>
      <Fragment {...place({ x: 0.42, y: 0.33, w: 0.5, rotate: -3, delay: 360 })}>
        <DosesCard />
      </Fragment>
      <Fragment {...place({ x: 0.06, y: 0.66, w: 0.44, rotate: 7, delay: 480 })}>
        <InventoryCard />
      </Fragment>
      <Fragment {...place({ x: 0.58, y: 0.62, w: 0.42, rotate: -5, delay: 600 })}>
        <AdherenceCard />
      </Fragment>
    </View>
  );
}

function Fragment({ x, y, w, rotate, delay, children }: Placement & { children: ReactNode }) {
  const reducedMotion = useReducedMotion();
  const enter = useSharedValue(reducedMotion ? 1 : 0);
  const drift = useSharedValue(0);

  useEffect(() => {
    if (reducedMotion) return;
    enter.set(withDelay(delay, withTiming(1, { duration: 560, easing: Easing.out(Easing.cubic) })));
    drift.set(
      withDelay(delay, withRepeat(withSequence(withTiming(1, { duration: 2600 + delay, easing: Easing.inOut(Easing.sin) }), withTiming(0, { duration: 2600 + delay, easing: Easing.inOut(Easing.sin) })), -1, false)),
    );
  }, [reducedMotion, delay, enter, drift]);

  const style = useAnimatedStyle(() => ({
    opacity: enter.get(),
    transform: [
      { translateY: 28 * (1 - enter.get()) + (drift.get() - 0.5) * 6 },
      { rotate: `${rotate * (0.6 + 0.4 * enter.get()) + (drift.get() - 0.5) * 1.5}deg` },
      { scale: 0.94 + 0.06 * enter.get() },
    ],
  }));

  return <Animated.View style={[styles.fragment, { left: x, top: y, width: w }, style]}>{children}</Animated.View>;
}

function Card({ title, icon, children }: { title: string; icon: string; children: ReactNode }) {
  return (
    <View style={styles.card}>
      <View style={styles.cardHeader}>
        <SymbolView name={icon as never} size={11} weight="semibold" tintColor={Accent.primary} fallback={<View style={styles.iconFallback} />} />
        <Text style={styles.cardTitle}>{title}</Text>
      </View>
      {children}
    </View>
  );
}

function CalendarCard() {
  const days = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];
  return (
    <Card title="June 2026" icon="calendar">
      <View style={styles.row}>
        {days.map((d, i) => (
          <Text key={i} style={styles.dayLabel}>
            {d}
          </Text>
        ))}
      </View>
      <View style={styles.row}>
        {[7, 8, 9, 10, 11, 12, 13].map((n) => (
          <View key={n} style={[styles.day, n === 11 && styles.dayOn]}>
            <Text style={[styles.dayNum, n === 11 && styles.dayNumOn]}>{n}</Text>
          </View>
        ))}
      </View>
    </Card>
  );
}

function NotesCard() {
  return (
    <Card title="Notes" icon="note.text">
      <Text style={styles.note} numberOfLines={2}>
        More energy by day 4. Sleep better, appetite down.
      </Text>
      <Text style={styles.stamp}>May 30</Text>
    </Card>
  );
}

function DosesCard() {
  const rows = [
    { name: 'BPC-157', dose: '250 mcg', done: true },
    { name: 'Tesamorelin', dose: '2 mg', done: false },
    { name: 'Retatrutide', dose: '4 mg', done: false },
  ];
  return (
    <Card title="Today’s doses" icon="syringe">
      {rows.map((r) => (
        <View key={r.name} style={styles.line}>
          <View style={[styles.swatch, { backgroundColor: r.done ? Accent.primary : 'rgba(255,255,255,0.25)' }]} />
          <Text style={styles.lineText}>{r.name}</Text>
          <Text style={styles.lineValue}>{r.dose}</Text>
          <View style={[styles.tick, r.done && styles.tickOn]}>{r.done ? <SymbolView name="checkmark" size={7} weight="bold" tintColor="#062B1F" fallback={null} /> : null}</View>
        </View>
      ))}
    </Card>
  );
}

function InventoryCard() {
  const rows = [
    ['Retatrutide', '2 vials'],
    ['BPC-157', '3 vials'],
    ['CJC-1295', '1 vial'],
  ];
  return (
    <Card title="Inventory" icon="shippingbox">
      {rows.map(([n, v]) => (
        <View key={n} style={styles.line}>
          <Text style={styles.lineText}>{n}</Text>
          <Text style={styles.lineValue}>{v}</Text>
        </View>
      ))}
    </Card>
  );
}

function TrendCard() {
  const rows = [
    { v: '98%', chip: null },
    { v: '94%', chip: 'declining' },
    { v: '26%', chip: 'declining' },
  ];
  return (
    <Card title="Energy" icon="chart.line.downtrend.xyaxis">
      {rows.map((r, i) => (
        <View key={i} style={styles.line}>
          <Text style={styles.lineText}>{r.v}</Text>
          {r.chip ? <Text style={styles.chip}>{r.chip}</Text> : null}
        </View>
      ))}
    </Card>
  );
}

const RING = 44;
const ringPath = Skia.Path.Circle(RING / 2, RING / 2, RING / 2 - 4);

function AdherenceCard() {
  return (
    <Card title="Adherence" icon="checkmark.seal">
      <View style={styles.adherence}>
        <Canvas style={{ width: RING, height: RING }}>
          <Circle cx={RING / 2} cy={RING / 2} r={RING / 2 - 4} color="rgba(255,255,255,0.12)" style="stroke" strokeWidth={5} />
          <Path path={ringPath} color={Accent.primary} style="stroke" strokeWidth={5} strokeCap="round" start={0} end={0.71} transform={[{ rotate: -Math.PI / 2 }]} origin={{ x: RING / 2, y: RING / 2 }} />
        </Canvas>
        <View>
          <Text style={styles.big}>71%</Text>
          <Text style={styles.stamp}>12 of 14 doses</Text>
        </View>
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  fragment: { position: 'absolute' },
  card: {
    padding: 10,
    borderRadius: 14,
    backgroundColor: 'rgba(20,24,22,0.92)',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(255,255,255,0.16)',
    gap: 6,
    shadowColor: '#000',
    shadowOpacity: 0.45,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 8 },
  },
  cardHeader: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  cardTitle: { color: INK, fontFamily: Typeface.bodySemiBold, fontSize: 10.5, letterSpacing: -0.1 },
  iconFallback: { width: 8, height: 8, borderRadius: 4, backgroundColor: Accent.primary },
  row: { flexDirection: 'row', justifyContent: 'space-between' },
  dayLabel: { width: 18, textAlign: 'center', color: MUTED, fontFamily: Typeface.bodyMedium, fontSize: 7.5 },
  day: { width: 18, height: 18, borderRadius: 9, alignItems: 'center', justifyContent: 'center' },
  dayOn: { backgroundColor: Accent.primary },
  dayNum: { color: INK, fontFamily: Typeface.bodyMedium, fontSize: 9 },
  dayNumOn: { color: '#062B1F', fontFamily: Typeface.bodyBold },
  note: { color: 'rgba(242,242,244,0.8)', fontFamily: Typeface.body, fontSize: 9.5, lineHeight: 13 },
  stamp: { color: MUTED, fontFamily: Typeface.body, fontSize: 8.5 },
  line: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  swatch: { width: 3, height: 12, borderRadius: 1.5 },
  lineText: { flex: 1, color: INK, fontFamily: Typeface.bodyMedium, fontSize: 9.5 },
  lineValue: { color: MUTED, fontFamily: Typeface.body, fontSize: 9 },
  tick: { width: 12, height: 12, borderRadius: 6, borderWidth: 1, borderColor: 'rgba(255,255,255,0.3)', alignItems: 'center', justifyContent: 'center' },
  tickOn: { backgroundColor: Accent.primary, borderColor: Accent.primary },
  chip: { color: RED, fontFamily: Typeface.bodySemiBold, fontSize: 7.5, letterSpacing: 0.2, paddingHorizontal: 5, paddingVertical: 1.5, borderRadius: 6, backgroundColor: 'rgba(248,113,113,0.15)', textTransform: 'uppercase' },
  adherence: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  big: { color: INK, fontFamily: Typeface.bodyBold, fontSize: 15, letterSpacing: -0.3 },
});
