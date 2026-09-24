import { useRouter } from 'expo-router';
import { SymbolView } from 'expo-symbols';
import { useEffect } from 'react';
import { StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import Animated, { Easing, FadeIn, FadeInDown, useAnimatedStyle, useReducedMotion, useSharedValue, withTiming, type SharedValue } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Vial, VialGlow } from '@/components/library/vial';
import { PressableScale } from '@/components/pressable-scale';
import { PageHeader } from '@/components/settings/settings-ui';
import { ShineButton } from '@/components/shine-button';
import { StageBackground } from '@/components/stage/stage-background';
import { Brand } from '@/constants/brand';
import { Accent, AppGutter, Spacing, Typeface } from '@/constants/theme';
import { compoundById, compoundColor } from '@/lib/compounds';
import { draftStore, useDraft } from '@/lib/protocol-draft';
import { joinNames } from '@/lib/schedule';

const VIAL = 112;
const MODES = [
  { id: 'separate', title: 'Track separately', text: 'Each compound keeps its own vial, dose and history.', symbol: 'square.split.2x1' },
  { id: 'blend', title: 'Track as one blend', text: 'One vial and one dose that covers the whole mix.', symbol: 'drop.halffull' },
] as const;

/**
 * Step 2 when several compounds were picked: are they separate vials or one pre-mixed blend?
 * The vials slide together and merge as the choice changes.
 */
export default function TrackModeScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { width, height } = useWindowDimensions();
  const reducedMotion = useReducedMotion();
  const draft = useDraft();
  const compounds = draft.compoundIds.map((id) => compoundById(id)).filter((x): x is NonNullable<typeof x> => !!x);
  const colors = compounds.map(compoundColor);
  const blend = useSharedValue(draft.mode === 'blend' ? 1 : 0);

  useEffect(() => {
    blend.set(reducedMotion ? (draft.mode === 'blend' ? 1 : 0) : withTiming(draft.mode === 'blend' ? 1 : 0, { duration: 520, easing: Easing.inOut(Easing.cubic) }));
  }, [draft.mode, blend, reducedMotion]);

  const n = compounds.length;
  const spacing = Math.min(VIAL * 1.15, (width - AppGutter * 2) / Math.max(n, 1));
  const blendStyle = useAnimatedStyle(() => ({
    opacity: blend.get(),
    transform: [{ scale: 0.7 + blend.get() * 0.3 }],
  }));

  return (
    <View style={styles.root}>
      <StageBackground width={width} height={height} center={{ x: width / 2, y: height * 0.3 }} />
      <PageHeader title="New protocol" right={<Text style={styles.step}>Step 2</Text>} />
      <View style={styles.body}>
        <Animated.View entering={FadeIn.duration(320)} style={styles.titleBlock}>
          <Text style={styles.title} accessibilityRole="header">
            How do you want to track this?
          </Text>
          <Text style={styles.subtitle}>{joinNames(compounds.map((c) => c.name))}</Text>
        </Animated.View>

        <View style={styles.stage} accessible accessibilityLabel={draft.mode === 'blend' ? 'One blended vial' : `${n} separate vials`}>
          {compounds.map((c, i) => (
            <SeparateVial key={c.id} color={colors[i]} offset={(i - (n - 1) / 2) * spacing} blend={blend} index={i} />
          ))}
          <Animated.View style={[styles.vialSlot, blendStyle]}>
            <VialGlow color={colors[0]} colors={colors} size={VIAL * 2.4} />
            <Vial color={colors[0]} colors={colors} size={VIAL} level={0.72} />
          </Animated.View>
        </View>

        <Animated.View entering={FadeInDown.delay(120).duration(400)} style={styles.options}>
          {MODES.map((m) => {
            const on = draft.mode === m.id;
            return (
              <PressableScale key={m.id} onPress={() => draftStore.setMode(m.id)} accessibilityRole="radio" accessibilityState={{ selected: on }} accessibilityLabel={m.title} accessibilityHint={m.text} pressedScale={0.985} style={[styles.option, on && styles.optionOn]}>
                <View style={styles.optionTop}>
                  <View style={[styles.optionIcon, on && styles.optionIconOn]}>
                    <SymbolView name={m.symbol} size={15} weight="semibold" tintColor={on ? Accent.primary : 'rgba(242,242,244,0.6)'} fallback={null} />
                  </View>
                  <View style={[styles.radio, on && styles.radioOn]}>{on ? <View style={styles.radioDot} /> : null}</View>
                </View>
                <Text style={[styles.optionTitle, on && styles.optionTitleOn]}>{m.title}</Text>
                <Text style={styles.optionBody}>{m.text}</Text>
              </PressableScale>
            );
          })}
        </Animated.View>
      </View>

      <View style={[styles.footer, { paddingBottom: Math.max(insets.bottom, Spacing.three) }]}>
        <ShineButton label="Continue" onPress={() => router.push('/protocol/schedule')} shineDelay={1200} />
      </View>
    </View>
  );
}

