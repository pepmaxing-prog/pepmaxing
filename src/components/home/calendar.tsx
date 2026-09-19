import { SymbolView } from 'expo-symbols';
import { useMemo, useState, type RefObject } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Gesture, GestureDetector, type ScrollView as GHScrollView } from 'react-native-gesture-handler';
import Animated, { Easing, FadeIn, interpolate, useAnimatedStyle, useSharedValue, withSpring } from 'react-native-reanimated';
import { scheduleOnRN } from 'react-native-worklets';

import { PressableScale } from '@/components/pressable-scale';
import { Accent, Spacing, Typeface } from '@/constants/theme';
import { addDays, dayKey, MONTHS, monthGrid, sameDay, startOfWeek, weekdayLabels, type DoseEvent } from '@/lib/schedule';

const CELL = 40;
const ROW_GAP = 6;
const WEEK_ROW = CELL + 12;
const MONTH_HEADER = 44;
const MONTH_ROWS = 6;
const WEEK_HEIGHT = 18 + WEEK_ROW + 6;
const MONTH_HEIGHT = MONTH_HEADER + 18 + MONTH_ROWS * (CELL + ROW_GAP) + 8;

type Props = {
  selected: Date;
  onSelect: (date: Date) => void;
  doses: DoseEvent[];
  weekStartsOn: 0 | 1;
  /** The page's scroll view, so a vertical drag on the card opens the calendar instead of scrolling. */
  scrollRef?: RefObject<GHScrollView | null>;
};

/**
 * The home calendar: a seven-day strip that pulls open into a full month. One progress value
 * (0 = week, 1 = month) drives the height, the strip/grid cross-fade and the handle, so drag,
 * tap and swipe all move the same thing. Swiping the open month changes month.
 */
