-- Первый запуск в Supabase: SQL Editor → New query → Run
-- Предупреждение "destructive" не должно появляться (нет DROP).

create table if not exists public.user_settings (
  user_id uuid primary key references auth.users (id) on delete cascade,
  favorites text[] not null default '{}',
  updated_at timestamptz not null default now()
);

alter table public.user_settings enable row level security;

create policy "user_settings_select_own"
  on public.user_settings for select
  using (auth.uid() = user_id);

create policy "user_settings_insert_own"
  on public.user_settings for insert
  with check (auth.uid() = user_id);

create policy "user_settings_update_own"
  on public.user_settings for update
  using (auth.uid() = user_id);

-- Authentication → Providers → Email: включён
-- Authentication → URL Configuration: redirect http://127.0.0.1:8080/**
