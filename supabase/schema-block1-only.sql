-- БЛОК 1 — таблица, колонки рисунков, RLS включён сразу

create table if not exists public.user_settings (
  user_id uuid primary key references auth.users (id) on delete cascade,
  favorites text[] not null default '{}',
  updated_at timestamptz not null default now(),
  drawings jsonb not null default '{}'::jsonb,
  drawings_updated_at timestamptz not null default now()
);

alter table public.user_settings enable row level security;

alter table public.user_settings
  add column if not exists drawings jsonb not null default '{}'::jsonb;

alter table public.user_settings
  add column if not exists drawings_updated_at timestamptz not null default now();
