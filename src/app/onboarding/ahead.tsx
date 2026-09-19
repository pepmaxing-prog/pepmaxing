import { SymbolView, type SFSymbol } from 'expo-symbols';
import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, { Easing, FadeIn, FadeInDown, FadeOut, useReducedMotion, useSharedValue, withDelay, withTiming } from 'react-native-reanimated';

import { hintStyle } from '@/components/onboarding/choices';
import { OnboardingShell } from '@/components/onboarding/onboarding-shell';
import { useTranscriptType } from '@/components/onboarding/typewriter';
import { ShineButton } from '@/components/shine-button';
import { Brand } from '@/constants/brand';
import { Accent, Spacing, Typeface } from '@/constants/theme';
import { onboardingStore, useOnboarding } from '@/lib/onboarding-store';

/** How each goal reads inside the milestone copy; the first goal picked wins. */
const GOAL_PHRASE: Record<string, string> = {
  'lose-weight': 'fat loss',
  'build-recover': 'recovery',
  'look-feel': 'feeling your best',
  heal: 'healing',
  think: 'focus',
  sleep: 'better sleep',
};
const GOAL_ORDER = Object.keys(GOAL_PHRASE);

type Milestone = { when: string; text: string; symbol: SFSymbol };

function milestones(phrase: string): Milestone[] {
  return [
    { when: 'Day 1', text: `Your ${phrase} protocol is set: doses, schedule and reminders in place.`, symbol: 'calendar.badge.checkmark' },
    { when: 'Week 1', text: `Every dose logged in a tap, and your library filling with ${phrase} research.`, symbol: 'books.vertical.fill' },
    { when: 'Month 1', text: 'First full cycle done. Your consistency and dose history, charted.', symbol: 'chart.line.uptrend.xyaxis' },
    { when: 'Month 2', text: 'Real trend data: what\u2019s working, what to adjust, and when.', symbol: 'sparkles' },
  ];
}

const ROW_STAGGER = 520;
const FIRST_ROW_DELAY = 500;
const TINT_MS = 1400;

export default function AheadScreen() {
  const router = useRouter();
  const reducedMotion = useReducedMotion();
  const type = useTranscriptType();
  const { goals, disclaimerAcceptedAt } = useOnboarding();
  const primary = GOAL_ORDER.find((id) => goals.includes(id)) ?? 'build-recover';
  const phrase = GOAL_PHRASE[primary];
  const rows = milestones(phrase);
  const [notice, setNotice] = useState(false);

  const tint = useSharedValue(reducedMotion ? 1 : 0);
  useEffect(() => {
    if (reducedMotion) return;
    tint.set(withDelay(200, withTiming(1, { duration: TINT_MS, easing: Easing.inOut(Easing.quad) })));
  }, [reducedMotion, tint]);

  const accept = () => {
    onboardingStore.set({ disclaimerAcceptedAt: new Date().toISOString() });
    setNotice(false);
    router.push('/onboarding/matching');
  };
  const continueDelay = FIRST_ROW_DELAY + rows.length * ROW_STAGGER;

  return (
    <>
      <OnboardingShell
        step={13}
        tint={tint}
        footer={
          <Animated.View entering={FadeIn.delay(continueDelay).duration(420)}>
            <ShineButton label="Continue" onPress={() => (disclaimerAcceptedAt ? router.push('/onboarding/matching') : setNotice(true))} shineDelay={continueDelay + 600} />
          </Animated.View>
        }>
        <View style={{ paddingTop: Math.round(Spacing.five * type.scale) }}>
          <Animated.Text entering={FadeIn.duration(420)} style={type.text} accessibilityRole="header">
            {'Here\u2019s what\u2019s\nahead.'}
          </Animated.Text>
          <Animated.Text entering={FadeIn.delay(120).duration(400)} style={hintStyle}>
            Your first 60 days, built for {phrase}.
          </Animated.Text>

          <View style={styles.timeline}>
            {rows.map((row, i) => (
              <Animated.View key={row.when} entering={FadeInDown.delay(FIRST_ROW_DELAY + i * ROW_STAGGER).duration(480)} style={styles.row}>
                <View style={styles.rail}>
                  <View style={styles.disc}>
                    <SymbolView name={row.symbol} size={18} weight="semibold" tintColor={Accent.primary} fallback={<View style={styles.discFallback} />} />
                  </View>
                  {i < rows.length - 1 ? (
                    <View style={styles.connector}>
                      {[0, 1, 2, 3].map((d) => (
                        <View key={d} style={styles.dot} />
                      ))}
                    </View>
                  ) : null}
                </View>
                <View style={styles.card}>
                  <Text style={styles.when}>{row.when.toUpperCase()}</Text>
                  <Text style={styles.text}>{row.text}</Text>
                </View>
              </Animated.View>
            ))}
          </View>
        </View>
      </OnboardingShell>

      {notice ? (
        <Animated.View entering={FadeIn.duration(220)} exiting={FadeOut.duration(180)} style={styles.scrim}>
          <Pressable style={styles.scrimTap} onPress={() => setNotice(false)} accessibilityLabel="Dismiss" />
          <Animated.View entering={FadeInDown.duration(320)} style={styles.sheet} accessibilityViewIsModal>
            <Text style={styles.sheetTitle}>Before we begin</Text>
            <Text style={styles.sheetBody}>I understand {Brand.name} provides educational content, not medical advice.</Text>
            <ShineButton label="I understand" onPress={accept} />
          </Animated.View>
        </Animated.View>
      ) : null}
    </>
  );
}

const RAIL = 40;

const styles = StyleSheet.create({
  timeline: { marginTop: Spacing.four },
  row: { flexDirection: 'row', gap: Spacing.three },
  rail: { width: RAIL, alignItems: 'center' },
  disc: {
    width: RAIL,
    height: RAIL,
    borderRadius: RAIL / 2,
    backgroundColor: 'rgba(52,211,153,0.12)',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(52,211,153,0.35)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  discFallback: { width: 14, height: 14, borderRadius: 7, backgroundColor: Accent.primary },
  connector: { flex: 1, justifyContent: 'space-evenly', alignItems: 'center', paddingVertical: 4 },
  dot: { width: 3, height: 3, borderRadius: 1.5, backgroundColor: 'rgba(52,211,153,0.45)' },
  card: {
    flex: 1,
    marginBottom: Spacing.two + Spacing.half,
    padding: Spacing.three,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(255,255,255,0.1)',
    gap: 4,
  },
  when: { color: Accent.primary, fontFamily: Typeface.bodySemiBold, fontSize: 11, letterSpacing: 1.2 },
  text: { color: 'rgba(242,242,244,0.86)', fontFamily: Typeface.body, fontSize: 15, lineHeight: 21, letterSpacing: -0.15 },
  scrim: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    paddingHorizontal: Spacing.four,
    backgroundColor: 'rgba(0,0,0,0.62)',
  },
  scrimTap: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 },
  sheet: {
    padding: Spacing.four,
    borderRadius: 28,
    backgroundColor: '#0B1511',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(255,255,255,0.14)',
    gap: Spacing.three,
  },
  sheetTitle: { color: '#F5F5F7', fontFamily: Typeface.display, fontSize: 22, letterSpacing: -0.4 },
  sheetBody: { color: 'rgba(242,242,244,0.72)', fontFamily: Typeface.body, fontSize: 15, lineHeight: 22, letterSpacing: -0.15 },
});
