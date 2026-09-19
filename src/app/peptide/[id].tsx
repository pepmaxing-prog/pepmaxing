import { useLocalSearchParams, useRouter } from 'expo-router';
import { SymbolView, type SFSymbol } from 'expo-symbols';
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
import { categoryById, peptideById, savedStore, STACKS, STATUS_LABEL, useSaved, PEPTIDES } from '@/lib/peptides';
import { quickActions } from '@/lib/quick-actions';

export default function PeptideScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { width, height } = useWindowDimensions();
  const { id } = useLocalSearchParams<{ id: string }>();
  const saved = useSaved();
  const peptide = peptideById(id);

  if (!peptide) {
    return (
      <View style={styles.root}>
        <Text style={styles.missing}>That peptide isn’t in the library.</Text>
      </View>
    );
  }
  const category = categoryById(peptide.category);
  const isSaved = saved.includes(peptide.id);
  const inStacks = STACKS.filter((s) => s.peptides.includes(peptide.id));
  const related = PEPTIDES.filter((p) => p.category === peptide.category && p.id !== peptide.id).slice(0, 3);

  const facts: { symbol: SFSymbol; label: string; value: string }[] = [
    { symbol: 'syringe', label: 'Route', value: peptide.route },
    { symbol: 'clock', label: 'Half-life', value: peptide.halfLife ?? 'Not established' },
    { symbol: 'checkmark.seal', label: 'Status', value: STATUS_LABEL[peptide.status] },
  ];

  return (
    <View style={styles.root}>
      <StageBackground width={width} height={height} center={{ x: width / 2, y: height * 0.18 }} />
      <View style={[styles.header, { paddingTop: insets.top + Spacing.two }]}>
        <PressableScale onPress={() => router.back()} accessibilityRole="button" accessibilityLabel="Back" hitSlop={10} style={styles.iconButton}>
          <SymbolView name="chevron.left" size={18} weight="medium" tintColor="#F5F5F7" fallback={<Text style={styles.glyph}>‹</Text>} />
        </PressableScale>
        <Text style={styles.headerTitle} numberOfLines={1}>
          {peptide.name}
        </Text>
        <PressableScale onPress={() => savedStore.toggle(peptide.id)} accessibilityRole="button" accessibilityLabel={isSaved ? 'Remove from saved' : 'Save'} hitSlop={10} style={styles.iconButton}>
          <SymbolView name={isSaved ? 'bookmark.fill' : 'bookmark'} size={18} weight="medium" tintColor={isSaved ? category.color : '#F5F5F7'} fallback={<Text style={styles.glyph}>♡</Text>} />
        </PressableScale>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: Gutter, paddingBottom: Math.max(insets.bottom, Spacing.three) + 96 }}>
        <Animated.View entering={FadeIn.duration(360)} style={styles.hero}>
          <View style={[styles.heroGlow, { backgroundColor: `${category.color}22` }]} />
          <Vial color={category.color} size={64} />
          <View style={styles.heroText}>
            <Text style={styles.name}>{peptide.name}</Text>
            <Text style={styles.nickname}>{peptide.nickname}</Text>
            {peptide.aka ? <Text style={styles.aka}>{peptide.aka}</Text> : null}
            <View style={styles.chips}>
              <View style={[styles.chip, { backgroundColor: `${category.color}22` }]}>
                <View style={[styles.chipDot, { backgroundColor: category.color }]} />
                <Text style={[styles.chipText, { color: category.color }]}>{category.label}</Text>
              </View>
              {peptide.tags
                .filter((t) => t.toLowerCase() !== category.label.toLowerCase())
                .map((t) => (
                  <View key={t} style={styles.chip}>
                    <Text style={styles.chipText}>{t}</Text>
                  </View>
                ))}
            </View>
          </View>
        </Animated.View>

        <Animated.View entering={FadeInDown.delay(100).duration(420)} style={styles.facts}>
          {facts.map((f) => (
            <View key={f.label} style={styles.fact}>
              <SymbolView name={f.symbol} size={14} weight="semibold" tintColor={category.color} fallback={null} />
              <Text style={styles.factLabel}>{f.label.toUpperCase()}</Text>
              <Text style={styles.factValue} numberOfLines={3}>
                {f.value}
              </Text>
            </View>
          ))}
        </Animated.View>

        <Section title="Overview" delay={180} text={peptide.overview} />
        <Section title="How it works" delay={240} text={peptide.mechanism} />
        <Section title="Evidence & safety" delay={300} text={peptide.evidence} accent={peptide.status === 'research' ? category.color : undefined} />

        {inStacks.length > 0 ? (
          <Animated.View entering={FadeInDown.delay(360).duration(420)} style={styles.block}>
            <Text style={styles.blockTitle}>PART OF</Text>
            <View style={styles.stackRow}>
              {inStacks.map((s) => (
                <PressableScale key={s.id} onPress={() => router.push({ pathname: '/stack/[id]', params: { id: s.id } })} accessibilityRole="button" style={styles.stackPill}>
                  <Text style={styles.stackPillText}>{s.name}</Text>
                  <Text style={styles.stackPillMeta}>{s.peptides.length} peptides</Text>
                </PressableScale>
              ))}
            </View>
          </Animated.View>
        ) : null}

        {related.length > 0 ? (
          <Animated.View entering={FadeInDown.delay(420).duration(420)} style={styles.block}>
            <Text style={styles.blockTitle}>ALSO IN {category.label.toUpperCase()}</Text>
            <View style={styles.list}>
              {related.map((p) => (
                <PeptideRow key={p.id} peptide={p} saved={saved.includes(p.id)} compact onPress={() => router.push({ pathname: '/peptide/[id]', params: { id: p.id } })} />
              ))}
            </View>
          </Animated.View>
        ) : null}

        <Text style={styles.disclaimer}>{Brand.name} summarises published research and regulatory status. It is not medical advice; discuss any compound with a licensed clinician.</Text>
      </ScrollView>

      <View style={[styles.footer, { paddingBottom: Math.max(insets.bottom, Spacing.three) }]}>
        <ShineButton label="Add to a protocol" onPress={() => quickActions.open()} shineDelay={1600} />
      </View>
    </View>
  );
}

