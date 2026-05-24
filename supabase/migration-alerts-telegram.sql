-- Алерты в облаке + Telegram (шаг 1)
-- Запускай в Supabase SQL Editor после schema.sql (блоки 1–3).

-- Telegram chat_id пользователя (из @userinfobot или getUpdates бота)
alter table public.user_settings
  add column if not exists telegram_chat_id bigint;

-- Активные алерты для worker (дублируют localStorage на клиенте)
create table if not exists public.price_alerts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  symbol text not null,
  shape_id text not null,
  price numeric not null,
  tf text not null default '60',
  created_at timestamptz not null default now(),
  triggered_at timestamptz,
  unique (user_id, symbol, shape_id)
);

create index if not exists price_alerts_active_idx
  on public.price_alerts (user_id, symbol)
  where triggered_at is null;

alter table public.price_alerts enable row level security;

-- Пользователь видит только свои алерты
create policy "price_alerts_select_own"
  on public.price_alerts for select
  using (auth.uid() = user_id);

create policy "price_alerts_insert_own"
  on public.price_alerts for insert
  with check (auth.uid() = user_id);

create policy "price_alerts_update_own"
  on public.price_alerts for update
  using (auth.uid() = user_id);

create policy "price_alerts_delete_own"
  on public.price_alerts for delete
  using (auth.uid() = user_id);

-- Обновить telegram_chat_id в своей строке user_settings
-- (select/update уже есть на user_settings для user_id = auth.uid())
