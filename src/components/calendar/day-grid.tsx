import { StyleSheet, Text, View, type StyleProp, type ViewStyle } from 'react-native';

import { PressableScale } from '@/components/pressable-scale';
import { Accent, Colors, Spacing, Typeface } from '@/constants/theme';
import { fromDateKey } from '@/lib/dates';

const WEEKDAYS = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];

export type DayCell = {
  key: string;
  /** Doses logged on this day. */
  count: number;
  today: boolean;
  /** Projected next dose, not yet taken. */
  due: boolean;
};

/**
 * Rolling 30-day cycle laid out as weeks starting on Monday, so columns line up with
 * weekdays and a weekly protocol shows as a straight vertical line.
 */
export function DayGrid({ days, onSelect }: { days: DayCell[]; onSelect: (key: string) => void }) {
  const leading = (fromDateKey(days[0].key).getDay() + 6) % 7;

  return (
    <View style={styles.root}>
      <View style={styles.week}>
        {WEEKDAYS.map((label, index) => (
          <Text key={index} style={styles.weekday}>
            {label}
          </Text>
        ))}
      </View>
      <View style={styles.grid}>
        {Array.from({ length: leading }, (_, index) => (
          <View key={`pad-${index}`} style={styles.cell} />
        ))}
        {days.map((day) => (
          <PressableScale
            key={day.key}
            accessibilityRole="button"
            accessibilityLabel={`${day.key}, ${day.count} shots`}
            style={styles.cell}
            onPress={() => onSelect(day.key)}>
            <View
              style={[
                styles.dot,
                day.count > 0 && styles.dotDosed,
                day.count > 1 && styles.dotDouble,
                day.due && styles.dotDue,
                day.today && styles.dotToday,
              ]}>
              <Text style={[styles.dayLabel, day.count > 0 && styles.dayLabelDosed]}>
                {fromDateKey(day.key).getDate()}
              </Text>
            </View>
          </PressableScale>
        ))}
      </View>
    </View>
  );
}

export function Legend() {
  return (
    <View style={styles.legend}>
      <LegendItem style={styles.dotDosed} label="Dose logged" />
      <LegendItem style={styles.dotDue} label="Due" />
      <LegendItem style={styles.dotToday} label="Today" />
    </View>
  );
}

function LegendItem({ style, label }: { style: StyleProp<ViewStyle>; label: string }) {
  return (
    <View style={styles.legendItem}>
      <View style={[styles.swatch, style]} />
      <Text style={styles.legendLabel}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { gap: Spacing.two },
  week: { flexDirection: 'row' },
  weekday: {
    flex: 1,
    textAlign: 'center',
    color: Colors.dark.textTertiary,
    fontFamily: Typeface.bodyMedium,
    fontSize: 11,
  },
  grid: { flexDirection: 'row', flexWrap: 'wrap', rowGap: Spacing.two },
  cell: { width: `${100 / 7}%`, alignItems: 'center' },
  dot: {
    width: 36,
    height: 36,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.dark.backgroundElement,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  dotDosed: { backgroundColor: Accent.primarySoft },
  dotDouble: { backgroundColor: Accent.primary },
  dotDue: { borderColor: Accent.primary, borderStyle: 'dashed' },
  dotToday: { borderColor: Colors.dark.text },
  dayLabel: { color: Colors.dark.textTertiary, fontFamily: Typeface.bodyMedium, fontSize: 13 },
  dayLabelDosed: { color: Colors.dark.text },
  legend: { flexDirection: 'row', gap: Spacing.three, flexWrap: 'wrap' },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: Spacing.one },
  swatch: {
    width: 14,
    height: 14,
    borderRadius: 5,
    backgroundColor: Colors.dark.backgroundElement,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  legendLabel: { color: Colors.dark.textSecondary, fontFamily: Typeface.body, fontSize: 12 },
});
