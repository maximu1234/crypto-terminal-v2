-- Algo bot alert source (manual mode price alerts)
-- Run in Supabase SQL Editor after migration-alerts-telegram.sql

alter table public.price_alerts
  add column if not exists source text;

create index if not exists price_alerts_source_idx
  on public.price_alerts (user_id, source)
  where source is not null and triggered_at is null;
