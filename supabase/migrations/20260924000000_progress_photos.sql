-- Progress photos: the image bytes live in a private Storage bucket under the user's own folder
-- (`<user_id>/<photo_id>.jpg`); the metadata (category, date, note) is a synced `user_state` store
-- so a new phone lists the photos and downloads them on demand.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('progress-photos', 'progress-photos', false, 5242880, array['image/jpeg'])
on conflict (id) do nothing;

-- Own-folder access only. storage.foldername(name)[1] is the first path segment = the user id.
create policy "progress-photos: read own" on storage.objects
  for select to authenticated
  using (bucket_id = 'progress-photos' and (storage.foldername(name))[1] = (select auth.uid())::text);

create policy "progress-photos: upload own" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'progress-photos' and (storage.foldername(name))[1] = (select auth.uid())::text);

create policy "progress-photos: update own" on storage.objects
  for update to authenticated
  using (bucket_id = 'progress-photos' and (storage.foldername(name))[1] = (select auth.uid())::text)
  with check (bucket_id = 'progress-photos' and (storage.foldername(name))[1] = (select auth.uid())::text);

create policy "progress-photos: delete own" on storage.objects
  for delete to authenticated
  using (bucket_id = 'progress-photos' and (storage.foldername(name))[1] = (select auth.uid())::text);

-- The synced metadata store.
alter table public.user_state drop constraint if exists user_state_store_check;
alter table public.user_state
  add constraint user_state_store_check
  check (store in ('schedule', 'health', 'chat', 'preferences', 'saved', 'custom_compounds', 'nutrition', 'vials', 'photos'));
