import { useLocalSearchParams, useRouter } from 'expo-router';
import { SymbolView } from 'expo-symbols';
import { useCallback, useMemo, useState } from 'react';
import { FlatList, Keyboard, Modal, Pressable, ScrollView, StyleSheet, Text, TextInput, useWindowDimensions, View } from 'react-native';
import Animated, { FadeIn, FadeInDown, FadeOut, LinearTransition, useAnimatedStyle } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useKeyboardHeight } from '@/hooks/use-keyboard-height';
import { PressableScale } from '@/components/pressable-scale';
import { CompoundRow, StackRow } from '@/components/protocol/compound-row';
import { PageHeader } from '@/components/settings/settings-ui';
import { ShineButton } from '@/components/shine-button';
import { StageBackground } from '@/components/stage/stage-background';
import { Brand } from '@/constants/brand';
import { Accent, AppGutter, Spacing, Typeface } from '@/constants/theme';
import { COMPOUND_CATEGORIES, COMPOUNDS, compoundCategoryById, customCompoundsStore, searchCompounds, sortCompounds, useCustomCompounds, type Compound, type CompoundCategoryId } from '@/lib/compounds';
import { STACKS, useSaved } from '@/lib/peptides';
import { draftStore, useDraft } from '@/lib/protocol-draft';
import { useSchedule } from '@/lib/schedule';

type Tab = 'all' | 'mine' | 'stacks';
type Filter = 'popular' | 'all' | CompoundCategoryId;

const TABS: { id: Tab; label: string }[] = [
  { id: 'all', label: 'All' },
  { id: 'mine', label: 'Mine' },
  { id: 'stacks', label: 'Stacks' },
];

/**
 * Step 1 of a new protocol: pick what it tracks. Everything is one list — peptides, blends,
 * brands, hormones, vitamins — filtered by tab, category and search. Pick as many as you run;
 * a stack ticks all of its components at once. With `?add=1` the picks join the current draft.
 */
