-- Align price_alerts sync model with user_drawings:
-- soft delete via deleted_at + deterministic updated_at.

alter table public.price_alerts
  add column if not exists updated_at timestamptz not null default now(),
  add column if not exists deleted_at timestamptz;

create or replace function public.price_alerts_set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists price_alerts_updated_at on public.price_alerts;

create trigger price_alerts_updated_at
  before update on public.price_alerts
  for each row
  execute function public.price_alerts_set_updated_at();

create index if not exists price_alerts_active_sync_idx
  on public.price_alerts (user_id, symbol, shape_id, updated_at)
  where triggered_at is null and deleted_at is null;

create index if not exists price_alerts_deleted_idx
  on public.price_alerts (user_id, deleted_at)
  where deleted_at is not null;
