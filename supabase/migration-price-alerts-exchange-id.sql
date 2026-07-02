-- Привязка алертов к бирже (bybit | bingx).
-- Выполнить в Supabase SQL Editor.

alter table public.price_alerts
  add column if not exists exchange_id text not null default 'bybit';

create index if not exists price_alerts_exchange_active_idx
  on public.price_alerts (user_id, exchange_id)
  where triggered_at is null and deleted_at is null;
