-- Nutrition (meals + water) and vial inventory join the synced stores.
alter table public.user_state drop constraint if exists user_state_store_check;
alter table public.user_state
  add constraint user_state_store_check
  check (store in ('schedule', 'health', 'chat', 'preferences', 'saved', 'custom_compounds', 'nutrition', 'vials'));
