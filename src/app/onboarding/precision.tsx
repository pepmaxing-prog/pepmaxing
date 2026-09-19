import { useRouter } from 'expo-router';
import { SymbolView } from 'expo-symbols';
import { StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import Animated, { FadeIn, FadeInDown, ZoomIn } from 'react-native-reanimated';

import { hintStyle } from '@/components/onboarding/choices';
import { Gutter, OnboardingShell } from '@/components/onboarding/onboarding-shell';
import { Syringe } from '@/components/onboarding/syringe';
import { useTranscriptType } from '@/components/onboarding/typewriter';
import { ShineButton } from '@/components/shine-button';
import { Brand } from '@/constants/brand';
import { Accent, Spacing, Typeface } from '@/constants/theme';

const RED = '#F87171';

/** Why precision matters: the same peptide, one decimal off, is a 50% overdose. */
export default function PrecisionScreen() {
  const router = useRouter();
  const { width } = useWindowDimensions();
  const type = useTranscriptType();
  const syringeWidth = width - Gutter * 2 - Spacing.three * 2;

  return (
    <OnboardingShell
      step={16}
      footer={
        <Animated.View entering={FadeIn.delay(1500).duration(420)}>
          <ShineButton label="Continue" onPress={() => router.push('/onboarding/paywall')} shineDelay={2000} />
        </Animated.View>
      }>
      <View style={{ paddingTop: Math.round(Spacing.five * type.scale) }}>
        <Animated.Text entering={FadeIn.duration(420)} style={type.text} accessibilityRole="header">
          One decimal is a{'\n'}
          <Text style={styles.accent}>$300 mistake</Text>.
        </Animated.Text>
        <Animated.Text entering={FadeIn.delay(140).duration(400)} style={hintStyle}>
          {Brand.name} matches the line on your syringe. No guessing.
        </Animated.Text>

        <Animated.View entering={FadeInDown.delay(300).duration(480)} style={styles.panel}>
          <View style={styles.rowHeader}>
            <View style={styles.tag}>
              <SymbolView name="checkmark.circle.fill" size={13} weight="semibold" tintColor={Accent.primary} fallback={null} />
              <Text style={[styles.tagText, { color: Accent.primary }]}>CORRECT</Text>
            </View>
            <Text style={styles.reading}>
              10 units<Text style={styles.readingMuted}> · 250 mcg</Text>
            </Text>
          </View>
          <Syringe width={syringeWidth} units={10} tone="good" delay={500} />
          <View style={styles.between}>
            <View style={styles.rule} />
            <Animated.View entering={ZoomIn.delay(1900).duration(320)} style={styles.chip}>
              <SymbolView name="arrow.up" size={9} weight="bold" tintColor={RED} fallback={null} />
              <Text style={styles.chipText}>+50% dose</Text>
            </Animated.View>
            <View style={styles.rule} />
          </View>
          <View style={styles.rowHeader}>
            <View style={styles.tag}>
              <SymbolView name="exclamationmark.triangle.fill" size={13} weight="semibold" tintColor={RED} fallback={null} />
              <Text style={[styles.tagText, { color: RED }]}>TOO HIGH</Text>
            </View>
            <Text style={styles.reading}>
              15 units<Text style={styles.readingMuted}> · 375 mcg</Text>
            </Text>
          </View>
          <Syringe width={syringeWidth} units={15} tone="bad" delay={1000} guideUnits={10} />
        </Animated.View>

        <Animated.View entering={FadeInDown.delay(1100).duration(480)} style={styles.callout}>
          <SymbolView name="exclamationmark.triangle.fill" size={16} weight="semibold" tintColor={RED} fallback={<View style={styles.calloutFallback} />} />
          <Text style={styles.calloutText}>
            Reconstitute with the wrong volume and the concentration shifts. 0.5 mL off means every dose you draw is 50% wrong.
          </Text>
        </Animated.View>
      </View>
    </OnboardingShell>
  );
}

const styles = StyleSheet.create({
  accent: { color: Accent.primary },
  panel: {
    marginTop: Spacing.five,
    padding: Spacing.three,
    borderRadius: 22,
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(255,255,255,0.12)',
  },
  rowHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 2 },
  tag: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  tagText: { fontFamily: Typeface.bodySemiBold, fontSize: 11, letterSpacing: 0.8 },
  reading: { color: '#F5F5F7', fontFamily: Typeface.bodyBold, fontSize: 15, letterSpacing: -0.2 },
  readingMuted: { color: 'rgba(242,242,244,0.55)', fontFamily: Typeface.bodyMedium, fontSize: 13 },
  between: { flexDirection: 'row', alignItems: 'center', gap: Spacing.two, marginVertical: Spacing.one + Spacing.half },
  rule: { flex: 1, height: StyleSheet.hairlineWidth, backgroundColor: 'rgba(255,255,255,0.14)' },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    height: 24,
    borderRadius: 12,
    backgroundColor: 'rgba(248,113,113,0.14)',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(248,113,113,0.45)',
  },
  chipText: { color: RED, fontFamily: Typeface.bodySemiBold, fontSize: 12, letterSpacing: -0.1 },
  callout: {
    marginTop: Spacing.four,
    flexDirection: 'row',
    gap: Spacing.two,
    padding: Spacing.three,
    borderRadius: 18,
    backgroundColor: 'rgba(248,113,113,0.08)',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(248,113,113,0.3)',
  },
  calloutFallback: { width: 14, height: 14, borderRadius: 7, backgroundColor: RED },
  calloutText: { flex: 1, color: 'rgba(242,242,244,0.82)', fontFamily: Typeface.body, fontSize: 13.5, lineHeight: 19, letterSpacing: -0.1 },
});
