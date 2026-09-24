/**
 * Builds the food library from USDA FoodData Central (public domain):
 *   node scripts/foods/ingest-usda.mjs <sr_legacy_csv_dir> <foundation_csv_dir> [<fndds_csv_dir>]
 * FNDDS ("Survey foods") adds ~5.4k foods as people actually eat them — "Sushi roll, California",
 * "Burrito, beef, with rice, cheese", "Chicken breast, grilled" — with real as-eaten portions.
 * Writes:
 *   assets/data/foods-curated.json      — the curated tier, bundled with the app (instant, offline)
 *   /tmp/usda/sql/foods-XX.sql          — chunked upserts for public.foods (the searchable long tail)
 *   /tmp/usda/report.txt                — curated entries that did not resolve, for fixing
 * Datasets: https://fdc.nal.usda.gov/download-datasets (SR Legacy 2018-04, Foundation Foods).
 */
import fs from 'node:fs';
import path from 'node:path';
import { CATEGORIES, CURATED } from './curated.mjs';

const [srDir, ffDir, fnddsDir] = process.argv.slice(2);
if (!srDir || !ffDir) throw new Error('usage: ingest-usda.mjs <sr_legacy_dir> <foundation_dir> [<fndds_dir>]');

// ---- tiny RFC 4180 reader -------------------------------------------------------------------
function readCsv(file) {
  const text = fs.readFileSync(file, 'utf8');
  const rows = [];
  let row = [], field = '', quoted = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (quoted) {
      if (c === '"') {
        if (text[i + 1] === '"') { field += '"'; i++; } else quoted = false;
      } else field += c;
    } else if (c === '"') quoted = true;
    else if (c === ',') { row.push(field); field = ''; }
    else if (c === '\n' || c === '\r') {
      if (c === '\r' && text[i + 1] === '\n') i++;
      row.push(field); field = '';
      if (row.length > 1 || row[0] !== '') rows.push(row);
      row = [];
    } else field += c;
  }
  if (field || row.length) { row.push(field); rows.push(row); }
  const header = rows.shift();
  return rows.map((r) => Object.fromEntries(header.map((h, i) => [h, r[i] ?? ''])));
}

