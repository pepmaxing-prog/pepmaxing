import { useRouter } from 'expo-router';
import { SymbolView, type SFSymbol } from 'expo-symbols';
import { useState } from 'react';
import { ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import Animated, { FadeInDown, LinearTransition } from 'react-native-reanimated';

import { RingGauge } from '@/components/home/ring-gauge';
import { FoodSheet } from '@/components/me/food-sheet';
import { ScanCard } from '@/components/me/scan-card';
import { PressableScale } from '@/components/pressable-scale';
import { Sheet } from '@/components/protocol/sheets';
import { ShineButton } from '@/components/shine-button';
import { Accent, Spacing, Typeface } from '@/constants/theme';
import { ATTRIBUTION, categorySymbol, curatedFood, defaultServing, macrosFor, popularMix, type FoodItem } from '@/lib/foods';
import { ML_PER_OZ, mealsOn, nutritionStore, totalsOf, useNutrition } from '@/lib/nutrition';
import { useOnboarding } from '@/lib/onboarding-store';
import { estimateGoals, usePreferences } from '@/lib/preferences';
import { dayKey, formatTime, timeKeyFromDate } from '@/lib/schedule';

const PROTEIN = '#F472B6';
const FIBER = '#34D399';
const WATER = '#60A5FA';

/** Nutrition: today's protein, fibre, water and macros against the daily goals, meals, and a food library. */
export function NutritionSection({ width }: { width: number }) {
  const router = useRouter();
  const doc = useNutrition();
  const prefs = usePreferences();
  const onboarding = useOnboarding();
  const goals = prefs.customGoals ?? estimateGoals(onboarding).goals;
  const imperial = onboarding.units === 'imperial';
  const today = new Date();
  const meals = mealsOn(doc, today);
  const totals = totalsOf(meals);
  const waterMl = doc.water[dayKey(today)] ?? 0;
  const waterGoalMl = goals.waterOz * ML_PER_OZ;
  const [manual, setManual] = useState(false);
  const [picked, setPicked] = useState<FoodItem | null>(null);
  const half = (width - Spacing.two) / 2;
  // The rail: what you use, then the most popular curated foods.
  const rail = [...doc.recents.map((id) => curatedFood(id) ?? doc.known[id]).filter((f): f is FoodItem => !!f), ...popularMix(14).filter((f) => !doc.recents.includes(f.id))].slice(0, 14);

  const waterStep = imperial ? 8 * ML_PER_OZ : 250;
  const waterLabel = imperial ? `${Math.round(waterMl / ML_PER_OZ)} oz` : `${Math.round(waterMl)} mL`;
  const waterGoalLabel = imperial ? `${goals.waterOz} oz` : `${Math.round(waterGoalMl / 10) * 10} mL`;

  return (
    <View style={styles.root}>
      <Animated.View entering={FadeInDown.duration(320)}>
        <ScanCard />
      </Animated.View>
      <Animated.View entering={FadeInDown.delay(60).duration(360)} style={[styles.row, { marginTop: Spacing.two }]}>
        <View style={[styles.card, { width: half }]}>
          <Label symbol="fork.knife" text="Protein" color={PROTEIN} right={`${goals.protein} g`} />
          <View style={styles.ringWrap}>
            <RingGauge size={Math.min(124, half - Spacing.three * 2)} progress={Math.min(1, totals.protein / Math.max(1, goals.protein))} color={PROTEIN} stroke={9}>
              <Text style={styles.ringValue}>{Math.round(totals.protein)} g</Text>
              <Text style={styles.ringSub}>{Math.max(0, goals.protein - Math.round(totals.protein))} g to go</Text>
            </RingGauge>
          </View>
          <Stepper label="5 g" onMinus={() => nutritionStore.adjustQuick({ protein: -5, kcal: -20 })} onPlus={() => nutritionStore.adjustQuick({ protein: 5, kcal: 20 })} minusDisabled={totals.protein <= 0} />
          <View style={styles.bars}>
            <Bar label="Calories" value={totals.kcal} goal={goals.kcal} unit="kcal" color="#FBBF24" />
            <Bar label="Carbs" value={totals.carbs} goal={goals.carbs} unit="g" color="#7DD3FC" />
            <Bar label="Fat" value={totals.fat} goal={goals.fat} unit="g" color="#C084FC" />
          </View>
        </View>
        <View style={{ width: half, gap: Spacing.two }}>
          <View style={styles.card}>
            <Label symbol="leaf.fill" text="Fiber" color={FIBER} right={`${goals.fiber} g`} />
            <Text style={styles.bigValue}>{Math.round(totals.fiber)} g</Text>
            <Stepper label="1 g" onMinus={() => nutritionStore.adjustQuick({ fiber: -1, carbs: -1, kcal: -2 })} onPlus={() => nutritionStore.adjustQuick({ fiber: 1, carbs: 1, kcal: 2 })} minusDisabled={totals.fiber <= 0} />
            <Track value={totals.fiber} goal={goals.fiber} color={FIBER} />
          </View>
          <View style={styles.card}>
            <Label symbol="drop.fill" text="Water" color={WATER} right={waterGoalLabel} />
            <View style={styles.bottleRow}>
              <Bottle fill={Math.min(1, waterMl / Math.max(1, waterGoalMl))} />
              <Text style={styles.bigValue}>{waterLabel}</Text>
            </View>
            <Stepper label={imperial ? '8 oz' : '250 mL'} onMinus={() => nutritionStore.addWater(-waterStep)} onPlus={() => nutritionStore.addWater(waterStep)} minusDisabled={waterMl <= 0} />
          </View>
        </View>
      </Animated.View>

      <PressableScale onPress={() => router.push('/food/search')} accessibilityRole="button" accessibilityLabel="Search foods" pressedScale={0.99} style={styles.search}>
        <SymbolView name="magnifyingglass" size={15} weight="semibold" tintColor="rgba(242,242,244,0.5)" fallback={null} />
        <Text style={styles.searchText} numberOfLines={1}>
          Search foods, brands, dishes…
        </Text>
        <Text style={styles.searchHint}>USDA · worldwide</Text>
      </PressableScale>

      <View style={styles.sectionHead}>
        <View>
          <Text style={styles.sectionTitle}>Food library</Text>
          <Text style={styles.sectionSub}>{doc.recents.length ? 'Your recent foods first, then the most logged.' : 'The most logged foods. Tap to add.'}</Text>
        </View>
        <PressableScale onPress={() => router.push('/food/search')} accessibilityRole="button" accessibilityLabel="Browse all foods" hitSlop={8}>
          <Text style={styles.browse}>Browse all →</Text>
        </PressableScale>
      </View>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.rail} style={{ marginHorizontal: -Spacing.three }}>
        {rail.map((f) => {
          const serving = defaultServing(f);
          const m = macrosFor(f, serving.grams);
          return (
            <PressableScale key={f.id} onPress={() => setPicked(f)} accessibilityRole="button" accessibilityLabel={`${f.name}, ${m.protein} grams protein per ${serving.label}`} pressedScale={0.97} style={styles.food}>
              <View style={styles.foodIcon}>
                <SymbolView name={categorySymbol(f.category)} size={15} weight="semibold" tintColor={Accent.primary} fallback={null} />
              </View>
              <Text style={styles.foodName} numberOfLines={2}>
                {f.name}
              </Text>
              <Text style={styles.foodServing}>
                {serving.label} · {m.kcal} kcal
              </Text>
              <Text style={styles.foodProtein}>{m.protein} g protein</Text>
            </PressableScale>
          );
        })}
      </ScrollView>

      <View style={styles.sectionHead}>
        <Text style={styles.sectionTitle}>Today&apos;s meals</Text>
        <PressableScale onPress={() => setManual(true)} accessibilityRole="button" accessibilityLabel="Add a meal manually" hitSlop={8} style={styles.addManual}>
          <SymbolView name="plus" size={11} weight="bold" tintColor={Accent.primary} fallback={null} />
          <Text style={styles.addManualText}>Add manually</Text>
        </PressableScale>
      </View>
      <Animated.View layout={LinearTransition.duration(220)} style={styles.card}>
        {meals.length === 0 ? (
          <View style={styles.empty}>
            <SymbolView name="fork.knife" size={22} weight="medium" tintColor="rgba(242,242,244,0.35)" fallback={null} />
            <Text style={styles.emptyText}>No meals yet — add one from the library or by hand.</Text>
          </View>
        ) : (
          meals.map((m, i) => (
            <View key={m.id} style={[styles.meal, i < meals.length - 1 && styles.divider]}>
              <View style={styles.mealText}>
                <Text style={styles.mealName} numberOfLines={1}>
                  {m.name}
                </Text>
                <Text style={styles.mealMeta}>
                  {formatTime(timeKeyFromDate(new Date(m.at)))} · {m.kcal} kcal · P {m.protein} · C {m.carbs} · F {m.fat}
                </Text>
              </View>
              <PressableScale onPress={() => nutritionStore.removeMeal(m.id)} accessibilityRole="button" accessibilityLabel={`Remove ${m.name}`} hitSlop={8} style={styles.trash}>
                <SymbolView name="trash" size={14} weight="medium" tintColor="rgba(242,242,244,0.45)" fallback={null} />
              </PressableScale>
            </View>
          ))
        )}
      </Animated.View>
      <Text style={styles.footnote}>Targets come from Settings → Daily goals{prefs.customGoals ? '' : ' (estimated from your body metrics)'}. {ATTRIBUTION}.</Text>

      <MealSheet open={manual} onClose={() => setManual(false)} />
      <FoodSheet food={picked} onClose={() => setPicked(null)} />
    </View>
  );
}

