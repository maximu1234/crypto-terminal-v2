-- Realtime: браузер узнаёт, что worker удалил сработавший алерт.
-- Выполнить в Supabase SQL Editor (проект crypto-terminal-dev).

alter publication supabase_realtime add table public.price_alerts;

-- DELETE в realtime отдаёт symbol/shape_id (иначе payload.old пустой).
alter table public.price_alerts replica identity full;
