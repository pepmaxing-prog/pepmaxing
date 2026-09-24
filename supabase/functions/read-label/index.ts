import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

/**
 * Reads a Nutrition Facts panel from a photo with OpenAI vision and returns the numbers as a food
 * (per serving and per 100 g). The image is processed in memory and never stored. Requires the
 * OPENAI_API_KEY secret; OPENAI_VISION_MODEL overrides the model (default gpt-4.1-mini).
 * Body: { image: string (base64 JPEG, no data: prefix), hint?: string }
 */
const JSON_HEADERS = { "Content-Type": "application/json" };
const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: JSON_HEADERS });

const SCHEMA = {
  type: "object",
  additionalProperties: false,
  properties: {
    readable: { type: "boolean", description: "False when the image is not a nutrition label or the numbers cannot be read." },
    product_name: { type: ["string", "null"], description: "Product name if printed on the packaging in the photo, else null." },
    brand: { type: ["string", "null"] },
    serving_label: { type: ["string", "null"], description: "The serving as printed, e.g. '2/3 cup (55g)'." },
    serving_grams: { type: ["number", "null"], description: "Serving weight in grams (or mL for liquids) if printed; null if unknown." },
    servings_per_container: { type: ["number", "null"] },
    per_serving: {
      type: "object",
      additionalProperties: false,
      properties: {
        kcal: { type: ["number", "null"] },
        fat_g: { type: ["number", "null"] },
        sat_fat_g: { type: ["number", "null"] },
        carbs_g: { type: ["number", "null"] },
        fiber_g: { type: ["number", "null"] },
        sugar_g: { type: ["number", "null"] },
        protein_g: { type: ["number", "null"] },
        sodium_mg: { type: ["number", "null"] },
      },
      required: ["kcal", "fat_g", "sat_fat_g", "carbs_g", "fiber_g", "sugar_g", "protein_g", "sodium_mg"],
    },
    confidence: { type: "number", description: "0–1, how legible and complete the panel was." },
    notes: { type: ["string", "null"], description: "Anything the user should double-check, e.g. 'per 100 g column used'." },
  },
  required: ["readable", "product_name", "brand", "serving_label", "serving_grams", "servings_per_container", "per_serving", "confidence", "notes"],
} as const;

type Reading = {
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

const PROMPT = `You read Nutrition Facts panels (US, EU "Nutrition Information", UK, Canadian and similar) from photos.
Return only what is printed. Never estimate a value that is not on the label: use null.
If the label lists both "per serving" and "per 100 g", report the per-serving column and put the serving weight in serving_grams.
If only "per 100 g" is printed, treat 100 g as the serving (serving_label "100 g", serving_grams 100).
Energy: report kilocalories; if only kJ is printed, convert (kcal = kJ / 4.184) and say so in notes.
Sodium: milligrams; if only salt is printed, sodium_mg = salt_g * 400 and say so in notes.
If the photo is not a nutrition label, or too blurry to read, set readable=false.`;

Deno.serve(async (req: Request) => {
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);
  const apiKey = Deno.env.get("OPENAI_API_KEY");
  if (!apiKey) return json({ error: "Label reading is not configured yet (OPENAI_API_KEY missing)." }, 503);

  let body: { image?: string; hint?: string };
  try {
    body = await req.json();
  } catch {
    return json({ error: "Bad request" }, 400);
  }
  const image = (body.image ?? "").replace(/^data:image\/\w+;base64,/, "");
  if (image.length < 1000) return json({ error: "No image" }, 400);
  if (image.length > 6_000_000) return json({ error: "Image too large" }, 413);

  // Signed-in users only (the platform JWT check also accepts the anon key).
  const asCaller = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_ANON_KEY")!, { global: { headers: { Authorization: req.headers.get("Authorization") ?? "" } } });
  const { data: { user } } = await asCaller.auth.getUser();
  if (!user) return json({ error: "Unauthorized" }, 401);

  const model = Deno.env.get("OPENAI_VISION_MODEL") || "gpt-4.1-mini";
  const res = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
    signal: AbortSignal.timeout(40_000),
    body: JSON.stringify({
      model,
      temperature: 0,
      max_tokens: 600,
      response_format: { type: "json_schema", json_schema: { name: "nutrition_label", strict: true, schema: SCHEMA } },
      messages: [
        { role: "system", content: PROMPT },
        {
          role: "user",
          content: [
            { type: "text", text: body.hint ? `Read this nutrition label. Context from the user: ${body.hint.slice(0, 200)}` : "Read this nutrition label." },
            { type: "image_url", image_url: { url: `data:image/jpeg;base64,${image}`, detail: "high" } },
          ],
        },
      ],
    }),
  });
  if (!res.ok) {
    const detail = await res.text().catch(() => "");
    return json({ error: `The label reader is unavailable right now (${res.status}).`, detail: detail.slice(0, 300) }, 502);
  }
  const data = (await res.json()) as { choices?: { message?: { content?: string; refusal?: string } }[]; usage?: unknown };
  const content = data.choices?.[0]?.message?.content;
  if (!content) return json({ error: "The reader returned nothing usable." }, 502);
  let reading: Reading;
  try {
    reading = JSON.parse(content) as Reading;
  } catch {
    return json({ error: "The reader returned malformed data." }, 502);
  }
  return json({ reading, model, usage: data.usage ?? null });
});
