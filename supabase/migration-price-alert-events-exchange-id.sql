-- Биржа сработавшего алерта (bybit | bingx) для истории closed-app → hydrate.
-- Выполнить в Supabase SQL Editor после migration-price-alert-events.sql.

alter table public.price_alert_events
  add column if not exists exchange_id text not null default 'bybit';

create index if not exists price_alert_events_user_exchange_time_idx
  on public.price_alert_events (user_id, exchange_id, triggered_at desc);