function SeparateVial({ color, offset, blend, index }: { color: string; offset: number; blend: SharedValue<number>; index: number }) {
  const style = useAnimatedStyle(() => {
    const b = blend.get();
    return {
      opacity: 1 - b,
      transform: [{ translateX: offset * (1 - b) }, { scale: 1 - b * 0.25 }],
    };
  });
  return (
    <Animated.View entering={FadeInDown.delay(80 + index * 70).duration(420)} style={styles.vialSlot}>
      <Animated.View style={[styles.vialInner, style]}>
        <VialGlow color={color} size={VIAL * 2.1} />
        <Vial color={color} size={VIAL} level={0.62} />
      </Animated.View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: Brand.black },
  body: { flex: 1, paddingHorizontal: AppGutter },
  step: { color: 'rgba(242,242,244,0.5)', fontFamily: Typeface.bodySemiBold, fontSize: 12.5 },
  titleBlock: { marginTop: Spacing.two },
  title: { color: '#F5F5F7', fontFamily: Typeface.display, fontSize: 30, letterSpacing: -0.9 },
  subtitle: { marginTop: 4, color: 'rgba(242,242,244,0.55)', fontFamily: Typeface.body, fontSize: 14.5, letterSpacing: -0.1 },
  stage: { flex: 1, minHeight: VIAL * 2.2, alignItems: 'center', justifyContent: 'center' },
  vialSlot: { position: 'absolute', width: VIAL * 2.4, height: VIAL * 2.4, alignItems: 'center', justifyContent: 'center' },
  vialInner: { width: VIAL * 2.4, height: VIAL * 2.4, alignItems: 'center', justifyContent: 'center' },
  options: { flexDirection: 'row', gap: Spacing.two, marginBottom: 100 },
  option: { flex: 1, padding: Spacing.three, borderRadius: 20, backgroundColor: 'rgba(255,255,255,0.05)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)', gap: Spacing.one + Spacing.half },
  optionOn: { borderColor: 'rgba(52,211,153,0.6)', backgroundColor: 'rgba(52,211,153,0.08)' },
  optionTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: Spacing.one },
  optionIcon: { width: 32, height: 32, borderRadius: 10, backgroundColor: 'rgba(255,255,255,0.07)', alignItems: 'center', justifyContent: 'center' },
  optionIconOn: { backgroundColor: 'rgba(52,211,153,0.14)' },
  radio: { width: 22, height: 22, borderRadius: 11, borderWidth: 1.5, borderColor: 'rgba(242,242,244,0.3)', alignItems: 'center', justifyContent: 'center' },
  radioOn: { borderColor: Accent.primary },
  radioDot: { width: 11, height: 11, borderRadius: 5.5, backgroundColor: Accent.primary },
  optionTitle: { color: 'rgba(242,242,244,0.85)', fontFamily: Typeface.bodySemiBold, fontSize: 15, letterSpacing: -0.3 },
  optionTitleOn: { color: '#F5F5F7' },
  optionBody: { color: 'rgba(242,242,244,0.55)', fontFamily: Typeface.body, fontSize: 12.5, lineHeight: 17 },
  footer: { position: 'absolute', left: 0, right: 0, bottom: 0, paddingHorizontal: AppGutter, paddingTop: Spacing.three, experimental_backgroundImage: 'linear-gradient(180deg, rgba(0,0,0,0) 0%, rgba(0,0,0,0.9) 30%, #000 100%)' },
});
