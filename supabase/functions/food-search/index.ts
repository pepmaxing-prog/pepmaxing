import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

/**
 * Packaged-food search and barcode lookup. Two sources, both normalised to our `foods` shape
 * (macros per 100 g) and cached in the table with the service role:
 *  - USDA FoodData Central "Branded" (400k+ US products with label data, public domain) via the
 *    FDC API — set the USDA_API_KEY secret (free at fdc.nal.usda.gov/api-key-signup); without it the
 *    shared DEMO_KEY is used, which allows only 30 requests/hour.
 *  - Open Food Facts (worldwide, ODbL — the app shows the attribution), best-effort: often slow.
 * Body: { q?: string; barcode?: string; limit?: number }
 */
const OFF_UA = "Pepmaxing/1.0 (support@pepmaxing.app)";
const JSON_HEADERS = { "Content-Type": "application/json" };
const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: JSON_HEADERS });

type OffProduct = {
  code?: string;
  product_name?: string;
  product_name_en?: string;
  brands?: string;
  categories_tags?: string[];
  image_front_small_url?: string;
  image_url?: string;
  serving_size?: string;
  serving_quantity?: number | string;
  nutriments?: Record<string, number | string | undefined>;
};

type FoodRow = {
  id: string;
  source: "off" | "usda";
  external_id: string;
  name: string;
  brand: string | null;
  description: string | null;
  category: string;
  kcal: number;
  protein: number;
  carbs: number;
  fat: number;
  fiber: number | null;
  sugar: number | null;
  sodium_mg: number | null;
  sat_fat: number | null;
  servings: { label: string; grams: number }[];
  barcode: string | null;
  image_url: string | null;
  tags: string[];
  popularity: number;
  verified: boolean;
};

const num = (v: unknown): number | null => {
  const n = typeof v === "string" ? Number(v) : (v as number | undefined);
  return typeof n === "number" && Number.isFinite(n) ? n : null;
};

/** OFF category tags → our browse categories. */
function categoryOf(tags: string[] = []): string {
  const t = tags.join(" ");
  if (/dairies|cheeses|yogurts|milks/.test(t)) return "dairy";
  if (/meats|fishes|seafood|eggs|poultry/.test(t)) return "protein";
  if (/breads|cereals|pastas|rice|grains|breakfast/.test(t)) return "grains";
  if (/fruits/.test(t)) return "fruit";
  if (/vegetables|legumes/.test(t)) return "vegetables";
  if (/nuts|seeds|spreads/.test(t)) return "nuts";
  if (/beverages|drinks|waters|juices|sodas|coffees|teas/.test(t)) return "drinks";
  if (/snacks|biscuits|chocolates|confectioneries|desserts|sweets|candies/.test(t)) return "snacks";
  if (/meals|pizzas|sandwiches|soups|sauces|dressings|condiments/.test(t)) return "prepared";
  if (/supplements|protein-powders|sports/.test(t)) return "supplements";
  return "other";
}

function normalise(p: OffProduct): FoodRow | null {
  const n = p.nutriments ?? {};
  const kcal = num(n["energy-kcal_100g"]) ?? (num(n["energy_100g"]) != null ? Math.round(num(n["energy_100g"])! / 4.184) : null);
  const name = (p.product_name_en || p.product_name || "").trim();
  if (!p.code || !name || kcal == null) return null;
  const servingGrams = num(p.serving_quantity);
  const servings = servingGrams && servingGrams > 0 ? [{ label: p.serving_size?.trim() || "1 serving", grams: servingGrams }] : [];
  return {
    id: `off:${p.code}`,
    source: "off",
    external_id: p.code,
    name: name.slice(0, 120),
    brand: p.brands?.split(",")[0]?.trim().slice(0, 80) || null,
    description: null,
    category: categoryOf(p.categories_tags),
    kcal,
    protein: num(n["proteins_100g"]) ?? 0,
    carbs: num(n["carbohydrates_100g"]) ?? 0,
    fat: num(n["fat_100g"]) ?? 0,
    fiber: num(n["fiber_100g"]),
    sugar: num(n["sugars_100g"]),
    sodium_mg: num(n["sodium_100g"]) != null ? Math.round(num(n["sodium_100g"])! * 1000) : null,
    sat_fat: num(n["saturated-fat_100g"]),
    servings,
    barcode: p.code,
    image_url: p.image_front_small_url || p.image_url || null,
    tags: [],
    popularity: 0,
    verified: false,
  };
}

/** USDA FDC search result (only the fields we read). */
type FdcFood = {
  fdcId: number;
  description: string;
  dataType: string;
  brandOwner?: string;
  brandName?: string;
  gtinUpc?: string;
  servingSize?: number;
  servingSizeUnit?: string;
  householdServingFullText?: string;
  brandedFoodCategory?: string;
  foodNutrients?: { nutrientId: number; value: number }[];
};

