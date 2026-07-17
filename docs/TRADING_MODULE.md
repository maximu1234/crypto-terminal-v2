# Торговый модуль (desktop)

**Статус:** MVP · **Эталон:** `metka-29` · **UI:** `/terminal.html` (**desktop .app** — торговый слой; **web** — без торговли)

Торговля **только Multichart.app на Mac** (широкое окно): не Vercel, не iPad, не смартфон.

## Desktop vs Web

| | Сайт (Vercel) | Desktop (.app) |
|---|---------------|------------------|
| Графики, алерты, синхронизация | ✅ | ✅ |
| `/trade`, торговля, API keys | ❌ | ✅ |
| `/script.html`, сканер паттерна 1-2 | ❌ (редирект) | ✅ |

## Скрипт (desktop, часть торгового модуля)

Страница **Скрипт** и фоновый сканер паттерна **1-2** — не отдельный продуктовый модуль, а **расширение торгового слоя** (как `/trade`, позиции, оверлеи). Только **Multichart.app**; на вебе `/script.html` → редирект на Скринер.

| Компонент | Файлы |
|-----------|--------|
| Страница / boot | `script.html`, `js/script-page-boot.js`, `js/script-page.js`, `js/script-page-widgets.js`, `js/script-page-storage.js` |
| Фоновый скан | `js/script-scan-background.js`, `js/pattern-12-scanner.js`, `js/pattern-scan-results.js` |
| Nav / статус | `js/site-header-nav-desktop.js`, `js/script-terminal-status.js`, `js/site-boot.js` |

**Аудит торгового модуля** → проверять Скрипт в том же проходе (desktop-gate, bundle, nav, фоновый таймер). См. `.cursor/rules/trading-module-script.mdc`.

## Функции (metka-29)

| # | Задача | Статус |
|---|--------|--------|
| T-1 | Keychain для apiKey / apiSecret | ✅ |
| T-2 | IPC `cryptoTerminalDesktop.trading` | ✅ |
| T-3 | Bybit REST: баланс, позиции, ордера | ✅ |
| T-4 | UI: dropdown Bybit (ключи, баланс, пинг) | ✅ |
| T-5 | Market entry + limit/stop ордера | ✅ |
| T-6 | SL/TP на графике (drag, validation) | ✅ |
| T-7 | Объёмы USDT (per-coin + defaults) | ✅ |
| T-8 | Панель позиций / ордеров | ✅ |

## Архитектура

```
Renderer (/coins.html — desktop)
  ├─ trade/module-router.js → active renderer bundle
  │    ├─ trade/bybit/*
  │    └─ trade/bingx/*
  └─ preload → cryptoTerminalDesktop.trading.*
       └─ ipcMain (desktop/trading/register-ipc.cjs)
            ├─ trading-router.cjs → active exchange
            ├─ exchange-credentials.cjs → per-exchange Keychain files
            ├─ bybit-rest.cjs / bingx-rest.cjs → signed REST
            └─ trading-stream.cjs → private WS + REST seed
```

- **Main process** — HMAC-подпись, ping, market entry с retry poll позиции.
- **Renderer** — UI и оверлеи; ключи не в localStorage (Bybit и BingX).

## BingX (desktop — isolated module)

| Компонент | Файлы |
|-----------|--------|
| REST client | `desktop/trading/bingx-rest.cjs` (**не трогать** `bybit-rest.cjs`) |
| Private WS | `desktop/trading/bingx-private-ws.cjs` |
| Private stream | `desktop/trading/bingx-trading-stream.cjs` |
| Credentials | `bingx-api-credentials.json` в userData (plaintext, mode 0600) |
| Подпись | `desktop/trading/bingx-sign.cjs` |
| Renderer | `js/trade/bingx/*` |

**Изоляция бирж:** правки BingX — только `desktop/trading/bingx-*` и
`js/trade/bingx/*`. Правки Bybit — только `desktop/trading/bybit-*` и
`js/trade/bybit/*`.

Общие файлы без биржевой логики: `trading-router.cjs`,
`trading-stream.cjs`, `register-ipc.cjs`, `js/trade/module-router.js` и
тонкие renderer-facades `js/trade-positions-cache.js`,
`js/trade-stream-bridge.js`, `js/trade-chart-overlay.js`,
`js/trade-auto-stops.js`, `js/trade-market-entry.js`,
`js/trade-book-panel.js`, `js/trade-diary-page.js`,
`js/trade-diary-detail.js`, `js/trade-diary-chart.js`.

При смене биржи старый renderer-модуль останавливается и страница
перезагружается: DOM listeners, stream subscriptions и кэши одной биржи не
переживают переход в другую.

**Дефолты аккаунта:** hedge (`dualSidePosition=true`) + multi-asset (`multiAssetsMode`) + cross margin на символ. Stream/cache/book ключуют позиции как `SYMBOL:LONG|SHORT`; close/setStop/getPosition передают `positionSide`.

**Работает:** ключи → баланс → пинг → market open → TRIGGER_MARKET/LIMIT → auto SL/TP после fill (`setPositionStop`, не attach JSON на MARKET) → позиции/ордера → set/cancel SL/TP.

**Триггеры:** `TRIGGER_MARKET` с `quantity` + `stopPrice` + `price` + `workingType` (без `quoteOrderQty`). Cancel — DELETE с params в query.

**Поток позиций:** private WS `ACCOUNT_UPDATE` / `ORDER_TRADE_UPDATE` → мгновенный main snapshot → renderer. REST только через `bingx-request-scheduler.cjs` (critical place/cancel, coalesced reconcile). WS delta не ждёт `seedDone`. Optimistic FILL из ORDER_TRADE. Renderer **не** делает periodic REST poll — `trading:getStreamSnapshot`. Empty REST soft-skip только для fresh optimistic open.

