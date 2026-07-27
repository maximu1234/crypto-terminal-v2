-- Облачная блокировка АлгоБота v2: один запуск на хеш алго API-ключа.
-- Без логина Multichart. Capability = знание SHA-256(exchange:net:apiKey).
-- Запускай в Supabase SQL Editor (заменяет v1 по user_id).

drop table if exists public.algo_bot_lock;

create table public.algo_bot_lock (
  lock_key text primary key,
  locked boolean not null default false,
  instance_id text,
  app_name text,
  locked_at timestamptz
);

alter table public.algo_bot_lock enable row level security;

drop policy if exists "algo_bot_lock_select" on public.algo_bot_lock;
create policy "algo_bot_lock_select"
  on public.algo_bot_lock for select
  using (true);

drop policy if exists "algo_bot_lock_insert" on public.algo_bot_lock;
create policy "algo_bot_lock_insert"
  on public.algo_bot_lock for insert
  with check (true);

drop policy if exists "algo_bot_lock_update" on public.algo_bot_lock;
create policy "algo_bot_lock_update"
  on public.algo_bot_lock for update
  using (true)
  with check (true);

drop policy if exists "algo_bot_lock_delete" on public.algo_bot_lock;
create policy "algo_bot_lock_delete"
  on public.algo_bot_lock for delete
  using (true);

grant select, insert, update, delete on public.algo_bot_lock to anon;
grant select, insert, update, delete on public.algo_bot_lock to authenticated;
