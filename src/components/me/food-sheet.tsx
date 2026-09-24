import { Image } from 'expo-image';
import { SymbolView } from 'expo-symbols';
import { useState } from 'react';
import { StyleSheet, Text, TextInput, View } from 'react-native';
import Animated, { LinearTransition } from 'react-native-reanimated';

import { PressableScale } from '@/components/pressable-scale';
import { Sheet } from '@/components/protocol/sheets';
import { ShineButton } from '@/components/shine-button';
import { Accent, Spacing, Typeface } from '@/constants/theme';
import { categorySymbol, defaultServing, macrosFor, type FoodItem } from '@/lib/foods';
import { nutritionStore, useNutrition } from '@/lib/nutrition';
import { toast } from '@/lib/toast';

/** Pick an amount for a food and add it to today. Servings come from the source; grams are always editable. */
export function FoodSheet({ food, onClose }: { food: FoodItem | null; onClose: () => void }) {
  return (
    <Sheet open={!!food} title={food?.name ?? ''} hint={food?.brand ? `${food.brand}${food.source === 'off' ? ' · Open Food Facts' : ''}` : food?.source === 'usda' || food?.source === 'curated' ? 'USDA FoodData Central' : undefined} onClose={onClose} keyboard>
      {food ? <FoodBody food={food} onClose={onClose} /> : null}
    </Sheet>
  );
}

function FoodBody({ food, onClose }: { food: FoodItem; onClose: () => void }) {
  const { favourites } = useNutrition();
  const options = [...food.servings, ...(food.servings.some((s) => s.grams === 100) ? [] : [{ label: '100 g', grams: 100 }])];
  const [serving, setServing] = useState(defaultServing(food));
  const [count, setCount] = useState(1);
  const [gramsText, setGramsText] = useState('');
  const grams = gramsText ? Number(gramsText.replace(',', '.')) || 0 : serving.grams * count;
  const m = macrosFor(food, grams);
  const favourite = favourites.includes(food.id);

  const add = () => {
    if (!grams) return;
    const label = gramsText ? `${Math.round(grams)} g` : count === 1 ? serving.label : `${count} × ${serving.label}`;
    nutritionStore.addMeal({ name: `${food.name} · ${label}`, kcal: m.kcal, protein: m.protein, carbs: m.carbs, fat: m.fat, fiber: m.fiber, foodId: food.id, grams }, food);
    toast.show(`Added ${food.name} · ${m.kcal} kcal`);
    onClose();
  };

  return (
    <View style={styles.body}>
      <View style={styles.hero}>
        {food.imageUrl ? <Image source={{ uri: food.imageUrl }} style={styles.image} contentFit="cover" transition={150} /> : (
          <View style={styles.icon}>
            <SymbolView name={categorySymbol(food.category)} size={22} weight="semibold" tintColor={Accent.primary} fallback={null} />
          </View>
        )}
        <View style={styles.per100}>
          <Text style={styles.per100Title}>Per 100 g</Text>
          <Text style={styles.per100Text}>
            {Math.round(food.kcal)} kcal · P {Math.round(food.protein)} · C {Math.round(food.carbs)} · F {Math.round(food.fat)}
          </Text>
        </View>
        <PressableScale onPress={() => nutritionStore.toggleFavourite(food)} accessibilityRole="button" accessibilityLabel={favourite ? 'Remove from favourites' : 'Add to favourites'} accessibilityState={{ selected: favourite }} hitSlop={8} style={styles.star}>
          <SymbolView name={favourite ? 'star.fill' : 'star'} size={18} weight="medium" tintColor={favourite ? '#FBBF24' : 'rgba(242,242,244,0.5)'} fallback={null} />
        </PressableScale>
      </View>

      <View style={styles.servings}>
        {options.map((s) => {
          const on = !gramsText && serving.grams === s.grams && serving.label === s.label;
          return (
            <PressableScale
              key={`${s.label}-${s.grams}`}
              onPress={() => {
                setServing(s);
                setGramsText('');
              }}
              accessibilityRole="radio"
              accessibilityState={{ selected: on }}
              accessibilityLabel={`${s.label}, ${s.grams} grams`}
              style={[styles.chip, on && styles.chipOn]}>
              <Text style={[styles.chipText, on && styles.chipTextOn]}>{s.label}</Text>
              <Text style={[styles.chipGrams, on && styles.chipTextOn]}>{Math.round(s.grams)} g</Text>
            </PressableScale>
          );
        })}
      </View>

      <View style={styles.amountRow}>
        <View style={styles.stepper}>
          <PressableScale onPress={() => setCount((c) => Math.max(0.5, c - 0.5))} disabled={!!gramsText || count <= 0.5} accessibilityRole="button" accessibilityLabel="Fewer servings" hitSlop={6} style={[styles.stepButton, (!!gramsText || count <= 0.5) && styles.stepOff]}>
            <SymbolView name="minus" size={11} weight="bold" tintColor="#F5F5F7" fallback={null} />
          </PressableScale>
          <Text style={[styles.count, !!gramsText && styles.countOff]}>{count} ×</Text>
          <PressableScale onPress={() => setCount((c) => Math.min(10, c + 0.5))} disabled={!!gramsText} accessibilityRole="button" accessibilityLabel="More servings" hitSlop={6} style={[styles.stepButton, !!gramsText && styles.stepOff]}>
            <SymbolView name="plus" size={11} weight="bold" tintColor="#F5F5F7" fallback={null} />
          </PressableScale>
        </View>
        <View style={styles.gramsField}>
          <TextInput value={gramsText} onChangeText={(v) => setGramsText(v.replace(/[^0-9.,]/g, '').slice(0, 5))} keyboardType="decimal-pad" placeholder={`${Math.round(serving.grams * count)}`} placeholderTextColor="rgba(242,242,244,0.4)" style={styles.gramsInput} accessibilityLabel="Grams" />
          <Text style={styles.gramsUnit}>g</Text>
        </View>
      </View>

      <Animated.View layout={LinearTransition.duration(180)} style={styles.macros}>
        <Macro label="Calories" value={`${m.kcal}`} unit="kcal" strong />
        <Macro label="Protein" value={`${m.protein}`} unit="g" color="#F472B6" />
        <Macro label="Carbs" value={`${m.carbs}`} unit="g" color="#7DD3FC" />
        <Macro label="Fat" value={`${m.fat}`} unit="g" color="#C084FC" />
        <Macro label="Fiber" value={`${m.fiber}`} unit="g" color="#34D399" />
      </Animated.View>

      <ShineButton label={grams ? `Add · ${m.kcal} kcal` : 'Enter an amount'} onPress={add} disabled={!grams} />
    </View>
  );
}