**Amend (drag на графике):** цена триггера/лимитки меняется через `POST /openApi/swap/v1/trade/cancelReplace` (не `/amend` — тот меняет только quantity). При cancel ok / place fail — повторный place.

**Дневник (renderer split):** host `js/trade-diary-*.js` содержит только
DOM/period/status и делегирует `diaryLoadPeriod` активному bundle через
`module-router`. Fetch, day-cache policy, detail и klines полностью находятся
в `js/trade/bybit/diary/*` | `js/trade/bingx/diary/*`.
Bybit — closed-PnL + executions (metka-69 контракт, без enrich/resolved).
BingX — income + fills resolve; загруженные прошлые дни переиспользуются из
day-cache, а сеть повторно проверяет только текущий день.

**Дневник BingX:** единый резолвер для detail; list — income + **один allFillOrders-window на символ** до первой отрисовки (без N× per-trade resolve и без второго renderer-прохода).

| Слой | Поведение |
|------|-----------|
| List | income identity/PnL → per-symbol fills → `side`/`durationMs` готовы до paint |
| Detail | `resolveBingxClosedTrade` (PH → adaptive fills) |
| Side | только `positionSide` / PH; **не** угадывать Long/Short по Buy→Sell |
| List resolve / detail | `PRIORITY.normal`, `cancelable: false`; прошлые дни сохраняются в day-cache |
| Miss | detail → `ok: false`; list → строка может остаться «—», но ответ всегда возвращается |

**Терминал «История сделок» (renderer split):**
`trade-chart-execution-markers.js` отвечает только за checkbox/cache/отрисовку,
а `trade-markers-sandbox/trade-fetch.js` — тонкий facade через
`trade/module-router.js`.

| Биржа | Модуль | Алгоритм |
|-------|--------|----------|
| Bybit | `js/trade/bybit/history/*` | closed-PnL list + per-trade `getTradeDiaryDetail` (тот же 180d/`avgEntryPrice` matcher, что Дневник) |
| BingX | `js/trade/bingx/history/*` | income + собственный fills enrich, `skipExecutions:true`, `enrich:true` |

Bybit history не импортирует BingX history и наоборот. Исправления matching
одной биржи не вносятся в shared facade или модуль другой биржи.

## Файлы

| Путь | Назначение |
|------|------------|
| `desktop/trading/exchange-credentials.cjs` | Per-exchange credential store |
| `desktop/trading/trading-router.cjs` | Thin IPC adapter switch |
| `desktop/trading/trading-stream.cjs` | Thin stream facade → bybit/bingx stream |
| `desktop/trading/bybit-trading-stream.cjs` | Bybit private stream |
| `desktop/trading/bingx-trading-stream.cjs` | BingX private stream |
| `desktop/trading/bybit-rest.cjs` | Bybit REST client |
| `desktop/trading/bingx-rest.cjs` | BingX REST client |
| `desktop/trading/bingx-request-scheduler.cjs` | BingX REST priority queue / cooldown |
| `desktop/trading/register-ipc.cjs` | IPC handlers |
| `js/trade/module-router.js` | Thin renderer bundle switch |
| `js/trade/bybit/*` | Bybit renderer: cache/stream/overlay/entry/book/stops |
| `js/trade/bingx/*` | BingX renderer: cache/stream/overlay/entry/book/stops |
| `desktop/trading/credentials.cjs` | Bybit credentials shim |
| `coins.html` | Монеты (+ торговля в desktop .app) |
| `js/terminal-page-boot.js` | Boot: chart + условный trade-слой |
| `js/trade-desktop-boot.js` | Trade CSS + init (только desktop) |
| `js/trade-exchange-settings.js` | Exchange dropdown + ping |
| `js/trade-market-entry.js` | Thin facade → active exchange renderer |
| `js/trade-volume-presets.js` | Объёмы USDT |
| `js/trade-book-panel.js` | Thin facade → active exchange book |
| `js/trade-chart-overlay.js` | Thin facade → active exchange overlay |
| `js/trade-chart-orders.js` | Limit/stop линии |
| `js/trade-order-plus-ui.js` | Меню «+» на шкале |
| `js/trade-open-positions.js` | Пин символов с позицией |
| `js/desktop-trade-nav.js` | Пункт «Торговля» в меню |
| `script.html` | Скрипт — сканер 1-2 (только desktop) |
| `js/script-page-boot.js` | Boot + редирект вне desktop |
| `js/script-scan-background.js` | Фоновое авто-сканирование |
| `js/script-terminal-status.js` | Статус скана в шапке Терминала |

## IPC

| Channel | Описание |
|---------|----------|
| `trading:setActiveExchange` | Активная биржа для IPC/потока |
| `trading:getStatus` | configured, testnet, apiKey prefix (`exchangeId`) |
| `trading:saveKeys` / `clearKeys` | Keychain (`exchangeId`) |
| `trading:getWalletBalance` | USDT unified |
| `trading:getPositions` / `getPosition` | Открытые позиции |
| `trading:openPosition` | Market entry |
| `trading:placeOrder` / `cancelOrder` / `amendOrder` | Limit/stop |
| `trading:setPositionStop` / `cancelPositionStop` | SL/TP |
| `trading:closePosition` | Закрыть по рынку |
| `trading:pingBybit` | RTT public + signed |

## Smoke

1. Desktop → Bybit → testnet/mainnet keys → баланс, пинг.
2. `/trade` → Buy → линия позиции на графике.
3. Hover на линию → СЛ/ТП handles → drag → validation.
4. «+» на шкале → limit/stop → линия ордера.

## Связанные документы

- [MARKER_29.md](./MARKER_29.md) — текущий эталон
- [DESKTOP_APP.md](./DESKTOP_APP.md) — Electron shell
