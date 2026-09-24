-- Strict all-words search first; when nothing matches every word ("jasmine rice"), fall back to
-- any-word matching ranked by how many words hit, so people still land on "Rice, white, cooked"
-- instead of an empty screen.
create or replace function public.search_foods(q text, lim int default 30)
returns setof public.foods
language plpgsql
stable
security invoker
set search_path = ''
as $$
declare
  raw text := lower(trim(q));
  strict_q tsquery;
  loose_q tsquery;
  n int;
begin
  if raw = '' then return; end if;
  strict_q := websearch_to_tsquery('simple', raw);
  -- "a b c" → "a or b or c"
  loose_q := websearch_to_tsquery('simple', array_to_string(regexp_split_to_array(raw, '\s+'), ' or '));

  -- Word matches outrank look-alikes: "Wine, rice" is a trigram neighbour of "jasmine rice", but
  -- "White rice, cooked" (tagged jasmine) actually contains the words.
  return query
    select f.*
    from public.foods f
    where f.search @@ strict_q or extensions.similarity(f.name, raw) > 0.4 or f.name ilike '%' || raw || '%'
    order by
      (case when lower(f.name) = raw then 3 else 0 end)
        + (case when lower(f.name) like raw || '%' then 2 else 0 end)
        + (case when f.search @@ strict_q then 1.5 else 0 end)
        + ts_rank(f.search, strict_q)
        + extensions.similarity(f.name, raw)
        + f.popularity / 1000.0
        + (case when f.verified then 0.05 else 0 end) desc,
      f.name
    limit greatest(1, least(lim, 100));
  get diagnostics n = row_count;
  if n > 0 then return; end if;

  return query
    select f.*
    from public.foods f
    where f.search @@ loose_q
    order by
      ts_rank(f.search, loose_q) + f.popularity / 1000.0 + (case when f.verified then 0.05 else 0 end) desc,
      length(f.name),
      f.name
    limit greatest(1, least(lim, 100));
end;
$$;