export default function NewProtocolScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { width, height } = useWindowDimensions();
  const params = useLocalSearchParams<{ compound?: string; stack?: string; add?: string }>();
  const adding = params.add === '1';
  const saved = useSaved();
  const custom = useCustomCompounds();
  const schedule = useSchedule();
  const draft = useDraft();

  const [tab, setTab] = useState<Tab>(params.stack ? 'stacks' : 'all');
  const [filter, setFilter] = useState<Filter>('all');
  const [query, setQuery] = useState('');
  const [selected, setSelected] = useState<string[]>(() => {
    const stack = params.stack ? STACKS.find((s) => s.id === params.stack) : undefined;
    return stack ? [...stack.peptides] : params.compound ? [params.compound] : [];
  });
  const [customOpen, setCustomOpen] = useState(false);
  /** Already in the draft when adding more — shown ticked and locked. */
  const locked = useMemo(() => (adding ? draft.compoundIds : []), [adding, draft.compoundIds]);

  const all = useMemo(() => sortCompounds([...custom, ...COMPOUNDS]), [custom]);
  const mine = useMemo(() => {
    const inProtocols = new Set(schedule.protocols.flatMap((p) => p.items.flatMap((i) => i.compoundIds)));
    return all.filter((x) => x.custom || (x.peptideId && saved.includes(x.peptideId)) || saved.includes(x.id) || inProtocols.has(x.id));
  }, [all, saved, schedule.protocols]);
  const compounds = useMemo(() => searchCompounds(tab === 'mine' ? mine : all, query, filter), [tab, mine, all, query, filter]);
  const stacks = useMemo(() => {
    const q = query.trim().toLowerCase();
    return STACKS.filter((s) => (filter === 'all' || filter === 'popular' || s.category === filter) && (!q || s.name.toLowerCase().includes(q) || s.blurb.toLowerCase().includes(q)));
  }, [query, filter]);

  const isSelected = useCallback((id: string) => selected.includes(id) || locked.includes(id), [selected, locked]);
  const toggle = useCallback(
    (id: string) => {
      if (locked.includes(id)) return;
      setSelected((cur) => (cur.includes(id) ? cur.filter((x) => x !== id) : [...cur, id]));
    },
    [locked],
  );
  const stackSelected = (ids: string[]) => ids.every(isSelected);
  const toggleStack = (ids: string[]) =>
    setSelected((cur) => (ids.every((id) => cur.includes(id) || locked.includes(id)) ? cur.filter((id) => !ids.includes(id)) : [...cur, ...ids.filter((id) => !cur.includes(id) && !locked.includes(id))]));
  const picks = selected.map((id) => all.find((x) => x.id === id)).filter((x): x is Compound => !!x);

  const continueTo = () => {
    if (!selected.length) return;
    Keyboard.dismiss();
    if (adding) {
      draftStore.addCompounds(selected);
      router.back();
      return;
    }
    draftStore.start(selected);
    router.push(selected.length > 1 ? '/protocol/track' : '/protocol/schedule');
  };
  const addCustom = (name: string, category: CompoundCategoryId) => {
    const entry = customCompoundsStore.add(name, category);
    setCustomOpen(false);
    setSelected((cur) => [...cur, entry.id]);
    setTab('mine');
    setFilter('all');
    setQuery('');
  };

  const footerHeight = 112 + Math.max(insets.bottom, Spacing.three);
  const renderCompound = useCallback(
    ({ item }: { item: Compound }) => (
      <View style={styles.rowWrap}>
        <CompoundRow
          compound={item}
          selected={isSelected(item.id)}
          locked={locked.includes(item.id)}
          onPress={() => toggle(item.id)}
          onDetails={item.peptideId ? () => router.push({ pathname: '/peptide/[id]', params: { id: item.peptideId! } }) : undefined}
        />
      </View>
    ),
    [isSelected, locked, toggle, router],
  );

  const header = (
    <View>
      <Animated.View entering={FadeIn.duration(320)} style={styles.titleBlock}>
        <Text style={styles.title} accessibilityRole="header">
          {adding ? 'Add more' : 'What are you running?'}
        </Text>
        <Text style={styles.subtitle}>{adding ? 'they join this protocol.' : 'pick everything this protocol tracks.'}</Text>
      </Animated.View>

      <Animated.View entering={FadeInDown.delay(60).duration(380)} style={styles.searchRow}>
        <View style={styles.search}>
          <SymbolView name="magnifyingglass" size={16} weight="medium" tintColor="rgba(242,242,244,0.5)" fallback={null} />
          <TextInput
            value={query}
            onChangeText={setQuery}
            placeholder="Search compounds"
            placeholderTextColor="rgba(242,242,244,0.4)"
            autoCorrect={false}
            autoCapitalize="none"
            returnKeyType="search"
            clearButtonMode="while-editing"
            accessibilityLabel="Search compounds"
            style={styles.searchInput}
          />
        </View>
        <PressableScale onPress={() => setCustomOpen(true)} accessibilityRole="button" accessibilityLabel="Add a custom compound" style={styles.customButton}>
          <SymbolView name="plus" size={13} weight="bold" tintColor="#F5F5F7" fallback={<Text style={styles.customPlus}>+</Text>} />
          <Text style={styles.customText}>Custom</Text>
        </PressableScale>
      </Animated.View>

      <Animated.View entering={FadeInDown.delay(110).duration(380)} style={styles.segment}>
        {TABS.map((t) => {
          const on = tab === t.id;
          return (
            <PressableScale key={t.id} onPress={() => setTab(t.id)} accessibilityRole="tab" accessibilityState={{ selected: on }} pressedScale={0.98} style={[styles.segmentItem, on && styles.segmentItemOn]}>
              <Text style={[styles.segmentText, on && styles.segmentTextOn]}>
                {t.label}
                {t.id === 'mine' && mine.length ? ` · ${mine.length}` : ''}
              </Text>
            </PressableScale>
          );
        })}
      </Animated.View>

      <Animated.View entering={FadeInDown.delay(160).duration(380)}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chips} keyboardShouldPersistTaps="handled">
          <Chip label="Popular" color={Accent.primary} selected={filter === 'popular'} onPress={() => setFilter(filter === 'popular' ? 'all' : 'popular')} />
          {COMPOUND_CATEGORIES.map((cat) => (
            <Chip key={cat.id} label={cat.label} color={cat.color} selected={filter === cat.id} onPress={() => setFilter(filter === cat.id ? 'all' : cat.id)} />
          ))}
        </ScrollView>
      </Animated.View>

      <View style={styles.countRow}>
        <Text style={styles.count}>{tab === 'stacks' ? `${stacks.length} curated stack${stacks.length === 1 ? '' : 's'}` : `${compounds.length} compound${compounds.length === 1 ? '' : 's'}`}</Text>
        {filter !== 'all' ? (
          <PressableScale onPress={() => setFilter('all')} accessibilityRole="button" hitSlop={8}>
            <Text style={styles.clear}>Clear filter</Text>
          </PressableScale>
        ) : null}
      </View>
    </View>
  );

  const empty = (
    <Animated.View entering={FadeIn.duration(260)} style={styles.empty}>
      <Text style={styles.emptyTitle}>{tab === 'mine' && !query && filter === 'all' ? 'Nothing here yet' : 'No matches'}</Text>
      <Text style={styles.emptyText}>
        {tab === 'mine' && !query && filter === 'all' ? 'Bookmark peptides in the Library, or add a custom compound, and they show up here.' : 'Try another spelling, a brand name, or add it as a custom compound.'}
      </Text>
    </Animated.View>
  );

  return (
    <View style={styles.root}>
      <StageBackground width={width} height={height} center={{ x: width / 2, y: height * 0.15 }} />
      <PageHeader title={adding ? 'Add compounds' : 'New protocol'} right={adding ? null : <Text style={styles.step}>Step 1</Text>} />
      {tab === 'stacks' ? (
        <FlatList
          data={stacks}
          keyExtractor={(s) => s.id}
          ListHeaderComponent={header}
          ListEmptyComponent={empty}
          renderItem={({ item }) => (
            <View style={styles.rowWrap}>
              <StackRow stack={item} selected={stackSelected(item.peptides)} onPress={() => toggleStack(item.peptides)} onDetails={() => router.push({ pathname: '/stack/[id]', params: { id: item.id } })} />
            </View>
          )}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="on-drag"
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingBottom: footerHeight + Spacing.three }}
        />
      ) : (
        <FlatList
          data={compounds}
          keyExtractor={(x) => x.id}
          renderItem={renderCompound}
          extraData={[selected, locked]}
          ListHeaderComponent={header}
          ListEmptyComponent={empty}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="on-drag"
          showsVerticalScrollIndicator={false}
          initialNumToRender={14}
          windowSize={7}
          removeClippedSubviews
          contentContainerStyle={{ paddingBottom: footerHeight + Spacing.three }}
        />
      )}

      <View style={[styles.footer, { paddingBottom: Math.max(insets.bottom, Spacing.three) }]}>
        {picks.length ? (
          <Animated.View entering={FadeIn.duration(180)} exiting={FadeOut.duration(140)} layout={LinearTransition.duration(200)} style={styles.picksWrap}>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.picks} keyboardShouldPersistTaps="handled">
              {picks.map((x) => (
                <Animated.View key={x.id} entering={FadeIn.duration(160)} exiting={FadeOut.duration(120)} layout={LinearTransition.duration(200)}>
                  <PressableScale onPress={() => toggle(x.id)} accessibilityRole="button" accessibilityLabel={`Remove ${x.name}`} style={styles.pick}>
                    <View style={[styles.selectedDot, { backgroundColor: compoundCategoryById(x.category).color }]} />
                    <Text style={styles.pickText} numberOfLines={1}>
                      {x.name}
                    </Text>
                    <SymbolView name="xmark" size={9} weight="bold" tintColor="rgba(242,242,244,0.55)" fallback={<Text style={styles.pickX}>×</Text>} />
                  </PressableScale>
                </Animated.View>
              ))}
            </ScrollView>
          </Animated.View>
        ) : null}
        <ShineButton label={adding ? (picks.length ? `Add ${picks.length}` : 'Add') : picks.length > 1 ? `Continue with ${picks.length}` : 'Continue'} onPress={continueTo} disabled={!picks.length} shineDelay={1400} style={styles.continue} />
      </View>

      <CustomCompoundModal open={customOpen} onClose={() => setCustomOpen(false)} onAdd={addCustom} initialName={query} />
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

