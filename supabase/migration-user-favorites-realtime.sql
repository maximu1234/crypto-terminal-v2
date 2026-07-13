-- Realtime для user_favorites (как price_alerts).
alter publication supabase_realtime add table public.user_favorites;
alter table public.user_favorites replica identity full;
