import { usePathname, useRouter } from 'expo-router';
import { SymbolView } from 'expo-symbols';
import { useEffect, type ReactNode } from 'react';
import { Alert, Pressable, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import Animated, { FadeIn, FadeOut, type SharedValue } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { PressableScale } from '@/components/pressable-scale';
import { StageBackground } from '@/components/stage/stage-background';
import { Brand } from '@/constants/brand';
import { Spacing, Typeface } from '@/constants/theme';
import { onboardingStore } from '@/lib/onboarding-store';
import { supabase, supabaseConfigured } from '@/lib/supabase';

/** Horizontal margin shared by every onboarding step. */
export const Gutter = Spacing.four + Spacing.one;
/** Steps counted by the progress bar; the name step has no bar. */
export const TOTAL_STEPS = 16;
/** Local builds only (`.env.local`): long-pressing the progress bar offers to wipe onboarding and start over. */
const ALLOW_RESET = process.env.EXPO_PUBLIC_ALLOW_RESET === '1';

type Props = {
  children: ReactNode;
  /** Full-bleed layer between the stage and the header, e.g. a video montage. */
  backdrop?: ReactNode;
  /** Docked at the bottom of the screen. */
  footer?: ReactNode;
  onBack?: () => void;
  /** Fast-forwards the step's animations. Shown top-right while provided. */
  onSkip?: () => void;
  /** 1-based step shown in the top progress bar. Omit to hide the bar (the first step). */
  step?: number;
  totalSteps?: number;
  /** 0→1 blend of the stage toward the emerald vignette. */
  tint?: SharedValue<number>;
};

/**
 * Shared frame for onboarding steps: the brand stage, a header row (back, progress, skip),
 * content and a docked footer. The header keeps its height whether or not it has controls,
 * so content never shifts when they come and go.
 */
export function OnboardingShell({ children, backdrop, footer, onBack, onSkip, step, totalSteps = TOTAL_STEPS, tint }: Props) {
  const { width, height } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const progress = step === undefined ? 0 : Math.min(1, Math.max(0, step / totalSteps));

  // Every step mounts this shell, so the route reached here is where a relaunch resumes.
  const pathname = usePathname();
  useEffect(() => {
    if (pathname === '/onboarding/welcome-back') return;
    if (pathname.startsWith('/onboarding/') && onboardingStore.get().step !== pathname) onboardingStore.set({ step: pathname });
  }, [pathname]);

  const router = useRouter();
  const offerReset = () => {
    Alert.alert('Start over?', 'This clears your onboarding answers on this device and signs you out.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Start over',
        style: 'destructive',
        onPress: async () => {
          if (supabaseConfigured) await supabase().auth.signOut({ scope: 'local' }).catch(() => {});
          onboardingStore.reset();
          router.replace('/');
        },
      },
    ]);
  };

  return (
    <View style={styles.root}>
      <StageBackground width={width} height={height} center={{ x: width / 2, y: height * 0.34 }} tint={tint} />
      {backdrop ? <View style={styles.backdrop}>{backdrop}</View> : null}
      <View style={[styles.header, { paddingTop: insets.top + Spacing.three }]}>
        {onBack ? (
          <PressableScale onPress={onBack} accessibilityRole="button" accessibilityLabel="Back" hitSlop={12} style={styles.back}>
            <SymbolView name="chevron.left" size={18} tintColor="#F5F5F7" weight="medium" fallback={<View style={styles.backFallback} />} />
          </PressableScale>
        ) : (
          <View style={styles.back} />
        )}
        {step !== undefined ? (
          <Pressable
            style={styles.track}
            onLongPress={ALLOW_RESET ? offerReset : undefined}
            delayLongPress={1200}
            accessibilityRole="progressbar"
            accessibilityValue={{ min: 0, max: totalSteps, now: step }}>
            <View style={[styles.fill, { width: `${progress * 100}%` }]} />
          </Pressable>
        ) : (
          <View style={styles.flex} />
        )}
        <View style={styles.skipSlot}>
          {onSkip ? (
            <Animated.View entering={FadeIn.duration(260)} exiting={FadeOut.duration(200)}>
              <PressableScale onPress={onSkip} accessibilityRole="button" accessibilityLabel="Skip animation" hitSlop={12} style={styles.skip}>
                <Text style={styles.skipLabel}>Skip</Text>
              </PressableScale>
            </Animated.View>
          ) : null}
        </View>
      </View>

      <View style={styles.content}>{children}</View>

      {footer ? <View style={[styles.footer, { paddingBottom: Math.max(insets.bottom, Spacing.three) }]}>{footer}</View> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: Brand.black },
  backdrop: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 },
  flex: { flex: 1 },
  header: {
    paddingHorizontal: Spacing.three,
    paddingBottom: Spacing.three,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
  },
  back: {
    width: 28,
    height: 36,
    alignItems: 'flex-start',
    justifyContent: 'center',
  },
  backFallback: { width: 10, height: 10, borderLeftWidth: 2, borderBottomWidth: 2, borderColor: '#F5F5F7', transform: [{ rotate: '45deg' }] },
  track: {
    flex: 1,
    height: 3,
    borderRadius: 2,
    backgroundColor: 'rgba(255,255,255,0.16)',
    overflow: 'hidden',
  },
  fill: {
    height: '100%',
    borderRadius: 2,
    backgroundColor: 'rgba(255,255,255,0.88)',
  },
  skipSlot: { width: 44, height: 36, alignItems: 'flex-end', justifyContent: 'center' },
  skip: { height: 36, justifyContent: 'center', paddingLeft: Spacing.two },
  skipLabel: {
    color: 'rgba(242,242,244,0.6)',
    fontFamily: Typeface.bodyMedium,
    fontSize: 15,
    letterSpacing: -0.1,
  },
  content: { flex: 1, paddingHorizontal: Gutter, overflow: 'hidden' },
  footer: { paddingHorizontal: Gutter, paddingTop: Spacing.three },
});