function Label({ symbol, text, color, right }: { symbol: SFSymbol; text: string; color: string; right?: string }) {
  return (
    <View style={styles.label}>
      <SymbolView name={symbol} size={13} weight="semibold" tintColor={color} fallback={null} />
      <Text style={styles.labelText}>{text}</Text>
      {right ? <Text style={styles.labelRight}>{right}</Text> : null}
    </View>
  );
}

function Stepper({ label, onMinus, onPlus, minusDisabled }: { label: string; onMinus: () => void; onPlus: () => void; minusDisabled?: boolean }) {
  return (
    <View style={styles.stepper}>
      <PressableScale onPress={onMinus} disabled={minusDisabled} accessibilityRole="button" accessibilityLabel={`Remove ${label}`} hitSlop={6} style={[styles.stepButton, minusDisabled && styles.stepButtonOff]}>
        <SymbolView name="minus" size={12} weight="bold" tintColor="#F5F5F7" fallback={null} />
      </PressableScale>
      <Text style={styles.stepLabel}>{label}</Text>
      <PressableScale onPress={onPlus} accessibilityRole="button" accessibilityLabel={`Add ${label}`} hitSlop={6} style={styles.stepButton}>
        <SymbolView name="plus" size={12} weight="bold" tintColor="#F5F5F7" fallback={null} />
      </PressableScale>
    </View>
  );
}

