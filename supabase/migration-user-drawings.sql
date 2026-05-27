-- Рисунки по строкам (как price_alerts), не JSON в user_settings.
-- Запускай в Supabase SQL Editor после schema.sql.

create table if not exists public.user_drawings (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  symbol text not null,
  shape_id text not null,
  shape jsonb not null,
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  unique (user_id, symbol, shape_id)
);

create index if not exists user_drawings_active_idx
  on public.user_drawings (user_id, symbol)
  where deleted_at is null;

alter table public.user_drawings enable row level security;

create policy "user_drawings_select_own"
  on public.user_drawings for select
  using (auth.uid() = user_id);

create policy "user_drawings_insert_own"
  on public.user_drawings for insert
  with check (auth.uid() = user_id);

create policy "user_drawings_update_own"
  on public.user_drawings for update
  using (auth.uid() = user_id);

create policy "user_drawings_delete_own"
  on public.user_drawings for delete
  using (auth.uid() = user_id);
