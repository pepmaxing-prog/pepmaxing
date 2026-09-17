import { useRouter } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { DayGrid, Legend, type DayCell } from '@/components/calendar/day-grid';
import { ShotRow } from '@/components/shots/shot-row';
import { StatRow, StatTile } from '@/components/today/summary-cards';
import { Card, CardTitle, SectionLabel } from '@/components/ui/card';
import { Screen } from '@/components/ui/screen';
import { Colors, Spacing, Typeface } from '@/constants/theme';
import { useShots } from '@/data/store';
import { adherenceRate, currentStreak, daysUntilNextDose, inferCadence } from '@/lib/adherence';
import { addDays, dateKeyRange, formatRelativeDay, startOfDay, toDateKey } from '@/lib/dates';

const CYCLE_DAYS = 30;

export default function CalendarScreen() {
  const router = useRouter();
  const shots = useShots();
  const [today] = useState(() => startOfDay(new Date()));
  const [selected, setSelected] = useState(() => toDateKey(new Date()));

  const cadence = inferCadence(shots);
  const untilNext = daysUntilNextDose(shots, cadence, today);
  const dueKey = untilNext != null ? toDateKey(addDays(today, untilNext)) : null;

  const counts = new Map<string, number>();
  for (const shot of shots) counts.set(shot.date, (counts.get(shot.date) ?? 0) + 1);
  const todayKey = toDateKey(today);
  const days: DayCell[] = dateKeyRange(addDays(today, -(CYCLE_DAYS - 1)), today).map((key) => ({
    key,
    count: counts.get(key) ?? 0,
    today: key === todayKey,
    due: key === dueKey,
  }));

  const dosedInCycle = days.filter((day) => day.count > 0).length;
  const adherence = adherenceRate(shots, cadence, CYCLE_DAYS, today);
  const streak = currentStreak(shots, cadence, today);
  const selectedShots = shots.filter((shot) => shot.date === selected);

  return (
    <Screen title="Calendar" subtitle={`Rolling ${CYCLE_DAYS}-day cycle`}>
      <StatRow>
        <StatTile value={`${dosedInCycle}`} label="Days dosed" />
        <StatTile
          value={adherence == null ? '—' : `${Math.round(adherence * 100)}%`}
          label="On schedule"
          accent={(adherence ?? 0) >= 0.9}
        />
        <StatTile value={streak > 0 ? `${streak}` : '—'} label="Streak" accent={streak >= 4} />
      </StatRow>

      <Card style={styles.gridCard}>
        <DayGrid days={days} onSelect={setSelected} />
        <Legend />
      </Card>

      <View style={styles.section}>
        <SectionLabel>{formatRelativeDay(selected, today)}</SectionLabel>
        <Card style={selectedShots.length > 0 ? styles.list : undefined}>
          {selectedShots.length === 0 ? (
            <Text style={styles.empty}>
              {selected === todayKey
                ? 'Nothing logged today yet.'
                : 'No dose logged on this day.'}
            </Text>
          ) : (
            selectedShots.map((shot, index) => (
              <View key={shot.id}>
                {index > 0 ? <View style={styles.divider} /> : null}
                <ShotRow shot={shot} onPress={() => router.push(`/log?id=${shot.id}`)} />
              </View>
            ))
          )}
        </Card>
      </View>

      {untilNext != null ? (
        <Card style={styles.nextCard}>
          <CardTitle>Next dose</CardTitle>
          <Text style={styles.nextDetail}>
            {dueKey ? formatRelativeDay(dueKey, today) : ''} · {cadence} protocol
          </Text>
        </Card>
      ) : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  gridCard: { gap: Spacing.three },
  section: { gap: Spacing.two },
  list: { paddingVertical: Spacing.one },
  divider: { height: 1, backgroundColor: Colors.dark.border },
  empty: { color: Colors.dark.textSecondary, fontFamily: Typeface.body, fontSize: 14 },
  nextCard: { gap: Spacing.one },
  nextDetail: { color: Colors.dark.textSecondary, fontFamily: Typeface.body, fontSize: 14 },
});
