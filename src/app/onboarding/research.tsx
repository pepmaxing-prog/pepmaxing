import { useRouter } from 'expo-router';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Pressable, StyleSheet } from 'react-native';
import Animated, { Easing, FadeIn, FadeOut, useAnimatedStyle, useReducedMotion, useSharedValue, withDelay, withTiming } from 'react-native-reanimated';

import { OnboardingShell } from '@/components/onboarding/onboarding-shell';
import { ResearchSlides } from '@/components/onboarding/research-slides';
import { TranscriptText, useTypewriter } from '@/components/onboarding/typewriter';
import { ShineButton } from '@/components/shine-button';
import { displayName, onboardingStore, useOnboarding } from '@/lib/onboarding-store';

/** Lines that don't depend on the name; used to recognise a returning visit. */
const FACTS = ['7,000+ known peptides.\nA century of research.', 'And the evidence\nis on your side.', "Here's what the\nstudies show"] as const;

/** How long the ellipsis pulses before the highlights take over. */
const THINKING_MS = 1800;
const DOT_MS = 320;
/** The stage blooms from neutral to emerald as this chapter opens. */
const TINT_MS = 1600;

export default function ResearchScreen() {
  const router = useRouter();
  const reducedMotion = useReducedMotion();
  const { name, spoken } = useOnboarding();
  const returning = spoken.includes(FACTS[0]);
  const [phase, setPhase] = useState<'talk' | 'thinking' | 'slides'>(returning ? 'slides' : 'talk');
  const [dots, setDots] = useState(1);
  const [reachedEnd, setReachedEnd] = useState(returning);

  const lines = useMemo(() => {
    const who = displayName(name) || 'there';
    return [`Great goals, ${who}.\nLet's make them happen.`, ...FACTS];
  }, [name]);

  const onDone = useCallback(() => setPhase('thinking'), []);
  const { typed, done, skip } = useTypewriter(lines, { onDone });

  useEffect(() => {
    if (returning) skip();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (phase !== 'thinking') return;
    const pulse = setInterval(() => setDots((d) => (d % 3) + 1), DOT_MS);
    const finish = setTimeout(() => setPhase('slides'), THINKING_MS);
    return () => {
      clearInterval(pulse);
      clearTimeout(finish);
    };
  }, [phase]);

  const tint = useSharedValue(returning || reducedMotion ? 1 : 0);
  useEffect(() => {
    if (returning || reducedMotion) return;
    tint.set(withDelay(300, withTiming(1, { duration: TINT_MS, easing: Easing.inOut(Easing.quad) })));
  }, [returning, reducedMotion, tint]);

  const onLastSlide = useCallback(() => setReachedEnd(true), []);

  const cta = useSharedValue(reachedEnd ? 1 : 0);
  useEffect(() => {
    cta.set(withTiming(reachedEnd ? 1 : 0, { duration: 420 }));
  }, [reachedEnd, cta]);
  const ctaStyle = useAnimatedStyle(() => ({ opacity: cta.get() }));

  // Skip: straight to the highlights with Continue unlocked, so nobody has to sit through the tour.
  const skipAhead = () => {
    skip();
    setPhase('slides');
    setReachedEnd(true);
  };

  const submit = () => {
    if (!returning) onboardingStore.set({ spoken: [...spoken, ...lines] });
    router.push('/onboarding/experience');
  };

  const onTap = phase === 'talk' ? (done ? undefined : skip) : phase === 'thinking' ? () => setPhase('slides') : undefined;

  return (
    <OnboardingShell
      onBack={() => router.back()}
      onSkip={reachedEnd ? undefined : skipAhead}
      step={3}
      tint={tint}
      footer={
        phase === 'slides' ? (
          <Animated.View style={[ctaStyle, { pointerEvents: reachedEnd ? 'auto' : 'none' }]}>
            <ShineButton label="Continue" disabled={!reachedEnd} onPress={submit} shineDelay={900} />
          </Animated.View>
        ) : undefined
      }>
      {phase === 'slides' ? (
        <Animated.View key="slides" entering={returning ? undefined : FadeIn.delay(160).duration(480)} style={styles.flex}>
          <ResearchSlides onLastSlide={onLastSlide} />
        </Animated.View>
      ) : (
        <Animated.View key="talk" exiting={FadeOut.duration(320)} style={styles.flex}>
          <Pressable style={styles.flex} onPress={onTap} disabled={!onTap} accessible={false}>
            <TranscriptText paragraphs={lines} typed={typed} tail={phase === 'thinking' ? '.'.repeat(dots) : undefined} />
          </Pressable>
        </Animated.View>
      )}
    </OnboardingShell>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
});
