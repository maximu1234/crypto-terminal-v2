-- LWW для переноса цены алерта между устройствами (опционально)
alter table public.price_alerts
  add column if not exists updated_at timestamptz not null default now();

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