// Foundation Foods report energy as Atwater general factors (2047) rather than 1008.
const NUTRIENTS = { 1008: 'kcal', 2047: 'kcalAtwater', 1003: 'protein', 1005: 'carbs', 1004: 'fat', 1079: 'fiber', 2000: 'sugar', 1063: 'sugar', 1093: 'sodium', 1258: 'satFat' };
// FNDDS writes the nutrient *number* in the nutrient_id column.
const NUTRIENT_NUMBERS = { 208: 'kcal', 203: 'protein', 205: 'carbs', 204: 'fat', 291: 'fiber', 269: 'sugar', 307: 'sodium', 606: 'satFat' };
// WWEIA (FNDDS) category descriptions → ours, by keyword.
function wweiaCategory(desc = '') {
  const d = desc.toLowerCase();
  if (/milk|cheese|yogurt|cream|dairy/.test(d)) return 'dairy';
  if (/egg|beef|pork|poultry|chicken|turkey|meat|fish|seafood|shellfish|bacon|sausage|frankfurter|deli|cold cuts|lamb|game/.test(d)) return 'protein';
  if (/bread|roll|bagel|tortilla|cereal|oat|rice|pasta|noodle|grain|pancake|waffle|french toast|biscuit|muffin|crackers|quick bread/.test(d)) return 'grains';
  if (/fruit|berries|melon|apple|banana|citrus|dried fruit/.test(d)) return 'fruit';
  if (/vegetable|potato|tomato|lettuce|greens|onion|carrot|corn|squash|salad/.test(d)) return 'vegetables';
  if (/bean|pea|lentil|legume|soy|tofu|nut and seed|hummus/.test(d)) return /nut/.test(d) ? 'nuts' : 'legumes';
  if (/nuts|seeds|peanut/.test(d)) return 'nuts';
  if (/oil|butter|margarine|mayonnaise|dressing|condiment|sauce|gravy|dip|spread|sugar|syrup|jam|honey|sweetener/.test(d)) return 'fats';
  if (/beverage|drink|coffee|tea|juice|soda|soft drink|water|beer|wine|liquor|cocktail|smoothie/.test(d)) return 'drinks';
  if (/cake|cookie|pie|pastry|candy|chocolate|ice cream|frozen dessert|pudding|doughnut|sweet|snack|chips|popcorn|pretzel|bar/.test(d)) return 'snacks';
  if (/pizza|burrito|taco|sandwich|burger|soup|stew|casserole|mixed dish|entree|nachos|dumpling|sushi|stir-fry|fried rice|pasta mixed|meat mixed|rice mixed/.test(d)) return 'prepared';
  if (/formula|infant|baby|protein and nutritional powders|supplement/.test(d)) return /powder|supplement/.test(d) ? 'supplements' : null;
  return 'other';
}
// Survey-speak that means nothing to a person logging lunch.
const FNDDS_NOISE = /,?\s*(NFS|NS as to [^,]+|as ingredient in recipes?|not further specified)/gi;
const USDA_CATEGORY = {
  'Dairy and Egg Products': 'dairy', 'Spices and Herbs': 'other', 'Baby Foods': null, 'Fats and Oils': 'fats', 'Poultry Products': 'protein',
  'Soups, Sauces, and Gravies': 'prepared', 'Sausages and Luncheon Meats': 'protein', 'Breakfast Cereals': 'grains', 'Fruits and Fruit Juices': 'fruit',
  'Pork Products': 'protein', 'Vegetables and Vegetable Products': 'vegetables', 'Nut and Seed Products': 'nuts', 'Beef Products': 'protein',
  'Beverages': 'drinks', 'Finfish and Shellfish Products': 'protein', 'Legumes and Legume Products': 'legumes', 'Lamb, Veal, and Game Products': 'protein',
  'Baked Products': 'grains', 'Sweets': 'snacks', 'Cereal Grains and Pasta': 'grains', 'Fast Foods': 'prepared', 'Meals, Entrees, and Side Dishes': 'prepared',
  'Snacks': 'snacks', 'American Indian/Alaska Native Foods': 'other', 'Restaurant Foods': 'prepared', 'Branded Food Products Database': null, 'Quality Control Materials': null, 'Alcoholic Beverages': 'drinks',
};
// Bits of USDA descriptions that only make sense to a lab — dropped outright.
const DROP = /^(all grades|all classes|choice|select|prime|imported|fresh|frozen|composite of trimmed retail cuts|trimmed to .*fat|broilers or fryers|includes .*|\(includes .*\)|year round average|with(out)? (added )?salt( added)?|unenriched|enriched|not fortified|fortified|prepared with (tap )?water|regular|commercially prepared|ready-to-bake or -fry|nfs|usda commodity.*|mature seeds|drained solids.*|solids and liquids|home-prepared|approximately .*|liquid expressed .*|lip.?off|lip.?on|shelf stable|refrigerated|dry heat|moist heat|separable fat|external fat|seam fat)$/i;
// Shortened rather than dropped: they distinguish cuts.
const ABBREV = [
  [/^separable lean only$/i, 'lean only'],
  [/^separable lean and fat$/i, 'lean and fat'],
  [/^meat only$/i, 'meat only'],
  [/^meat and skin$/i, 'with skin'],
  [/^cooked, (\w+)$/i, '$1'],
];

