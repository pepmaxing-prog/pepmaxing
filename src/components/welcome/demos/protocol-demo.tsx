import { Canvas, Circle, Group, Path, Skia } from '@shopify/react-native-skia';
import { StyleSheet, Text, View } from 'react-native';
import Animated, {
  cancelAnimation,
  Easing,
  useAnimatedStyle,
  useDerivedValue,
  useSharedValue,
  withDelay,
  withSequence,
  withSpring,
  withTiming,
  type SharedValue,
} from 'react-native-reanimated';

import { Typeface } from '@/constants/theme';

import { MockTabBar } from './mock-tab-bar';
import { AnimatedText, Demo, DemoHeader, MockStatusBar, useDemoLoop } from './shared';

const LOOP_MS = 5600;
const ROW_DURATION = 480;
const ROW_STAGGER = 110;
const RING_SIZE = 84;
const RING_STROKE = 8;

const ringPath = Skia.Path.Make();
ringPath.addCircle(RING_SIZE / 2, RING_SIZE / 2, (RING_SIZE - RING_STROKE) / 2);
const checkPath = Skia.Path.MakeFromSVGString('M5 11.5 L9.5 16 L17 6.5')!;

const COMPOUNDS = [
  { name: 'BPC-157', detail: '250 mcg · 8:00 AM', done: true },
  { name: 'TB-500', detail: '2.5 mg · 8:00 AM', done: true },
  { name: 'Semaglutide', detail: '0.5 mg · due 6:00 PM', done: false },
] as const;
const WEEK = [
  { day: 'M', value: 1 },
  { day: 'T', value: 0.8 },
  { day: 'W', value: 1 },
  { day: 'T', value: 0.6 },
  { day: 'F', value: 1 },
  { day: 'S', value: 0.9 },
  { day: 'S', value: 0.6, today: true },
] as const;
const ROWS_TOTAL = ROW_DURATION + (COMPOUNDS.length - 1) * ROW_STAGGER;
const easeOut = Easing.out(Easing.cubic);

export function ProtocolDemo({ active }: { active: boolean }) {
  const card = useSharedValue(0);
  const ring = useSharedValue(0);
  const rows = useSharedValue(0);
  const press = useSharedValue(1);
  const check = useSharedValue(0);

  useDemoLoop(
    active,
    LOOP_MS,
    () => {
      card.value = withTiming(1, { duration: 520, easing: easeOut });
      ring.value = withDelay(150, withTiming(0.6, { duration: 900, easing: easeOut }));
      rows.value = withDelay(250, withTiming(1, { duration: ROWS_TOTAL, easing: Easing.linear }));
      press.value = withDelay(
        1700,
        withSequence(withTiming(0.9, { duration: 110 }), withSpring(1, { damping: 12, stiffness: 260 })),
      );
      check.value = withDelay(1850, withTiming(1, { duration: 480, easing: easeOut }));
      ring.value = withDelay(1900, withTiming(0.8, { duration: 800, easing: easeOut }));
    },
    () => {
      [card, ring, rows, press, check].forEach(cancelAnimation);
      card.value = 0;
      ring.value = 0;
      rows.value = 0;
      press.value = 1;
      check.value = 0;
    },
  );

  const percent = useDerivedValue(() => `${Math.round(ring.value * 100)}%`);
  const doses = useDerivedValue<string>(() => (check.value > 0.35 ? '4 of 5 doses' : '3 of 5 doses'));
  const cardStyle = useAnimatedStyle(() => ({
    opacity: card.value,
    transform: [{ translateY: 18 * (1 - card.value) }],
  }));
  const weekStyle = useAnimatedStyle(() => {
    const local = Math.min(Math.max((rows.value * ROWS_TOTAL - ROWS_TOTAL + 200) / 420, 0), 1);
    const eased = 1 - Math.pow(1 - local, 3);
    return { opacity: eased, transform: [{ translateY: 14 * (1 - eased) }] };
  });

  return (
    <View style={styles.screen}>
      <MockStatusBar />
      <DemoHeader title="Today" subtitle="Monday, Sep 14" />

      <Animated.View style={[styles.card, cardStyle]}>
        <Canvas style={{ width: RING_SIZE, height: RING_SIZE }}>
          <Circle
            cx={RING_SIZE / 2}
            cy={RING_SIZE / 2}
            r={(RING_SIZE - RING_STROKE) / 2}
            style="stroke"
            strokeWidth={RING_STROKE}
            color="rgba(255,255,255,0.08)"
          />
          <Group origin={{ x: RING_SIZE / 2, y: RING_SIZE / 2 }} transform={[{ rotate: -Math.PI / 2 }]}>
            <Path
              path={ringPath}
              style="stroke"
              strokeWidth={RING_STROKE}
              strokeCap="round"
              color={Demo.accent}
              start={0}
              end={ring}
            />
          </Group>
        </Canvas>
        <View style={styles.ringLabel} pointerEvents="none">
          <AnimatedText text={percent} style={styles.ringPercent} />
        </View>
        <View style={styles.cardText}>
          <Text style={styles.cardTitle}>Adherence</Text>
          <AnimatedText text={doses} style={styles.cardValue} />
          <View style={styles.onTrack}>
            <View style={styles.onTrackDot} />
            <Text style={styles.onTrackText}>On track this week</Text>
          </View>
        </View>
      </Animated.View>

      <Text style={styles.sectionLabel}>PROTOCOL</Text>
      {COMPOUNDS.map((compound, i) => (
        <CompoundRow
          key={compound.name}
          index={i}
          progress={rows}
          name={compound.name}
          detail={compound.detail}
          done={compound.done}
          press={compound.done ? undefined : press}
          check={compound.done ? undefined : check}
        />
      ))}

      <Animated.View style={[styles.weekCard, weekStyle]}>
        <View style={styles.weekHeader}>
          <Text style={styles.cardTitle}>This week</Text>
          <Text style={styles.weekValue}>92%</Text>
        </View>
        <View style={styles.weekBars}>
          {WEEK.map((d, i) => (
            <WeekBar key={i} day={d.day} value={d.value} today={'today' in d} check={check} />
          ))}
        </View>
      </Animated.View>

      <MockTabBar active={0} />
    </View>
  );
}

