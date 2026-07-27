-- SUPERSEDED by migration-algo-bot-lock-v2.sql (lock_key = SHA-256 of algo API key).
-- Облачная блокировка АлгоБота: один запуск на аккаунт.
-- Запускай в Supabase SQL Editor.

create table if not exists public.algo_bot_lock (
  user_id uuid primary key references auth.users (id) on delete cascade,
  locked boolean not null default false,
  instance_id text,
  app_name text,
  locked_at timestamptz
);

alter table public.algo_bot_lock enable row level security;

drop policy if exists "algo_bot_lock_select_own" on public.algo_bot_lock;
create policy "algo_bot_lock_select_own"
  on public.algo_bot_lock for select
  using (auth.uid() = user_id);

drop policy if exists "algo_bot_lock_insert_own" on public.algo_bot_lock;
create policy "algo_bot_lock_insert_own"
  on public.algo_bot_lock for insert
  with check (auth.uid() = user_id);

drop policy if exists "algo_bot_lock_update_own" on public.algo_bot_lock;
create policy "algo_bot_lock_update_own"
  on public.algo_bot_lock for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "algo_bot_lock_delete_own" on public.algo_bot_lock;
create policy "algo_bot_lock_delete_own"
  on public.algo_bot_lock for delete
  using (auth.uid() = user_id);

grant select, insert, update, delete on public.algo_bot_lock to authenticated;