/** "Lamb, Australian, imported, fresh, leg, shank half, separable lean only, trimmed to 1/8\" fat, cooked, roasted" → "Lamb, Australian, leg, shank half, lean only, roasted". */
function cleanName(description) {
  const parts = description.split(/,\s*/).map((p) => p.trim()).filter(Boolean);
  const kept = [];
  for (let i = 0; i < parts.length; i++) {
    let part = parts[i];
    if (i > 0 && DROP.test(part)) continue;
    // "cooked" followed by the method → just the method; "cooked" alone stays.
    if (/^cooked$/i.test(part) && parts[i + 1] && /^(roasted|grilled|broiled|braised|fried|baked|boiled|steamed|stewed|pan-fried|microwaved|simmered|dry heat|moist heat)/i.test(parts[i + 1])) continue;
    for (const [re, to] of ABBREV) part = part.replace(re, to);
    kept.push(part);
  }
  const name = kept.join(', ').replace(/\s+/g, ' ');
  return name.charAt(0).toUpperCase() + name.slice(1);
}

function load(dir, { survey = false } = {}) {
  const foods = readCsv(path.join(dir, 'food.csv'));
  const nutrients = readCsv(path.join(dir, 'food_nutrient.csv'));
  const portions = fs.existsSync(path.join(dir, 'food_portion.csv')) ? readCsv(path.join(dir, 'food_portion.csv')) : [];
  const units = Object.fromEntries(readCsv(path.join(dir, 'measure_unit.csv')).map((u) => [u.id, u.name]));
  const categories = survey ? {} : Object.fromEntries(readCsv(path.join(dir, 'food_category.csv')).map((c) => [c.id, c.description]));
  // FNDDS categories live in a separate table keyed by food.
  const wweia = survey ? Object.fromEntries(readCsv(path.join(dir, 'wweia_food_category.csv')).map((c) => [c.wweia_food_category, c.wweia_food_category_description])) : {};
  const surveyCategory = survey ? Object.fromEntries(readCsv(path.join(dir, 'survey_fndds_food.csv')).map((r) => [r.fdc_id, wweia[r.wweia_category_number]])) : {};
  const byFood = new Map();
  for (const n of nutrients) {
    const key = survey ? NUTRIENT_NUMBERS[n.nutrient_id] : NUTRIENTS[n.nutrient_id];
    if (!key) continue;
    const m = byFood.get(n.fdc_id) ?? {};
    const v = Number(n.amount);
    if (Number.isFinite(v) && (m[key] == null || key !== 'sugar')) m[key] = v;
    byFood.set(n.fdc_id, m);
  }
  for (const m of byFood.values()) if (m.kcal == null && m.kcalAtwater != null) m.kcal = Math.round(m.kcalAtwater);
  const portionsByFood = new Map();
  for (const p of portions) {
    const grams = Number(p.gram_weight);
    if (!grams) continue;
    if (survey) {
      // FNDDS: label in portion_description ("1 cup", "1 slice"), amount empty, modifier is a code.
      const label = p.portion_description?.trim();
      if (!label || /not specified|guideline amount/i.test(label)) continue;
      const list = portionsByFood.get(p.fdc_id) ?? [];
      if (list.length < 4 && !list.some((x) => x.grams === grams)) list.push({ label, grams });
      portionsByFood.set(p.fdc_id, list);
      continue;
    }
    const unit = units[p.measure_unit_id];
    const amount = Number(p.amount);
    // SR Legacy keeps the unit text in `modifier` with measure_unit "undetermined" (9999).
    const text = unit && unit !== 'undetermined' ? `${unit}${p.modifier && !/^\d/.test(p.modifier) ? `, ${p.modifier}` : ''}` : p.portion_description || p.modifier || 'serving';
    const label = /^[\d½¼¾]/.test(text) ? text : `${fmtAmount(amount)} ${text}`;
    const list = portionsByFood.get(p.fdc_id) ?? [];
    if (list.length < 4 && !list.some((x) => x.grams === grams)) list.push({ label: label.trim(), grams });
    portionsByFood.set(p.fdc_id, list);
  }
  return { foods, byFood, portionsByFood, categories, surveyCategory, survey };
}
const fmtAmount = (n) => (Number.isInteger(n) ? String(n) : n === 0.5 ? '½' : n === 0.25 ? '¼' : n === 0.75 ? '¾' : String(n));


