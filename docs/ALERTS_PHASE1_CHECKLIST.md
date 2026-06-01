# Алерты — фаза 1 (стабильная запись и trigger)

UI «+» на графике **пока не включён** (блок в `terminal.js` закомментирован). Сначала проверяем облако и worker.

## Шаг 1. Supabase SQL (один раз)

В [Supabase SQL Editor](https://supabase.com/dashboard) выполните **по порядку**:

1. `supabase/migration-price-alert-events.sql` — таблица истории
2. `supabase/migration-price-alert-events-realtime.sql` — Realtime для истории

Убедитесь, что раньше уже выполнены:

- `migration-alerts-telegram.sql`
- `migration-price-alerts-realtime.sql`
- при необходимости `migration-price-alerts-soft-delete.sql`

## Шаг 2. Railway — alert-worker

1. Откройте проект **alert-worker** на Railway.
2. **Deploy** последней версии кода (папка `alert-worker/` из репозитория).
3. Проверьте переменные:
   - `SUPABASE_URL`
   - `SUPABASE_SERVICE_ROLE_KEY` — **Legacy JWT** (`eyJ…`), не `sb_secret_`
   - `TELEGRAM_BOT_TOKEN`
4. В логах после деплоя не должно быть постоянных `worker_not_ready`.

## Шаг 3. Сайт — `js/supabase-env.js`

В `js/supabase-env.js` (локально и на Vercel через build) должны быть:

- `SUPABASE_URL`, `SUPABASE_ANON_KEY`
- `ALERT_WORKER_URL` — публичный URL Railway **без** слэша в конце, например `https://….up.railway.app`

На **Vercel** → Environment Variables → Production (+ Preview при необходимости).

## Шаг 4. Деплой фронта

```bash
git add -A
git commit -m "Alerts phase 1: worker-only push path, history table, no browser purge"
git push origin main
```

После деплоя: **Cmd+Shift+R** на production.

## Шаг 5. Вход и Telegram

1. Откройте сайт → шестерёнка → войдите по email.
2. Страница **Алерты** → подключите **Telegram Chat ID** (бот → Start → число в поле → Сохранить).

Без Chat ID новые алерты через «+» не создаются (после включения UI).

## Шаг 6. Тест без «+» (через Supabase)

Пока «+» выключен, проверка записи вручную:

1. Supabase → **Table Editor** → `price_alerts` → **Insert row**:
   - `user_id` — ваш UUID из Authentication → Users
   - `symbol` — `BTCUSDT`
   - `shape_id` — `test_pa_1`
   - `price` — уровень рядом с рынком
   - `tf` — `60`
2. На **втором устройстве** (iPad) с тем же аккаунтом: откройте `/coins` BTCUSDT — жёлтая линия должна появиться после Realtime (может понадобиться 1–2 с).
3. Дождитесь пересечения цены **или** удалите строку в Table Editor — линия должна исчезнуть на обоих устройствах.

## Шаг 7. Тест trigger (главный)

1. Создайте **два** алерта в Table Editor (`test_pa_1`, `test_pa_2`) на разных уровнях.
2. Дождитесь срабатывания или симулируйте движение цены.
3. Ожидаемо:
   - звук/toast на открытой вкладке;
   - сообщение в **Telegram**;
   - строка исчезла из `price_alerts`;
   - появилась запись в `price_alert_events`;
   - на странице **Алерты** — в таблице «Исполненные» (и на втором устройстве после Realtime).

## Шаг 8. Консоль (если что-то не так)

Включите отладку:

```js
localStorage.setItem('ct_debug_alerts','1')
```

Перезагрузите страницу. Смотрите строки `[alerts]` и `worker /push-alert`.

Типичные проблемы:

| Симптом | Что проверить |
|---------|----------------|
| `worker /push-alert ОТКЛОНЁН` | `ALERT_WORKER_URL`, вход, Railway логи |
| Нет Telegram | Chat ID на «Алерты», `TELEGRAM_BOT_TOKEN` на Railway |
| Линия только на одном устройстве | Realtime `price_alerts`, вход одним email |
| История только локально | SQL шаг 1–2, worker задеплоен |

## Шаг 9. Фаза 2 (потом)

Когда шаги 6–7 стабильны — раскомментировать `mountPriceAlertUi` в `js/terminal.js` и проверить «+» на Mac и iPad.
