# Метка 14 — рабочая версия (июнь 2026)

**Тег:** `metka-14` · **Коммит:** `git rev-parse metka-14`

**Текущий эталон отката.** Наследует [MARKER_13.md](./MARKER_13.md).

Проверено: `check:all` OK (syntax, manifest, nav, unit tests).

## Что добавлено после metka-13

### Статистика (`/statistics.html`)
- Новая страница: Bybit kline-статистика, вкладки периода 1d / 1w / 1m / 1y
- `js/statistics.js`, `css/statistics.css`
- Пункт **«Статистика»** в site-nav на всех страницах

### Главная (screener)
- Компактный header: layout / sort / TF в pick-меню (desktop)
- Поиск символа (mobile + desktop): jump к виджету + highlight до клика
- Убрана подсказка `2000 · кадр …` в шапке виджета; volume + % выровнены вправо
- `screener.css` v24 — обновлён layout header и виджетов

### Монеты — рынки Bybit
- Вкладки: Crypto, Новые, **Innovation Zone**, Stocks, Commodities, Forex
- `bybit-listings.js`: фильтры по `symbolType`, окно «Новые» 7 → **30** дней
- Forex/Stocks/Commodities через Bybit (Twelve Data убран для forex на Coins)

### Монеты — шкала времени «в будущее» (TradingView-style)
- Пустое место справа + подписи дат/часов на нижней оси RSI
- Whitespace-бары + anchor-серия на RSI; `applyCoinsChartViewport`, `CHART_BUILD_ID` → `20260609-future-timescale-v10`
- Исправлена «гармошка» при смене монеты: один settle viewport вместо 5× timeout + 4× resize

### Монеты — crosshair
- Плашка цены на шкале (`#crosshair-price-label`, `chart-dom-crosshair.js`)

### UX
- `suppress-native-context-menu.js` v2: нативное контекстное меню на **верхнем nav** и логотипе; блок на графике
- Флаг монеты: заморозка обновления списка пока открыт color picker

### Аудит metka-14
- Синхронизированы все `chart-import.js` → v25 (было v14 у 9 модулей — stale chart chain)
- `screener.css` v24 в `terminal.html` и `system/index.html`
- Версионирован импорт `chart-options.js` в `chart-dom-crosshair.js`

## Ключевые версии ассетов

| Файл | v |
|------|---|
| `terminal.js` | 285 |
| `screener.js` | 67 |
| `chart-import.js` | 25 |
| `chart.js` | 132 |
| `chart/chart-factory.js` | 19 |
| `chart/chart-dom-crosshair.js` | 12 |
| `bybit-listings.js` | 4 |
| `terminal/coins-table.js` | 6 |
| `suppress-native-context-menu.js` | 2 |
| `statistics.js` | 6 |
| `screener.css` | 24 |
| `terminal.css` | 106 |
| `coins.css` | 30 |
| `site-boot.js` | 82 |

Полный список: `js/asset-manifest.js` → `node scripts/sync-asset-versions.cjs`.

## Аудит (2026-06-09)

| Проверка | Результат |
|----------|-----------|
| `npm run check:all` | OK |
| Syntax (все `.js`) | OK |
| Asset manifest + site nav | OK |
| Unit tests | 14/14 |
| `chart-import` chain | синхронизирован (v25) |

### Ручной smoke

| Страница | Что проверить |
|----------|----------------|
| Главная | pick-меню layout/sort/TF, поиск символа, виджеты |
| Монеты | вкладки рынков, future time scale, смена монеты без «гармошки» |
| Монеты | crosshair price label, флаг + color picker |
| `/statistics.html` | периоды, refresh |
| Терминал | dashboard, screener.css |
| Nav | контекстное меню «открыть в новой вкладке» |

### Известные ограничения

- Forex на Bybit: публичный API может вернуть 0 инструментов — вкладка пустая до появления данных
- Фаза 4 refactor: split `alerts-cloud-sync.js` — отложена
- `js/alerts-cloud/*` — prep, не wired в проде

## Откат

```bash
git fetch --tags
git checkout metka-14   # текущий эталон
git checkout metka-13   # до Statistics / future scale / screener search
```

## Следующий шаг

- Фаза 4 alerts-cloud **или** стабилизация Bybit proxy
- После крупных правок: `sync-asset-versions` → `check:all` → обновить метку
