import { useRouter } from 'expo-router';
import { SymbolView } from 'expo-symbols';
import { useMemo, useState } from 'react';
import { ScrollView, StyleSheet, Text, TextInput, useWindowDimensions, View } from 'react-native';
import Animated, { FadeIn, FadeInDown, LinearTransition } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { TAB_BAR_HEIGHT } from '@/components/home/floating-tab-bar';
import { PeptideRow } from '@/components/library/peptide-row';
import { StackCard } from '@/components/library/stack-card';
import { Gutter } from '@/components/onboarding/onboarding-shell';
import { PressableScale } from '@/components/pressable-scale';
import { StageBackground } from '@/components/stage/stage-background';
import { Brand } from '@/constants/brand';
import { Accent, Spacing, Typeface } from '@/constants/theme';
import { CATEGORIES, PEPTIDES, searchPeptides, STACKS, useSaved, type CategoryId } from '@/lib/peptides';

type Filter = CategoryId | 'all';

export default function LibraryScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { width, height } = useWindowDimensions();
  const saved = useSaved();
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState<Filter>('all');
  const [savedOnly, setSavedOnly] = useState(false);

  const searching = query.trim().length > 0;
  const results = useMemo(() => {
    const base = searchPeptides(query, filter);
    return savedOnly ? base.filter((p) => saved.includes(p.id)) : base;
  }, [query, filter, savedOnly, saved]);

  const sections = useMemo(
    () => CATEGORIES.map((c) => ({ category: c, items: results.filter((p) => p.category === c.id) })).filter((s) => s.items.length > 0),
    [results],
  );
  const stacks = useMemo(() => (filter === 'all' ? STACKS : STACKS.filter((s) => s.category === filter)), [filter]);
  const showStacks = !searching && !savedOnly && stacks.length > 0;
  const cardWidth = Math.min(236, width * 0.6);

  return (
    <View style={styles.root}>
      <StageBackground width={width} height={height} center={{ x: width / 2, y: height * 0.15 }} />
      <ScrollView
        keyboardDismissMode="on-drag"
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingTop: insets.top + Spacing.three, paddingBottom: TAB_BAR_HEIGHT + Math.max(insets.bottom, Spacing.two) + Spacing.five }}>
        <Animated.View entering={FadeIn.duration(360)} style={styles.header}>
          <View>
            <Text style={styles.title}>Library</Text>
            <Text style={styles.subtitle}>
              {PEPTIDES.length} peptides · {STACKS.length} stacks
            </Text>
          </View>
          <PressableScale
            onPress={() => setSavedOnly((v) => !v)}
            accessibilityRole="button"
            accessibilityState={{ selected: savedOnly }}
            style={[styles.savedPill, savedOnly && styles.savedPillOn]}>
            <SymbolView name={savedOnly ? 'bookmark.fill' : 'bookmark'} size={14} weight="semibold" tintColor={savedOnly ? '#062B1F' : '#F5F5F7'} fallback={null} />
            <Text style={[styles.savedText, savedOnly && styles.savedTextOn]}>Saved{saved.length ? ` · ${saved.length}` : ''}</Text>
          </PressableScale>
        </Animated.View>

        <Animated.View entering={FadeInDown.delay(60).duration(400)} style={styles.search}>
          <SymbolView name="magnifyingglass" size={16} weight="medium" tintColor="rgba(242,242,244,0.5)" fallback={null} />
          <TextInput
            value={query}
            onChangeText={setQuery}
            placeholder="Search peptides, nicknames, effects"
            placeholderTextColor="rgba(242,242,244,0.4)"
            autoCorrect={false}
            autoCapitalize="none"
            returnKeyType="search"
            clearButtonMode="while-editing"
            accessibilityLabel="Search the library"
            style={styles.searchInput}
          />
        </Animated.View>

        <Animated.View entering={FadeInDown.delay(120).duration(400)}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chips} keyboardShouldPersistTaps="handled">
            <Chip label="All" color={Accent.primary} selected={filter === 'all'} onPress={() => setFilter('all')} />
            {CATEGORIES.map((c) => (
              <Chip key={c.id} label={c.label} color={c.color} selected={filter === c.id} onPress={() => setFilter(filter === c.id ? 'all' : c.id)} />
            ))}
          </ScrollView>
        </Animated.View>

        {showStacks ? (
          <Animated.View entering={FadeInDown.delay(180).duration(420)} layout={LinearTransition.duration(240)}>
            <View style={[styles.section, styles.sectionHeader]}>
              <Text style={styles.eyebrow}>STACKS</Text>
              <Text style={styles.eyebrowMeta}>{stacks.length} curated</Text>
            </View>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.rail} keyboardShouldPersistTaps="handled">
              {stacks.map((s) => (
                <StackCard key={s.id} stack={s} width={cardWidth} onPress={() => router.push({ pathname: '/stack/[id]', params: { id: s.id } })} />
              ))}
            </ScrollView>
          </Animated.View>
        ) : null}

        {sections.length === 0 ? (
          <Animated.View entering={FadeIn.duration(300)} style={[styles.section, styles.empty]}>
            <Text style={styles.emptyTitle}>{savedOnly ? 'Nothing saved yet' : 'No matches'}</Text>
            <Text style={styles.emptyText}>{savedOnly ? 'Tap the bookmark on any peptide to keep it here.' : `Try a nickname or an effect, like \u201chealing\u201d or \u201csleep\u201d.`}</Text>
          </Animated.View>
        ) : (
          sections.map((s, i) => (
            <Animated.View key={s.category.id} entering={FadeInDown.delay(220 + Math.min(i, 4) * 60).duration(420)} layout={LinearTransition.duration(240)}>
              <View style={[styles.section, styles.sectionHeader]}>
                <View style={styles.sectionTitle}>
                  <View style={[styles.dot, { backgroundColor: s.category.color }]} />
                  <Text style={styles.eyebrow}>{s.category.label.toUpperCase()}</Text>
                </View>
                <Text style={styles.eyebrowMeta}>{s.category.blurb}</Text>
              </View>
              <View style={[styles.section, styles.list]}>
                {s.items.map((p) => (
                  <PeptideRow key={p.id} peptide={p} saved={saved.includes(p.id)} compact={searching} onPress={() => router.push({ pathname: '/peptide/[id]', params: { id: p.id } })} />
                ))}
              </View>
            </Animated.View>
          ))
        )}

        <Text style={styles.disclaimer}>{Brand.name} describes what the research says. It is not medical advice; talk to a clinician before starting anything.</Text>
      </ScrollView>
    </View>
  );
}

