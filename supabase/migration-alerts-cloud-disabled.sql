-- Флаг «облачные алерты выключены» (секретные настройки /system).
-- Worker на Railway не шлёт Telegram, если alerts_cloud_disabled = true.

alter table public.user_settings
  add column if not exists alerts_cloud_disabled boolean not null default false;
