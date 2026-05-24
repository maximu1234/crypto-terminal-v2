# Alert Worker (Telegram)

Постоянный процесс: Bybit WebSocket → проверка алертов из Supabase → Telegram.

Браузерные алерты (звук/тост) **не заменяет** — только дополнение при привязанном Telegram.

## Railway (пустой дашборд)

1. **New Project** → **Deploy from GitHub repo** → `crypto-terminal-v2`.
2. Открой сервис → **Settings**:
   - **Root Directory**: `alert-worker`
3. **Variables** (обязательно):

| Variable | Где взять |
|----------|-----------|
| `SUPABASE_URL` | Supabase → Settings → API → Project URL |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase → API → `service_role` (секрет, не anon) |
| `TELEGRAM_BOT_TOKEN` | BotFather |
| `PORT` | `8080` (Railway часто подставляет сам — можно не задавать) |

4. **Deploy** → **Logs**: `bybit ws connected` и `alert-worker listening`.
5. Если **Build failed** — открой **Build Logs**; после push с `Dockerfile` сборка идёт через Docker.

6. **Settings → Networking → Generate Domain** → `https://….up.railway.app/health` → `{"ok":true,...}`.

## Supabase SQL

Выполни `supabase/migration-alerts-telegram.sql` в SQL Editor.

## Telegram chat_id

1. Напиши боту `/start`.
2. Открой `https://api.telegram.org/bot<TOKEN>/getUpdates` → `chat.id`.
3. На сайте **Алерты** → блок «Telegram» → вставь chat id (после входа в аккаунт).

## Локально

```bash
cd alert-worker
cp .env.example .env   # заполни
npm install
npm start
```
