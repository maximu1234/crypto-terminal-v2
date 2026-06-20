# Метка 29 — торговый модуль (июнь 2026)

**Тег:** `metka-29` · **Коммит:** `git rev-parse metka-29`

**Предыдущий эталон (до metka-30).** Текущий: [MARKER_30.md](./MARKER_30.md) (`metka-30`).

Проверено: desktop **Multichart 1.0.16** — `/trade.html`, Bybit mainnet/testnet, CI gate (manifest, nav, unit tests).

## Что добавлено после metka-28

### Торговый модуль (desktop-only)

| Компонент | Файлы | Описание |
|-----------|-------|----------|
| Страница | `trade.html`, `js/trade-page-boot.js` | Копия coins с торговым UI; редирект на web |
| Bybit REST | `desktop/trading/bybit-rest.cjs` | Signed v5: баланс, позиции, ордера, SL/TP, market entry |
| IPC | `desktop/trading/register-ipc.cjs`, `desktop/preload.js` | `cryptoTerminalDesktop.trading.*` |
| Keychain | `desktop/trading/credentials.cjs` | apiKey / apiSecret, testnet toggle |
| Настройки | `js/trade-exchange-settings.js` | Dropdown Bybit: ключи, баланс, дефолтные объёмы, **пинг до API** |
| Market entry | `js/trade-market-entry.js` | Кнопки Buy/Sell по рынку (ask/bid) |
| Объёмы | `js/trade-volume-presets.js` | 6 слотов USDT на монету + defaults в настройках |
| Стакан / позиции | `js/trade-book-panel.js` | Панель справа: баланс, позиции, ордера |
| Оверлей позиции | `js/trade-chart-overlay.js` | Линия входа, PnL-бейдж, SL/TP drag + handles на hover |
| Ордера на графике | `js/trade-chart-orders.js` | Limit/stop линии, drag amend, cancel |
| Plus-меню | `js/trade-order-plus-ui.js` | Limit/stop/alert с ценовой шкалы |
| Список монет | `js/trade-open-positions.js`, `terminal/coins-table.js` | Пин открытых позиций наверх |

### Desktop / сессия

- `desktop/local-site-server.cjs` — фиксированный порт 47391 (localStorage не теряется)
- `desktop/auth-session.cjs` — бэкап Supabase-сессии в userData
- `js/auth-storage.js`, `js/cloud-sync.js` — restore session в .app

### Оптимизации latency

- Параллельный fetch ticker + instrument rules при market entry
- Позиция возвращается из main process сразу после ордера (retry poll)
- `trade-position-updated` — мгновенный оверлей на графике без лишнего IPC

## Аудит торговли (metka-29)

| Проверка | Статус |
|----------|--------|
| Ключи только в Keychain (main process) | ✅ |
| Renderer не видит secret после save | ✅ |
| `/trade` недоступен на Vercel (redirect) | ✅ |
| Market Buy/Sell → линия позиции на графике | ✅ |
| SL/TP: handles на hover, drag, validation vs mark | ✅ |
| Limit/stop ордера: линии, drag, cancel | ✅ |
| Пинг API + signed в настройках Bybit | ✅ |
| Import `?v=` ↔ `asset-manifest.js` | ✅ CI |
| JS syntax + unit tests | ✅ CI |

## Ключевые версии ассетов

| Файл | v |
|------|---|
| `release-marker.js` | 12 (`METKA_NUMBER=29`) |
| `trade-page-boot.js` | 10 |
| `trade-chart-overlay.js` | 13 |
| `trade-exchange-settings.js` | 6 |
| `trade-book-panel.js` | 4 |
| `terminal.js` | 317 |
| `terminal/coins-table.js` | 12 |
| `desktop/package.json` | 1.0.17 |

## Откат

```bash
git fetch --tags
git checkout metka-29   # текущий — торговля
git checkout metka-28   # до торгового модуля
```

## Smoke

| Платформа | Проверка |
|-----------|----------|
| Desktop `.app` | `/trade` — Buy/Sell, SL/TP, limit ордер |
| Desktop | Bybit keys → баланс, пинг |
| Desktop | Позиция в списке монет (оранжевый badge) |
| `/` | v0.29 после выбора таймфрейма |
| Vercel | `/trade` → redirect `/coins` |

## Тег после коммита

```bash
git tag -a metka-29 -m "metka-29: Bybit trading module (desktop /trade)"
```
