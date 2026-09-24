-- Which upstream searches the food-search Edge Function has already run. The function uses it to
-- (1) skip a USDA / Open Food Facts call when the same query was fetched recently — the products
-- are already in `foods` — and (2) stay under the USDA API's hourly quota. Service-role only:
-- RLS is on with no policies, so the Data API exposes nothing to app users.
create table if not exists public.food_search_log (
  q text not null,
  source text not null check (source in ('usda', 'off')),
  results int not null default 0,
  fetched_at timestamptz not null default now(),
  primary key (q, source)
);

comment on table public.food_search_log is 'Upstream food searches already performed (query cache + quota accounting for the food-search function).';

create index if not exists food_search_log_fetched_idx on public.food_search_log (source, fetched_at desc);

alter table public.food_search_log enable row level security;