/** Name + category for something we do not list. Stored on the device; selected as soon as it is added. */
function CustomCompoundModal({ open, onClose, onAdd, initialName }: { open: boolean; onClose: () => void; onAdd: (name: string, category: CompoundCategoryId) => void; initialName: string }) {
  const [name, setName] = useState(initialName);
  const [category, setCategory] = useState<CompoundCategoryId>('other');
  const insets = useSafeAreaInsets();
  const keyboard = useKeyboardHeight();
  // The card rides up with the keyboard so the chips and Add stay reachable.
  const lift = useAnimatedStyle(() => ({ transform: [{ translateY: -keyboard.get() }] }));
  const reset = () => {
    setName('');
    setCategory('other');
  };
  return (
    <Modal visible={open} transparent animationType="fade" onRequestClose={onClose} onShow={() => setName((cur) => cur || initialName)}>
      <View style={styles.modalRoot}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} accessibilityLabel="Dismiss" />
        <Animated.View style={[styles.modalCard, { marginBottom: Math.max(insets.bottom, Spacing.three) + Spacing.two }, lift]} accessibilityViewIsModal>
          <Text style={styles.modalTitle}>Custom compound</Text>
          <Text style={styles.modalHint}>Not in the list? Name it and pick the closest category.</Text>
          <TextInput
            value={name}
            onChangeText={setName}
            placeholder="Name, e.g. Tesofensine"
            placeholderTextColor="rgba(242,242,244,0.4)"
            autoFocus
            autoCorrect={false}
            maxLength={48}
            returnKeyType="done"
            accessibilityLabel="Compound name"
            style={styles.modalInput}
          />
          <View style={styles.modalChips}>
            {COMPOUND_CATEGORIES.map((cat) => (
              <Chip key={cat.id} label={cat.label} color={cat.color} selected={category === cat.id} onPress={() => setCategory(cat.id)} />
            ))}
          </View>
          <View style={styles.modalActions}>
            <PressableScale
              onPress={() => {
                reset();
                onClose();
              }}
              accessibilityRole="button"
              style={styles.modalCancel}>
              <Text style={styles.modalCancelText}>Cancel</Text>
            </PressableScale>
            <View style={styles.modalAdd}>
              <ShineButton
                label="Add"
                disabled={!name.trim()}
                onPress={() => {
                  onAdd(name, category);
                  reset();
                }}
              />
            </View>
          </View>
        </Animated.View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: Brand.black },
  step: { color: 'rgba(242,242,244,0.5)', fontFamily: Typeface.bodySemiBold, fontSize: 12.5, fontVariant: ['tabular-nums'] },
  titleBlock: { paddingHorizontal: AppGutter, marginTop: Spacing.two },
  title: { color: '#F5F5F7', fontFamily: Typeface.display, fontSize: 30, letterSpacing: -0.9 },
  subtitle: { marginTop: 4, color: 'rgba(242,242,244,0.55)', fontFamily: Typeface.body, fontSize: 14.5, letterSpacing: -0.1 },
  searchRow: { marginTop: Spacing.four, marginHorizontal: AppGutter, flexDirection: 'row', alignItems: 'center', gap: Spacing.two },
  search: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    paddingHorizontal: Spacing.three,
    height: 50,
    borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(255,255,255,0.14)',
  },
  searchInput: { flex: 1, color: '#F5F5F7', fontFamily: Typeface.body, fontSize: 15.5, letterSpacing: -0.15, paddingVertical: 0 },
  customButton: { flexDirection: 'row', alignItems: 'center', gap: 5, height: 50, paddingHorizontal: 14, borderRadius: 16, backgroundColor: 'rgba(255,255,255,0.08)', borderWidth: StyleSheet.hairlineWidth, borderColor: 'rgba(255,255,255,0.16)' },
  customPlus: { color: '#F5F5F7', fontFamily: Typeface.bodyBold, fontSize: 15 },
  customText: { color: '#F5F5F7', fontFamily: Typeface.bodySemiBold, fontSize: 13.5, letterSpacing: -0.1 },
  segment: { marginTop: Spacing.three, marginHorizontal: AppGutter, flexDirection: 'row', padding: 3, borderRadius: 14, backgroundColor: 'rgba(255,255,255,0.06)', borderWidth: StyleSheet.hairlineWidth, borderColor: 'rgba(255,255,255,0.1)' },
  segmentItem: { flex: 1, height: 36, borderRadius: 11, alignItems: 'center', justifyContent: 'center' },
  segmentItemOn: { backgroundColor: 'rgba(255,255,255,0.12)' },
  segmentText: { color: 'rgba(242,242,244,0.6)', fontFamily: Typeface.bodySemiBold, fontSize: 13.5, letterSpacing: -0.1 },
  segmentTextOn: { color: '#F5F5F7' },
  chips: { paddingHorizontal: AppGutter, paddingTop: Spacing.three, gap: Spacing.one, flexDirection: 'row' },
  chip: { flexDirection: 'row', alignItems: 'center', gap: 7, height: 34, paddingHorizontal: 13, borderRadius: 17, backgroundColor: 'rgba(255,255,255,0.05)', borderWidth: StyleSheet.hairlineWidth, borderColor: 'rgba(255,255,255,0.14)' },
  chipDot: { width: 7, height: 7, borderRadius: 3.5 },
  chipDotIdle: { opacity: 0.55 },
  chipText: { color: 'rgba(242,242,244,0.75)', fontFamily: Typeface.bodySemiBold, fontSize: 13, letterSpacing: -0.1 },
  countRow: { marginTop: Spacing.four, marginBottom: Spacing.two, paddingHorizontal: AppGutter + Spacing.one, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  count: { color: 'rgba(242,242,244,0.45)', fontFamily: Typeface.bodySemiBold, fontSize: 11, letterSpacing: 1.1, textTransform: 'uppercase' },
  clear: { color: Accent.primary, fontFamily: Typeface.bodySemiBold, fontSize: 12.5 },
  rowWrap: { paddingHorizontal: AppGutter, paddingBottom: Spacing.two },
  empty: { marginTop: Spacing.five, paddingHorizontal: AppGutter, alignItems: 'center', gap: Spacing.one },
  emptyTitle: { color: '#F5F5F7', fontFamily: Typeface.bodySemiBold, fontSize: 17, letterSpacing: -0.3 },
  emptyText: { color: 'rgba(242,242,244,0.55)', fontFamily: Typeface.body, fontSize: 14, textAlign: 'center', lineHeight: 20 },
  footer: { position: 'absolute', left: 0, right: 0, bottom: 0, paddingHorizontal: AppGutter, paddingTop: Spacing.four, gap: Spacing.two, alignItems: 'center', experimental_backgroundImage: 'linear-gradient(180deg, rgba(0,0,0,0) 0%, rgba(0,0,0,0.85) 18%, #000 100%)' },
  picksWrap: { alignSelf: 'stretch', marginHorizontal: -AppGutter },
  picks: { paddingHorizontal: AppGutter, gap: 6, flexDirection: 'row' },
  pick: { flexDirection: 'row', alignItems: 'center', gap: 7, height: 30, paddingLeft: 11, paddingRight: 9, borderRadius: 15, backgroundColor: 'rgba(18,22,20,0.95)', borderWidth: StyleSheet.hairlineWidth, borderColor: 'rgba(255,255,255,0.16)' },
  pickText: { maxWidth: 160, color: '#F2F2F4', fontFamily: Typeface.bodyMedium, fontSize: 13, letterSpacing: -0.1 },
  pickX: { color: 'rgba(242,242,244,0.55)', fontSize: 13 },
  continue: { alignSelf: 'stretch' },
  selectedDot: { width: 7, height: 7, borderRadius: 3.5 },
  modalRoot: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.6)' },
  modalCard: { marginHorizontal: Spacing.two, padding: Spacing.four, borderRadius: 28, backgroundColor: '#121614', borderWidth: StyleSheet.hairlineWidth, borderColor: 'rgba(255,255,255,0.14)', gap: Spacing.three },
  modalTitle: { color: '#F5F5F7', fontFamily: Typeface.display, fontSize: 22, letterSpacing: -0.5 },
  modalHint: { marginTop: -Spacing.two, color: 'rgba(242,242,244,0.55)', fontFamily: Typeface.body, fontSize: 13.5, lineHeight: 19 },
  modalInput: { height: 50, paddingHorizontal: Spacing.three, borderRadius: 16, backgroundColor: 'rgba(255,255,255,0.06)', borderWidth: StyleSheet.hairlineWidth, borderColor: 'rgba(255,255,255,0.14)', color: '#F5F5F7', fontFamily: Typeface.bodyMedium, fontSize: 15.5 },
  modalChips: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.one },
  modalActions: { flexDirection: 'row', alignItems: 'center', gap: Spacing.two, marginTop: Spacing.one },
  modalCancel: { height: 52, paddingHorizontal: Spacing.four, borderRadius: 26, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(255,255,255,0.08)' },
  modalCancelText: { color: '#F5F5F7', fontFamily: Typeface.bodySemiBold, fontSize: 15 },
  modalAdd: { flex: 1 },
});
