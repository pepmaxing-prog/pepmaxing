import type { SFSymbol } from 'expo-symbols';

import curatedBundle from '@/assets/data/foods-curated.json';
import { supabase, supabaseConfigured } from './supabase';

/**
 * The food library. Three tiers behind one shape:
 *  - curated (bundled JSON, instant, offline): ~200 foods people log daily, USDA numbers, real serving sizes;
 *  - library (Supabase `foods`, ~7,800 USDA generics): full-text + fuzzy search through `search_foods`;
 *  - packaged (Edge Function `food-search` → Open Food Facts): worldwide products by name or barcode.
 * All macros are per 100 g; `macrosFor` scales to a serving.
 */

export type FoodCategoryId = 'protein' | 'dairy' | 'grains' | 'fruit' | 'vegetables' | 'legumes' | 'nuts' | 'fats' | 'drinks' | 'snacks' | 'prepared' | 'supplements' | 'other';
export type Serving = { label: string; grams: number };
export type FoodItem = {
  id: string;
  name: string;
  brand?: string | null;
  category: FoodCategoryId;
  /** Per 100 g. */
  kcal: number;
  protein: number;
  carbs: number;
  fat: number;
  fiber?: number | null;
  sugar?: number | null;
  sodiumMg?: number | null;
  servings: Serving[];
  imageUrl?: string | null;
  source: 'curated' | 'usda' | 'off' | 'custom';
  barcode?: string | null;
};

type Bundle = { categories: { id: FoodCategoryId; label: string; symbol: string }[]; foods: (Omit<FoodItem, 'source' | 'category'> & { category: string; description?: string; sodium_mg?: number | null; popularity: number; tags: string[] })[] };
const bundle = curatedBundle as unknown as Bundle;

export const FOOD_CATEGORIES: { id: FoodCategoryId; label: string; symbol: SFSymbol }[] = bundle.categories.map((c) => ({ id: c.id, label: c.label, symbol: c.symbol as SFSymbol }));
export const categorySymbol = (id: string): SFSymbol => FOOD_CATEGORIES.find((c) => c.id === id)?.symbol ?? 'basket.fill';
export const categoryLabel = (id: string) => FOOD_CATEGORIES.find((c) => c.id === id)?.label ?? 'Other';

/** The curated tier, most popular first. */
export const CURATED_FOODS: FoodItem[] = [...bundle.foods]
  .sort((a, b) => b.popularity - a.popularity)
  .map((f) => ({ id: f.id, name: f.name, category: f.category as FoodCategoryId, kcal: f.kcal, protein: f.protein, carbs: f.carbs, fat: f.fat, fiber: f.fiber, sugar: f.sugar, sodiumMg: f.sodium_mg, servings: f.servings, source: 'curated' }));
const curatedById = new Map(CURATED_FOODS.map((f) => [f.id, f]));

/** Popular foods with the categories interleaved, so a rail isn't three chickens in a row. */
export function popularMix(limit = 14): FoodItem[] {
  const byCat = new Map<string, FoodItem[]>();
  for (const f of CURATED_FOODS) byCat.set(f.category, [...(byCat.get(f.category) ?? []), f]);
  const order = ['protein', 'dairy', 'grains', 'fruit', 'vegetables', 'legumes', 'nuts', 'drinks', 'fats', 'snacks', 'prepared', 'supplements'];
  const out: FoodItem[] = [];
  for (let i = 0; out.length < limit && i < 10; i++) for (const c of order) {
    const f = byCat.get(c)?.[i];
    if (f && out.length < limit) out.push(f);
  }
  return out;
}
const curatedTags = new Map(bundle.foods.map((f) => [f.id, `${f.name} ${f.tags.join(' ')} ${f.description ?? ''}`.toLowerCase()]));

export const curatedFood = (id: string) => curatedById.get(id);

const norm = (s: string) => s.toLowerCase().replace(/[^a-z0-9%\s-]/g, ' ').replace(/\s+/g, ' ').trim();

/** Instant matches from the bundle: every query word must appear in the name, tags or description. */
export function searchCurated(q: string, limit = 12): FoodItem[] {
  const words = norm(q).split(' ').filter(Boolean);
  if (!words.length) return CURATED_FOODS.slice(0, limit);
  const scored = CURATED_FOODS.map((f) => {
    const hay = curatedTags.get(f.id) ?? f.name.toLowerCase();
    const name = f.name.toLowerCase();
    if (!words.every((w) => hay.includes(w))) return null;
    const score = (name.startsWith(words[0]) ? 3 : 0) + (words.every((w) => name.includes(w)) ? 2 : 0);
    return { f, score };
  }).filter((x): x is { f: FoodItem; score: number } => !!x);
  return scored.sort((a, b) => b.score - a.score).slice(0, limit).map((x) => x.f);
}

type Row = { id: string; source: string; name: string; brand: string | null; category: string; kcal: number | string; protein: number | string; carbs: number | string; fat: number | string; fiber: number | string | null; sugar: number | string | null; sodium_mg: number | string | null; servings: Serving[]; image_url: string | null; barcode: string | null };
const n = (v: number | string | null | undefined) => (v == null ? null : Number(v));
export function fromRow(r: Row): FoodItem {
  return { id: r.id, name: r.name, brand: r.brand, category: (r.category as FoodCategoryId) ?? 'other', kcal: Number(r.kcal), protein: Number(r.protein), carbs: Number(r.carbs), fat: Number(r.fat), fiber: n(r.fiber), sugar: n(r.sugar), sodiumMg: n(r.sodium_mg), servings: r.servings ?? [], imageUrl: r.image_url, source: r.source === 'off' ? 'off' : 'usda', barcode: r.barcode };
}

