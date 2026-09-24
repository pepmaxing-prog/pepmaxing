import { useRouter } from 'expo-router';
import { SymbolView } from 'expo-symbols';
import { useMemo, useRef, useState } from 'react';
import { StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import { ScrollView } from 'react-native-gesture-handler';
import Animated, { FadeIn, FadeInDown, FadeOut, LinearTransition } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Calendar } from '@/components/home/calendar';
import { TAB_BAR_HEIGHT } from '@/components/home/floating-tab-bar';
import { SiteCard } from '@/components/home/site-card';
import { SummaryPager } from '@/components/home/summary-pager';
import { PressableScale } from '@/components/pressable-scale';
import { ShineButton } from '@/components/shine-button';
import { StageBackground } from '@/components/stage/stage-background';
import { BrandRow } from '@/components/welcome/brand-row';
import { Brand } from '@/constants/brand';
import { Accent, AppGutter, Spacing, Typeface } from '@/constants/theme';
import { displayName, useOnboarding } from '@/lib/onboarding-store';
import { compoundSummaries, currentStreak, dosesOn, formatDayTitle, sameDay, timeKeyFromDate, useSchedule, type DoseEvent } from '@/lib/schedule';
import { siteById } from '@/lib/sites';

export default function HomeScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { width, height } = useWindowDimensions();
  const { name, units } = useOnboarding();
  const schedule = useSchedule();
  const [selected, setSelected] = useState(() => new Date());
  const [calendarOpen, setCalendarOpen] = useState(false);
  const today = useMemo(() => new Date(), []);
  const scrollRef = useRef<ScrollView>(null);

  const first = displayName(name);
  const dayDoses = dosesOn(schedule, selected);
  const streak = currentStreak(schedule, today);
  const isToday = sameDay(selected, today);
  const hasProtocols = schedule.protocols.length > 0;
  const summaries = useMemo(() => compoundSummaries(schedule, today), [schedule, today]);
  const pageWidth = width - AppGutter * 2;

  return (
    <View style={styles.root}>
      <StageBackground width={width} height={height} center={{ x: width / 2, y: height * 0.22 }} />
      <ScrollView
        ref={scrollRef}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingTop: insets.top + Spacing.three, paddingBottom: TAB_BAR_HEIGHT + Math.max(insets.bottom, Spacing.two) + Spacing.five }}>
        <Animated.View entering={FadeIn.duration(360)} style={styles.header}>
          <BrandRow size="large" />
          <View style={styles.headerActions}>
            <View style={[styles.streak, streak > 0 && styles.streakOn]} accessible accessibilityLabel={`${streak} day streak`}>
              <SymbolView name="flame.fill" size={15} weight="semibold" tintColor={streak > 0 ? '#FB923C' : 'rgba(242,242,244,0.45)'} fallback={<View style={styles.streakFallback} />} />
              <Text style={[styles.streakText, streak > 0 && styles.streakTextOn]}>{streak}</Text>
            </View>
            <PressableScale
              onPress={() => setCalendarOpen((v) => !v)}
              accessibilityRole="button"
              accessibilityLabel={calendarOpen ? 'Hide calendar' : 'Show calendar'}
              accessibilityState={{ expanded: calendarOpen }}
              hitSlop={8}
              style={[styles.iconButton, calendarOpen && styles.iconButtonOn]}>
              <SymbolView name="calendar" size={22} weight="medium" tintColor={calendarOpen ? Accent.primary : 'rgba(242,242,244,0.85)'} fallback={<View style={styles.streakFallback} />} />
            </PressableScale>
            <PressableScale onPress={() => router.push('/settings')} accessibilityRole="button" accessibilityLabel="Settings" hitSlop={8} style={styles.iconButton}>
              <SymbolView name="gearshape" size={24} weight="medium" tintColor="rgba(242,242,244,0.85)" fallback={<View style={styles.streakFallback} />} />
            </PressableScale>
          </View>
        </Animated.View>

        {calendarOpen ? (
          <Animated.View entering={FadeInDown.duration(320)} exiting={FadeOut.duration(180)} layout={LinearTransition.duration(240)} style={styles.section}>
            <Calendar selected={selected} onSelect={setSelected} doses={schedule.doses} weekStartsOn={units === 'imperial' ? 0 : 1} scrollRef={scrollRef} />
          </Animated.View>
        ) : null}

        {summaries.length ? (
          <Animated.View entering={FadeInDown.delay(60).duration(420)} layout={LinearTransition.duration(240)} style={styles.section}>
            <SummaryPager summaries={summaries} schedule={schedule} width={pageWidth} now={today} />
          </Animated.View>
        ) : null}

        {hasProtocols ? null : (
          <Animated.View entering={FadeInDown.delay(120).duration(460)} style={[styles.section, styles.empty]}>
            <View style={styles.emptyDisc}>
              <SymbolView name="syringe.fill" size={26} weight="semibold" tintColor={Accent.primary} fallback={<View style={styles.emptyFallback} />} />
            </View>
            <Text style={styles.emptyTitle}>{first ? `Welcome to ${Brand.name}, ${first}.` : `Welcome to ${Brand.name}.`}</Text>
            <Text style={styles.emptyText}>Create your first protocol and we’ll take care of the doses, the math and the reminders.</Text>
            <ShineButton label="Create protocol" onPress={() => router.push('/protocol/new')} style={styles.emptyButton} shineDelay={1800} />
          </Animated.View>
        )}

        {hasProtocols ? (
          <Animated.View entering={FadeInDown.delay(160).duration(420)} layout={LinearTransition.duration(240)} style={styles.section}>
            <View style={styles.card}>
              <View style={styles.cardHeader}>
                <View style={styles.cardIcon}>
                  <SymbolView name="list.clipboard" size={14} weight="semibold" tintColor={Accent.primary} fallback={null} />
                </View>
                <Text style={styles.cardTitle}>{isToday ? 'Today' : formatDayTitle(selected)}</Text>
                {!isToday ? (
                  <PressableScale onPress={() => setSelected(new Date())} accessibilityRole="button" hitSlop={8}>
                    <Text style={styles.cardAction}>Back to today</Text>
                  </PressableScale>
                ) : null}
              </View>
              {dayDoses.length === 0 ? (
                <Text style={styles.rest}>Rest day. No doses scheduled.</Text>
              ) : (
                <View style={styles.doseList}>
                  {dayDoses.map((d) => (
                    <DoseRow key={d.id} dose={d} onPress={() => router.push({ pathname: '/log/[id]', params: { id: d.id } })} />
                  ))}
                </View>
              )}
              <PressableScale onPress={() => router.push('/history')} accessibilityRole="button" accessibilityLabel="Dose history" pressedScale={0.99} style={styles.historyRow}>
                <SymbolView name="list.bullet" size={15} weight="semibold" tintColor="rgba(242,242,244,0.7)" fallback={null} />
                <Text style={styles.historyText}>Dose history</Text>
                <SymbolView name="chevron.right" size={12} weight="semibold" tintColor="rgba(242,242,244,0.35)" fallback={null} />
              </PressableScale>
            </View>
          </Animated.View>
        ) : null}

        <Animated.View entering={FadeInDown.delay(240).duration(460)} layout={LinearTransition.duration(240)} style={styles.section}>
          <SiteCard schedule={schedule} now={today} />
        </Animated.View>
      </ScrollView>
    </View>
  );
}

