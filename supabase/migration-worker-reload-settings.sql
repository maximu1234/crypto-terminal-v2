-- Глобальные системные настройки для worker (service role).
-- Используется для persistence периода ALERTS_RELOAD_MS между рестартами Railway.

create table if not exists public.system_settings (
  key text primary key,
  value jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

create or replace function public.system_settings_set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists system_settings_updated_at on public.system_settings;

create trigger system_settings_updated_at
  before update on public.system_settings
  for each row
  execute function public.system_settings_set_updated_at();
