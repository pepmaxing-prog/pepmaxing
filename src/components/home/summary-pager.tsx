import { useRouter } from 'expo-router';
import { SymbolView, type SFSymbol } from 'expo-symbols';
import { useState } from 'react';
import { ScrollView, StyleSheet, Text, View, type NativeScrollEvent, type NativeSyntheticEvent } from 'react-native';

import { LevelChart } from '@/components/home/level-chart';
import { RingGauge } from '@/components/home/ring-gauge';
import { PressableScale } from '@/components/pressable-scale';
import { Accent, Spacing, Typeface } from '@/constants/theme';
import { describeTrend, pkProfile } from '@/lib/pk';
import { formatMg, formatRelative, formatWhen, type CompoundSummary, type Schedule } from '@/lib/schedule';

const AMBER = '#FBBF24';
const RED = '#F87171';

/**
 * One page per tracked compound (the Next dose hero with its interval ring, then Last dose and
 * Level), and a final page with the estimated-level chart. Swipe between them; dots below.
 */
export function SummaryPager({ summaries, schedule, width, now }: { summaries: CompoundSummary[]; schedule: Schedule; width: number; now: Date }) {
  const [page, setPage] = useState(0);
  const onScroll = (e: NativeSyntheticEvent<NativeScrollEvent>) => setPage(Math.round(e.nativeEvent.contentOffset.x / width));
  const chart = summaries.some((s) => s.compoundId);
  const pages = summaries.length + (chart ? 1 : 0);
  return (
    <View>
      <ScrollView horizontal pagingEnabled showsHorizontalScrollIndicator={false} onMomentumScrollEnd={onScroll} scrollEnabled={pages > 1}>
        {summaries.map((s) => (
          <View key={s.key} style={{ width }}>
            <SummaryPage summary={s} schedule={schedule} now={now} width={width} />
          </View>
        ))}
        {chart ? (
          <View key="chart" style={{ width }}>
            <LevelChart schedule={schedule} summaries={summaries} width={width} now={now} />
          </View>
        ) : null}
      </ScrollView>
      {pages > 1 ? (
        <View style={styles.dots}>
          {Array.from({ length: pages }, (_, i) => (
            <View key={i} style={[styles.dot, i === page && styles.dotOn]} />
          ))}
        </View>
      ) : null}
    </View>
  );
}

function SummaryPage({ summary, schedule, now, width }: { summary: CompoundSummary; schedule: Schedule; now: Date; width: number }) {
  const router = useRouter();
  // The ring shrinks on narrow phones so the headline keeps room to breathe.
  const ringSize = Math.round(Math.min(128, Math.max(104, width * 0.34)));
  const trend = summary.compoundId && summary.levelMg != null && summary.levelMg > 0 ? describeTrend(schedule, summary.compoundId, now) : null;
  const { next, nextDue, overdue, last, lastAt, progress, levelMg, halfLifeHours, color } = summary;
  const dueSoon = !!nextDue && !overdue && nextDue.getTime() - now.getTime() < 15 * 60_000;
  const ringColor = overdue ? RED : dueSoon ? AMBER : color;
  const status = !nextDue ? 'Nothing scheduled' : overdue ? 'Overdue' : dueSoon ? 'Due now' : 'On track';
  const headline = !nextDue ? 'All caught up' : overdue ? `${formatRelative(nextDue, now).replace(' ago', '')} overdue` : formatRelative(nextDue, now).replace(/^in /, 'In ');
  const open = () => next && router.push({ pathname: '/log/[id]', params: { id: next.id } });

  return (
    <View style={styles.page}>
      <PressableScale onPress={open} disabled={!next} accessibilityRole="button" accessibilityLabel={next ? `Next dose, ${summary.title} ${next.amount}, ${status}, ${headline}` : `${summary.title}, nothing scheduled`} pressedScale={0.985} style={styles.hero}>
        <View style={styles.heroText}>
          <Label symbol="calendar" text="Next dose" />
          <Text style={styles.heroHeadline} numberOfLines={1} adjustsFontSizeToFit>
            {headline}
          </Text>
          <Text style={styles.heroWhen} numberOfLines={1}>
            {nextDue ? formatWhen(nextDue, now) : 'Add doses to a protocol'}
          </Text>
          <Text style={styles.heroCompound} numberOfLines={1}>
            {summary.title}
            {summary.subtitle ? ` · ${summary.subtitle}` : ''}
          </Text>
        </View>
        <View style={styles.ringWrap}>
          <RingGauge size={ringSize} progress={nextDue ? (overdue ? 1 : progress) : 0} color={ringColor} stroke={10}>
            <Text style={styles.ringTitle} numberOfLines={1} adjustsFontSizeToFit>
              {summary.title}
            </Text>
            <Text style={styles.ringAmount}>{next?.amount ?? last?.amount ?? '—'}</Text>
          </RingGauge>
          <Text style={[styles.ringStatus, { color: ringColor }]}>{status}</Text>
        </View>
      </PressableScale>

      <View style={styles.tiles}>
        <PressableScale onPress={() => last && router.push({ pathname: '/log/[id]', params: { id: last.id } })} disabled={!last} accessibilityRole="button" accessibilityLabel={last ? `Last dose ${last.amount}, ${formatWhen(lastAt!, now)}` : 'No dose logged yet'} pressedScale={0.985} style={styles.tile}>
          <Label symbol="clock" text="Last dose" />
          <Text style={styles.tileValue} numberOfLines={1} adjustsFontSizeToFit>
            {last ? (last.log?.dose != null && last.log.unit ? `${last.log.dose} ${last.log.unit}` : last.amount) : '—'}
          </Text>
          <Text style={styles.tileCaption} numberOfLines={1}>
            {lastAt ? formatWhen(lastAt, now) : 'Nothing logged yet'}
          </Text>
        </PressableScale>
        <View style={styles.tile} accessible accessibilityLabel={levelMg != null ? `Estimated level ${formatMg(levelMg)}` : 'Level unavailable'}>
          <Label symbol="waveform.path.ecg" text="Level" />
          <Text style={styles.tileValue} numberOfLines={1} adjustsFontSizeToFit>
            {levelMg != null ? (levelMg > 0 ? `~${formatMg(levelMg)}` : '0') : '—'}
          </Text>
          <Text style={styles.tileCaption} numberOfLines={2}>
            {trend ?? (halfLifeHours ? `Estimate · ${describeHalfLife(halfLifeHours)} half-life` : summary.compoundId && !pkProfile(summary.compoundId) ? 'No documented half-life' : 'Estimate unavailable')}
          </Text>
        </View>
      </View>
    </View>
  );
}

