# Метка 14 — рабочая версия (июнь 2026)

**Тег:** `metka-14` · **Коммит:** `git rev-parse metka-14`

**Текущий эталон отката.** Наследует [MARKER_13.md](./MARKER_13.md).

Проверено: asset manifest OK, site-nav OK (автопроверки); `npm run check:all` — syntax + unit tests (локально при наличии Node).

## Что добавлено после metka-13

### Статистика (`/statistics.html`)
- Bybit kline-стatистика, вкладки 1d / 1w / 1m / 1y
- `js/statistics.js`, `js/statistics-background.js` — фоновое обновление при уходе со страницы (sessionStorage, resume без сброса прогресса)
- Пункт **«Статистика»** в site-nav на всех страницах

### Главная (screener)
- Компактный header: layout / sort / TF в pick-меню (desktop)
- Поиск символа (mobile + desktop): jump к виджету + highlight
- `screener.css` v24 — layout header и виджетов

### Монеты — рынки Bybit
- Вкладки: **Все** (первая, по умолчанию), Crypto, Новые, Innovation Zone, Stocks, Commodities, Forex
- `bybit-listings.js`: `filterAllListings`, окно «Новые» 30 дней
- URL `?symbol=` открывает вкладку «Все»

### Монеты — шкала времени «в будущее» (TradingView-style)
- Пустое место справа + подписи на нижней оси RSI
- `applyCoinsChartViewport`, `CHART_BUILD_ID` → `20260609-future-timescale-v10`
- Исправлена «гармошка» при смене монеты: один settle viewport

### Монеты — crosshair (TradingView-style)
- Плашка цены на шкале (`#crosshair-price-label`)
- На **ценовой шкале** — вертикаль и горizontаль **скрываются** (не залипают у края)
- Кнопка **«+»** (алерт): видна на всём plot, на горизонтали; пропадает на шкале вместе с crosshair
- Исправлен дублирующий vert (`.chart-dom-crosshair-vert` vs `#linked-crosshair-vert`)
- **RSI:** горизонталь crosshair в панели RSI при наведении; vert общий; HUD RSI — значение под курсором

### UX
- `suppress-native-context-menu.js` v2: контекстное меню на nav / логотипе
- Флаг монеты: заморозка списка при color picker

## Ключевые версии ассетов

| Файл | v |
|------|---|
| `terminal.js` | 289 |
| `screener.js` | 67 |
| `chart-import.js` | 25 |
| `chart.js` | 133 |
| `chart/chart-factory.js` | 23 |
| `chart/chart-dom-crosshair.js` | 13 |
| `price-alert-ui.js` | 37 |
| `bybit-listings.js` | 5 |
| `terminal/coins-table.js` | 7 |
| `terminal/coins-prefs.js` | 6 |
| `terminal/coins-state.js` | 5 |
| `statistics.js` | 8 |
| `statistics-background.js` | 2 |
| `site-boot.js` | 83 |
| `suppress-native-context-menu.js` | 2 |
| `screener.css` | 24 |
| `terminal.css` | 107 |
| `coins.css` | 30 |
| `statistics.css` | 7 |

Полный список: `js/asset-manifest.js` → `node scripts/sync-asset-versions.cjs`.

## Аудит (2026-06-10)

| Проверка | Результат |
|----------|-----------|
| Asset manifest (`check-asset-manifest.cjs`) | OK — 117 assets, 150 files |
| Site nav (`check-site-nav.cjs`) | OK — 5 pages, 7 links |
| `chart-import` chain | v25 во всех потребителях |
| Stale imports | нет (listings/coins-prefs CI fix в c233a97) |
| Syntax / unit tests | `npm run check:all` (Node в CI) |

### Страницы (inventory)

| URL | Файл | Статус |
|-----|------|--------|
| `/` | `index.html` | screener, nav OK |
| `/coins` | `coins.html` | chart + RSI + listings |
| `/terminal` | `terminal.html` | dashboard widgets |
| `/alerts` | `alerts/index.html` | alerts UI |
| `/listings` | `listings.html` | Bybit listings |
| `/statistics` | `statistics.html` | kline stats + bg job |
| `/trade-calculator` | `trade-calculator.html` | position sizing |
| `/system` | `system/index.html` | admin |
| `/btc-d` | `btc-d.html` | BTC.D page |
| `screener.html` | redirect → `/` | legacy |

### Ручной smoke

| Страница | Что проверить |
|----------|----------------|
| Главная | pick-меню, поиск символа, виджеты |
| Монеты | вкладка «Все», future time scale, смена монеты |
| Монеты | crosshair: plot / price scale / RSI horiz |
| Монеты | «+» на plot, алерт, без дубля vert |
| `/statistics.html` | периоды, refresh, уход со страницы и возврат |
| Терминал | dashboard, рисование на виджете |
| Nav | контекстное меню «открыть в новой вкладке» |

### Известные ограничения

- Forex на Bybit: публичный API может вернуть 0 инструментов — вкладка пустая
- Фаза 4 refactor: split `alerts-cloud-sync.js` — отложена
- `js/alerts-cloud/*` — prep, не wired в проде

## Откат

```bash
git fetch --tags
git checkout metka-14   # текущий эталон
git checkout metka-13   # до Statistics / future scale / crosshair polish
```

## Следующий шаг

- Фаза 4 alerts-cloud **или** стабилизация Bybit proxy
- После крупных правок: `sync-asset-versions` → `check:all` → обновить эту метку (re-tag `metka-14`)
