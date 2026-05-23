-- crypto-terminal-v2 — облачная синхронизация
-- Запускай по ОДНОМУ блоку (выдели блок → Run). Между блоками — Success.
-- Закрой вкладку Table Editor для user_settings перед запуском.

-- ═══════════════════════════════════════════════════════════════════════════
-- БЛОК 1 — таблица и колонки (обязательно)
-- ═══════════════════════════════════════════════════════════════════════════

create table if not exists public.user_settings (
  user_id uuid primary key references auth.users (id) on delete cascade,
  favorites text[] not null default '{}',
  updated_at timestamptz not null default now(),
  drawings jsonb not null default '{}'::jsonb,
  drawings_updated_at timestamptz not null default now()
);

alter table public.user_settings
  add column if not exists drawings jsonb not null default '{}'::jsonb;

alter table public.user_settings
  add column if not exists drawings_updated_at timestamptz not null default now();

alter table public.user_settings enable row level security;

-- ═══════════════════════════════════════════════════════════════════════════
-- БЛОК 2 — политики доступа (если уже входил в аккаунт раньше — можно пропустить)
-- При ошибке duplicate_object / policy already exists — пропусти блок 2.
-- ═══════════════════════════════════════════════════════════════════════════

create policy "user_settings_select_own"
  on public.user_settings for select
  using (auth.uid() = user_id);

create policy "user_settings_insert_own"
  on public.user_settings for insert
  with check (auth.uid() = user_id);

create policy "user_settings_update_own"
  on public.user_settings for update
  using (auth.uid() = user_id);

-- ═══════════════════════════════════════════════════════════════════════════
-- БЛОК 3 — Realtime (отдельно, после блока 1)
-- Ошибка «already member» — нормально, Realtime уже включён.
-- ═══════════════════════════════════════════════════════════════════════════

alter publication supabase_realtime add table public.user_settings;