export function Calendar({ selected, onSelect, doses, weekStartsOn, scrollRef }: Props) {
  const today = useMemo(() => new Date(), []);
  const [open, setOpen] = useState(false);
  const [visibleMonth, setVisibleMonth] = useState({ year: selected.getFullYear(), month: selected.getMonth() });
  const [slideKey, setSlideKey] = useState(0);
  const progress = useSharedValue(0);
  const dragStart = useSharedValue(0);

  const dotsByDay = useMemo(() => {
    const map = new Map<string, DoseEvent[]>();
    for (const d of doses) map.set(d.day, [...(map.get(d.day) ?? []), d]);
    return map;
  }, [doses]);

  const setOpenState = (next: boolean) => {
    setOpen(next);
    if (next) setVisibleMonth({ year: selected.getFullYear(), month: selected.getMonth() });
  };
  const animateTo = (next: boolean) => {
    progress.set(withSpring(next ? 1 : 0, { damping: 22, stiffness: 190, mass: 0.9 }));
    setOpenState(next);
  };

  const handleTap = () => animateTo(!open);
  // Drag anywhere on the card. Closed: only a downward drag counts (an upward one scrolls the page).
  // Open: either direction. Horizontal movement is left to the month swipe.
  let pan = Gesture.Pan()
    .activeOffsetY(open ? [-10, 10] : 10)
    .failOffsetX([-24, 24])
    .onStart(() => {
      dragStart.set(progress.get());
    })
    .onUpdate((e) => {
      progress.set(Math.min(1, Math.max(0, dragStart.get() + e.translationY / (MONTH_HEIGHT - WEEK_HEIGHT))));
    })
    .onEnd((e) => {
      const shouldOpen = e.velocityY > 300 ? true : e.velocityY < -300 ? false : progress.get() > 0.5;
      progress.set(withSpring(shouldOpen ? 1 : 0, { damping: 22, stiffness: 190, mass: 0.9 }));
      scheduleOnRN(setOpenState, shouldOpen);
    });
  if (!open) pan = pan.failOffsetY(-12);
  if (scrollRef) pan = pan.blocksExternalGesture(scrollRef);

  const shiftMonth = (delta: number) => {
    setVisibleMonth((m) => {
      const d = new Date(m.year, m.month + delta, 1);
      return { year: d.getFullYear(), month: d.getMonth() };
    });
    setSlideKey((k) => k + delta);
  };
  const swipe = Gesture.Pan()
    .activeOffsetX([-16, 16])
    .failOffsetY([-12, 12])
    .onEnd((e) => {
      if (e.translationX < -48 || e.velocityX < -500) scheduleOnRN(shiftMonth, 1);
      else if (e.translationX > 48 || e.velocityX > 500) scheduleOnRN(shiftMonth, -1);
    });

  const goToday = () => {
    onSelect(today);
    setVisibleMonth({ year: today.getFullYear(), month: today.getMonth() });
    setSlideKey((k) => k + 1);
  };

  const containerStyle = useAnimatedStyle(() => ({ height: interpolate(progress.get(), [0, 1], [WEEK_HEIGHT, MONTH_HEIGHT]) }));
  const weekStyle = useAnimatedStyle(() => ({ opacity: interpolate(progress.get(), [0, 0.35], [1, 0], 'clamp') }));
  const monthStyle = useAnimatedStyle(() => ({ opacity: interpolate(progress.get(), [0.3, 0.8], [0, 1], 'clamp') }));
  const handleStyle = useAnimatedStyle(() => ({ width: interpolate(progress.get(), [0, 1], [36, 56]) }));

  const weekStart = startOfWeek(selected, weekStartsOn);
  const week = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));
  const labels = weekdayLabels(weekStartsOn);
  const grid = monthGrid(visibleMonth.year, visibleMonth.month, weekStartsOn);

  const renderDay = (date: Date, dimmed = false) => {
    const isToday = sameDay(date, today);
    const isSelected = sameDay(date, selected);
    const dots = dotsByDay.get(dayKey(date)) ?? [];
    return (
      <PressableScale key={dayKey(date)} onPress={() => onSelect(date)} accessibilityRole="button" accessibilityLabel={date.toDateString()} accessibilityState={{ selected: isSelected }} style={styles.day}>
        <View style={[styles.cell, isToday && styles.cellToday, isSelected && styles.cellSelected]}>
          <Text style={[styles.dayNum, dimmed && styles.dayNumDim, isSelected && styles.dayNumSelected]}>{date.getDate()}</Text>
        </View>
        <View style={styles.dots}>
          {dots.length === 0 ? (
            <View style={styles.dash} />
          ) : (
            dots.slice(0, 3).map((d) => <View key={d.id} style={[styles.dot, { backgroundColor: d.color, opacity: d.logged ? 1 : 0.55 }]} />)
          )}
        </View>
      </PressableScale>
    );
  };

  return (
    <GestureDetector gesture={pan}>
      <View style={styles.card}>
        <Animated.View style={[styles.container, containerStyle]}>
        <Animated.View style={[styles.layer, weekStyle, { pointerEvents: open ? 'none' : 'auto' }]}>
          <View style={styles.labels}>
            {labels.map((l) => (
              <Text key={l} style={styles.label}>
                {l}
              </Text>
            ))}
          </View>
          <View style={styles.row}>{week.map((d) => renderDay(d))}</View>
        </Animated.View>

        <Animated.View style={[styles.layer, monthStyle, { pointerEvents: open ? 'auto' : 'none' }]}>
          <View style={styles.monthHeader}>
            <PressableScale onPress={() => animateTo(false)} accessibilityRole="button" accessibilityLabel="Close calendar" hitSlop={10} style={styles.iconButton}>
              <SymbolView name="xmark" size={15} weight="semibold" tintColor="#F5F5F7" fallback={<Text style={styles.fallbackGlyph}>×</Text>} />
            </PressableScale>
            <View style={styles.monthNav}>
              <PressableScale onPress={() => shiftMonth(-1)} accessibilityRole="button" accessibilityLabel="Previous month" hitSlop={10} style={styles.iconButton}>
                <SymbolView name="chevron.left" size={14} weight="semibold" tintColor="rgba(242,242,244,0.7)" fallback={<Text style={styles.fallbackGlyph}>‹</Text>} />
              </PressableScale>
              <Text style={styles.monthTitle}>
                {MONTHS[visibleMonth.month]} {visibleMonth.year}
              </Text>
              <PressableScale onPress={() => shiftMonth(1)} accessibilityRole="button" accessibilityLabel="Next month" hitSlop={10} style={styles.iconButton}>
                <SymbolView name="chevron.right" size={14} weight="semibold" tintColor="rgba(242,242,244,0.7)" fallback={<Text style={styles.fallbackGlyph}>›</Text>} />
              </PressableScale>
            </View>
            <PressableScale onPress={goToday} accessibilityRole="button" style={styles.todayPill}>
              <Text style={styles.todayLabel}>Today</Text>
            </PressableScale>
          </View>
          <GestureDetector gesture={swipe}>
            <View>
              <View style={styles.labels}>
                {labels.map((l) => (
                  <Text key={l} style={styles.label}>
                    {l}
                  </Text>
                ))}
              </View>
              <Animated.View key={slideKey} entering={FadeIn.duration(220).easing(Easing.out(Easing.quad))} style={styles.grid}>
                {grid.map((d) => renderDay(d, d.getMonth() !== visibleMonth.month))}
              </Animated.View>
            </View>
          </GestureDetector>
        </Animated.View>
        </Animated.View>

        <PressableScale onPress={handleTap} accessibilityRole="button" accessibilityLabel={open ? 'Collapse calendar' : 'Expand calendar'} style={styles.handleZone}>
          <Animated.View style={[styles.handle, handleStyle]} />
        </PressableScale>
      </View>
    </GestureDetector>
  );
}

