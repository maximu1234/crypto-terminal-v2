-- Облачная блокировка АлгоБота v3: только authenticated JWT и только свой user:<uuid>.
-- Запускай в Supabase SQL Editor после v2.

alter table public.algo_bot_lock enable row level security;

drop policy if exists "algo_bot_lock_select" on public.algo_bot_lock;
drop policy if exists "algo_bot_lock_insert" on public.algo_bot_lock;
drop policy if exists "algo_bot_lock_update" on public.algo_bot_lock;
drop policy if exists "algo_bot_lock_delete" on public.algo_bot_lock;

drop policy if exists "algo_bot_lock_select_own_key" on public.algo_bot_lock;
create policy "algo_bot_lock_select_own_key"
  on public.algo_bot_lock
  for select
  to authenticated
  using (
    lock_key ~ '^user:[0-9a-fA-F-]{36}$'
    and substring(lock_key from 6)::uuid = auth.uid()
  );

drop policy if exists "algo_bot_lock_insert_own_key" on public.algo_bot_lock;
create policy "algo_bot_lock_insert_own_key"
  on public.algo_bot_lock
  for insert
  to authenticated
  with check (
    lock_key ~ '^user:[0-9a-fA-F-]{36}$'
    and substring(lock_key from 6)::uuid = auth.uid()
  );

drop policy if exists "algo_bot_lock_update_own_key" on public.algo_bot_lock;
create policy "algo_bot_lock_update_own_key"
  on public.algo_bot_lock
  for update
  to authenticated
  using (
    lock_key ~ '^user:[0-9a-fA-F-]{36}$'
    and substring(lock_key from 6)::uuid = auth.uid()
  )
  with check (
    lock_key ~ '^user:[0-9a-fA-F-]{36}$'
    and substring(lock_key from 6)::uuid = auth.uid()
  );

drop policy if exists "algo_bot_lock_delete_own_key" on public.algo_bot_lock;
create policy "algo_bot_lock_delete_own_key"
  on public.algo_bot_lock
  for delete
  to authenticated
  using (
    lock_key ~ '^user:[0-9a-fA-F-]{36}$'
    and substring(lock_key from 6)::uuid = auth.uid()
  );

revoke all on public.algo_bot_lock from anon;
grant select, insert, update, delete on public.algo_bot_lock to authenticated;
