import { useRouter } from 'expo-router';
import { useMemo } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { ShotRow } from '@/components/shots/shot-row';
import { Card, EmptyState } from '@/components/ui/card';
import { Screen } from '@/components/ui/screen';
import { Colors, Spacing, Typeface } from '@/constants/theme';
import { useShots } from '@/data/store';
import type { Shot } from '@/data/types';
import { formatRelativeDay } from '@/lib/dates';

export default function HistoryScreen() {
  const router = useRouter();
  const shots = useShots();
  const sections = useMemo(() => groupByDate(shots), [shots]);

  return (
    <Screen title="History" subtitle={`${shots.length} shot${shots.length === 1 ? '' : 's'} logged`}>
      {shots.length === 0 ? (
        <EmptyState title="No history yet" detail="Every shot you log shows up here, newest first." />
      ) : (
        sections.map(({ date, entries }) => (
          <View key={date} style={styles.section}>
            <Text style={styles.date}>{formatRelativeDay(date)}</Text>
            <Card style={styles.list}>
              {entries.map((shot, index) => (
                <View key={shot.id}>
                  {index > 0 ? <View style={styles.divider} /> : null}
                  <ShotRow shot={shot} onPress={() => router.push(`/log?id=${shot.id}`)} />
                </View>
              ))}
            </Card>
          </View>
        ))
      )}
    </Screen>
  );
}

/** Shots arrive newest first, so insertion order already gives newest-first sections. */
function groupByDate(shots: Shot[]): { date: string; entries: Shot[] }[] {
  const sections: { date: string; entries: Shot[] }[] = [];
  for (const shot of shots) {
    const last = sections[sections.length - 1];
    if (last?.date === shot.date) last.entries.push(shot);
    else sections.push({ date: shot.date, entries: [shot] });
  }
  return sections;
}

const styles = StyleSheet.create({
  section: { gap: Spacing.two },
  date: { color: Colors.dark.textTertiary, fontFamily: Typeface.bodyMedium, fontSize: 13 },
  list: { paddingVertical: Spacing.one },
  divider: { height: 1, backgroundColor: Colors.dark.border },
});
