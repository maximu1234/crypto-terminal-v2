-- Флаги по бирже (как price_alerts), не JSON в user_settings.
-- Запускай в Supabase SQL Editor после schema.sql.

create table if not exists public.user_favorites (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  exchange_id text not null default 'bybit',
  symbol text not null,
  flag_group text not null check (flag_group in ('red', 'green', 'gray', 'blue')),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  unique (user_id, exchange_id, symbol)
);

create index if not exists user_favorites_active_idx
  on public.user_favorites (user_id, exchange_id)
  where deleted_at is null;

create index if not exists user_favorites_deleted_idx
  on public.user_favorites (user_id, deleted_at)
  where deleted_at is not null;

create or replace function public.user_favorites_set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists user_favorites_updated_at on public.user_favorites;

create trigger user_favorites_updated_at
  before update on public.user_favorites
  for each row
  execute function public.user_favorites_set_updated_at();

alter table public.user_favorites enable row level security;

create policy "user_favorites_select_own"
  on public.user_favorites for select
  using (auth.uid() = user_id);

create policy "user_favorites_insert_own"
  on public.user_favorites for insert
  with check (auth.uid() = user_id);

drop policy if exists "user_favorites_update_own" on public.user_favorites;

create policy "user_favorites_update_own"
  on public.user_favorites
  for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "user_favorites_delete_own"
  on public.user_favorites for delete
  using (auth.uid() = user_id);

grant select, insert, update, delete
  on public.user_favorites
  to authenticated;

grant select
  on public.user_favorites
  to anon;
