-- Разрешить пользователю удалять свою историю price_alert_events (очистка мусора в настройках).
-- Выполнить в Supabase SQL Editor после migration-price-alert-events.sql.

drop policy if exists "price_alert_events_delete_own"
  on public.price_alert_events;

create policy "price_alert_events_delete_own"
  on public.price_alert_events
  for delete
  using (auth.uid() = user_id);

grant delete on public.price_alert_events to authenticated;