function WeekBar({
  day,
  value,
  today,
  check,
}: {
  day: string;
  value: number;
  today: boolean;
  check: SharedValue<number>;
}) {
  const barStyle = useAnimatedStyle(() => ({
    height: 26 * (today ? value + 0.25 * check.value : value),
    backgroundColor: today ? Demo.accent : 'rgba(255,255,255,0.22)',
  }));
  return (
    <View style={styles.weekCol}>
      <View style={styles.weekTrack}>
        <Animated.View style={[styles.weekBar, barStyle]} />
      </View>
      <Text style={[styles.weekDay, today && { color: Demo.text }]}>{day}</Text>
    </View>
  );
}

function CompoundRow({
  index,
  progress,
  name,
  detail,
  done,
  press,
  check,
}: {
  index: number;
  progress: SharedValue<number>;
  name: string;
  detail: string;
  done: boolean;
  press?: SharedValue<number>;
  check?: SharedValue<number>;
}) {
  const style = useAnimatedStyle(() => {
    const elapsed = progress.value * ROWS_TOTAL - index * ROW_STAGGER;
    const local = Math.min(Math.max(elapsed / ROW_DURATION, 0), 1);
    const eased = 1 - Math.pow(1 - local, 3);
    return { opacity: eased, transform: [{ translateX: 28 * (1 - eased) }] };
  });
  const buttonStyle = useAnimatedStyle(() => ({
    opacity: check ? 1 - Math.min(check.value * 2.5, 1) : 0,
    transform: [{ scale: press?.value ?? 1 }],
  }));
  const checkWrapStyle = useAnimatedStyle(() => ({
    opacity: check ? Math.min(check.value * 3, 1) : 1,
    transform: [{ scale: check ? 0.6 + 0.4 * Math.min(check.value * 1.6, 1) : 1 }],
  }));

  return (
    <Animated.View style={[styles.row, style]}>
      <View style={[styles.rowDot, { backgroundColor: done ? Demo.accent : Demo.faint }]} />
      <View style={styles.rowText}>
        <Text style={styles.rowName}>{name}</Text>
        <Text style={styles.rowDetail}>{detail}</Text>
      </View>
      {done ? (
        <View style={styles.checkCircle}>
          <StaticCheck />
        </View>
      ) : (
        <View style={styles.rowAction}>
          <Animated.View style={[styles.logButton, buttonStyle]}>
            <Text style={styles.logText}>Log</Text>
          </Animated.View>
          <Animated.View style={[styles.checkCircle, styles.checkOverlay, checkWrapStyle]}>
            <Canvas style={styles.checkCanvas}>
              <Path
                path={checkPath}
                style="stroke"
                strokeWidth={2.4}
                strokeCap="round"
                strokeJoin="round"
                color="#04140D"
                start={0}
                end={check ?? 1}
              />
            </Canvas>
          </Animated.View>
        </View>
      )}
    </Animated.View>
  );
}