function Macro({ label, value, unit, color, strong }: { label: string; value: string; unit: string; color?: string; strong?: boolean }) {
  return (
    <View style={styles.macro}>
      <Text style={[styles.macroValue, strong && styles.macroStrong, color ? { color } : null]}>
        {value}
        <Text style={styles.macroUnit}> {unit}</Text>
      </Text>
      <Text style={styles.macroLabel}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  body: { gap: Spacing.three },
  hero: { flexDirection: 'row', alignItems: 'center', gap: Spacing.two },
  image: { width: 52, height: 52, borderRadius: 14, backgroundColor: 'rgba(255,255,255,0.08)' },
  icon: { width: 52, height: 52, borderRadius: 14, backgroundColor: 'rgba(52,211,153,0.12)', alignItems: 'center', justifyContent: 'center' },
  per100: { flex: 1, gap: 2 },
  per100Title: { color: 'rgba(242,242,244,0.45)', fontFamily: Typeface.bodySemiBold, fontSize: 10.5, letterSpacing: 1 },
  per100Text: { color: 'rgba(242,242,244,0.8)', fontFamily: Typeface.bodyMedium, fontSize: 13.5, fontVariant: ['tabular-nums'] },
  star: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  servings: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.one },
  chip: { paddingHorizontal: 12, height: 40, borderRadius: 12, backgroundColor: 'rgba(255,255,255,0.06)', borderWidth: StyleSheet.hairlineWidth, borderColor: 'rgba(255,255,255,0.14)', justifyContent: 'center', gap: 1 },
  chipOn: { backgroundColor: 'rgba(52,211,153,0.16)', borderColor: 'rgba(52,211,153,0.5)' },
  chipText: { color: 'rgba(242,242,244,0.85)', fontFamily: Typeface.bodySemiBold, fontSize: 13 },
  chipGrams: { color: 'rgba(242,242,244,0.45)', fontFamily: Typeface.body, fontSize: 11 },
  chipTextOn: { color: Accent.primary },
  amountRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.two },
  stepper: { flexDirection: 'row', alignItems: 'center', gap: Spacing.one, height: 46, paddingHorizontal: 6, borderRadius: 14, backgroundColor: 'rgba(255,255,255,0.05)', borderWidth: StyleSheet.hairlineWidth, borderColor: 'rgba(255,255,255,0.1)' },
  stepButton: { width: 32, height: 32, borderRadius: 16, backgroundColor: 'rgba(255,255,255,0.1)', alignItems: 'center', justifyContent: 'center' },
  stepOff: { opacity: 0.35 },
  count: { minWidth: 44, textAlign: 'center', color: '#F5F5F7', fontFamily: Typeface.bodySemiBold, fontSize: 15, fontVariant: ['tabular-nums'] },
  countOff: { color: 'rgba(242,242,244,0.35)' },
  gramsField: { flex: 1, flexDirection: 'row', alignItems: 'center', height: 46, paddingHorizontal: Spacing.three, borderRadius: 14, backgroundColor: 'rgba(255,255,255,0.05)', borderWidth: StyleSheet.hairlineWidth, borderColor: 'rgba(255,255,255,0.1)' },
  gramsInput: { flex: 1, color: '#F5F5F7', fontFamily: Typeface.bodySemiBold, fontSize: 16, fontVariant: ['tabular-nums'], paddingVertical: 0 },
  gramsUnit: { color: 'rgba(242,242,244,0.5)', fontFamily: Typeface.bodyMedium, fontSize: 14 },
  macros: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: Spacing.two, paddingHorizontal: Spacing.two, borderRadius: 16, backgroundColor: 'rgba(255,255,255,0.04)' },
  macro: { alignItems: 'center', gap: 2, flex: 1 },
  macroValue: { color: '#F5F5F7', fontFamily: Typeface.bodySemiBold, fontSize: 15, fontVariant: ['tabular-nums'] },
  macroStrong: { fontFamily: Typeface.display, fontSize: 18 },
  macroUnit: { color: 'rgba(242,242,244,0.5)', fontFamily: Typeface.body, fontSize: 11 },
  macroLabel: { color: 'rgba(242,242,244,0.5)', fontFamily: Typeface.body, fontSize: 11 },
});