function Section({ title, text, delay, accent }: { title: string; text: string; delay: number; accent?: string }) {
  return (
    <Animated.View entering={FadeInDown.delay(delay).duration(420)} style={[styles.block, accent ? { borderLeftWidth: 2, borderLeftColor: accent, paddingLeft: Spacing.three } : null]}>
      <Text style={styles.blockTitle}>{title.toUpperCase()}</Text>
      <Text style={styles.body}>{text}</Text>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: Brand.black },
  missing: { color: '#F5F5F7', margin: Spacing.six, fontFamily: Typeface.body },
  header: { paddingHorizontal: Spacing.three, paddingBottom: Spacing.two, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: Spacing.two },
  iconButton: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  glyph: { color: '#F5F5F7', fontSize: 22 },
  headerTitle: { flex: 1, textAlign: 'center', color: 'rgba(242,242,244,0.7)', fontFamily: Typeface.bodySemiBold, fontSize: 15, letterSpacing: -0.2 },
  hero: { marginTop: Spacing.two, flexDirection: 'row', alignItems: 'flex-start', gap: Spacing.three, padding: Spacing.three, borderRadius: 24, backgroundColor: 'rgba(255,255,255,0.05)', borderWidth: StyleSheet.hairlineWidth, borderColor: 'rgba(255,255,255,0.12)', overflow: 'hidden' },
  heroGlow: { position: 'absolute', top: -60, right: -60, width: 180, height: 180, borderRadius: 90 },
  heroText: { flex: 1, gap: 3 },
  name: { color: '#F5F5F7', fontFamily: Typeface.display, fontSize: 26, letterSpacing: -0.7 },
  nickname: { color: 'rgba(242,242,244,0.85)', fontFamily: Typeface.bodyMedium, fontSize: 15, letterSpacing: -0.2 },
  aka: { color: 'rgba(242,242,244,0.5)', fontFamily: Typeface.body, fontSize: 12.5, marginTop: 2 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: Spacing.one + Spacing.half },
  chip: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 9, paddingVertical: 4, borderRadius: 9, backgroundColor: 'rgba(255,255,255,0.08)' },
  chipDot: { width: 6, height: 6, borderRadius: 3 },
  chipText: { color: 'rgba(242,242,244,0.75)', fontFamily: Typeface.bodySemiBold, fontSize: 11 },
  facts: { marginTop: Spacing.two, flexDirection: 'row', gap: Spacing.two },
  fact: { flex: 1, padding: Spacing.two + Spacing.half, borderRadius: 18, backgroundColor: 'rgba(255,255,255,0.05)', borderWidth: StyleSheet.hairlineWidth, borderColor: 'rgba(255,255,255,0.1)', gap: 4 },
  factLabel: { color: 'rgba(242,242,244,0.45)', fontFamily: Typeface.bodySemiBold, fontSize: 9.5, letterSpacing: 0.9 },
  factValue: { color: '#F2F2F4', fontFamily: Typeface.bodyMedium, fontSize: 12.5, lineHeight: 17, letterSpacing: -0.1 },
  block: { marginTop: Spacing.five },
  blockTitle: { color: 'rgba(242,242,244,0.5)', fontFamily: Typeface.bodySemiBold, fontSize: 11, letterSpacing: 1.1, marginBottom: Spacing.one + Spacing.half },
  body: { color: 'rgba(242,242,244,0.82)', fontFamily: Typeface.body, fontSize: 15.5, lineHeight: 23, letterSpacing: -0.15 },
  stackRow: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.two },
  stackPill: { paddingHorizontal: Spacing.three, paddingVertical: Spacing.two, borderRadius: 16, backgroundColor: 'rgba(255,255,255,0.06)', borderWidth: StyleSheet.hairlineWidth, borderColor: 'rgba(255,255,255,0.14)', gap: 1 },
  stackPillText: { color: '#F5F5F7', fontFamily: Typeface.bodySemiBold, fontSize: 14, letterSpacing: -0.2 },
  stackPillMeta: { color: 'rgba(242,242,244,0.5)', fontFamily: Typeface.body, fontSize: 11.5 },
  list: { gap: Spacing.two },
  disclaimer: { marginTop: Spacing.five, color: 'rgba(242,242,244,0.38)', fontFamily: Typeface.body, fontSize: 12, lineHeight: 17, textAlign: 'center' },
  footer: { position: 'absolute', left: 0, right: 0, bottom: 0, paddingHorizontal: Gutter, paddingTop: Spacing.two, experimental_backgroundImage: 'linear-gradient(180deg, rgba(0,0,0,0) 0%, rgba(0,0,0,0.9) 40%, #000 100%)' },
});
