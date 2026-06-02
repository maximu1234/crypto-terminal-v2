# Метка 10 — стабильная сборка (июнь 2026)

> **Superseded by [MARKER_11.md](./MARKER_11.md)** (`metka-11`) — текущий prod-эталон.

**Тег:** `metka-10` · **Коммит:** `git rev-parse metka-10`

**Эталон после фазы 3 refactor.** Наследует [MARKER_9.md](./MARKER_9.md).

Проверено на **desktop**: `/coins`, `/terminal`, screener — без ошибок в консоли; cloud sync рисунков (pull/push/realtime) работает локально.

**iPad / push:** не проверялись на момент метки — см. чеклист ниже перед продом.

## Что добавлено после metka-9

### Refactor фаза 3 — split `drawings-cloud-sync.js`
- `drawings-cloud-sync.js` — тонкий barrel → `drawings-cloud/`
- `sync-lifecycle.js` — init, realtime, poll, sync meta, chart refresh
- `worker-client.js` — push/delete через worker + REST
- `pull-reconcile.js` — reconcile, pull из Supabase
- Исправления wiring после split (экспорты, `drawingsPushTimer`, throttled warn при 0 rows)

### Fix — preview при рисовании (desktop, metka-9 carry-over)
- Импорт `hideDomChartCrosshair` в `drawings/init.js`

### Версии ассетов (drawings)
- `drawings-cloud-sync.js?v=41`
- `drawings-cloud/sync-lifecycle.js?v=6`, `worker-client.js?v=6`, `pull-reconcile.js?v=5`
- `drawings-storage.js?v=7`, `drawings/init.js?v=28`

## Аудит (2026-06-01)

| Проверка | Результат |
|----------|-----------|
| `npm run check:all` | OK |
| Рисунки: create / preview / delete (desktop) | OK |
| Рисунки: cross-device (desktop ↔ iPad) | **не проверено** после split |
| Tablet: жесты рисования | без изменений (metka-9) |

## Перед push в прод

1. Push ветки, открыть терминал на iPad.
2. [DRAWINGS_REGRESSION.md](./DRAWINGS_REGRESSION.md) — create / delete / sync рисунков.
3. Алерты — после фазы 4 refactor.

## Следующий шаг refactor

**Фаза 4:** split `alerts-cloud-sync.js` — см. [REFACTOR_DRAWINGS.md](./REFACTOR_DRAWINGS.md).

## Откат

```bash
git fetch --tags
git checkout metka-10   # после фазы 3
git checkout metka-9    # до split drawings-cloud
git checkout metka-8    # до tablet wiring
```