function Label({ symbol, text }: { symbol: SFSymbol; text: string }) {
  return (
    <View style={styles.label}>
      <SymbolView name={symbol} size={13} weight="semibold" tintColor={Accent.primary} fallback={null} />
      <Text style={styles.labelText}>{text}</Text>
    </View>
  );
}

function describeHalfLife(hours: number): string {
  if (hours >= 48) return `${Number((hours / 24).toFixed(hours % 24 ? 1 : 0))}-day`;
  return `${Number(hours.toFixed(1))}-hour`;
}

const styles = StyleSheet.create({
  page: { gap: Spacing.two },
  hero: { flexDirection: 'row', alignItems: 'center', gap: Spacing.three, padding: Spacing.three, paddingLeft: Spacing.four, borderRadius: 24, backgroundColor: 'rgba(255,255,255,0.05)', borderWidth: StyleSheet.hairlineWidth, borderColor: 'rgba(255,255,255,0.1)' },
  heroText: { flex: 1, gap: 3 },
  heroHeadline: { marginTop: 6, color: '#F5F5F7', fontFamily: Typeface.display, fontSize: 26, letterSpacing: -0.7 },
  heroWhen: { color: 'rgba(242,242,244,0.6)', fontFamily: Typeface.body, fontSize: 13.5 },
  heroCompound: { color: 'rgba(242,242,244,0.5)', fontFamily: Typeface.body, fontSize: 13 },
  ringWrap: { alignItems: 'center', gap: 2 },
  ringTitle: { maxWidth: 88, color: '#F5F5F7', fontFamily: Typeface.bodySemiBold, fontSize: 13.5, letterSpacing: -0.2 },
  ringAmount: { color: 'rgba(242,242,244,0.6)', fontFamily: Typeface.body, fontSize: 12.5 },
  ringStatus: { marginTop: -14, fontFamily: Typeface.bodySemiBold, fontSize: 12.5 },
  tiles: { flexDirection: 'row', gap: Spacing.two },
  tile: { flex: 1, padding: Spacing.three, paddingLeft: Spacing.three + Spacing.half, borderRadius: 20, backgroundColor: 'rgba(255,255,255,0.05)', borderWidth: StyleSheet.hairlineWidth, borderColor: 'rgba(255,255,255,0.1)', gap: 3 },
  tileValue: { marginTop: 6, color: '#F5F5F7', fontFamily: Typeface.display, fontSize: 24, letterSpacing: -0.6 },
  tileCaption: { color: 'rgba(242,242,244,0.5)', fontFamily: Typeface.body, fontSize: 12.5, lineHeight: 16 },
  label: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  labelText: { color: 'rgba(242,242,244,0.7)', fontFamily: Typeface.bodyMedium, fontSize: 13 },
  dots: { flexDirection: 'row', justifyContent: 'center', gap: 6, marginTop: Spacing.two },
  dot: { width: 6, height: 6, borderRadius: 3, backgroundColor: 'rgba(255,255,255,0.22)' },
  dotOn: { backgroundColor: '#F5F5F7' },
});