const sr = load(srDir);
const ff = load(ffDir);
const rows = new Map();
function addRows(set, dataType) {
  for (const f of set.foods) {
    if (f.data_type !== dataType) continue;
    const mapped = set.survey ? wweiaCategory(set.surveyCategory[f.fdc_id]) : USDA_CATEGORY[set.categories[f.food_category_id]];
    if (mapped === null) continue;
    const cat = mapped ?? 'other';
    const m = set.byFood.get(f.fdc_id);
    if (!m || m.kcal == null) continue;
    const name = set.survey ? cleanSurveyName(f.description) : cleanName(f.description);
    if (!name) continue;
    rows.set(f.fdc_id, {
      id: `usda:${f.fdc_id}`,
      source: 'usda',
      external_id: f.fdc_id,
      name,
      description: f.description,
      category: cat,
      kcal: m.kcal, protein: m.protein ?? 0, carbs: m.carbs ?? 0, fat: m.fat ?? 0, fiber: m.fiber ?? null, sugar: m.sugar ?? null, sodium_mg: m.sodium ?? null, sat_fat: m.satFat ?? null,
      servings: set.portionsByFood.get(f.fdc_id) ?? [],
      tags: [],
      popularity: 0,
      verified: dataType === 'foundation_food',
    });
  }
}
function cleanSurveyName(description) {
  const name = description.replace(FNDDS_NOISE, '').replace(/\s+,/g, ',').replace(/,\s*$/, '').replace(/\s+/g, ' ').trim();
  return name.charAt(0).toUpperCase() + name.slice(1);
}
addRows(sr, 'sr_legacy_food');
addRows(ff, 'foundation_food');
const fndds = fnddsDir ? load(fnddsDir, { survey: true }) : null;
if (fndds) addRows(fndds, 'survey_fndds_food');
console.log('long tail rows:', rows.size);

// ---- curated tier ---------------------------------------------------------------------------
const all = [...sr.foods, ...ff.foods.filter((f) => f.data_type === 'foundation_food')];
const lower = all.map((f) => ({ f, d: f.description.toLowerCase() }));
// Exact match first, then the shortest description with that prefix — skipping entries that have no
// nutrient data yet (the newest Foundation Foods sometimes ship before their analyses).
function hasNutrients(f) {
  const set = sr.foods.includes(f) ? sr : ff;
  const m = set.byFood.get(f.fdc_id);
  return !!m && m.kcal != null;
}
function resolve(q) {
  const needle = q.toLowerCase();
  const candidates = [...lower.filter((x) => x.d === needle), ...lower.filter((x) => x.d !== needle && x.d.startsWith(needle)).sort((a, b) => a.d.length - b.d.length)];
  return candidates.find((x) => hasNutrients(x.f))?.f ?? candidates[0]?.f ?? null;
}
const curated = [];
const report = [];
CURATED.forEach((c, i) => {
  const f = resolve(c.q) ?? (c.alt ? resolve(c.alt) : null);
  if (!f) { report.push(`UNRESOLVED  ${c.name}  ← ${c.q}`); return; }
  const set = sr.foods.includes(f) ? sr : ff;
  const m = set.byFood.get(f.fdc_id);
  if (!m || m.kcal == null) { report.push(`NO NUTRIENTS  ${c.name}  ← ${f.description}`); return; }
  if (f.description.toLowerCase() !== c.q.toLowerCase()) report.push(`resolved      ${c.name}  ← ${f.description}`);
  const servings = c.serv ?? set.portionsByFood.get(f.fdc_id) ?? [];
  const entry = {
    id: `usda:${f.fdc_id}`,
    name: c.name,
    description: f.description,
    category: c.cat,
    kcal: m.kcal, protein: m.protein ?? 0, carbs: m.carbs ?? 0, fat: m.fat ?? 0, fiber: m.fiber ?? 0, sugar: m.sugar ?? null, sodium_mg: m.sodium ?? null,
    servings,
    tags: c.tags,
    popularity: CURATED.length - i,
  };
  curated.push(entry);
  const row = rows.get(f.fdc_id);
  if (row) Object.assign(row, { name: c.name, category: c.cat, servings, tags: c.tags, popularity: entry.popularity, verified: true });
  else rows.set(f.fdc_id, { ...entry, source: 'usda', external_id: f.fdc_id, sat_fat: m.satFat ?? null, verified: true });
});
fs.mkdirSync('assets/data', { recursive: true });
fs.writeFileSync('assets/data/foods-curated.json', JSON.stringify({ categories: CATEGORIES, foods: curated }));
fs.mkdirSync('/tmp/usda/sql', { recursive: true });
fs.writeFileSync('/tmp/usda/report.txt', report.join('\n'));
console.log('curated:', curated.length, 'of', CURATED.length, '| report lines:', report.length, `| bundle ${Math.round(fs.statSync('assets/data/foods-curated.json').size / 1024)} KB`);