/** Ranked search over the whole USDA library (needs network; curated results cover offline). */
export async function searchLibrary(q: string, limit = 30): Promise<FoodItem[]> {
  if (!supabaseConfigured || q.trim().length < 2) return [];
  const { data, error } = await supabase().rpc('search_foods', { q: q.trim(), lim: limit });
  if (error || !data) return [];
  return (data as Row[]).map(fromRow);
}

/** Packaged products by name, through the Edge Function (Open Food Facts, best-effort, may be slow). */
export async function searchPackaged(q: string, limit = 12): Promise<FoodItem[]> {
  if (!supabaseConfigured || q.trim().length < 2) return [];
  const { data, error } = await supabase().functions.invoke('food-search', { body: { q: q.trim(), limit } });
  if (error || !data?.foods) return [];
  return (data.foods as Row[]).map(fromRow);
}

/** One product by barcode, cached server-side after the first lookup. */
export async function lookupBarcode(code: string): Promise<FoodItem | null> {
  if (!supabaseConfigured) return null;
  const { data, error } = await supabase().functions.invoke('food-search', { body: { barcode: code } });
  if (error || !data?.foods?.length) return null;
  return fromRow(data.foods[0] as Row);
}

/** What the label reader returns (see supabase/functions/read-label). */
export type LabelReading = {
  readable: boolean;
  product_name: string | null;
  brand: string | null;
  serving_label: string | null;
  serving_grams: number | null;
  servings_per_container: number | null;
  per_serving: { kcal: number | null; fat_g: number | null; sat_fat_g: number | null; carbs_g: number | null; fiber_g: number | null; sugar_g: number | null; protein_g: number | null; sodium_mg: number | null };
  confidence: number;
  notes: string | null;
};

export class LabelReadError extends Error {}

/** Sends a downscaled label photo (base64 JPEG) to the reader; the image is not stored anywhere. */
export async function readLabel(imageBase64: string, hint?: string): Promise<LabelReading> {
  if (!supabaseConfigured) throw new LabelReadError('Not configured');
  const { data, error } = await supabase().functions.invoke('read-label', { body: { image: imageBase64, hint } });
  if (error) {
    // supabase-js wraps non-2xx responses; surface the function's own message when it sent one.
    const ctx = (error as { context?: Response }).context;
    const detail = ctx ? await ctx.json().catch(() => null) : null;
    throw new LabelReadError(detail?.error ?? 'Could not reach the label reader');
  }
  if (!data?.reading) throw new LabelReadError(data?.error ?? 'No reading');
  return data.reading as LabelReading;
}

/** Turns a label reading into a food (per 100 g) with the printed serving. Null when there is not enough to work with. */
export function foodFromLabel(r: LabelReading, fallbackName = 'Scanned label'): FoodItem | null {
  const p = r.per_serving;
  if (!r.readable || p.kcal == null) return null;
  const grams = r.serving_grams && r.serving_grams > 0 ? r.serving_grams : null;
  // Without a serving weight we can only express the label per serving: treat the serving as 100 g so the maths holds.
  const per100 = (v: number | null) => (v == null ? 0 : grams ? (v / grams) * 100 : v);
  const servingLabel = r.serving_label?.trim() || (grams ? `${grams} g` : '1 serving');
  return {
    id: `label:${Date.now().toString(36)}`,
    name: (r.product_name?.trim() || fallbackName).slice(0, 80),
    brand: r.brand?.trim() || null,
    category: 'other',
    kcal: per100(p.kcal),
    protein: per100(p.protein_g),
    carbs: per100(p.carbs_g),
    fat: per100(p.fat_g),
    fiber: p.fiber_g == null ? null : per100(p.fiber_g),
    sugar: p.sugar_g == null ? null : per100(p.sugar_g),
    sodiumMg: p.sodium_mg == null ? null : per100(p.sodium_mg),
    servings: [{ label: servingLabel, grams: grams ?? 100 }],
    source: 'custom',
  };
}

export type Macros = { kcal: number; protein: number; carbs: number; fat: number; fiber: number };

/** Scales the per-100 g values to an amount, rounded the way a label would show them. */
export function macrosFor(food: Pick<FoodItem, 'kcal' | 'protein' | 'carbs' | 'fat' | 'fiber'>, grams: number): Macros {
  const k = grams / 100;
  const r1 = (v: number) => Math.round(v * k * 10) / 10;
  return { kcal: Math.round(food.kcal * k), protein: r1(food.protein), carbs: r1(food.carbs), fat: r1(food.fat), fiber: r1(food.fiber ?? 0) };
}

/** A sensible default amount: the first listed serving, else 100 g. */
export const defaultServing = (food: FoodItem): Serving => food.servings[0] ?? { label: '100 g', grams: 100 };

export const ATTRIBUTION = 'Nutrition data: USDA FoodData Central · Open Food Facts (ODbL)';
