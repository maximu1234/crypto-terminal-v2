# Метка 32 — индикаторы на Монетах, авторефresh, изоляция trade (июнь 2026)

**Тег:** `metka-32` · **Desktop:** `desktop-v1.0.23`

**Текущий эталон отката.** Предыдущий: [MARKER_31.md](./MARKER_31.md) (`metka-31`).

Проверено: `npm run check:all` (syntax, asset-manifest, site-nav, 41 unit tests).

## Аудит: web vs desktop trade

| Проверка | Статус |
|----------|--------|
| `/coins` в браузере: `isTradePage === false` | ✅ `page-routes.js`, `coins-state.js` |
| Trade CSS/JS только при `cryptoTerminalDesktop.isDesktop` | ✅ `trade-desktop-boot.js`, `coins.html` (`trade-desktop` class) |
| `body.trade-page` — только desktop | ✅ `enableTradeDesktopMode()` |
| Chart host / overlay / orders — init за `trade-page` | ✅ `trade-chart-*.js`, `initTradeOpenPositions` |
| Dashboard trade widget — lazy import + `isDashboardTradeEnabled()` | ✅ `dashboard.js` |
| Список монет: `trade-open-positions` не грузится на web | ✅ lazy import в `coins-table.js` |
| Индикаторы, авторефresh, RSI-fix — в корне сайта (не только bundle) | ✅ `coins.html`, `terminal.js`, `js/indicators/*` |

**Вывод:** торговый слой не монтируется в открытой web-версии `/coins`. Общие фичи (график, индикаторы, список) — в веб и desktop одинаково.

## Что добавлено после metka-31

### Монеты — индикаторы (web + desktop)

| Компонент | Файлы | Описание |
|-----------|-------|----------|
| Меню индикаторов | `js/chart-indicators.js`, `css/chart-indicators.css` | RSI (вне лимита), Volume, SMA/EMA, EMA Shift Ribbon, горизонтальный объём |
| Панели | `js/indicators/volume-pane.js`, `rsi-pane.js`, `moving-average.js`, … | Отдельные pane под графиком, resize через `coins-layout-resize` |
| Volume sync | `volume-pane.js`, `chart-factory.js` | Pan/zoom с main; time scale только под нижней панелью |
| SMA/EMA settings | `indicator-settings-dialog.js`, `moving-average.js` | Периоды, цвета TV-picker, толщина; дефолты 50/100/200 |
| RSI off без прыжка | `terminal.js`, `chart-factory.js` | `isLocked` при скрытом RSI; отписка `linkPairedChartTimeScales` |

### Монеты — авторефresh списка (web + desktop)

| Компонент | Файлы | Описание |
|-----------|-------|----------|
| UI | `coins.html`, `css/coins.css` | 10 сек / 1 мин / Никогда под поиском |
| Логика | `js/coins-list-refresh.js`, `js/tickers.js`, `coins-prefs.js` | `setTickerPollInterval()`, prefs `listRefreshMs` |

### Прочее (web + desktop)

| Комponent | Файлы |
|-----------|-------|
| Bybit route: Direct по умолчанию | `bybit-route-pref.js`, `system/index.html` |
| Alert badge −10% | `drawings/draw-redraw-loop.js` |
| Layout math tests | `tests/coins-layout-resize.test.mjs` |

### Только desktop (trade)

| Комponent | Файлы |
|-----------|-------|
| Positions cache | `trade-positions-cache.js` |
| Plus menu / ping / auto SL/TP | `trade-order-plus-ui.js`, `trade-exchange-settings.js` |
| Chart overlay / orders drag | `trade-chart-overlay.js`, `trade-chart-orders.js` |
| Credentials refactor | `desktop/trading/credentials.cjs`, `user-store.cjs` |

## Ключевые версии

| Файл | v |
|------|---|
| `release-marker.js` | METKA=32, desktop=1.0.23 |
| `terminal.js` | см. `asset-manifest.js` |
| `chart-indicators.js` | 10 |
| `chart-factory.js` | см. manifest |
| `tickers.js` | 23 |
| `coins-list-refresh.js` | 1 |
| `desktop/package.json` | 1.0.23 |

## Откат

```bash
git fetch --tags
git checkout metka-32   # текущий
git checkout metka-31   # до индикаторов + авторефresh
```

## Smoke

| Платформа | Проверка |
|-----------|----------|
| Web `/coins` | Индикаторы, RSI off без прыжка, авторефresh, v0.32, **нет** Bybit trade UI |
| Web `/` | Screener zoom, v0.32 |
| Desktop `/coins` | Индикаторы + trade layer, positions, orders |
| Desktop `/terminal` | Trade widgets |

## Теги

```bash
git tag -a metka-32 -m "metka-32: chart indicators, list autorefresh, RSI fix, trade isolation audit"
git tag -a desktop-v1.0.23 -m "desktop-v1.0.23: bundled UI metka-32"
```
