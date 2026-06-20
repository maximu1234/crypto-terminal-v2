# Торговый модуль (desktop)

**Статус:** фаза 1 — каркас · **Эталон:** `metka-28` · **Песочница UI:** `/trade.html` (**только desktop .app**)

Торговля **только Multichart.app на Mac** (широкое окно): не Vercel, не iPad, не смартфон. Пункт «Торговля» и Bybit — в `.coins-header-desktop`, без mobile-nav.

## Desktop vs Web (разделение версий)

| | Сайт (Vercel) | Desktop (.app) |
|---|---------------|------------------|
| Графики, алерты, синхронизация | ✅ | ✅ |
| `/trade`, торговля, API keys | ❌ | ✅ |

Единственное продуктовое отличие desktop — **модуль торговли**.

## Цели

| # | Задача | Статус |
|---|--------|--------|
| T-1 | Keychain (`safeStorage`) для apiKey / apiSecret | 🔄 фаза 1 |
| T-2 | IPC bridge `cryptoTerminalDesktop.trading` | 🔄 фаза 1 |
| T-3 | Bybit REST v5: баланс, позиции (read-only) | ⏳ фаза 2 |
| T-4 | UI: панель ключей + статус подключения | 🔄 dropdown Bybit на `/trade` |
| T-5 | Ордер: market/limit, reduce-only | ⏳ фаза 3 |
| T-6 | TP/SL, confirm dialog, testnet toggle | ⏳ фаза 4 |

## Архитектура

```
Renderer (coins.html / trade panel)
  └─ preload → cryptoTerminalDesktop.trading.*
       └─ ipcMain (desktop/trading/register-ipc.cjs)
            ├─ credentials.cjs  → safeStorage (Keychain)
            └─ bybit-rest.cjs   → api.bybit.com (signed, main only)
```

- **Main process** — единственное место подписи запросов HMAC.
- **Renderer** — только UI; ключи не попадают в `localStorage` / DevTools.
- **Testnet:** `BYBIT_TESTNET=1` или настройка в UI (фаза 4).

## Файлы

| Путь | Назначение |
|------|------------|
| `desktop/trading/credentials.cjs` | save/load/clear API keys |
| `desktop/trading/bybit-rest.cjs` | REST client (фаза 2+) |
| `desktop/trading/register-ipc.cjs` | `trading:*` handlers |
| `trade.html` | Копия `/coins` для экспериментов (отдельные prefs `trade_page_prefs_v1`) |
| `js/desktop-trade-nav.js` | Пункт «Торговля» в меню (inject, desktop-only) |

## IPC (фаза 1)

| Channel | Описание |
|---------|----------|
| `trading:getStatus` | `{ configured, testnet }` |
| `trading:saveKeys` | сохранить key + secret |
| `trading:clearKeys` | удалить из Keychain |

## Безопасность

- Не логировать key/secret.
- Не включать ключи в `site-bundle`.
- Ордеры — только после явного confirm в UI (фаза 3+).

## Smoke (после фазы 2)

1. Desktop → настройки торговли → ввести testnet keys.
2. Статус «Подключено», баланс USDT отображается.
3. Logout / clear keys — Keychain пуст.

## Связанные документы

- [DESKTOP_APP.md](./DESKTOP_APP.md) — оболочка Electron
- [MARKER_28.md](./MARKER_28.md) — текущий эталон