function Track({ value, goal, color }: { value: number; goal: number; color: string }) {
  return (
    <View style={styles.track}>
      <View style={[styles.trackFill, { width: `${Math.min(100, (value / Math.max(1, goal)) * 100)}%`, backgroundColor: color }]} />
    </View>
  );
}

function Bar({ label, value, goal, unit, color }: { label: string; value: number; goal: number; unit: string; color: string }) {
  return (
    <View style={styles.bar}>
      <View style={styles.barHead}>
        <Text style={styles.barLabel}>{label}</Text>
        <Text style={styles.barValue}>
          {Math.round(value)}
          <Text style={styles.barGoal}>
            /{goal.toLocaleString()} {unit}
          </Text>
        </Text>
      </View>
      <Track value={value} goal={goal} color={color} />
    </View>
  );
}

/** A little bottle that fills from the bottom. */
function Bottle({ fill }: { fill: number }) {
  return (
    <View style={styles.bottle} accessible accessibilityLabel={`${Math.round(fill * 100)} percent of water goal`}>
      <View style={styles.bottleNeck} />
      <View style={styles.bottleBody}>
        <View style={[styles.bottleFill, { height: `${Math.max(4, fill * 100)}%` }]} />
      </View>
    </View>
  );
}

function MealSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  return (
    <Sheet open={open} title="Add a meal" hint="Name it and enter what you know — protein alone is fine." onClose={onClose} keyboard>
      <MealBody onClose={onClose} />
    </Sheet>
  );
}

