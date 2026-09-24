-- Cloud copy of every on-device store (protocols + dose logs, health entries, chat, preferences,
-- saved peptides, custom compounds). One JSON document per user per store, mirroring the local
-- AsyncStorage shape, so a reinstall or a new phone restores everything after sign-in.
create table if not exists public.user_state (
  user_id uuid not null references auth.users (id) on delete cascade,
  store text not null check (store in ('schedule', 'health', 'chat', 'preferences', 'saved', 'custom_compounds')),
  data jsonb not null default '{}'::jsonb,
  -- Set by the device when it last changed the document; drives last-writer-wins on merge.
  changed_at timestamptz not null,
  updated_at timestamptz not null default now(),
  primary key (user_id, store)
);

comment on table public.user_state is 'Per-user, per-store JSON documents mirrored from the app''s local stores.';

drop trigger if exists user_state_set_updated_at on public.user_state;
create trigger user_state_set_updated_at
  before update on public.user_state
  for each row execute function public.set_updated_at();

alter table public.user_state enable row level security;

create policy "user_state: read own" on public.user_state
  for select to authenticated
  using ((select auth.uid()) = user_id);

create policy "user_state: insert own" on public.user_state
  for insert to authenticated
  with check ((select auth.uid()) = user_id);

create policy "user_state: update own" on public.user_state
  for update to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

create policy "user_state: delete own" on public.user_state
  for delete to authenticated
  using ((select auth.uid()) = user_id);
