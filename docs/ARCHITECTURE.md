# Архитектура Multichart (после рефакторинга 2026-06)

## Spine

`site-boot.js` — алерты, cloud, auth, lazy sync модулей.

`js/page-routes.js` — единое определение страницы (`isAlertsPage`, `isTerminalPage`, `isScriptPage`, `isAlgoTradingPage`, …).

## Имена страниц (не путать)

| URL | Страница | JS entry |
|-----|----------|----------|
| `/`, `/screener.html` | Скринер | `screener.js` (`index.html` редиректит сюда) |
| `/terminal.html` | Терминал | `terminal-page-boot.js` → `terminal-entry.js` → `terminal.js` |
| `/watchlist.html` | Вотчлист | `watchlist.js` |
| `/script.html` | Скрипт (pattern scan) | `script-page-boot.js` → `script-page.js` (тоггл в Системных) |
| `/algo-trading.html` | АлгоТрейдинг | `algo-trading-page-boot.js` / `algo-trading.js` (тоггл; live-бот только `.app`) |
| `/diary/index.html` | Дневник | `trade-diary-page.js` → `js/trade/{bybit\|bingx}/diary/*` |
| `/alerts/index.html` | Алерты | `alerts-page.js` |
| `/m-terminal.html`, `/m-screener.html` | Mobile lite | `js/mobile/*` |

`/coins` и `/trade` на сайте открывают Терминал (`vercel.json`). Файла `coins.html` нет.

`terminal.js` — реализация страницы Терминал. Виджеты Вотчлиста — `watchlist.js`.

`js/asset-manifest.js` + `scripts/sync-asset-versions.cjs` — версии `?v=`.

Desktop Multichart: `npm run bundle:sync` после правок web-статики; `npm run bundle:check` в CI.  
Algo Bot: `npm run bundle:bot` + `npm run bundle:bot:check` (lite fork; не wholesale Multichart overwrite).

## Продукты в репо

| Дерево | Роль |
|--------|------|
| корень (Vercel) | Сайт + `/api/*` |
| `desktop/` | Multichart Electron |
| `bot-app/` | Standalone Algo Bot (lite UI, algo keys only) |
| `alert-worker/` | Railway worker (triggers, Telegram, events) |

## Модули (facade → подмодули)

| Facade | Подмодули |
|--------|-----------|
| `alerts-cloud-sync.js` | ✅ barrel → `alerts-cloud/{debug,worker-client,telegram-id,registry-sync,polling-realtime,garbage-purge}.js` |
| `chart.js` | `chart/{chart-options,chart-dom-crosshair,chart-factory,…}.js` |
| `terminal.js` | `terminal/{terminal-coins-page,terminal-history,terminal-table,…}.js`; entry alias `terminal-entry.js` |
| `drawings.js` | `drawings/{init, persist, style-bar, placement, edit-interaction, chart-input, …}.js` |
| `js/trade-*.js` | тонкие facades → `js/trade/{bybit\|bingx}/**`; дневник: `page-render.js`, `trade-diary-chart-data.js`, `trade-diary-detail-view.js` |

## Performance

- `ticker-update-batch.js` — rAF coalesce ticker UI (screener + coins table)
- `device-pull-gate.js` — один debounced `pullDeviceStateFromCloud` на login
- `cloud-sync-throttle.js` — pull coalescer для Yandex

## Shared infra

- `shared/bybit-api-bases.json` — базы Bybit для Vercel `api/bybit.js` и `alert-worker`
- `js/telegram-bot-public.js` — username бота (auth-ui, alerts-page)
- `js/types/chart-types.js` — JSDoc typedefs

## CI

`.github/workflows/ci.yml` — syntax (без site-bundle), manifest check, **desktop + bot-lite bundle check**, site-nav, unit tests.

```bash
npm run check:all
```

Регрессия рисования (ручная): [DRAWINGS_REGRESSION.md](./DRAWINGS_REGRESSION.md)  
План refactor: [REFACTOR_DRAWINGS.md](./REFACTOR_DRAWINGS.md)  
Handoff: [HANDOFF.md](./HANDOFF.md)

## Известный долг (не баг-регресс)

- `terminal.js` и `drawings/init.js` — оркестраторы: логика уже в `terminal/*` и `drawings/*`, в файлах остались замыкания wiring/host.
- Pattern 1-2 оригинал заморожен; алго — только копии в `js/algo-trading/`.
- Algo Bot не содержит Terminal Bybit/BingX REST (`bot-app/trading/algo-*` + PnL Bybit).

## Откат

**Текущий релиз:** `metka-218` / веб `v0.218` / desktop `1.2.4` — [MARKER_218.md](./MARKER_218.md), `js/release-marker.js`. Desktop .app: [DESKTOP_APP.md](./DESKTOP_APP.md).

Откат perf chrome/chart по-прежнему **`metka-181`** — не удалять, см. [PERF_CHROME_CHART.md](./PERF_CHROME_CHART.md).