function Chip({ label, color, selected, onPress }: { label: string; color: string; selected: boolean; onPress: () => void }) {
  return (
    <PressableScale onPress={onPress} accessibilityRole="button" accessibilityState={{ selected }} style={[styles.chip, selected && { backgroundColor: `${color}26`, borderColor: `${color}99` }]}>
      <View style={[styles.chipDot, { backgroundColor: color }, !selected && styles.chipDotIdle]} />
      <Text style={[styles.chipText, selected && { color }]}>{label}</Text>
    </PressableScale>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: Brand.black },
  header: { paddingHorizontal: Gutter, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  title: { color: '#F5F5F7', fontFamily: Typeface.display, fontSize: 32, letterSpacing: -1 },
  subtitle: { marginTop: 2, color: 'rgba(242,242,244,0.5)', fontFamily: Typeface.body, fontSize: 13 },
  savedPill: { flexDirection: 'row', alignItems: 'center', gap: 6, height: 36, paddingHorizontal: 14, borderRadius: 18, backgroundColor: 'rgba(255,255,255,0.08)', borderWidth: StyleSheet.hairlineWidth, borderColor: 'rgba(255,255,255,0.16)' },
  savedPillOn: { backgroundColor: Accent.primary, borderColor: Accent.primary },
  savedText: { color: '#F5F5F7', fontFamily: Typeface.bodySemiBold, fontSize: 13.5, letterSpacing: -0.1 },
  savedTextOn: { color: '#062B1F' },
  section: { paddingHorizontal: Gutter },
  search: {
    marginTop: Spacing.four,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    marginHorizontal: Gutter,
    paddingHorizontal: Spacing.three,
    height: 50,
    borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(255,255,255,0.14)',
  },
  searchInput: { flex: 1, color: '#F5F5F7', fontFamily: Typeface.body, fontSize: 15.5, letterSpacing: -0.15, paddingVertical: 0 },
  chips: { paddingHorizontal: Gutter, paddingTop: Spacing.three, gap: Spacing.one, flexDirection: 'row' },
  chip: { flexDirection: 'row', alignItems: 'center', gap: 7, height: 34, paddingHorizontal: 13, borderRadius: 17, backgroundColor: 'rgba(255,255,255,0.05)', borderWidth: StyleSheet.hairlineWidth, borderColor: 'rgba(255,255,255,0.14)' },
  chipDot: { width: 7, height: 7, borderRadius: 3.5 },
  chipDotIdle: { opacity: 0.55 },
  chipText: { color: 'rgba(242,242,244,0.75)', fontFamily: Typeface.bodySemiBold, fontSize: 13, letterSpacing: -0.1 },
  sectionHeader: { marginTop: Spacing.five, marginBottom: Spacing.two, flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between', gap: Spacing.two },
  sectionTitle: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  dot: { width: 8, height: 8, borderRadius: 4 },
  eyebrow: { color: 'rgba(242,242,244,0.7)', fontFamily: Typeface.bodySemiBold, fontSize: 11.5, letterSpacing: 1.1 },
  eyebrowMeta: { color: 'rgba(242,242,244,0.4)', fontFamily: Typeface.body, fontSize: 12, flexShrink: 1, textAlign: 'right' },
  rail: { paddingHorizontal: Gutter, gap: Spacing.two, flexDirection: 'row' },
  list: { gap: Spacing.two },
  empty: { marginTop: Spacing.six, alignItems: 'center', gap: Spacing.one },
  emptyTitle: { color: '#F5F5F7', fontFamily: Typeface.bodySemiBold, fontSize: 17, letterSpacing: -0.3 },
  emptyText: { color: 'rgba(242,242,244,0.55)', fontFamily: Typeface.body, fontSize: 14, textAlign: 'center', lineHeight: 20 },
  disclaimer: { marginTop: Spacing.five, paddingHorizontal: Gutter, color: 'rgba(242,242,244,0.38)', fontFamily: Typeface.body, fontSize: 12, lineHeight: 17, textAlign: 'center' },
});
