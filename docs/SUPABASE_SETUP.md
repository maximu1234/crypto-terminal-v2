# Supabase — синхронизация избранного и рисунков

**Избранное** (флаги), **рисунки** и **алерты в Telegram** (опционально) между устройствами после входа по email.

Подробный перенос с тестовой ветки на production: [PRODUCTION_DEPLOY.md](./PRODUCTION_DEPLOY.md).

## 1. SQL в Supabase

1. [supabase.com/dashboard](https://supabase.com/dashboard) → проект **ehygysphfsnluegeycjx**
2. **SQL Editor** → New query
3. Запускай по **блокам** из `supabase/schema.sql` (см. комментарии в файле)
4. Закрой **Table Editor** для `user_settings` перед Run, если был deadlock

Проверка: в `user_settings` есть колонки `drawings`, `drawings_updated_at`.

**Алерты + Telegram:** после блоков 1–3 выполни `supabase/migration-alerts-telegram.sql`. Worker: папка `alert-worker/`, деплой на Railway — см. `alert-worker/README.md`.

## 2. Вход по email

1. **Authentication** → **Providers** → **Email** — включён
2. **Confirm email** — выключить (удобнее magic link)
3. **URL Configuration**:
   - **Site URL** — **production**-URL сайта (не `127.0.0.1`), например `https://crypto-terminal-v2.vercel.app`
   - **Redirect URLs** — production, preview, localhost (см. `PRODUCTION_DEPLOY.md`)

## 3. Локально на Mac

```bash
cp js/supabase-env.example.js js/supabase-env.js
```

Вставь **Project URL** и **anon key** (Supabase → Settings → API).

```bash
./start.sh
```

На главной: шестерёнка → **Синхронизация** → email → **Войти**.

## 4. Vercel

**Settings** → **Environment Variables**:

| Name | Value | Environments |
|------|--------|----------------|
| `SUPABASE_URL` | `https://ehygysphfsnluegeycjx.supabase.co` | **Production** и Preview |
| `SUPABASE_ANON_KEY` | anon key | **Production** и Preview |

Build (`vercel.json`) создаёт `js/supabase-env.js` при деплое.

## 5. Realtime

Таблица `user_settings` в publication `supabase_realtime` (блок 3 в `schema.sql`).

**iPad / Safari:** в фоне WebSocket спит; на открытой вкладке — опрос ~10 с + при возврате в Safari.

## 6. Проверка

1. Войди на Mac и iPad **одним email**
2. Флаги и рисунки меняются на одном устройстве → появляются на другом (1–10 с)

Без входа — только localStorage, как раньше.
