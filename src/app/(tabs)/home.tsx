import { useRouter } from 'expo-router';
import { SymbolView } from 'expo-symbols';
import { useMemo, useRef, useState } from 'react';
import { StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import { ScrollView } from 'react-native-gesture-handler';
import Animated, { FadeIn, FadeInDown } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Calendar } from '@/components/home/calendar';
import { TAB_BAR_HEIGHT } from '@/components/home/floating-tab-bar';
import { StatTiles } from '@/components/home/stat-tiles';
import { Gutter } from '@/components/onboarding/onboarding-shell';
import { PressableScale } from '@/components/pressable-scale';
import { ShineButton } from '@/components/shine-button';
import { StageBackground } from '@/components/stage/stage-background';
import { BrandRow } from '@/components/welcome/brand-row';
import { Brand } from '@/constants/brand';
import { Accent, Spacing, Typeface } from '@/constants/theme';
import { displayName, useOnboarding } from '@/lib/onboarding-store';
import { quickActions } from '@/lib/quick-actions';
import { currentStreak, dosesOn, formatDayTitle, nextDose, sameDay, useSchedule } from '@/lib/schedule';

export default function HomeScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { width, height } = useWindowDimensions();
  const { name, units } = useOnboarding();
  const schedule = useSchedule();
  const [selected, setSelected] = useState(() => new Date());
  const today = useMemo(() => new Date(), []);
  const scrollRef = useRef<ScrollView>(null);

  const first = displayName(name);
  const dayDoses = dosesOn(schedule, selected);
  const streak = currentStreak(schedule, today);
  const logged = schedule.doses.filter((d) => d.logged).length;
  const upcoming = nextDose(schedule, today);
  const isToday = sameDay(selected, today);
  const hasProtocols = schedule.protocols.length > 0;

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
            <PressableScale onPress={() => router.push('/settings')} accessibilityRole="button" accessibilityLabel="Settings" hitSlop={8} style={styles.iconButton}>
              <SymbolView name="gearshape" size={24} weight="medium" tintColor="rgba(242,242,244,0.85)" fallback={<View style={styles.streakFallback} />} />
            </PressableScale>
          </View>
        </Animated.View>

        <Animated.View entering={FadeInDown.delay(80).duration(420)} style={styles.section}>
          <Calendar selected={selected} onSelect={setSelected} doses={schedule.doses} weekStartsOn={units === 'imperial' ? 0 : 1} scrollRef={scrollRef} />
        </Animated.View>

        <Animated.View entering={FadeInDown.delay(160).duration(420)} style={styles.section}>
          <Text style={styles.eyebrow}>{isToday ? 'TODAY' : formatDayTitle(selected).toUpperCase()}</Text>
          {dayDoses.length === 0 ? (
            <Text style={styles.rest}>{hasProtocols ? 'Rest day. No doses scheduled.' : 'No doses scheduled yet.'}</Text>
          ) : (
            <View style={styles.doseList}>
              {dayDoses.map((d) => (
                <View key={d.id} style={styles.dose}>
                  <View style={[styles.doseSwatch, { backgroundColor: d.color }]} />
                  <View style={styles.doseText}>
                    <Text style={styles.doseName}>{d.peptide}</Text>
                    <Text style={styles.doseMeta}>
                      {d.amount} · {d.time}
                    </Text>
                  </View>
                  <View style={[styles.doseTick, d.logged && styles.doseTickOn]}>
                    {d.logged ? <SymbolView name="checkmark" size={10} weight="bold" tintColor="#062B1F" fallback={null} /> : null}
                  </View>
                </View>
              ))}
            </View>
          )}
        </Animated.View>

        {hasProtocols ? null : (
          <Animated.View entering={FadeInDown.delay(240).duration(460)} style={[styles.section, styles.empty]}>
            <View style={styles.emptyDisc}>
              <SymbolView name="syringe.fill" size={26} weight="semibold" tintColor={Accent.primary} fallback={<View style={styles.emptyFallback} />} />
            </View>
            <Text style={styles.emptyTitle}>{first ? `Welcome to ${Brand.name}, ${first}.` : `Welcome to ${Brand.name}.`}</Text>
            <Text style={styles.emptyText}>Create your first protocol and we’ll take care of the doses, the math and the reminders.</Text>
            <ShineButton label="Create protocol" onPress={() => quickActions.open()} style={styles.emptyButton} shineDelay={1800} />
          </Animated.View>
        )}

        <Animated.View entering={FadeInDown.delay(320).duration(460)} style={styles.section}>
          <StatTiles
            stats={[
              { symbol: 'flame.fill', value: `${streak} ${streak === 1 ? 'day' : 'days'}`, label: 'Streak', live: streak > 0 },
              { symbol: 'checkmark.circle.fill', value: String(logged), label: 'Doses logged', live: logged > 0 },
              { symbol: 'clock.fill', value: upcoming ? upcoming.time : '\u2014', label: 'Next dose', live: !!upcoming },
            ]}
          />
        </Animated.View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: Brand.black },
  header: { paddingHorizontal: Gutter, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  headerActions: { flexDirection: 'row', alignItems: 'center', gap: Spacing.one + Spacing.half },
  streak: { flexDirection: 'row', alignItems: 'center', gap: 5, height: 36, paddingHorizontal: 12, borderRadius: 18, backgroundColor: 'rgba(255,255,255,0.06)' },
  streakOn: { backgroundColor: 'rgba(251,146,60,0.14)' },
  streakFallback: { width: 12, height: 12, borderRadius: 6, backgroundColor: 'rgba(242,242,244,0.45)' },
  streakText: { color: 'rgba(242,242,244,0.55)', fontFamily: Typeface.bodySemiBold, fontSize: 15 },
  streakTextOn: { color: '#FDBA74' },
  iconButton: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  section: { paddingHorizontal: Gutter, marginTop: Spacing.four },
  eyebrow: { color: 'rgba(242,242,244,0.5)', fontFamily: Typeface.bodySemiBold, fontSize: 11, letterSpacing: 1.1 },
  rest: { marginTop: Spacing.one + Spacing.half, color: 'rgba(242,242,244,0.7)', fontFamily: Typeface.body, fontSize: 15, letterSpacing: -0.15 },
  doseList: { marginTop: Spacing.two, gap: Spacing.one + Spacing.half },
  dose: { flexDirection: 'row', alignItems: 'center', gap: Spacing.two + Spacing.half, padding: Spacing.three, borderRadius: 18, backgroundColor: 'rgba(255,255,255,0.05)', borderWidth: StyleSheet.hairlineWidth, borderColor: 'rgba(255,255,255,0.1)' },
  doseSwatch: { width: 4, height: 30, borderRadius: 2 },
  doseText: { flex: 1, gap: 2 },
  doseName: { color: '#F5F5F7', fontFamily: Typeface.bodySemiBold, fontSize: 15, letterSpacing: -0.2 },
  doseMeta: { color: 'rgba(242,242,244,0.55)', fontFamily: Typeface.body, fontSize: 13 },
  doseTick: { width: 24, height: 24, borderRadius: 12, borderWidth: 1.5, borderColor: 'rgba(255,255,255,0.25)', alignItems: 'center', justifyContent: 'center' },
  doseTickOn: { backgroundColor: Accent.primary, borderColor: Accent.primary },
  empty: { alignItems: 'center', paddingVertical: Spacing.two },
  emptyDisc: { width: 64, height: 64, borderRadius: 32, backgroundColor: 'rgba(52,211,153,0.12)', borderWidth: StyleSheet.hairlineWidth, borderColor: 'rgba(52,211,153,0.35)', alignItems: 'center', justifyContent: 'center' },
  emptyFallback: { width: 22, height: 22, borderRadius: 11, backgroundColor: Accent.primary },
  emptyTitle: { marginTop: Spacing.three, color: '#F5F5F7', fontFamily: Typeface.display, fontSize: 21, letterSpacing: -0.4, textAlign: 'center' },
  emptyText: { marginTop: Spacing.one + Spacing.half, color: 'rgba(242,242,244,0.62)', fontFamily: Typeface.body, fontSize: 15, lineHeight: 21, letterSpacing: -0.15, textAlign: 'center', paddingHorizontal: Spacing.two },
  emptyButton: { alignSelf: 'stretch', marginTop: Spacing.four },
});
