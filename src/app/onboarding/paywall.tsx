import { useRouter } from 'expo-router';
import { SymbolView, type SFSymbol } from 'expo-symbols';
import { useEffect, useState } from 'react';
import { Linking, ScrollView, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import Animated, { Easing, FadeIn, FadeInDown, useAnimatedStyle, useDerivedValue, useFrameCallback, useReducedMotion, useSharedValue, withDelay, withTiming } from 'react-native-reanimated';

import { OnboardingShell } from '@/components/onboarding/onboarding-shell';
import { useTranscriptType } from '@/components/onboarding/typewriter';
import { PressableScale } from '@/components/pressable-scale';
import { ShineButton } from '@/components/shine-button';
import { ProtocolDemo } from '@/components/welcome/demos/protocol-demo';
import { DEMO_HEIGHT, DEMO_WIDTH } from '@/components/welcome/demos/shared';
import { DeviceFrame, deviceMetrics } from '@/components/welcome/device-frame';
import { Brand, Legal } from '@/constants/brand';
import { Accent, Spacing, Typeface } from '@/constants/theme';
import { onboardingStore } from '@/lib/onboarding-store';
import { getPlans, PurchasesNotConfiguredError, restorePurchases, type Plan, type PlanId } from '@/lib/purchases';
import { useSplashPhase } from '@/lib/splash-state';

const BENEFITS: { symbol: SFSymbol; title: string; text: string }[] = [
  { symbol: 'function', title: 'Dose math, done', text: 'Vial, water, dose \u2192 exact units to draw, instantly.' },
  { symbol: 'mappin.and.ellipse', title: 'Never lose your rotation', text: 'Every site, dose and cycle, remembered for you.' },
  { symbol: 'chart.line.uptrend.xyaxis', title: 'Watch it actually work', text: 'Your whole arc, week one to now, in one view.' },
];

export default function PaywallScreen() {
  const router = useRouter();
  const reducedMotion = useReducedMotion();
  const { width, height } = useWindowDimensions();
  const type = useTranscriptType();
  const entered = useSplashPhase() !== 'showing';
  const [plans, setPlans] = useState<Plan[]>([]);
  const [selected, setSelected] = useState<PlanId>('yearly');
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);

  useEffect(() => {
    getPlans().then(setPlans);
  }, []);

  // The phone rises into view and breathes, as on the welcome screen.
  const device = deviceMetrics(Math.min(width * 0.34, 140));
  const demoScale = device.screenWidth / DEMO_WIDTH;
  const rise = useSharedValue(reducedMotion ? 1 : 0);
  useEffect(() => {
    if (!entered || reducedMotion) return;
    rise.set(withDelay(250, withTiming(1, { duration: 900, easing: Easing.out(Easing.cubic) })));
  }, [entered, reducedMotion, rise]);
  const clock = useSharedValue(0);
  useFrameCallback((frame) => {
    clock.set((frame.timeSinceFirstFrame ?? 0) / 1000);
  }, !reducedMotion);
  const rotateY = useDerivedValue(() => (reducedMotion ? 0 : Math.sin(clock.get() * 0.7) * 6) * rise.get());
  const rotateX = useDerivedValue(() => (reducedMotion ? 0 : Math.sin(clock.get() * 0.5 + 1) * 1.5) * rise.get());
  const deviceStyle = useAnimatedStyle(() => ({
    opacity: rise.get(),
    transform: [{ translateY: 70 * (1 - rise.get()) }, { scale: 0.9 + 0.1 * rise.get() }],
  }));

  // Purchases are wired later (RevenueCat); for now the plan choice is recorded and onboarding completes.
  const start = () => {
    if (busy) return;
    setBusy(true);
    onboardingStore.set({ completedAt: new Date().toISOString() });
    router.replace('/home');
  };
  const restore = async () => {
    try {
      await restorePurchases();
    } catch (error) {
      setNotice(error instanceof PurchasesNotConfiguredError ? 'Purchases are being set up. Check back shortly.' : 'Nothing to restore on this Apple ID.');
    }
  };

  const compact = height < 760;
  return (
    <OnboardingShell
      footer={
        <Animated.View entering={FadeIn.delay(700).duration(420)} style={styles.actions}>
          <ShineButton label="Start my protocol" onPress={start} disabled={busy || plans.length === 0} shineDelay={1600} />
          {notice ? (
            <Animated.Text entering={FadeIn.duration(240)} style={styles.notice}>
              {notice}
            </Animated.Text>
          ) : null}
          <Text style={styles.footnote}>One wrong measurement can cost you a $300 vial. {Brand.name} does the math so you don’t.</Text>
          <View style={styles.links}>
            <LinkText label="Terms" url={Legal.termsUrl} />
            <Text style={styles.dot}>·</Text>
            <LinkText label="Privacy" url={Legal.privacyUrl} />
            <Text style={styles.dot}>·</Text>
            <Text style={styles.link} onPress={restore} accessibilityRole="button" suppressHighlighting>
              Restore
            </Text>
          </View>
        </Animated.View>
      }>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingTop: Math.round(Spacing.three * type.scale), paddingBottom: Spacing.three }}>
        <Animated.Text entering={FadeIn.duration(420)} style={[type.text, styles.title]} accessibilityRole="header">
          {'Everything to run\nyour protocol right.'}
        </Animated.Text>

        <Animated.View style={[styles.deviceWrap, { height: compact ? device.height * 0.56 : device.height * 0.66 }, deviceStyle]}>
          <View style={{ height: device.height, overflow: 'hidden' }}>
            <DeviceFrame width={device.width} rotateY={rotateY} rotateX={rotateX}>
              <View style={{ width: device.screenWidth, height: device.screenHeight, overflow: 'hidden' }}>
                <View style={{ width: DEMO_WIDTH, height: DEMO_HEIGHT, transform: [{ scale: demoScale }], transformOrigin: 'top left' }}>
                  <ProtocolDemo active={entered} />
                </View>
              </View>
            </DeviceFrame>
          </View>
        </Animated.View>

        <View style={styles.benefits}>
          {BENEFITS.map((b, i) => (
            <Animated.View key={b.title} entering={FadeInDown.delay(500 + i * 110).duration(440)} style={styles.benefit}>
              <View style={styles.benefitIcon}>
                <SymbolView name={b.symbol} size={15} weight="semibold" tintColor={Accent.primary} fallback={<View style={styles.iconFallback} />} />
              </View>
              <Text style={styles.benefitText}>
                <Text style={styles.benefitTitle}>{b.title} </Text>
                {b.text}
              </Text>
            </Animated.View>
          ))}
        </View>

        <Animated.View entering={FadeInDown.delay(850).duration(460)} style={styles.plans}>
          {plans.map((plan) => (
            <PlanCard key={plan.id} plan={plan} selected={plan.id === selected} onPress={() => setSelected(plan.id)} />
          ))}
        </Animated.View>
      </ScrollView>
    </OnboardingShell>
  );
}

