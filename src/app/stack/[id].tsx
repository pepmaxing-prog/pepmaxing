import { useLocalSearchParams, useRouter } from 'expo-router';
import { SymbolView } from 'expo-symbols';
import { ScrollView, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import Animated, { FadeIn, FadeInDown } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { PeptideRow } from '@/components/library/peptide-row';
import { Vial } from '@/components/library/vial';
import { Gutter } from '@/components/onboarding/onboarding-shell';
import { PressableScale } from '@/components/pressable-scale';
import { ShineButton } from '@/components/shine-button';
import { StageBackground } from '@/components/stage/stage-background';
import { Brand } from '@/constants/brand';
import { Spacing, Typeface } from '@/constants/theme';
import { categoryById, peptideById, STACKS, useSaved } from '@/lib/peptides';
import { quickActions } from '@/lib/quick-actions';

export default function StackScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { width, height } = useWindowDimensions();
  const { id } = useLocalSearchParams<{ id: string }>();
  const saved = useSaved();
  const stack = STACKS.find((s) => s.id === id);

  if (!stack) {
    return (
      <View style={styles.root}>
        <Text style={styles.missing}>That stack isn’t in the library.</Text>
      </View>
    );
  }
  const category = categoryById(stack.category);
  const peptides = stack.peptides.map((p) => peptideById(p)).filter((p) => p !== undefined);

  return (
    <View style={styles.root}>
      <StageBackground width={width} height={height} center={{ x: width / 2, y: height * 0.18 }} />
      <View style={[styles.header, { paddingTop: insets.top + Spacing.two }]}>
        <PressableScale onPress={() => router.back()} accessibilityRole="button" accessibilityLabel="Back" hitSlop={10} style={styles.iconButton}>
          <SymbolView name="chevron.left" size={18} weight="medium" tintColor="#F5F5F7" fallback={<Text style={styles.glyph}>‹</Text>} />
        </PressableScale>
        <Text style={styles.headerTitle}>Stack</Text>
        <View style={styles.iconButton} />
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: Gutter, paddingBottom: Math.max(insets.bottom, Spacing.three) + 96 }}>
        <Animated.View entering={FadeIn.duration(360)} style={styles.hero}>
          <View style={[styles.heroGlow, { backgroundColor: `${category.color}22` }]} />
          <View style={styles.vials}>
            {peptides.map((p, i) => (
              <View key={p.id} style={[styles.vialSlot, i > 0 && { marginLeft: -14 }]}>
                <Vial color={categoryById(p.category).color} size={44} />
              </View>
            ))}
          </View>
          <Text style={styles.name}>{stack.name}</Text>
          <Text style={styles.blurb}>{stack.blurb}</Text>
          <View style={[styles.chip, { backgroundColor: `${category.color}22` }]}>
            <View style={[styles.chipDot, { backgroundColor: category.color }]} />
            <Text style={[styles.chipText, { color: category.color }]}>
              {category.label} · {peptides.length} peptides
            </Text>
          </View>
        </Animated.View>

        <Animated.View entering={FadeInDown.delay(120).duration(420)} style={styles.block}>
          <Text style={styles.blockTitle}>WHY THESE TOGETHER</Text>
          <Text style={styles.body}>{stack.rationale}</Text>
        </Animated.View>

        <Animated.View entering={FadeInDown.delay(200).duration(420)} style={styles.block}>
          <Text style={styles.blockTitle}>IN THIS STACK</Text>
          <View style={styles.list}>
            {peptides.map((p) => (
              <PeptideRow key={p.id} peptide={p} saved={saved.includes(p.id)} onPress={() => router.push({ pathname: '/peptide/[id]', params: { id: p.id } })} />
            ))}
          </View>
        </Animated.View>

        <Text style={styles.disclaimer}>Stacks describe combinations people commonly run; {Brand.name} is not recommending them. Talk to a clinician before combining compounds.</Text>
      </ScrollView>

      <View style={[styles.footer, { paddingBottom: Math.max(insets.bottom, Spacing.three) }]}>
        <ShineButton label="Build this protocol" onPress={() => quickActions.open()} shineDelay={1600} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: Brand.black },
  missing: { color: '#F5F5F7', margin: Spacing.six, fontFamily: Typeface.body },
  header: { paddingHorizontal: Spacing.three, paddingBottom: Spacing.two, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  iconButton: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  glyph: { color: '#F5F5F7', fontSize: 22 },
  headerTitle: { color: 'rgba(242,242,244,0.7)', fontFamily: Typeface.bodySemiBold, fontSize: 15, letterSpacing: -0.2 },
  hero: { marginTop: Spacing.two, padding: Spacing.four, borderRadius: 24, backgroundColor: 'rgba(255,255,255,0.05)', borderWidth: StyleSheet.hairlineWidth, borderColor: 'rgba(255,255,255,0.12)', overflow: 'hidden', gap: 4 },
  heroGlow: { position: 'absolute', top: -70, right: -70, width: 200, height: 200, borderRadius: 100 },
  vials: { flexDirection: 'row', marginBottom: Spacing.two },
  vialSlot: { width: 44, height: 44 },
  name: { color: '#F5F5F7', fontFamily: Typeface.display, fontSize: 28, letterSpacing: -0.8 },
  blurb: { color: 'rgba(242,242,244,0.7)', fontFamily: Typeface.body, fontSize: 15, lineHeight: 21, letterSpacing: -0.15 },
  chip: { alignSelf: 'flex-start', flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: Spacing.two, paddingHorizontal: 10, paddingVertical: 5, borderRadius: 10 },
  chipDot: { width: 6, height: 6, borderRadius: 3 },
  chipText: { fontFamily: Typeface.bodySemiBold, fontSize: 11.5 },
  block: { marginTop: Spacing.five },
  blockTitle: { color: 'rgba(242,242,244,0.5)', fontFamily: Typeface.bodySemiBold, fontSize: 11, letterSpacing: 1.1, marginBottom: Spacing.one + Spacing.half },
  body: { color: 'rgba(242,242,244,0.82)', fontFamily: Typeface.body, fontSize: 15.5, lineHeight: 23, letterSpacing: -0.15 },
  list: { gap: Spacing.two },
  disclaimer: { marginTop: Spacing.five, color: 'rgba(242,242,244,0.38)', fontFamily: Typeface.body, fontSize: 12, lineHeight: 17, textAlign: 'center' },
  footer: { position: 'absolute', left: 0, right: 0, bottom: 0, paddingHorizontal: Gutter, paddingTop: Spacing.two, experimental_backgroundImage: 'linear-gradient(180deg, rgba(0,0,0,0) 0%, rgba(0,0,0,0.9) 40%, #000 100%)' },
});
