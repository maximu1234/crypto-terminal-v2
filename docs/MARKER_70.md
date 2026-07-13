# Метка 70 — рисунки локально, флаги по бирже, алерт deep-link (июль 2026)

**Тег:** `metka-70`

## Что вошло

### Рисунки — только локально

- Убрана синхронизация рисунков с Supabase / alert-worker.
- Рисование без входа; ключи `drawings_{exchange}_{symbol}` в localStorage.
- Удалены `drawings-cloud/*`, purge рисунков в админке, worker endpoints `/push-drawing`, `/delete-drawing`.

### Флаги — облако по бирже

- Новая таблица `user_favorites` (`exchange_id`, `symbol`, `flag_group`, soft-delete).
- Миграции: `supabase/migration-user-favorites.sql`, опционально realtime.
- `favorites-cloud-sync.js` — REST upsert/push per active exchange (как `price_alerts`).
- Per-exchange sync state в localStorage; fallback на legacy `user_settings.favorites`.

### Алерты — deep link и биржа

- URL алерта: `/terminal.html?symbol=…&tf=…&exchange=bybit|bingx`.
- При несовпадении активной биржи — диалог «Переключиться на биржу …?» (Да/Нет).
- Telegram worker: `exchange` в ссылке графика.
- Тесты: `tests/alert-deep-link-exchange.test.mjs`.

### Торговля (desktop)

- RO-ордера на графике: стандартные красный/зелёный + метка `(RO)` (без оранжевого).

### Админ / секретные настройки

- Убраны серые неактивные чекбоксы Supabase prefs (BANDWIDTH-CUT зафиксирован в коде).
- Активен только переключатель «Отключить облачные алерты (Telegram)».

### Фиксы

- `terminal-state.js` — единая версия импорта (пустой список монет).
- `alert-deep-link-url.js` — корректный путь из `terminal-prefs.js`.

## Версии

- Web marker: `v0.70`
- Desktop app: `v1.0.64` (Mac + Win: `desktop-v1.0.64`, `desktop-win-v1.0.64`)

## SQL (Supabase)

Выполнить в SQL Editor: `migration-user-favorites.sql` (перед облачной синхронизацией флагов).
