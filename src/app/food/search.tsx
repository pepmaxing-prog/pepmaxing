import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import { SymbolView } from 'expo-symbols';
import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, Text, TextInput, useWindowDimensions, View } from 'react-native';
import Animated, { FadeIn, FadeInDown, LinearTransition } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { FoodSheet } from '@/components/me/food-sheet';
import { PressableScale } from '@/components/pressable-scale';
import { StageBackground } from '@/components/stage/stage-background';
import { Brand } from '@/constants/brand';
import { Accent, AppGutter, Spacing, Typeface } from '@/constants/theme';
import { ATTRIBUTION, categoryLabel, categorySymbol, CURATED_FOODS, curatedFood, defaultServing, FOOD_CATEGORIES, macrosFor, searchCurated, searchLibrary, searchPackaged, type FoodCategoryId, type FoodItem } from '@/lib/foods';
import { useNutrition } from '@/lib/nutrition';

/** Remote results, tagged with the query they answer so stale responses are ignored and loading is derived. */
type Remote = { q: string; library: FoodItem[] | null; packaged: FoodItem[] | null };

/**
 * Food search: the bundled curated tier answers instantly, the USDA library and Open Food Facts
 * stream in behind it. Empty query shows your recents, favourites and the browse categories.
 */
export default function FoodSearchScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { width, height } = useWindowDimensions();
  const { recents, favourites, known } = useNutrition();
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState<FoodCategoryId | null>(null);
  const [remote, setRemote] = useState<Remote>({ q: '', library: null, packaged: null });
  const [picked, setPicked] = useState<FoodItem | null>(null);
  const seq = useRef(0);
  const q = query.trim();
  const searching = q.length >= 2;
  // Remote sources wait for 3+ characters and a real pause: two-letter fragments are never useful
  // queries and every call counts against the USDA quota.
  const remoteReady = q.length >= 3;
  // The curated tier is pure and fast enough to derive on every keystroke.
  const curated = searching ? searchCurated(q) : [];
  const forThis = remote.q === q;
  const library = forThis && remote.library ? remote.library.filter((f) => !curated.some((c) => c.id === f.id)) : [];
  // Products already cached in the library come back from both calls; show each once.
  const packaged = forThis && remote.packaged ? remote.packaged.filter((f) => !library.some((l) => l.id === f.id) && !curated.some((c) => c.id === f.id)) : [];
  const loadingLibrary = remoteReady && !(forThis && remote.library);
  const loadingPackaged = remoteReady && !(forThis && remote.packaged);
  // Only say "nothing matched" when the lookup really came back empty — not when every product was
  // already shown in the library section above.
  const packagedTrulyEmpty = forThis && remote.packaged !== null && remote.packaged.length === 0;

  useEffect(() => {
    if (!remoteReady) return;
    const id = ++seq.current;
    const t = setTimeout(() => {
      void searchLibrary(q).then((library) => {
        if (seq.current === id) setRemote((r) => ({ q, library, packaged: r.q === q ? r.packaged : null }));
      });
      void searchPackaged(q).then((packaged) => {
        if (seq.current === id) setRemote((r) => ({ q, packaged, library: r.q === q ? r.library : null }));
      });
    }, 500);
    return () => clearTimeout(t);
  }, [q, remoteReady]);

  const resolve = (id: string): FoodItem | undefined => curatedFood(id) ?? known[id];
  const recentFoods = recents.map(resolve).filter((f): f is FoodItem => !!f).slice(0, 8);
  const favouriteFoods = favourites.map(resolve).filter((f): f is FoodItem => !!f);
  const browsing = !searching && category;
  const categoryFoods = category ? CURATED_FOODS.filter((f) => f.category === category) : [];

  return (
    <View style={styles.root}>
      <StageBackground width={width} height={height} center={{ x: width / 2, y: height * 0.1 }} />
      <View style={[styles.header, { paddingTop: insets.top + Spacing.one }]}>
        <View style={styles.field}>
          <SymbolView name="magnifyingglass" size={15} weight="semibold" tintColor="rgba(242,242,244,0.5)" fallback={null} />
          <TextInput
            value={query}
            onChangeText={setQuery}
            autoFocus
            autoCorrect={false}
            placeholder="Search foods, brands, dishes…"
            placeholderTextColor="rgba(242,242,244,0.4)"
            returnKeyType="search"
            style={styles.input}
            accessibilityLabel="Search foods"
          />
          {query ? (
            <PressableScale onPress={() => setQuery('')} accessibilityRole="button" accessibilityLabel="Clear" hitSlop={8}>
              <SymbolView name="xmark.circle.fill" size={16} weight="medium" tintColor="rgba(242,242,244,0.45)" fallback={null} />
            </PressableScale>
          ) : null}
        </View>
        <PressableScale onPress={() => router.push('/food/scan')} accessibilityRole="button" accessibilityLabel="Scan a barcode or nutrition label" hitSlop={8} style={styles.scan}>
          <SymbolView name="barcode.viewfinder" size={20} weight="medium" tintColor={Accent.primary} fallback={null} />
        </PressableScale>
        <PressableScale onPress={() => router.back()} accessibilityRole="button" accessibilityLabel="Done" hitSlop={8} style={styles.done}>
          <Text style={styles.doneText}>Done</Text>
        </PressableScale>
      </View>

      <ScrollView keyboardShouldPersistTaps="handled" keyboardDismissMode="on-drag" showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: AppGutter, paddingBottom: insets.bottom + Spacing.six }}>
        {searching ? (
          <Animated.View layout={LinearTransition.duration(200)} style={styles.sections}>
            {curated.length ? <Group title="Common foods" foods={curated} onPick={setPicked} /> : null}
            <Group title="Food library" foods={library} loading={loadingLibrary} emptyText={curated.length ? undefined : 'Nothing in the USDA library for that.'} onPick={setPicked} />
            <Group title="Packaged products" foods={packaged} loading={loadingPackaged} emptyText={packagedTrulyEmpty ? 'No packaged products matched. Try the brand name, or scan the barcode.' : undefined} onPick={setPicked} />
            <Text style={styles.attribution}>{ATTRIBUTION}</Text>
          </Animated.View>
        ) : browsing ? (
          <Animated.View entering={FadeIn.duration(200)} style={styles.sections}>
            <PressableScale onPress={() => setCategory(null)} accessibilityRole="button" accessibilityLabel="All categories" style={styles.backRow}>
              <SymbolView name="chevron.left" size={12} weight="bold" tintColor={Accent.primary} fallback={null} />
              <Text style={styles.backText}>All categories</Text>
            </PressableScale>
            <Group title={categoryLabel(category)} foods={categoryFoods} onPick={setPicked} />
          </Animated.View>
        ) : (
          <Animated.View entering={FadeInDown.duration(300)} style={styles.sections}>
            {recentFoods.length ? <Group title="Recent" foods={recentFoods} onPick={setPicked} /> : null}
            {favouriteFoods.length ? <Group title="Favourites" foods={favouriteFoods} onPick={setPicked} /> : null}
            <Text style={styles.eyebrow}>BROWSE</Text>
            <View style={styles.grid}>
              {FOOD_CATEGORIES.filter((c) => CURATED_FOODS.some((f) => f.category === c.id)).map((c) => (
                <PressableScale key={c.id} onPress={() => setCategory(c.id)} accessibilityRole="button" accessibilityLabel={c.label} pressedScale={0.97} style={[styles.catTile, { width: (width - AppGutter * 2 - Spacing.two) / 2 }]}>
                  <View style={styles.catIcon}>
                    <SymbolView name={c.symbol} size={16} weight="semibold" tintColor={Accent.primary} fallback={null} />
                  </View>
                  <Text style={styles.catLabel} numberOfLines={1}>
                    {c.label}
                  </Text>
                  <Text style={styles.catCount}>{CURATED_FOODS.filter((f) => f.category === c.id).length}</Text>
                </PressableScale>
              ))}
            </View>
            <Text style={styles.hint}>Type to search {CURATED_FOODS.length} common foods instantly, {'13,000+'} USDA foods and dishes, and hundreds of thousands of packaged products by name or brand — or tap the scanner to read a barcode or a nutrition label.</Text>
            <Text style={styles.attribution}>{ATTRIBUTION}</Text>
          </Animated.View>
        )}
      </ScrollView>

      <FoodSheet food={picked} onClose={() => setPicked(null)} />
    </View>
  );
}