function MealBody({ onClose }: { onClose: () => void }) {
  const [name, setName] = useState('');
  const [fields, setFields] = useState({ kcal: '', protein: '', carbs: '', fat: '', fiber: '' });
  const num = (v: string) => Number(v.replace(',', '.')) || 0;
  const valid = name.trim().length > 0 && (num(fields.kcal) > 0 || num(fields.protein) > 0 || num(fields.carbs) > 0 || num(fields.fat) > 0);
  const save = () => {
    nutritionStore.addMeal({ name: name.trim(), kcal: Math.round(num(fields.kcal)), protein: Math.round(num(fields.protein)), carbs: Math.round(num(fields.carbs)), fat: Math.round(num(fields.fat)), fiber: Math.round(num(fields.fiber)) });
    onClose();
  };
  return (
    <View style={styles.form}>
      <TextInput value={name} onChangeText={setName} placeholder="What did you eat?" placeholderTextColor="rgba(242,242,244,0.35)" style={styles.input} autoFocus accessibilityLabel="Meal name" />
      <View style={styles.fieldGrid}>
        {(['kcal', 'protein', 'carbs', 'fat', 'fiber'] as const).map((k) => (
          <View key={k} style={styles.field}>
            <Text style={styles.formLabel}>{k === 'kcal' ? 'Calories' : k[0].toUpperCase() + k.slice(1)}</Text>
            <TextInput value={fields[k]} onChangeText={(v) => setFields({ ...fields, [k]: v.replace(/[^0-9.,]/g, '') })} keyboardType="decimal-pad" placeholder="0" placeholderTextColor="rgba(242,242,244,0.3)" style={styles.fieldInput} accessibilityLabel={k} />
          </View>
        ))}
      </View>
      <ShineButton label="Add meal" onPress={save} disabled={!valid} />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { gap: Spacing.two },
  row: { flexDirection: 'row', gap: Spacing.two },
  card: { padding: Spacing.three, borderRadius: 20, backgroundColor: 'rgba(255,255,255,0.05)', borderWidth: StyleSheet.hairlineWidth, borderColor: 'rgba(255,255,255,0.1)', gap: Spacing.two },
  label: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  labelText: { flex: 1, color: 'rgba(242,242,244,0.8)', fontFamily: Typeface.bodyMedium, fontSize: 13 },
  labelRight: { color: 'rgba(242,242,244,0.45)', fontFamily: Typeface.body, fontSize: 12, fontVariant: ['tabular-nums'] },
  ringWrap: { alignItems: 'center', paddingVertical: Spacing.one },
  ringValue: { color: '#F5F5F7', fontFamily: Typeface.display, fontSize: 22, letterSpacing: -0.5 },
  ringSub: { color: 'rgba(242,242,244,0.5)', fontFamily: Typeface.body, fontSize: 11 },
  bigValue: { color: '#F5F5F7', fontFamily: Typeface.display, fontSize: 24, letterSpacing: -0.6 },
  stepper: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: Spacing.one },
  stepButton: { width: 30, height: 30, borderRadius: 15, backgroundColor: 'rgba(255,255,255,0.1)', alignItems: 'center', justifyContent: 'center' },
  stepButtonOff: { opacity: 0.35 },
  stepLabel: { flex: 1, textAlign: 'center', color: 'rgba(242,242,244,0.6)', fontFamily: Typeface.bodyMedium, fontSize: 12 },
  track: { height: 5, borderRadius: 2.5, backgroundColor: 'rgba(255,255,255,0.1)', overflow: 'hidden' },
  trackFill: { height: '100%', borderRadius: 2.5 },
  bars: { gap: Spacing.two, marginTop: Spacing.one },
  bar: { gap: 5 },
  barHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  barLabel: { color: 'rgba(242,242,244,0.75)', fontFamily: Typeface.bodyMedium, fontSize: 12.5 },
  barValue: { color: '#F5F5F7', fontFamily: Typeface.bodySemiBold, fontSize: 12, fontVariant: ['tabular-nums'] },
  barGoal: { color: 'rgba(242,242,244,0.45)', fontFamily: Typeface.body },
  bottleRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.two },
  bottle: { alignItems: 'center' },
  bottleNeck: { width: 12, height: 7, borderTopLeftRadius: 3, borderTopRightRadius: 3, backgroundColor: 'rgba(255,255,255,0.25)' },
  bottleBody: { width: 24, height: 40, borderRadius: 7, borderWidth: 1.5, borderColor: 'rgba(255,255,255,0.35)', overflow: 'hidden', justifyContent: 'flex-end' },
  bottleFill: { width: '100%', backgroundColor: WATER, opacity: 0.85 },
  sectionHead: { flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between', marginTop: Spacing.four, marginBottom: Spacing.two, gap: Spacing.two },
  sectionTitle: { color: '#F5F5F7', fontFamily: Typeface.display, fontSize: 20, letterSpacing: -0.5 },
  sectionSub: { color: 'rgba(242,242,244,0.5)', fontFamily: Typeface.body, fontSize: 12.5, marginTop: 2 },
  rail: { paddingHorizontal: Spacing.three, gap: Spacing.two },
  search: { flexDirection: 'row', alignItems: 'center', gap: Spacing.two, height: 50, paddingHorizontal: Spacing.three, borderRadius: 25, backgroundColor: 'rgba(255,255,255,0.07)', borderWidth: StyleSheet.hairlineWidth, borderColor: 'rgba(255,255,255,0.16)', marginTop: Spacing.two },
  searchText: { flex: 1, color: 'rgba(242,242,244,0.5)', fontFamily: Typeface.body, fontSize: 15 },
  searchHint: { color: 'rgba(242,242,244,0.35)', fontFamily: Typeface.bodySemiBold, fontSize: 10, letterSpacing: 0.6 },
  browse: { color: Accent.primary, fontFamily: Typeface.bodySemiBold, fontSize: 13 },
  food: { width: 136, padding: Spacing.three, borderRadius: 18, backgroundColor: 'rgba(255,255,255,0.05)', borderWidth: StyleSheet.hairlineWidth, borderColor: 'rgba(255,255,255,0.1)', gap: 4 },
  foodIcon: { width: 30, height: 30, borderRadius: 9, backgroundColor: 'rgba(52,211,153,0.12)', alignItems: 'center', justifyContent: 'center', marginBottom: 4 },
  foodName: { color: '#F5F5F7', fontFamily: Typeface.bodySemiBold, fontSize: 13.5, letterSpacing: -0.2, minHeight: 36 },
  foodServing: { color: 'rgba(242,242,244,0.5)', fontFamily: Typeface.body, fontSize: 11.5 },
  foodProtein: { color: Accent.primary, fontFamily: Typeface.bodySemiBold, fontSize: 12 },
  addManual: { flexDirection: 'row', alignItems: 'center', gap: 5, height: 30, paddingHorizontal: 11, borderRadius: 15, backgroundColor: 'rgba(52,211,153,0.12)' },
  addManualText: { color: Accent.primary, fontFamily: Typeface.bodySemiBold, fontSize: 12.5 },
  empty: { alignItems: 'center', gap: Spacing.one, paddingVertical: Spacing.three },
  emptyText: { color: 'rgba(242,242,244,0.5)', fontFamily: Typeface.body, fontSize: 13, textAlign: 'center' },
  meal: { flexDirection: 'row', alignItems: 'center', gap: Spacing.two, paddingVertical: Spacing.two },
  divider: { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: 'rgba(255,255,255,0.08)' },
  mealText: { flex: 1, gap: 2 },
  mealName: { color: '#F5F5F7', fontFamily: Typeface.bodySemiBold, fontSize: 14.5, letterSpacing: -0.2 },
  mealMeta: { color: 'rgba(242,242,244,0.5)', fontFamily: Typeface.body, fontSize: 12 },
  trash: { width: 32, height: 32, alignItems: 'center', justifyContent: 'center' },
  footnote: { marginTop: Spacing.two, color: 'rgba(242,242,244,0.4)', fontFamily: Typeface.body, fontSize: 11.5, lineHeight: 16 },
  form: { gap: Spacing.three },
  formLabel: { color: 'rgba(242,242,244,0.5)', fontFamily: Typeface.bodySemiBold, fontSize: 10.5, letterSpacing: 0.9 },
  input: { height: 48, paddingHorizontal: Spacing.three, borderRadius: 14, backgroundColor: 'rgba(255,255,255,0.07)', color: '#F5F5F7', fontFamily: Typeface.body, fontSize: 15.5 },
  fieldGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.two },
  field: { width: '30%', flexGrow: 1, gap: 4 },
  fieldInput: { height: 44, paddingHorizontal: Spacing.two + Spacing.half, borderRadius: 12, backgroundColor: 'rgba(255,255,255,0.07)', color: '#F5F5F7', fontFamily: Typeface.bodySemiBold, fontSize: 15, fontVariant: ['tabular-nums'] },
});
