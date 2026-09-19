import { Canvas, Circle, Group, Path, Skia } from '@shopify/react-native-skia';
import { SymbolView, type SFSymbol } from 'expo-symbols';
import { useRouter } from 'expo-router';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, { Easing, FadeIn, FadeInDown, useDerivedValue, useReducedMotion, useSharedValue, withDelay, withTiming } from 'react-native-reanimated';

import { OnboardingShell } from '@/components/onboarding/onboarding-shell';
import { TranscriptText, useTranscriptType, useTypewriter } from '@/components/onboarding/typewriter';
import { ShineButton } from '@/components/shine-button';
import { AnimatedText } from '@/components/welcome/demos/shared';
import { Accent, Spacing, Typeface } from '@/constants/theme';
import { onboardingStore, useOnboarding } from '@/lib/onboarding-store';

import { NONE, SCRIPTS } from './motivation';

/** A direct reply to every follow-up option; the first one picked (in list order) gets it. */
const ANSWERS: Record<string, string> = {
  // Just curious
  'how-it-works': 'We\u2019ll explain how each\none works, simply.',
  safety: 'Safety notes come\nwith every peptide.',
  'first-step': 'We\u2019ll map out your\nfirst step together.',
  'plain-english': 'Plain English only.\nNo jargon, promise.',
  sourcing: 'We\u2019ll help you vet\nany source.',
  stories: 'You\u2019ll hear how others\nactually used them.',
  // Ready to start
  which: 'We\u2019ll match peptides\nto your goals.',
  dosing: 'Doses get calculated,\nnot guessed.',
  mixing: 'The reconstitution math\nis done for you.',
  source: 'We\u2019ll help you vet\nany source.',
  'side-effects': 'Every side effect\ngets logged and flagged.',
  results: 'You\u2019ll see your results\nin the numbers.',
  [NONE]: 'Love the confidence.\nLet\u2019s keep it that way.',
  // Some experience
  'dose-tuning': 'We\u2019ll help you dial\ndoses in precisely.',
  stacking: 'Stacks get checked\nfor timing and overlap.',
  'early-signs': 'Side effects get spotted\nbefore they build.',
  planning: 'Cycles get planned,\nnot improvised.',
  trends: 'Every log becomes\na trend you can see.',
  consistency: 'Reminders keep you\nconsistent, day by day.',
  // Seasoned
  'multi-protocol': 'Run every protocol\nfrom one place.',
  inventory: 'Inventory and mixing,\ntracked to the unit.',
  analytics: 'Analytics built for\npeople who dig in.',
  labs: 'Lab results sit right\nnext to your logs.',
  'fast-logging': 'Logging takes seconds,\nnot minutes.',
  export: 'Export or share\nwhenever you need to.',
};

const FALLBACK = 'We\u2019ll keep every step\nclear and simple.';

const CLOSING = 'Most people don\u2019t\nfinish. You will.';

/** Pause between the closing line finishing and the stats taking over. */
const STATS_DELAY = 640;
const TINT_MS = 1600;
const RING = 76;
const RING_STROKE = 7;
const ringPath = Skia.Path.Circle(RING / 2, RING / 2, (RING - RING_STROKE) / 2);

type Stat = { symbol: SFSymbol; number: string; caption: string; source: string };

const STATS: Stat[] = [
  { symbol: 'bell.badge.fill', number: '2\u00d7', caption: 'the odds of staying on track\nwith reminders.', source: 'JAMA Internal Medicine, 2016' },
  { symbol: 'calendar', number: '66 days', caption: 'for a new routine to\nbecome automatic.', source: 'European Journal of Social Psychology, 2010' },
];

