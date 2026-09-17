import { useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import { StyleSheet, Text, View, useWindowDimensions } from 'react-native';

import { ShineButton } from '@/components/shine-button';
import { ShotRow } from '@/components/shots/shot-row';
import { LevelChart } from '@/components/today/level-chart';
import { StatRow, StatTile } from '@/components/today/summary-cards';
import { WinCard } from '@/components/today/win-card';
import { Card, CardTitle, EmptyState, SectionLabel } from '@/components/ui/card';
import { Screen } from '@/components/ui/screen';
import { Accent, Colors, Spacing, Typeface } from '@/constants/theme';
import { useCadence, useShots } from '@/data/store';
import { currentStreak, daysUntilNextDose, milestonesFor } from '@/lib/adherence';
import { DAY_MS, formatSince } from '@/lib/dates';
import { estimatedLevelMcg, formatLevel, levelSeries, shotTimestamp } from '@/lib/levels';

const WINDOW_DAYS = 30;

export default function TodayScreen() {
  const router = useRouter();
  const shots = useShots();
  const { width } = useWindowDimensions();
  const chartWidth = Math.min(width, 800) - Spacing.four * 2 - Spacing.four * 2;

  // Pinned at mount: the curve and the elapsed labels should not drift mid-render.
  const [now] = useState(() => Date.now());
  const series = useMemo(
    () => levelSeries(shots, { from: now - WINDOW_DAYS * DAY_MS, to: now }),
    [shots, now],
  );

  const last = shots[0];
  const cadence = useCadence();
  const level = estimatedLevelMcg(shots, now);
  const streak = currentStreak(shots, cadence);
  const untilNext = daysUntilNextDose(shots, cadence);
  const win = milestonesFor(shots, cadence)[0];

  return (
    <Screen title="Today" subtitle="Your protocol at a glance">
      {win ? <WinCard milestone={win} /> : null}

      <StatRow>
        <StatTile value={`${shots.length}`} label="Shots taken" />
        <StatTile value={last ? formatSince(shotTimestamp(last), now) : '—'} label="Last dose" />
        <StatTile value={formatLevel(level)} label="Est. level" accent={level > 0} />
      </StatRow>

      <Card style={styles.chartCard}>
        <View style={styles.chartHeader}>
          <CardTitle>Estimated level</CardTitle>
          <Text style={styles.windowLabel}>Last {WINDOW_DAYS} days</Text>
        </View>
        <LevelChart series={series} width={chartWidth} />
        <Text style={styles.disclaimer}>
          Modelled from published half-lives. A trend, not medical advice.
        </Text>
      </Card>

      <ShineButton label="Log a shot" onPress={() => router.push('/log')} />

      {untilNext != null ? (
        <Card style={styles.nextCard}>
          <Text style={styles.nextValue}>
            {untilNext > 0
              ? `Next dose in ${untilNext} day${untilNext === 1 ? '' : 's'}`
              : untilNext === 0
                ? 'Next dose due today'
                : `Overdue by ${-untilNext} day${untilNext === -1 ? '' : 's'}`}
          </Text>
          {streak > 1 ? <Text style={styles.streak}>{streak} doses in a row</Text> : null}
        </Card>
      ) : null}

      <View style={styles.section}>
        <SectionLabel>Recent</SectionLabel>
        {shots.length === 0 ? (
          <EmptyState
            title="Nothing logged yet"
            detail="Log your first shot and Pepmaxing will start tracking levels, streaks and progress."
          />
        ) : (
          <Card style={styles.list}>
            {shots.slice(0, 3).map((shot, index) => (
              <View key={shot.id}>
                {index > 0 ? <View style={styles.divider} /> : null}
                <ShotRow shot={shot} onPress={() => router.push(`/log?id=${shot.id}`)} />
              </View>
            ))}
          </Card>
        )}
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  chartCard: { gap: Spacing.two },
  chartHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  windowLabel: { color: Colors.dark.textTertiary, fontFamily: Typeface.body, fontSize: 12 },
  disclaimer: { color: Colors.dark.textTertiary, fontFamily: Typeface.body, fontSize: 12 },
  nextCard: { paddingVertical: Spacing.three, gap: 2 },
  nextValue: { color: Colors.dark.text, fontFamily: Typeface.bodySemiBold, fontSize: 15 },
  streak: { color: Accent.primary, fontFamily: Typeface.bodyMedium, fontSize: 13 },
  section: { gap: Spacing.two },
  list: { paddingVertical: Spacing.one },
  divider: { height: 1, backgroundColor: Colors.dark.border },
});
