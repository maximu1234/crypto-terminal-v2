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
| Nav / статус | `js/script-desktop-nav.js`, `js/script-terminal-status.js`, `js/site-boot.js` |

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
  └─ preload → cryptoTerminalDesktop.trading.*
       └─ ipcMain (desktop/trading/register-ipc.cjs)
            ├─ credentials.cjs  → safeStorage (Keychain)
            └─ bybit-rest.cjs   → api.bybit.com (signed)
```

- **Main process** — HMAC-подпись, ping, market entry с retry poll позиции.
- **Renderer** — UI и оверлеи; ключи не в localStorage.

## Файлы

| Путь | Назначение |
|------|------------|
| `desktop/trading/bybit-rest.cjs` | REST client |
| `desktop/trading/register-ipc.cjs` | IPC handlers |
| `desktop/trading/credentials.cjs` | Keychain |
| `coins.html` | Монеты (+ торговля в desktop .app) |
| `js/terminal-page-boot.js` | Boot: chart + условный trade-слой |
| `js/trade-desktop-boot.js` | Trade CSS + init (только desktop) |
| `js/trade-exchange-settings.js` | Bybit dropdown + ping |
| `js/trade-market-entry.js` | Buy/Sell по рынку |
| `js/trade-volume-presets.js` | Объёмы USDT |
| `js/trade-book-panel.js` | Панель позиций |
| `js/trade-chart-overlay.js` | Позиция / SL / TP на графике |
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
| `trading:getStatus` | configured, testnet, apiKey prefix |
| `trading:saveKeys` / `clearKeys` | Keychain |
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
