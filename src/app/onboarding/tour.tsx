import { SymbolView, type SFSymbol } from 'expo-symbols';
import { useRouter } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Pressable, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import Animated, { Easing, FadeIn, FadeInDown, useReducedMotion, useSharedValue, withDelay, withTiming } from 'react-native-reanimated';

import { hintStyle } from '@/components/onboarding/choices';
import { Gutter, OnboardingShell } from '@/components/onboarding/onboarding-shell';
import { TranscriptText, useTranscriptType, useTypewriter } from '@/components/onboarding/typewriter';
import { ShineButton } from '@/components/shine-button';
import { Brand } from '@/constants/brand';
import { Accent, Spacing, Typeface } from '@/constants/theme';
import { onboardingStore, useOnboarding } from '@/lib/onboarding-store';

const LINES = [
  `We built ${Brand.name} to be\nthe last peptide app\nyou\u2019ll ever need.`,
  'Made with care, by\npeople who use it daily.',
  'Everything you need.\nOne app.',
] as const;

type Feature = { name: string; caption: string; symbol: SFSymbol };

const FEATURES: Feature[] = [
  { name: 'Library', caption: 'Every peptide, explained', symbol: 'books.vertical.fill' },
  { name: 'Tracking', caption: 'One tap logs a dose', symbol: 'checkmark.circle.fill' },
  { name: 'Insights', caption: 'Watch your body respond', symbol: 'chart.xyaxis.line' },
  { name: 'Protocols', caption: 'What to take, and when', symbol: 'calendar.badge.clock' },
  { name: 'Calculator', caption: 'Reconstitution, solved', symbol: 'syringe.fill' },
  { name: 'Assistant', caption: 'Ask anything, no jargon', symbol: 'bubble.left.and.bubble.right.fill' },
];

const GRID_GAP = 12;
/** Pause between the last line finishing and the grid taking over. */
const GRID_DELAY = 640;
const TINT_MS = 1600;

export default function TourScreen() {
  const router = useRouter();
  const reducedMotion = useReducedMotion();
  const { width, height } = useWindowDimensions();
  const { spoken } = useOnboarding();
  const returning = spoken.includes(LINES[2]);
  const [grid, setGrid] = useState(returning);
  const type = useTranscriptType();

  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const onDone = useCallback(() => {
    timer.current = setTimeout(() => setGrid(true), returning ? 0 : GRID_DELAY);
  }, [returning]);
  useEffect(() => () => {
    if (timer.current) clearTimeout(timer.current);
  }, []);

  const { typed, done, skip } = useTypewriter(LINES, { onDone });

  useEffect(() => {
    if (returning) skip();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const skipToGrid = () => {
    skip();
    if (timer.current) clearTimeout(timer.current);
    setGrid(true);
  };

  const tint = useSharedValue(returning || reducedMotion ? 1 : 0);
  useEffect(() => {
    if (returning || reducedMotion) return;
    tint.set(withDelay(300, withTiming(1, { duration: TINT_MS, easing: Easing.inOut(Easing.quad) })));
  }, [returning, reducedMotion, tint]);

  const cardWidth = (width - Gutter * 2 - GRID_GAP) / 2;
  const compact = height < 700;

  const submit = () => {
    if (!returning) onboardingStore.set({ spoken: [...spoken, ...LINES] });
    router.push('/onboarding/notifications');
  };

  return (
    <OnboardingShell
      onBack={() => router.back()}
      onSkip={grid ? undefined : skipToGrid}
      step={9}
      tint={tint}
      footer={
        grid ? (
          <Animated.View entering={returning ? undefined : FadeIn.delay(760).duration(420)}>
            <ShineButton label="Continue" onPress={submit} shineDelay={1200} />
          </Animated.View>
        ) : undefined
      }>
      <Pressable style={styles.flex} onPress={skip} disabled={done} accessible={false}>
        <TranscriptText paragraphs={LINES} typed={typed} title={grid} titleTop={Math.round(Spacing.five * type.scale)}>
          {grid ? (
            <View>
              <Animated.Text entering={returning ? undefined : FadeIn.delay(320).duration(400)} style={hintStyle}>
                Six tools, one place.
              </Animated.Text>
              <View style={styles.grid}>
                {FEATURES.map((feature, i) => (
                  <Animated.View
                    key={feature.name}
                    entering={returning ? undefined : FadeInDown.delay(400 + i * 60).duration(460)}
                    style={[styles.card, { width: cardWidth, height: compact ? 96 : 128 }]}
                    accessible
                    accessibilityLabel={`${feature.name}. ${feature.caption}`}>
                    <View style={[styles.disc, compact && styles.discCompact]}>
                      <SymbolView name={feature.symbol} size={compact ? 19 : 22} weight="semibold" tintColor={Accent.primary} fallback={<View style={styles.discFallback} />} />
                    </View>
                    <Text style={styles.name}>{feature.name}</Text>
                    {compact ? null : <Text style={styles.caption}>{feature.caption}</Text>}
                  </Animated.View>
                ))}
              </View>
            </View>
          ) : null}
        </TranscriptText>
      </Pressable>
    </OnboardingShell>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  grid: {
    marginTop: Spacing.four,
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: GRID_GAP,
  },
  card: {
    borderRadius: 22,
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(255,255,255,0.1)',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: Spacing.two,
  },
  disc: {
    width: 46,
    height: 46,
    borderRadius: 23,
    backgroundColor: 'rgba(52,211,153,0.12)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.two + Spacing.half,
  },
  discCompact: { width: 40, height: 40, borderRadius: 20 },
  discFallback: { width: 18, height: 18, borderRadius: 9, backgroundColor: Accent.primary },
  name: {
    color: '#F2F2F4',
    fontFamily: Typeface.bodySemiBold,
    fontSize: 15,
    letterSpacing: -0.2,
    textAlign: 'center',
  },
  caption: {
    marginTop: Spacing.half + 1,
    color: 'rgba(242,242,244,0.48)',
    fontFamily: Typeface.body,
    fontSize: 12.5,
    lineHeight: 17,
    letterSpacing: -0.1,
    textAlign: 'center',
  },
});