const FDC_NUTRIENTS: Record<number, keyof Pick<FoodRow, "kcal" | "protein" | "carbs" | "fat" | "fiber" | "sugar" | "sodium_mg" | "sat_fat">> = { 1008: "kcal", 1003: "protein", 1005: "carbs", 1004: "fat", 1079: "fiber", 2000: "sugar", 1093: "sodium_mg", 1258: "sat_fat" };

function brandedCategory(text = ""): string {
  const t = text.toLowerCase();
  if (/cheese|yogurt|milk|dairy|cream|butter/.test(t)) return "dairy";
  if (/meat|poultry|seafood|fish|egg|sausage|deli|jerky/.test(t)) return "protein";
  if (/rice|pasta|bread|cereal|grain|flour|bakery|tortilla|oat/.test(t)) return "grains";
  if (/fruit/.test(t)) return "fruit";
  if (/vegetable|salad|potato/.test(t)) return "vegetables";
  if (/bean|legume|tofu|soy/.test(t)) return "legumes";
  if (/nut|seed|peanut/.test(t)) return "nuts";
  if (/oil|dressing|condiment|sauce|spread|syrup|sweetener|seasoning/.test(t)) return "fats";
  if (/beverage|drink|water|juice|soda|coffee|tea|energy/.test(t)) return "drinks";
  if (/snack|chip|candy|chocolate|cookie|dessert|ice cream|bar|cracker|popcorn/.test(t)) return "snacks";
  if (/meal|entree|frozen|pizza|soup|prepared/.test(t)) return "prepared";
  if (/supplement|protein powder|vitamin|nutrition/.test(t)) return "supplements";
  return "other";
}