/** One scheduled dose. Tap to open "Log your dose"; once logged it shows when and where. */
function DoseRow({ dose, onPress }: { dose: DoseEvent; onPress: () => void }) {
  const log = dose.log;
  const skipped = !!log?.skipped;
  const site = log?.site ? siteById(log.site) : null;
  const loggedAt = log && !skipped ? formatClock(new Date(log.at)) : null;
  return (
    <Animated.View layout={LinearTransition.duration(220)}>
      <PressableScale
        onPress={onPress}
        accessibilityRole="button"
        accessibilityLabel={`${dose.title}, ${dose.amount} at ${dose.time}`}
        accessibilityHint={skipped ? 'Skipped. Tap to change.' : log ? `Logged at ${loggedAt}. Tap to edit.` : 'Tap to log this dose.'}
        pressedScale={0.985}
        style={[styles.dose, dose.logged && styles.doseLogged, skipped && styles.doseSkipped]}>
        <View style={[styles.doseSwatch, { backgroundColor: dose.color }]} />
        <View style={styles.doseText}>
          <Text style={[styles.doseName, (dose.logged || skipped) && styles.doseNameLogged]} numberOfLines={1}>
            {dose.title}
          </Text>
          {dose.subtitle ? (
            <Text style={styles.doseSub} numberOfLines={1}>
              {dose.subtitle}
            </Text>
          ) : null}
          <Text style={styles.doseMeta} numberOfLines={1}>
            {log?.dose != null && log.unit ? `${log.dose} ${log.unit}` : dose.amount} · {dose.time}
          </Text>
        </View>
        {skipped ? (
          <Text style={styles.skipped}>Skipped</Text>
        ) : log ? (
          <View style={styles.loggedMeta}>
            <View style={styles.loggedRow}>
              <SymbolView name="checkmark" size={10} weight="bold" tintColor={Accent.primary} fallback={null} />
              <Text style={styles.loggedTime}>{loggedAt}</Text>
            </View>
            {site ? <Text style={styles.loggedSite}>{site.short}</Text> : null}
          </View>
        ) : (
          <View style={styles.logPill}>
            <Text style={styles.logText}>Log</Text>
          </View>
        )}
      </PressableScale>
    </Animated.View>
  );
}

