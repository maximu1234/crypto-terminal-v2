-- Realtime: история алертов на странице «Алерты» на всех устройствах.
-- Выполнить после migration-price-alert-events.sql.

alter publication supabase_realtime add table public.price_alert_events;

alter table public.price_alert_events replica identity full;