export default function ReassuranceScreen() {
  const router = useRouter();
  const reducedMotion = useReducedMotion();
  const { experience, motivations, spoken } = useOnboarding();
  const type = useTranscriptType();

  const lines = useMemo(() => {
    const first = SCRIPTS[experience ?? 'curious'].options.find((o) => motivations.includes(o.id))?.id;
    return ['You\u2019re in good hands.', (first && ANSWERS[first]) || FALLBACK, CLOSING];
  }, [experience, motivations]);
  // Replays if they went back and changed their answer, since the reply changes with it.
  const returning = spoken.includes(lines[1]) && spoken.includes(CLOSING);
  const [stats, setStats] = useState(returning);

  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const onDone = useCallback(() => {
    timer.current = setTimeout(() => setStats(true), returning ? 0 : STATS_DELAY);
  }, [returning]);
  useEffect(() => () => {
    if (timer.current) clearTimeout(timer.current);
  }, []);

  const { typed, done, skip } = useTypewriter(lines, { onDone });

  useEffect(() => {
    if (returning) skip();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const skipToStats = () => {
    skip();
    if (timer.current) clearTimeout(timer.current);
    setStats(true);
  };

  const tint = useSharedValue(returning || reducedMotion ? 1 : 0);
  useEffect(() => {
    if (returning || reducedMotion) return;
    tint.set(withDelay(300, withTiming(1, { duration: TINT_MS, easing: Easing.inOut(Easing.quad) })));
  }, [returning, reducedMotion, tint]);

  const submit = () => {
    if (!returning) onboardingStore.set({ spoken: [...spoken, ...lines] });
    router.push('/onboarding/about');
  };

  return (
    <OnboardingShell
      onBack={() => router.back()}
      onSkip={stats ? undefined : skipToStats}
      step={6}
      tint={tint}
      footer={
        stats ? (
          <Animated.View entering={returning ? undefined : FadeIn.delay(720).duration(420)}>
            <ShineButton label="Continue" onPress={submit} shineDelay={1200} />
          </Animated.View>
        ) : undefined
      }>
      <Pressable style={styles.flex} onPress={skip} disabled={done} accessible={false}>
        <TranscriptText paragraphs={lines} typed={typed} title={stats} titleTop={Math.round(Spacing.five * type.scale)}>
          {stats ? (
            <View style={styles.stack}>
              <Animated.View entering={returning ? undefined : FadeInDown.delay(360).duration(460)} style={styles.card}>
                <AdherenceRing animate={!returning && !reducedMotion} />
                <View style={styles.cardText}>
                  <Text style={styles.caption}>{'of long-term treatments aren\u2019t\ntaken as prescribed.'}</Text>
                  <Text style={styles.source}>World Health Organization, 2003</Text>
                </View>
              </Animated.View>
              {STATS.map((stat, i) => (
                <Animated.View key={stat.number} entering={returning ? undefined : FadeInDown.delay(480 + i * 90).duration(460)} style={styles.card}>
                  <View style={styles.disc}>
                    <SymbolView name={stat.symbol} size={22} weight="semibold" tintColor={Accent.primary} fallback={<View style={styles.discFallback} />} />
                  </View>
                  <View style={styles.cardText}>
                    <Text style={styles.number}>{stat.number}</Text>
                    <Text style={styles.caption}>{stat.caption}</Text>
                    <Text style={styles.source}>{stat.source}</Text>
                  </View>
                </Animated.View>
              ))}
            </View>
          ) : null}
        </TranscriptText>
      </Pressable>
    </OnboardingShell>
  );
}

/** Half-filled adherence ring, drawn the same way as the protocol demo's, counting up to 50%. */
function AdherenceRing({ animate }: { animate: boolean }) {
  const progress = useSharedValue(animate ? 0 : 1);
  useEffect(() => {
    if (!animate) return;
    progress.set(withDelay(700, withTiming(1, { duration: 1100, easing: Easing.out(Easing.cubic) })));
  }, [animate, progress]);
  const end = useDerivedValue(() => 0.5 * progress.get());
  const label = useDerivedValue(() => `${Math.round(50 * progress.get())}%`);

  return (
    <View style={styles.ring}>
      <Canvas style={{ width: RING, height: RING }}>
        <Circle cx={RING / 2} cy={RING / 2} r={(RING - RING_STROKE) / 2} style="stroke" strokeWidth={RING_STROKE} color="rgba(255,255,255,0.1)" />
        <Group origin={{ x: RING / 2, y: RING / 2 }} transform={[{ rotate: -Math.PI / 2 }]}>
          <Path path={ringPath} style="stroke" strokeWidth={RING_STROKE} strokeCap="round" color={Accent.primary} start={0} end={end} />
        </Group>
      </Canvas>
      <View style={styles.ringLabel}>
        <AnimatedText text={label} style={styles.ringText} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  stack: { marginTop: Spacing.four, gap: Spacing.three - Spacing.one },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
    padding: Spacing.three,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  cardText: { flex: 1, gap: Spacing.half },
  number: {
    color: '#F5F5F7',
    fontFamily: Typeface.display,
    fontSize: 26,
    letterSpacing: -0.8,
    marginBottom: Spacing.half,
  },
  caption: {
    color: 'rgba(242,242,244,0.9)',
    fontFamily: Typeface.bodyMedium,
    fontSize: 14.5,
    lineHeight: 19,
    letterSpacing: -0.15,
  },
  source: {
    color: 'rgba(242,242,244,0.48)',
    fontFamily: Typeface.body,
    fontSize: 12,
    lineHeight: 16,
  },
  disc: {
    width: 46,
    height: 46,
    borderRadius: 23,
    backgroundColor: 'rgba(52,211,153,0.12)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  discFallback: { width: 18, height: 18, borderRadius: 9, backgroundColor: Accent.primary },
  ring: { width: RING, height: RING },
  ringLabel: { position: 'absolute', top: 0, left: 0, width: RING, height: RING, alignItems: 'center', justifyContent: 'center' },
  ringText: { fontSize: 19, letterSpacing: -0.5, textAlign: 'center', width: RING, color: '#F5F5F7' },
});
