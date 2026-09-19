import type { SFSymbol } from 'expo-symbols';
import { useRouter } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { StyleSheet, useWindowDimensions, View } from 'react-native';
import Animated, { FadeIn, FadeInDown } from 'react-native-reanimated';

import { ChoiceCard, hintStyle } from '@/components/onboarding/choices';
import { Gutter, OnboardingShell } from '@/components/onboarding/onboarding-shell';
import { useTranscriptType } from '@/components/onboarding/typewriter';
import { Spacing } from '@/constants/theme';
import { onboardingStore, useOnboarding, type Experience } from '@/lib/onboarding-store';

type Level = { id: Experience; label: string; caption: string; symbol: SFSymbol };

const LEVELS: Level[] = [
  { id: 'curious', label: 'Just curious', caption: 'Heard of peptides,\nhaven\u2019t tried any yet', symbol: 'magnifyingglass' },
  { id: 'starting', label: 'Ready to start', caption: 'Done my research,\nplanning a first cycle', symbol: 'flag.fill' },
  { id: 'experienced', label: 'Some experience', caption: 'I\u2019ve run a cycle\nor two before', symbol: 'checkmark.seal.fill' },
  { id: 'seasoned', label: 'Seasoned', caption: 'I run and adjust\nmultiple protocols', symbol: 'slider.horizontal.3' },
];

const GRID_GAP = 12;
/** Long enough to see the card light up before the next step slides in. */
const ADVANCE_MS = 460;

/** Single choice: picking a level moves straight on, so there is no Continue button. */
export default function ExperienceScreen() {
  const router = useRouter();
  const { width, height } = useWindowDimensions();
  const { experience: saved, motivations } = useOnboarding();
  const [picked, setPicked] = useState<Experience | null>(saved);
  const type = useTranscriptType();
  const advance = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => () => {
    if (advance.current) clearTimeout(advance.current);
  }, []);

  const choose = (id: Experience) => {
    setPicked(id);
    if (advance.current) clearTimeout(advance.current);
    advance.current = setTimeout(() => {
      // Motivations are tailored to the level, so a new level starts that list afresh.
      onboardingStore.set({ experience: id, motivations: id === saved ? motivations : [] });
      router.push('/onboarding/motivation');
    }, ADVANCE_MS);
  };

  const cardWidth = (width - Gutter * 2 - GRID_GAP) / 2;
  const compact = height < 700;

  return (
    <OnboardingShell onBack={() => router.back()} step={4}>
      <View style={{ paddingTop: Math.round(Spacing.five * type.scale) }}>
        <Animated.Text entering={FadeIn.duration(420)} style={type.text} accessibilityRole="header">
          {'How familiar are you\nwith peptides?'}
        </Animated.Text>
        <Animated.Text entering={FadeIn.delay(120).duration(400)} style={hintStyle}>
          Pick the closest fit.
        </Animated.Text>
        <View style={styles.grid} accessibilityRole="radiogroup">
          {LEVELS.map((level, i) => (
            <ChoiceCard
              key={level.id}
              symbol={level.symbol}
              label={level.label}
              caption={level.caption}
              selected={picked === level.id}
              width={cardWidth}
              height={compact ? 136 : 172}
              compact={compact}
              accessibilityRole="radio"
              onPress={() => choose(level.id)}
              entering={FadeInDown.delay(200 + i * 60).duration(460)}
            />
          ))}
        </View>
      </View>
    </OnboardingShell>
  );
}

const styles = StyleSheet.create({
  grid: {
    marginTop: Spacing.four,
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: GRID_GAP,
  },
});