function PlanCard({ plan, selected, onPress }: { plan: Plan; selected: boolean; onPress: () => void }) {
  return (
    <PressableScale onPress={onPress} accessibilityRole="radio" accessibilityState={{ selected }} style={[styles.plan, selected && styles.planOn]}>
      {plan.badge ? (
        <View style={styles.badge}>
          <Text style={styles.badgeText}>{plan.badge.toUpperCase()}</Text>
        </View>
      ) : null}
      <View style={styles.planHeader}>
        <Text style={styles.planTitle}>{plan.title.toUpperCase()}</Text>
        <View style={[styles.radio, selected && styles.radioOn]}>{selected ? <SymbolView name="checkmark" size={10} weight="bold" tintColor="#062B1F" fallback={null} /> : null}</View>
      </View>
      <View style={styles.priceRow}>
        {plan.compareAt ? <Text style={styles.compareAt}>{plan.compareAt}</Text> : null}
        <Text style={styles.perMonth}>{plan.perMonth ?? plan.price}</Text>
      </View>
      <Text style={styles.period}>
        {plan.price} {plan.period}
      </Text>
    </PressableScale>
  );
}

function LinkText({ label, url }: { label: string; url: string }) {
  return (
    <Text style={styles.link} onPress={url ? () => Linking.openURL(url) : undefined} accessibilityRole={url ? 'link' : undefined} suppressHighlighting>
      {label}
    </Text>
  );
}

