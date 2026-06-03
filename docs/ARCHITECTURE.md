# Архитектура Multichart (после рефакторинга 2026-06)

## Spine

`site-boot.js` — алерты, cloud, auth, mobile nav, lazy sync модулей.

`js/page-routes.js` — единое определение страницы (`isAlertsPage`, `isCoinsPage`, …).

`js/asset-manifest.js` + `scripts/sync-asset-versions.cjs` — версии `?v=`.

## Модули (facade → подмодули)

| Facade | Подмодули |
|--------|-----------|
| `alerts-cloud-sync.js` | монолит в проде; `alerts-cloud/*` — prep, **не wired** (см. README там) |
| `drawings-cloud-sync.js` | ✅ barrel → `drawings-cloud/{sync-lifecycle,worker-client,pull-reconcile}.js` |
| `chart.js` | `chart/{chart-options,chart-dom-crosshair,chart-factory}.js` |
| `terminal.js` | `terminal/{coins-state,coins-prefs,coins-table}.js` |
| `drawings.js` | `drawings/{init,fib-spec,draw-hit,draw-render,…}.js`; tablet input wired |

## Performance

- `ticker-update-batch.js` — rAF coalesce ticker UI (screener + coins table)
- `device-pull-gate.js` — один debounced `pullDeviceStateFromCloud` на login
- `cloud-sync-throttle.js` — pull coalescer для Yandex

## Shared infra

- `shared/bybit-api-bases.json` — базы Bybit для Vercel `api/bybit.js` и `alert-worker`
- `js/telegram-bot-public.js` — username бота (auth-ui, alerts-page)
- `js/types/chart-types.js` — JSDoc typedefs

## CI

`.github/workflows/ci.yml` — syntax, manifest check, site-nav check, unit tests.

```bash
npm run check:all
```

Регрессия рисования (ручная): [DRAWINGS_REGRESSION.md](./DRAWINGS_REGRESSION.md)  
План refactor: [REFACTOR_DRAWINGS.md](./REFACTOR_DRAWINGS.md)

## Откат

**Текущий эталон:** `metka-12` — [MARKER_12.md](./MARKER_12.md) (рабочая версия, июнь 2026).
