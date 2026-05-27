-- Realtime для user_drawings (как price_alerts).
alter publication supabase_realtime add table public.user_drawings;
alter table public.user_drawings replica identity full;