function Group({ title, foods, loading, emptyText, onPick }: { title: string; foods: FoodItem[]; loading?: boolean; emptyText?: string; onPick: (f: FoodItem) => void }) {
  if (!foods.length && !loading && !emptyText) return null;
  return (
    <View>
      <View style={styles.groupHead}>
        <Text style={styles.eyebrow}>{title.toUpperCase()}</Text>
        {loading ? <ActivityIndicator size="small" color="rgba(242,242,244,0.5)" /> : null}
      </View>
      {foods.length ? (
        <View style={styles.list}>
          {foods.map((f, i) => (
            <FoodRow key={f.id} food={f} last={i === foods.length - 1} onPress={() => onPick(f)} />
          ))}
        </View>
      ) : !loading && emptyText ? (
        <Text style={styles.empty}>{emptyText}</Text>
      ) : null}
    </View>
  );
}

function FoodRow({ food, last, onPress }: { food: FoodItem; last: boolean; onPress: () => void }) {
  const serving = defaultServing(food);
  const m = macrosFor(food, serving.grams);
  return (
    <PressableScale onPress={onPress} accessibilityRole="button" accessibilityLabel={`${food.name}${food.brand ? `, ${food.brand}` : ''}, ${m.kcal} calories per ${serving.label}`} pressedScale={0.99} style={[styles.row, !last && styles.divider]}>
      {food.imageUrl ? <Image source={{ uri: food.imageUrl }} style={styles.thumb} contentFit="cover" transition={150} /> : (
        <View style={styles.thumbIcon}>
          <SymbolView name={categorySymbol(food.category)} size={15} weight="semibold" tintColor={Accent.primary} fallback={null} />
        </View>
      )}
      <View style={styles.rowText}>
        <Text style={styles.rowName} numberOfLines={1}>
          {food.name}
        </Text>
        <Text style={styles.rowMeta} numberOfLines={1}>
          {food.brand ? `${food.brand} · ` : ''}
          {serving.label} · {m.kcal} kcal · P {m.protein} g
        </Text>
      </View>
      <View style={styles.add}>
        <SymbolView name="plus" size={12} weight="bold" tintColor={Accent.primary} fallback={null} />
      </View>
    </PressableScale>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: Brand.black },
  header: { flexDirection: 'row', alignItems: 'center', gap: Spacing.two, paddingHorizontal: AppGutter, paddingBottom: Spacing.two },
  field: { flex: 1, height: 46, flexDirection: 'row', alignItems: 'center', gap: Spacing.two, paddingHorizontal: Spacing.three, borderRadius: 23, backgroundColor: 'rgba(255,255,255,0.08)', borderWidth: StyleSheet.hairlineWidth, borderColor: 'rgba(255,255,255,0.16)' },
  input: { flex: 1, color: '#F5F5F7', fontFamily: Typeface.body, fontSize: 15.5, paddingVertical: 0 },
  scan: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  done: { height: 40, paddingHorizontal: 6, justifyContent: 'center' },
  doneText: { color: Accent.primary, fontFamily: Typeface.bodySemiBold, fontSize: 15 },
  sections: { gap: Spacing.three, paddingTop: Spacing.one },
  groupHead: { flexDirection: 'row', alignItems: 'center', gap: Spacing.two, marginBottom: Spacing.one },
  eyebrow: { marginLeft: Spacing.one, color: 'rgba(242,242,244,0.45)', fontFamily: Typeface.bodySemiBold, fontSize: 11, letterSpacing: 1.1 },
  list: { borderRadius: 18, backgroundColor: 'rgba(255,255,255,0.05)', borderWidth: StyleSheet.hairlineWidth, borderColor: 'rgba(255,255,255,0.1)', overflow: 'hidden' },
  row: { flexDirection: 'row', alignItems: 'center', gap: Spacing.two + Spacing.half, paddingHorizontal: Spacing.three, minHeight: 60, paddingVertical: Spacing.two },
  divider: { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: 'rgba(255,255,255,0.08)' },
  thumb: { width: 40, height: 40, borderRadius: 11, backgroundColor: 'rgba(255,255,255,0.08)' },
  thumbIcon: { width: 40, height: 40, borderRadius: 11, backgroundColor: 'rgba(52,211,153,0.12)', alignItems: 'center', justifyContent: 'center' },
  rowText: { flex: 1, gap: 2 },
  rowName: { color: '#F5F5F7', fontFamily: Typeface.bodySemiBold, fontSize: 15, letterSpacing: -0.2 },
  rowMeta: { color: 'rgba(242,242,244,0.5)', fontFamily: Typeface.body, fontSize: 12.5, fontVariant: ['tabular-nums'] },
  add: { width: 28, height: 28, borderRadius: 14, backgroundColor: 'rgba(52,211,153,0.14)', alignItems: 'center', justifyContent: 'center' },
  empty: { marginTop: Spacing.one, marginLeft: Spacing.one, color: 'rgba(242,242,244,0.5)', fontFamily: Typeface.body, fontSize: 13, lineHeight: 18 },
  backRow: { flexDirection: 'row', alignItems: 'center', gap: 5, height: 32 },
  backText: { color: Accent.primary, fontFamily: Typeface.bodySemiBold, fontSize: 14 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.two },
  catTile: { flexDirection: 'row', alignItems: 'center', gap: Spacing.two, padding: Spacing.two + Spacing.half, borderRadius: 16, backgroundColor: 'rgba(255,255,255,0.05)', borderWidth: StyleSheet.hairlineWidth, borderColor: 'rgba(255,255,255,0.1)' },
  catIcon: { width: 32, height: 32, borderRadius: 10, backgroundColor: 'rgba(52,211,153,0.12)', alignItems: 'center', justifyContent: 'center' },
  catLabel: { flex: 1, color: '#F5F5F7', fontFamily: Typeface.bodySemiBold, fontSize: 13.5, letterSpacing: -0.2 },
  catCount: { color: 'rgba(242,242,244,0.4)', fontFamily: Typeface.body, fontSize: 12, fontVariant: ['tabular-nums'] },
  hint: { color: 'rgba(242,242,244,0.5)', fontFamily: Typeface.body, fontSize: 12.5, lineHeight: 17 },
  attribution: { color: 'rgba(242,242,244,0.35)', fontFamily: Typeface.body, fontSize: 11 },
});