function StaticCheck() {
  return (
    <Canvas style={styles.checkCanvas}>
      <Path
        path={checkPath}
        style="stroke"
        strokeWidth={2.4}
        strokeCap="round"
        strokeJoin="round"
        color="#04140D"
      />
    </Canvas>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: Demo.bg },
  card: {
    marginHorizontal: 16,
    marginTop: 4,
    padding: 14,
    borderRadius: 22,
    backgroundColor: Demo.card,
    borderWidth: 1,
    borderColor: Demo.border,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  ringLabel: {
    position: 'absolute',
    left: 15,
    top: 15,
    width: RING_SIZE,
    height: RING_SIZE,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ringPercent: { fontSize: 19, letterSpacing: -0.6, textAlign: 'center', width: 60 },
  cardText: { flex: 1, gap: 3 },
  cardTitle: { color: Demo.muted, fontFamily: Typeface.bodyMedium, fontSize: 12.5 },
  cardValue: { fontSize: 20, letterSpacing: -0.5 },
  onTrack: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 4 },
  onTrackDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: Demo.accent },
  onTrackText: { color: Demo.muted, fontFamily: Typeface.body, fontSize: 12 },
  sectionLabel: {
    color: Demo.faint,
    fontFamily: Typeface.bodySemiBold,
    fontSize: 11,
    letterSpacing: 0.9,
    marginTop: 12,
    marginBottom: 7,
    marginHorizontal: 22,
  },
  row: {
    marginHorizontal: 16,
    marginBottom: 7,
    paddingVertical: 11,
    paddingHorizontal: 14,
    borderRadius: 18,
    backgroundColor: Demo.card,
    borderWidth: 1,
    borderColor: Demo.border,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  rowDot: { width: 8, height: 8, borderRadius: 4 },
  rowText: { flex: 1, gap: 2 },
  rowName: { color: Demo.text, fontFamily: Typeface.bodySemiBold, fontSize: 14.5, letterSpacing: -0.2 },
  rowDetail: { color: Demo.muted, fontFamily: Typeface.body, fontSize: 12 },
  rowAction: { width: 52, height: 28, alignItems: 'flex-end', justifyContent: 'center' },
  logButton: {
    paddingHorizontal: 12,
    height: 28,
    borderRadius: 14,
    backgroundColor: Demo.text,
    alignItems: 'center',
    justifyContent: 'center',
  },
  logText: { color: '#000', fontFamily: Typeface.bodySemiBold, fontSize: 12.5 },
  checkCircle: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: Demo.accent,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkOverlay: { position: 'absolute', right: 0 },
  checkCanvas: { width: 22, height: 22 },
  weekCard: {
    marginHorizontal: 16,
    marginTop: 6,
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: 8,
    borderRadius: 18,
    backgroundColor: Demo.card,
    borderWidth: 1,
    borderColor: Demo.border,
  },
  weekHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  weekValue: { color: Demo.text, fontFamily: Typeface.bodySemiBold, fontSize: 13 },
  weekBars: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 10 },
  weekCol: { alignItems: 'center', gap: 5, width: 24 },
  weekTrack: { height: 30, justifyContent: 'flex-end' },
  weekBar: { width: 8, borderRadius: 4 },
  weekDay: { color: Demo.faint, fontFamily: Typeface.bodyMedium, fontSize: 10 },
});
