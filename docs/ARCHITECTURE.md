# Архитектура Multichart (после рефакторинга 2026-06)

## Spine

`site-boot.js` — алерты, cloud, auth, lazy sync модулей.

`js/page-routes.js` — единое определение страницы (`isAlertsPage`, `isTerminalPage`, …).

## Имена страниц (не путать)

| URL | HTML | JS entry |
|-----|------|----------|
| `/terminal.html` | Монеты | `terminal-entry.js` → `terminal.js` |
| `/terminal.html` | Терминал (виджеты) | `watchlist.js` |
| `/` | Главная (screener) | `screener.js` |

`terminal.js` — **legacy** имя для страницы Монеты; не связано с `terminal.html`.

`js/asset-manifest.js` + `scripts/sync-asset-versions.cjs` — версии `?v=`.

Desktop: `npm run bundle:sync` после правок web-статики; `npm run bundle:check` в CI.

## Модули (facade → подмодули)

| Facade | Подмодули |
|--------|-----------|
| `alerts-cloud-sync.js` | ✅ barrel → `alerts-cloud/{debug,worker-client,telegram-id,registry-sync,polling-realtime}.js` |
| `chart.js` | `chart/{chart-options,chart-dom-crosshair,chart-factory}.js` |
| `terminal.js` | `terminal/{coins-state,coins-prefs,coins-table,coins-chart-*}.js`; entry alias `terminal-entry.js` |
| `drawings.js` | `drawings/{init, persist, style-bar, placement, edit-interaction, chart-input, redraw-loop, price-scale, draw-hit, draw-render, …}.js` |

## Performance

- `ticker-update-batch.js` — rAF coalesce ticker UI (screener + coins table)
- `device-pull-gate.js` — один debounced `pullDeviceStateFromCloud` на login
- `cloud-sync-throttle.js` — pull coalescer для Yandex

## Shared infra

- `shared/bybit-api-bases.json` — базы Bybit для Vercel `api/bybit.js` и `alert-worker`
- `js/telegram-bot-public.js` — username бота (auth-ui, alerts-page)
- `js/types/chart-types.js` — JSDoc typedefs

## CI

`.github/workflows/ci.yml` — syntax, manifest check, **desktop bundle check**, site-nav check, unit tests.

```bash
npm run check:all
```

Регрессия рисования (ручная): [DRAWINGS_REGRESSION.md](./DRAWINGS_REGRESSION.md)  
План refactor: [REFACTOR_DRAWINGS.md](./REFACTOR_DRAWINGS.md)

## Откат

**Текущий эталон:** `metka-163` / desktop `1.1.62` — [MARKER_163.md](./MARKER_163.md), `js/release-marker.js`. Desktop .app: [DESKTOP_APP.md](./DESKTOP_APP.md).