/** Title-cases USDA's SHOUTING brand descriptions. */
const titleCase = (s: string) => s.toLowerCase().replace(/(^|[\s\-\(\/])([a-z])/g, (_, pre, ch) => pre + ch.toUpperCase()).replace(/\b(And|Or|Of|With|In|The|A)\b/g, (w) => w.toLowerCase());

function normaliseFdc(f: FdcFood): FoodRow | null {
  const n: Partial<Record<string, number>> = {};
  for (const x of f.foodNutrients ?? []) {
    const key = FDC_NUTRIENTS[x.nutrientId];
    if (key && typeof x.value === "number") n[key] = x.value;
  }
  if (n.kcal == null || !f.description) return null;
  const servingGrams = f.servingSizeUnit?.toLowerCase() === "g" || f.servingSizeUnit?.toLowerCase() === "ml" ? f.servingSize ?? null : null;
  const household = f.householdServingFullText?.trim().replace(/\bONZ\b/gi, "oz").replace(/\s*\|.*$/, "");
  const servings = servingGrams && servingGrams > 0 ? [{ label: household ? titleCase(household).replace(/\bOz\b/g, "oz") : "1 serving", grams: Math.round(servingGrams * 10) / 10 }] : [];
  const brand = (f.brandName || f.brandOwner || "").trim();
  return {
    id: `usda:${f.fdcId}`,
    source: "usda",
    external_id: String(f.fdcId),
    name: titleCase(f.description).slice(0, 120),
    brand: brand ? titleCase(brand).slice(0, 80) : null,
    description: null,
    category: brandedCategory(f.brandedFoodCategory),
    kcal: n.kcal,
    protein: n.protein ?? 0,
    carbs: n.carbs ?? 0,
    fat: n.fat ?? 0,
    fiber: n.fiber ?? null,
    sugar: n.sugar ?? null,
    sodium_mg: n.sodium_mg ?? null,
    sat_fat: n.sat_fat ?? null,
    servings,
    barcode: f.gtinUpc?.replace(/\D/g, "") || null,
    image_url: null,
    tags: [],
    popularity: 0,
    verified: false,
  };
}

async function searchFdc(q: string, limit: number): Promise<FoodRow[]> {
  const key = Deno.env.get("USDA_API_KEY") || "DEMO_KEY";
  // No sortBy: the API then orders by relevance score, which is what a search box wants.
  const url = `https://api.nal.usda.gov/fdc/v1/foods/search?api_key=${encodeURIComponent(key)}&query=${encodeURIComponent(q)}&dataType=Branded&pageSize=${limit}`;
  const res = await fetch(url, { signal: AbortSignal.timeout(6000) });
  if (!res.ok) return [];
  const data = (await res.json()) as { foods?: FdcFood[] };
  const rows = (data.foods ?? []).map(normaliseFdc).filter((r): r is FoodRow => !!r);
  // FDC's relevance is loose ("quest" → "Sea Quest Egg Hunt"); re-rank by how many query words the
  // name and brand actually contain, brand hits counting double.
  const words = q.toLowerCase().split(/\s+/).filter((w) => w.length > 1);
  const score = (r: FoodRow) => {
    const name = r.name.toLowerCase();
    const brand = (r.brand ?? "").toLowerCase();
    return words.reduce((acc, w) => acc + (name.includes(w) ? 1 : 0) + (brand.includes(w) ? 2 : 0), 0);
  };
  return rows.map((r, i) => ({ r, i, s: score(r) })).sort((a, b) => b.s - a.s || a.i - b.i).map((x) => x.r);
}

const FIELDS = "code,product_name,product_name_en,brands,categories_tags,image_front_small_url,image_url,serving_size,serving_quantity,nutriments";
/** OFF search is best-effort: it is often slow, and the app already has the USDA library to show. */
const SEARCH_TIMEOUT_MS = 6000;
const BARCODE_TIMEOUT_MS = 8000;
/** A query fetched from a source within this window is not fetched again — its products are in `foods`. */
const QUERY_CACHE_DAYS = 14;
/** USDA allows 1,000 requests/hour per key (30 on DEMO_KEY). Stop before the wall so the app degrades to the library. */
const USDA_HOURLY_BUDGET = Deno.env.get("USDA_API_KEY") ? 900 : 25;

type Admin = ReturnType<typeof createClient>;
const normaliseQuery = (q: string) => q.toLowerCase().replace(/\s+/g, " ").trim();

/** Sources still worth calling for this query: not fetched recently, and (for USDA) inside the hourly budget. */
async function sourcesToFetch(admin: Admin, q: string): Promise<{ usda: boolean; off: boolean; budgetLeft: number }> {
  const since = new Date(Date.now() - QUERY_CACHE_DAYS * 86_400_000).toISOString();
  const hourAgo = new Date(Date.now() - 3_600_000).toISOString();
  const [recent, hour] = await Promise.all([
    admin.from("food_search_log").select("source").eq("q", q).gte("fetched_at", since),
    admin.from("food_search_log").select("q", { count: "exact", head: true }).eq("source", "usda").not("q", "like", "u:%").gte("fetched_at", hourAgo),
  ]);
  const done = new Set((recent.data ?? []).map((r) => (r as { source: string }).source));
  const used = hour.count ?? 0;
  return { usda: !done.has("usda") && used < USDA_HOURLY_BUDGET, off: !done.has("off"), budgetLeft: Math.max(0, USDA_HOURLY_BUDGET - used) };
}

async function logFetch(admin: Admin, q: string, source: "usda" | "off", results: number) {
  await admin.from("food_search_log").upsert({ q, source, results, fetched_at: new Date().toISOString() }, { onConflict: "q,source" });
}

/** One user may make this many upstream-triggering requests per hour; beyond it they still get the cache. */
const PER_USER_HOURLY = 120;

async function userOverLimit(admin: Admin, userId: string): Promise<boolean> {
  const hourAgo = new Date(Date.now() - 3_600_000).toISOString();
  const { count } = await admin.from("food_search_log").select("q", { count: "exact", head: true }).eq("source", "usda").like("q", `u:${userId}:%`).gte("fetched_at", hourAgo);
  return (count ?? 0) >= PER_USER_HOURLY;
}

/** Records that this user caused an upstream call (for the per-user throttle only). */
async function logUser(admin: Admin, userId: string, what: string) {
  await admin.from("food_search_log").upsert({ q: `u:${userId}:${what}`, source: "usda", results: 0, fetched_at: new Date().toISOString() }, { onConflict: "q,source" });
}

async function usdaBudgetLeft(admin: Admin): Promise<number> {
  const hourAgo = new Date(Date.now() - 3_600_000).toISOString();
  const { count } = await admin.from("food_search_log").select("q", { count: "exact", head: true }).eq("source", "usda").not("q", "like", "u:%").gte("fetched_at", hourAgo);
  return Math.max(0, USDA_HOURLY_BUDGET - (count ?? 0));
}

Deno.serve(async (req: Request) => {
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);
  let body: { q?: string; barcode?: string; limit?: number };
  try {
    body = await req.json();
  } catch {
    return json({ error: "Bad request" }, 400);
  }
  // The platform's JWT check accepts the public anon key, so require an actual signed-in user here.
  const asCaller = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_ANON_KEY")!, { global: { headers: { Authorization: req.headers.get("Authorization") ?? "" } } });
  const { data: { user } } = await asCaller.auth.getUser();
  if (!user) return json({ error: "Unauthorized" }, 401);
  const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!, { auth: { autoRefreshToken: false, persistSession: false } });

  try {
    if (body.barcode) {
      const code = body.barcode.replace(/\D/g, "");
      if (!code) return json({ error: "Bad barcode" }, 400);
      const cached = await admin.from("foods").select("*").eq("barcode", code).maybeSingle();
      if (cached.data) return json({ foods: [cached.data], cached: true });
      if (await userOverLimit(admin, user.id)) return json({ foods: [], error: "Too many lookups this hour — try again later." }, 429);
      void logUser(admin, user.id, `b:${code}`);
      // Open Food Facts first (worldwide, has photos), then USDA Branded by GTIN for US products OFF lacks.
      let row: FoodRow | null = null;
      try {
        const res = await fetch(`https://world.openfoodfacts.org/api/v2/product/${code}.json?fields=${FIELDS}`, { headers: { "User-Agent": OFF_UA }, signal: AbortSignal.timeout(BARCODE_TIMEOUT_MS) });
        if (res.ok) {
          const data = (await res.json()) as { status?: number; product?: OffProduct };
          row = data.product ? normalise(data.product) : null;
        }
      } catch {
        /* fall through to USDA */
      }
      if (!row && (await usdaBudgetLeft(admin)) > 0) {
        const fdc = await searchFdc(code, 3).catch(() => [] as FoodRow[]);
        row = fdc.find((r) => r.barcode && code.endsWith(r.barcode.replace(/^0+/, ""))) ?? fdc[0] ?? null;
        await logFetch(admin, `gtin:${code}`, "usda", row ? 1 : 0); // counts against the hourly budget
      }
      if (!row) return json({ foods: [] });
      await admin.from("foods").upsert(row, { onConflict: "id" });
      return json({ foods: [row] });
    }

    const q = normaliseQuery(body.q ?? "");
    if (q.length < 3) return json({ foods: [] });
    const limit = Math.min(Math.max(body.limit ?? 12, 1), 25);
    // A query already fetched recently costs nothing: its products are in `foods`, which the app's
    // library search returns. Only the sources not yet asked (and within budget) are called, in parallel.
    const plan = await sourcesToFetch(admin, q);
    if (!plan.usda && !plan.off) return json({ foods: [], cached: true });
    if (await userOverLimit(admin, user.id)) return json({ foods: [], error: "Too many lookups this hour — try again later." }, 429);
    void logUser(admin, user.id, `q:${q}`);
    const off = plan.off
      ? (async () => {
          const url = `https://world.openfoodfacts.org/cgi/search.pl?search_terms=${encodeURIComponent(q)}&search_simple=1&action=process&json=1&page_size=${limit}&fields=${FIELDS}&sort_by=unique_scans_n`;
          const res = await fetch(url, { headers: { "User-Agent": OFF_UA }, signal: AbortSignal.timeout(SEARCH_TIMEOUT_MS) });
          if (!res.ok) return [] as FoodRow[];
          const data = (await res.json()) as { products?: OffProduct[] };
          return (data.products ?? []).map(normalise).filter((r): r is FoodRow => !!r);
        })()
      : Promise.resolve([] as FoodRow[]);
    const [fdcResult, offResult] = await Promise.allSettled([plan.usda ? searchFdc(q, limit) : Promise.resolve([] as FoodRow[]), off]);
    const fdcRows = fdcResult.status === "fulfilled" ? fdcResult.value : [];
    const offRows = offResult.status === "fulfilled" ? offResult.value : [];
    // USDA Branded first (label data, US shelves), then OFF for the rest of the world; same barcode → keep USDA.
    const seen = new Set(fdcRows.map((r) => r.barcode).filter((b): b is string => !!b));
    const rows = [...fdcRows, ...offRows.filter((r) => !r.barcode || !seen.has(r.barcode))].slice(0, limit);
    if (rows.length) await admin.from("foods").upsert(rows, { onConflict: "id", ignoreDuplicates: false });
    // Remember what was asked — successful calls only, so a timeout is retried next time.
    await Promise.all([
      plan.usda && fdcResult.status === "fulfilled" ? logFetch(admin, q, "usda", fdcRows.length) : null,
      plan.off && offResult.status === "fulfilled" ? logFetch(admin, q, "off", offRows.length) : null,
    ]);
    const problems = [fdcResult.status === "rejected" ? "USDA" : null, offResult.status === "rejected" ? "Open Food Facts" : null].filter(Boolean);
    return json({ foods: rows, budgetLeft: plan.budgetLeft, ...(problems.length ? { error: `${problems.join(" and ")} did not answer in time` } : {}) });
  } catch (error) {
    const timedOut = error instanceof Error && error.name === "TimeoutError";
    return json({ foods: [], error: timedOut ? "Open Food Facts is slow right now" : error instanceof Error ? error.message : "Lookup failed" }, 200);
  }
});
