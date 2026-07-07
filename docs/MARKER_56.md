# Метка 56 — Alerts sync hardening, admin controls, UI fixes (июль 2026)

**Тег:** `metka-56` · **Веб:** `v0.56` · **Desktop:** `v1.0.49`

**Предыдущий эталон:** [MARKER_55.md](./MARKER_55.md) (`metka-55` / `desktop-v1.0.48`).

## Зачем

Усилить надежность облачных алертов и дать администратору контроль над worker: ручной reload, canary, health, purge мусора в Supabase и настраиваемый safety-период проверки.

## Что изменено

| Компонент | Описание |
|-----------|----------|
| Alert worker | Admin endpoints: период reload, `reload-now`, canary, расширенный `/health` |
| Sync модель | Мгновенный подхват после `push/delete` + редкий safety-reload |
| Persistence | Настройка интервала сохраняется в `system_settings` |
| Secret settings | Разделы purge алертов, reload period, health/reload/canary controls |
| Script page | Фикс таймера фонового сканирования без самосброса |
| Terminal UI | Фиксы focus-outline и маскирование PnL/объема |
| Layout header | Порядок в шапке: меню → шестеренка → layout picker |

## Ключевые файлы

| Область | Файлы |
|---------|--------|
| Worker reload/admin | `alert-worker/index.js`, `alert-worker/lib/client-api.js`, `alert-worker/lib/reload-interval.js` |
| Worker reload hooks | `alert-worker/lib/reload-request.js`, `alert-worker/lib/supabase-rest.js` |
| Secret settings UI | `js/app-settings-secret.js`, `js/system-admin-worker-reload-ms.js`, `js/system-admin-page.js`, `system/index.html` |
| Purge | `js/alerts-cloud/garbage-purge.js`, `js/system-admin-alerts-purge.js` |
| SQL | `supabase/migration-worker-reload-settings.sql`, `supabase/migration-price-alert-events-delete-own.sql` |
| Release marker | `js/release-marker.js`, `desktop/package.json` |

## Откат

```bash
git checkout metka-56
```
