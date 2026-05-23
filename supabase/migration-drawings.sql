-- Если user_settings уже создана (избранное), выполни один раз в SQL Editor:

alter table public.user_settings
  add column if not exists drawings jsonb not null default '{}'::jsonb,
  add column if not exists drawings_updated_at timestamptz not null default now();