function formatClock(date: Date): string {
  const [h, m] = timeKeyFromDate(date).split(':').map(Number);
  return `${h % 12 === 0 ? 12 : h % 12}:${String(m).padStart(2, '0')} ${h >= 12 ? 'PM' : 'AM'}`;
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: Brand.black },
  header: { paddingHorizontal: AppGutter, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  headerActions: { flexDirection: 'row', alignItems: 'center', gap: Spacing.one + Spacing.half },
  streak: { flexDirection: 'row', alignItems: 'center', gap: 5, height: 36, paddingHorizontal: 12, borderRadius: 18, backgroundColor: 'rgba(255,255,255,0.06)' },
  streakOn: { backgroundColor: 'rgba(251,146,60,0.14)' },
  streakFallback: { width: 12, height: 12, borderRadius: 6, backgroundColor: 'rgba(242,242,244,0.45)' },
  streakText: { color: 'rgba(242,242,244,0.55)', fontFamily: Typeface.bodySemiBold, fontSize: 15 },
  streakTextOn: { color: '#FDBA74' },
  iconButton: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
  iconButtonOn: { backgroundColor: 'rgba(52,211,153,0.12)' },
  card: { borderRadius: 24, backgroundColor: 'rgba(255,255,255,0.05)', borderWidth: StyleSheet.hairlineWidth, borderColor: 'rgba(255,255,255,0.1)', overflow: 'hidden' },
  cardHeader: { flexDirection: 'row', alignItems: 'center', gap: Spacing.two, paddingHorizontal: Spacing.three, paddingTop: Spacing.three, paddingBottom: Spacing.two },
  cardIcon: { width: 28, height: 28, borderRadius: 8, backgroundColor: 'rgba(52,211,153,0.12)', alignItems: 'center', justifyContent: 'center' },
  cardTitle: { flex: 1, color: '#F5F5F7', fontFamily: Typeface.bodySemiBold, fontSize: 16, letterSpacing: -0.3 },
  cardAction: { color: Accent.primary, fontFamily: Typeface.bodySemiBold, fontSize: 13 },
  historyRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.two, paddingHorizontal: Spacing.three, height: 50, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: 'rgba(255,255,255,0.08)' },
  historyText: { flex: 1, color: 'rgba(242,242,244,0.85)', fontFamily: Typeface.bodySemiBold, fontSize: 14.5, letterSpacing: -0.2 },
  section: { paddingHorizontal: AppGutter, marginTop: Spacing.four },
  rest: { paddingHorizontal: Spacing.three, paddingBottom: Spacing.three, color: 'rgba(242,242,244,0.7)', fontFamily: Typeface.body, fontSize: 15, letterSpacing: -0.15 },
  doseList: { paddingHorizontal: Spacing.two, paddingBottom: Spacing.two, gap: Spacing.one + Spacing.half },
  dose: { flexDirection: 'row', alignItems: 'center', gap: Spacing.two + Spacing.half, padding: Spacing.three, borderRadius: 18, backgroundColor: 'rgba(255,255,255,0.04)', borderWidth: StyleSheet.hairlineWidth, borderColor: 'rgba(255,255,255,0.08)' },
  doseLogged: { backgroundColor: 'rgba(52,211,153,0.07)', borderColor: 'rgba(52,211,153,0.3)' },
  doseSwatch: { width: 4, height: 30, borderRadius: 2 },
  doseText: { flex: 1, gap: 2 },
  doseName: { color: '#F5F5F7', fontFamily: Typeface.bodySemiBold, fontSize: 15, letterSpacing: -0.2 },
  doseNameLogged: { color: 'rgba(242,242,244,0.75)' },
  doseSub: { color: 'rgba(242,242,244,0.7)', fontFamily: Typeface.bodyMedium, fontSize: 12.5 },
  doseMeta: { color: 'rgba(242,242,244,0.55)', fontFamily: Typeface.body, fontSize: 13 },
  doseSkipped: { opacity: 0.6 },
  loggedMeta: { alignItems: 'flex-end', gap: 2 },
  loggedRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  loggedTime: { color: 'rgba(242,242,244,0.8)', fontFamily: Typeface.bodySemiBold, fontSize: 12.5, fontVariant: ['tabular-nums'] },
  loggedSite: { color: 'rgba(242,242,244,0.5)', fontFamily: Typeface.body, fontSize: 12 },
  skipped: { color: 'rgba(242,242,244,0.5)', fontFamily: Typeface.bodyMedium, fontSize: 12.5 },
  logPill: { height: 32, paddingHorizontal: 14, borderRadius: 16, backgroundColor: Accent.primary, alignItems: 'center', justifyContent: 'center' },
  logText: { color: '#062B1F', fontFamily: Typeface.bodySemiBold, fontSize: 13.5 },
  empty: { alignItems: 'center', paddingVertical: Spacing.two },
  emptyDisc: { width: 64, height: 64, borderRadius: 32, backgroundColor: 'rgba(52,211,153,0.12)', borderWidth: StyleSheet.hairlineWidth, borderColor: 'rgba(52,211,153,0.35)', alignItems: 'center', justifyContent: 'center' },
  emptyFallback: { width: 22, height: 22, borderRadius: 11, backgroundColor: Accent.primary },
  emptyTitle: { marginTop: Spacing.three, color: '#F5F5F7', fontFamily: Typeface.display, fontSize: 21, letterSpacing: -0.4, textAlign: 'center' },
  emptyText: { marginTop: Spacing.one + Spacing.half, color: 'rgba(242,242,244,0.62)', fontFamily: Typeface.body, fontSize: 15, lineHeight: 21, letterSpacing: -0.15, textAlign: 'center', paddingHorizontal: Spacing.two },
  emptyButton: { alignSelf: 'stretch', marginTop: Spacing.four },
});
