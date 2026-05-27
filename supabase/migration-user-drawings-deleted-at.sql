-- Если таблица создана без deleted_at, upsert из приложения падал молча.
alter table public.user_drawings
  add column if not exists deleted_at timestamptz;

create index if not exists user_drawings_active_idx
  on public.user_drawings (user_id, symbol)
  where deleted_at is null;