const styles = StyleSheet.create({
  card: {
    paddingTop: Spacing.two + Spacing.half,
    paddingHorizontal: Spacing.one,
    borderRadius: 26,
    backgroundColor: 'rgba(255,255,255,0.055)',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(255,255,255,0.12)',
  },
  container: { overflow: 'hidden' },
  layer: { position: 'absolute', top: 0, left: 0, right: 0 },
  labels: { flexDirection: 'row', height: 18 },
  label: { flex: 1, textAlign: 'center', color: 'rgba(242,242,244,0.45)', fontFamily: Typeface.bodyMedium, fontSize: 11, letterSpacing: 0.2 },
  row: { flexDirection: 'row', height: WEEK_ROW },
  grid: { flexDirection: 'row', flexWrap: 'wrap' },
  day: { width: `${100 / 7}%`, alignItems: 'center', height: CELL + ROW_GAP, justifyContent: 'flex-start' },
  cell: { width: CELL - 6, height: CELL - 6, borderRadius: (CELL - 6) / 2, alignItems: 'center', justifyContent: 'center' },
  cellToday: { borderWidth: 1.5, borderColor: Accent.primary },
  cellSelected: { backgroundColor: Accent.primary, borderColor: Accent.primary },
  dayNum: { color: '#F2F2F4', fontFamily: Typeface.bodyMedium, fontSize: 15, letterSpacing: -0.2 },
  dayNumDim: { color: 'rgba(242,242,244,0.3)' },
  dayNumSelected: { color: '#062B1F', fontFamily: Typeface.bodyBold },
  dots: { flexDirection: 'row', gap: 3, height: 6, alignItems: 'center', marginTop: 2 },
  dash: { width: 6, height: 2, borderRadius: 1, backgroundColor: 'rgba(255,255,255,0.14)' },
  dot: { width: 5, height: 5, borderRadius: 2.5 },
  monthHeader: { height: MONTH_HEADER, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  monthNav: { flexDirection: 'row', alignItems: 'center', gap: Spacing.two },
  monthTitle: { color: '#F5F5F7', fontFamily: Typeface.bodySemiBold, fontSize: 15, letterSpacing: -0.2, minWidth: 120, textAlign: 'center' },
  iconButton: { width: 32, height: 32, alignItems: 'center', justifyContent: 'center' },
  fallbackGlyph: { color: '#F5F5F7', fontSize: 16 },
  todayPill: { height: 30, paddingHorizontal: 12, borderRadius: 15, borderWidth: 1, borderColor: 'rgba(255,255,255,0.25)', alignItems: 'center', justifyContent: 'center' },
  todayLabel: { color: '#F5F5F7', fontFamily: Typeface.bodySemiBold, fontSize: 12.5, letterSpacing: -0.1 },
  handleZone: { height: 30, alignItems: 'center', justifyContent: 'center' },
  handle: { height: 5, borderRadius: 2.5, backgroundColor: 'rgba(255,255,255,0.32)' },
});
