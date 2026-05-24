-- Запустите в Supabase SQL Editor, если алерты не пишутся (RLS/права).
-- Проект: ehygysphfsnluegeycjx (crypto-terminal-dev)

-- UPDATE при upsert требует WITH CHECK (PostgreSQL 15+ / Supabase)
drop policy if exists "price_alerts_update_own" on public.price_alerts;

create policy "price_alerts_update_own"
  on public.price_alerts
  for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

grant select, insert, update, delete
  on public.price_alerts
  to authenticated;

grant select
  on public.price_alerts
  to anon;