const styles = StyleSheet.create({
  title: { fontSize: 29, lineHeight: 35 },
  deviceWrap: { marginTop: Spacing.three, alignItems: 'center', overflow: 'hidden' },
  benefits: { marginTop: Spacing.two, gap: Spacing.one + Spacing.half },
  benefit: { flexDirection: 'row', alignItems: 'center', gap: Spacing.two + Spacing.half },
  benefitIcon: { width: 32, height: 32, borderRadius: 16, backgroundColor: 'rgba(52,211,153,0.12)', alignItems: 'center', justifyContent: 'center' },
  iconFallback: { width: 12, height: 12, borderRadius: 6, backgroundColor: Accent.primary },
  benefitText: { flex: 1, color: 'rgba(242,242,244,0.7)', fontFamily: Typeface.body, fontSize: 13.5, lineHeight: 19, letterSpacing: -0.1 },
  benefitTitle: { color: '#F5F5F7', fontFamily: Typeface.bodySemiBold },
  plans: { marginTop: Spacing.three + Spacing.one, flexDirection: 'row', gap: Spacing.two },
  plan: {
    flex: 1,
    padding: Spacing.three,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderWidth: 1.5,
    borderColor: 'rgba(255,255,255,0.12)',
    gap: 4,
  },
  planOn: { borderColor: Accent.primary, backgroundColor: 'rgba(52,211,153,0.08)' },
  badge: { position: 'absolute', top: -11, left: Spacing.three, paddingHorizontal: 8, height: 20, borderRadius: 10, backgroundColor: Accent.primary, justifyContent: 'center' },
  badgeText: { color: '#062B1F', fontFamily: Typeface.bodyBold, fontSize: 9.5, letterSpacing: 0.6 },
  planHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  planTitle: { color: 'rgba(242,242,244,0.7)', fontFamily: Typeface.bodySemiBold, fontSize: 11, letterSpacing: 0.8 },
  radio: { width: 20, height: 20, borderRadius: 10, borderWidth: 1.5, borderColor: 'rgba(255,255,255,0.3)', alignItems: 'center', justifyContent: 'center' },
  radioOn: { backgroundColor: Accent.primary, borderColor: Accent.primary },
  priceRow: { flexDirection: 'row', alignItems: 'baseline', gap: 6, marginTop: 2 },
  compareAt: { color: 'rgba(242,242,244,0.4)', fontFamily: Typeface.bodyMedium, fontSize: 13, textDecorationLine: 'line-through' },
  perMonth: { color: '#F5F5F7', fontFamily: Typeface.bodyBold, fontSize: 17, letterSpacing: -0.3 },
  period: { color: 'rgba(242,242,244,0.5)', fontFamily: Typeface.body, fontSize: 11.5 },
  actions: { gap: Spacing.one + Spacing.half },
  notice: { color: 'rgba(242,242,244,0.7)', fontFamily: Typeface.body, fontSize: 13, lineHeight: 18, textAlign: 'center' },
  footnote: { color: 'rgba(242,242,244,0.45)', fontFamily: Typeface.body, fontSize: 11.5, lineHeight: 16, textAlign: 'center' },
  links: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 8 },
  link: { color: 'rgba(242,242,244,0.55)', fontFamily: Typeface.bodyMedium, fontSize: 12 },
  dot: { color: 'rgba(242,242,244,0.35)', fontSize: 12 },
});
