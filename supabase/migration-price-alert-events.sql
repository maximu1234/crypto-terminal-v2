-- История сработавших алертов (синхронизация Mac / iPad / телефон).
-- Выполнить в Supabase SQL Editor после migration-alerts-telegram.sql.

create table if not exists public.price_alert_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  symbol text not null,
  shape_id text not null,
  price numeric not null,
  trigger_price numeric,
  tf text not null default '60',
  triggered_at timestamptz not null default now()
);

create index if not exists price_alert_events_user_time_idx
  on public.price_alert_events (user_id, triggered_at desc);

alter table public.price_alert_events enable row level security;

drop policy if exists "price_alert_events_select_own"
  on public.price_alert_events;

create policy "price_alert_events_select_own"
  on public.price_alert_events
  for select
  using (auth.uid() = user_id);

-- INSERT только через service role (Railway worker), не из браузера.

grant select on public.price_alert_events to authenticated;