// ---- names must stay distinct -----------------------------------------------------------------
// Rows that still share a display name (e.g. two years of the same survey food) fall back to their
// full description, so the list never shows the same label twice for different numbers.
{
  const byName = new Map();
  for (const r of rows.values()) byName.set(r.name, [...(byName.get(r.name) ?? []), r]);
  let fixed = 0;
  for (const group of byName.values()) {
    if (group.length < 2) continue;
    const seen = new Set();
    for (const r of group) {
      if (r.popularity > 0) { seen.add(r.name); continue; } // curated names win
      let candidate = r.description && r.description !== r.name ? r.description.replace(/\s*\(Includes foods for USDA's Food Distribution Program\)/i, '') : r.name;
      if (seen.has(candidate)) candidate = `${candidate} (${r.external_id})`;
      if (candidate !== r.name) { r.name = candidate; fixed++; }
      seen.add(candidate);
    }
  }
  console.log('names de-duplicated:', fixed);
}

// ---- chunked SQL ----------------------------------------------------------------------------
const list = [...rows.values()];
const CHUNK = 400;
let n = 0;
for (let i = 0; i < list.length; i += CHUNK) {
  const chunk = list.slice(i, i + CHUNK).map((r) => ({ ...r, tags: r.tags, servings: r.servings }));
  const json = JSON.stringify(chunk).replace(/\$\$/g, '$ $');
  const sql = `insert into public.foods (id, source, external_id, name, description, category, kcal, protein, carbs, fat, fiber, sugar, sodium_mg, sat_fat, servings, tags, popularity, verified)
select t.id, t.source, t.external_id, t.name, t.description, t.category, t.kcal, t.protein, t.carbs, t.fat, t.fiber, t.sugar, t.sodium_mg, t.sat_fat, coalesce(t.servings, '[]'::jsonb), coalesce(t.tags, '{}'::text[]), coalesce(t.popularity, 0), coalesce(t.verified, false)
from jsonb_to_recordset($$${json}$$::jsonb) as t(id text, source text, external_id text, name text, description text, category text, kcal numeric, protein numeric, carbs numeric, fat numeric, fiber numeric, sugar numeric, sodium_mg numeric, sat_fat numeric, servings jsonb, tags text[], popularity int, verified boolean)
on conflict (id) do update set name = excluded.name, description = excluded.description, category = excluded.category, kcal = excluded.kcal, protein = excluded.protein, carbs = excluded.carbs, fat = excluded.fat, fiber = excluded.fiber, sugar = excluded.sugar, sodium_mg = excluded.sodium_mg, sat_fat = excluded.sat_fat, servings = excluded.servings, tags = excluded.tags, popularity = excluded.popularity, verified = excluded.verified, updated_at = now();`;
  fs.writeFileSync(`/tmp/usda/sql/foods-${String(n++).padStart(2, '0')}.sql`, sql);
}
console.log('sql chunks:', n, `(${CHUNK} rows each)`);
