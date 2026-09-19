-- In-app feedback from Settings → Submit feedback. Users can add and read their own; nothing else.
create table if not exists public.feedback (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  message text not null check (char_length(message) between 1 and 4000),
  app_version text,
  created_at timestamptz not null default now()
);

create index if not exists feedback_user_id_idx on public.feedback (user_id);

alter table public.feedback enable row level security;

create policy "feedback: insert own" on public.feedback
  for insert to authenticated
  with check ((select auth.uid()) = user_id);

create policy "feedback: read own" on public.feedback
  for select to authenticated
  using ((select auth.uid()) = user_id);
