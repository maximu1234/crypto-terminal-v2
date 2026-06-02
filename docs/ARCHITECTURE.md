# Архитектура Multichart (после рефакторинга 2026-06)

## Spine

`site-boot.js` — алерты, cloud, auth, mobile nav, lazy sync модулей.

`js/page-routes.js` — единое определение страницы (`isAlertsPage`, `isCoinsPage`, …).

`js/asset-manifest.js` + `scripts/sync-asset-versions.cjs` — версии `?v=`.

## Модули (facade → подмодули)

| Facade | Подмодули |
|--------|-----------|
| `alerts-cloud-sync.js` | `alerts-cloud/{debug,telegram-id,worker-client,registry-sync,polling-realtime}.js` |
| `drawings-cloud-sync.js` | `drawings-cloud/{worker-client,pull-reconcile,sync-lifecycle}.js` |
| `chart.js` | `chart/{chart-options,chart-dom-crosshair,chart-factory}.js` |
| `terminal.js` | `terminal/{coins-state,coins-prefs,coins-table}.js` |
| `drawings.js` | `drawings/{init,draw-render,draw-hit,fib-spec,…}.js`, `drawings-tablet-input.js` |

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
node --test tests/*.test.mjs
node scripts/check-asset-manifest.cjs
node scripts/check-site-nav.cjs
```

## Откат

`metka-4` — см. [MARKER_4.md](./MARKER_4.md).
