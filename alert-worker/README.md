# Alert Worker (Telegram)

Постоянный процесс: Bybit WebSocket → проверка алертов из Supabase → Telegram.

Браузерные алерты (звук/тост) при открытой вкладке:
- `POST /push-alert` — запись алерта в Supabase (service role)
- `POST /trigger` — Telegram + удаление после срабатывания

Нужен `ALERT_WORKER_URL` на Vercel в `js/supabase-env.js`. При закрытой вкладке срабатывает только worker по свечам Bybit.

## Railway (пустой дашборд)

1. **New Project** → **Deploy from GitHub repo** → `crypto-terminal-v2`.
2. Открой сервис → **Settings**:
   - **Root Directory**: `alert-worker`
3. **Variables** — на **этом же сервисе** (не только в Project Shared), с **значениями** (нажмите глаз, проверьте что не пусто):

| Variable | Пример |
|----------|--------|
| `SUPABASE_URL` | `https://xxxx.supabase.co` |
| `SUPABASE_ANON_KEY` | anon key (для `POST /trigger` из браузера) |
| `SUPABASE_SERVICE_ROLE_KEY` | длинный `service_role` ключ |
| `TELEGRAM_BOT_TOKEN` | от BotFather |

Без кавычек в значениях. **Chat ID сюда не нужен.**

После добавления/правки переменных: **Deployments** → **⋯** → **Redeploy** (обязательно, иначе контейнер старый).

4. **Deploy** → **Deploy Logs**: `env ok: …` и `alert-worker listening`.
5. **Networking** → domain → `/health` → `{"ok":true,"config":{"ready":true,...}}`.

Если `ok:false` и `missing:[...]` — переменные не попали в контейнер → Redeploy или проверьте значения (глаз).

## Supabase SQL

Выполни `supabase/migration-alerts-telegram.sql` в SQL Editor.

## Telegram chat_id

1. Напиши боту `/start`.
2. Открой `https://api.telegram.org/bot<TOKEN>/getUpdates` → `chat.id`.
3. На сайте **Алерты** → блок «Telegram» → вставь chat id (после входа в аккаунт).

## Если /health показывает alerts: 0, а SQL — 2

В Railway в `SUPABASE_SERVICE_ROLE_KEY` нужен **Legacy `service_role`** (начинается с **`eyJ`**), не `sb_publishable_` и не `sb_secret_`.

Supabase → Settings → API Keys → вкладка **Legacy anon, service_role API keys** → **service_role** → Reveal.

Проверка локально:

```bash
cd alert-worker
cp .env.example .env   # URL + legacy service_role
node scripts/check-supabase.mjs
```

После push в Git: Railway → Redeploy. В `/health` смотри:

- `config.jwtRole` — должно быть **`service_role`**. Если **`anon`** — в Railway вставлен не тот ключ (anon даёт `[]` без ошибки).
- `diag.activeInDb` — должно совпадать с SQL (2).

## Локально

```bash
cd alert-worker
cp .env.example .env   # заполни
npm install
npm start
```
