-- The food library: one normalised row per food, per 100 g. Sources: USDA FoodData Central (public
-- domain), Open Food Facts (ODbL — attribute in the UI), and our curated tier. World-readable,
-- written only by ingest scripts / Edge Functions with the service role.
create extension if not exists pg_trgm with schema extensions;

create table if not exists public.foods (
  id text primary key,                                  -- 'usda:173687' | 'off:3017620422003'
  source text not null check (source in ('usda', 'off', 'curated')),
  external_id text,
  name text not null,
  brand text,
  description text,                                     -- the source's full description
  category text not null default 'other',
  kcal numeric not null,
  protein numeric not null default 0,
  carbs numeric not null default 0,
  fat numeric not null default 0,
  fiber numeric,
  sugar numeric,
  sodium_mg numeric,
  sat_fat numeric,
  servings jsonb not null default '[]'::jsonb,          -- [{ "label": "1 cup", "grams": 244 }]
  barcode text,
  image_url text,
  tags text[] not null default '{}',
  popularity int not null default 0,
  verified boolean not null default false,
  -- array_to_string is only STABLE, so tags join the vector through array_to_tsvector (immutable).
  search tsvector generated always as (
    to_tsvector('simple', coalesce(name, '') || ' ' || coalesce(brand, '') || ' ' || coalesce(description, '')) || array_to_tsvector(tags)
  ) stored,
  updated_at timestamptz not null default now()
);

comment on table public.foods is 'Food library, macros per 100 g. USDA (public domain) + Open Food Facts (ODbL) + curated.';

create index if not exists foods_search_idx on public.foods using gin (search);
create index if not exists foods_name_trgm_idx on public.foods using gin (name extensions.gin_trgm_ops);
create index if not exists foods_barcode_idx on public.foods (barcode) where barcode is not null;
create index if not exists foods_category_popularity_idx on public.foods (category, popularity desc);

drop trigger if exists foods_set_updated_at on public.foods;
create trigger foods_set_updated_at
  before update on public.foods
  for each row execute function public.set_updated_at();

alter table public.foods enable row level security;

create policy "foods: read" on public.foods
  for select to anon, authenticated
  using (true);

-- Ranked search: full-text hits first, then fuzzy name matches for typos, popularity as a tiebreak.
create or replace function public.search_foods(q text, lim int default 30)
returns setof public.foods
language sql
stable
security invoker
set search_path = ''
as $$
  with query as (
    select
      websearch_to_tsquery('simple', q) as tsq,
      lower(trim(q)) as raw
  )
  select f.*
  from public.foods f, query
  -- search_path is empty, so the pg_trgm operator is named explicitly.
  where (query.raw <> '' and (f.search @@ query.tsq or f.name operator(extensions.%) query.raw or f.name ilike '%' || query.raw || '%'))
  order by
    (case when lower(f.name) = query.raw then 3 else 0 end)
      + (case when lower(f.name) like query.raw || '%' then 2 else 0 end)
      + ts_rank(f.search, query.tsq)
      + extensions.similarity(f.name, query.raw)
      + f.popularity / 1000.0
      + (case when f.verified then 0.05 else 0 end) desc,
    f.name
  limit greatest(1, least(lim, 100));
$$;

revoke all on function public.search_foods(text, int) from public;
grant execute on function public.search_foods(text, int) to anon, authenticated;
