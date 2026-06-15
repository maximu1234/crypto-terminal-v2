# Метка 21 — рабочая версия (июнь 2026)

**Тег:** `metka-21` · **Коммит:** `git rev-parse metka-21`

**Предыдущий эталон отката.** Текущая: [MARKER_22.md](./MARKER_22.md) (`metka-22`).

Проверено: asset manifest (python audit, 0 mismatches); site-nav (7 ссылок × 5 страниц). Unit tests — `npm run check:all` (node).

## Что добавлено после metka-20

### Главная — RSI в виджетах
- **4 и 6** виджетов (десктоп): RSI внизу каждого виджета (**26%** высоты, график **74%**)
- **9** виджетов и **мобилка** — без RSI
- Шкала даты/времени **под RSI** (как на Монетах), не под свечным графиком
- Горячие клавиши: **1** → 4, **2** → 6, **3** → 9 виджетов
- Уровни 30/50/70 скрыты до загрузки данных RSI (нет «мигания» пунктира)

### Терминал — RSI в виджетах
- **1–6** синих флагов (1–2 ряда): RSI с теми же пропорциями **26% / 74%**
- **7–9** виджетов (3 ряда) и **мобилка** — без RSI
- Шкала времени под RSI; синхронизация zoom через `linkPairedChartTimeScales`

### Монеты — таблица символов
- Длинные названия **обрезаются** (`text-overflow: ellipsis`), не залезают на колонки 24h / 1h
- Полное имя — в `title` при наведении
- Убрано переопределение `.coin-symbol { overflow: visible }`

### Общее — RSI layout
- `updateRsiBandLayout` / `updateRsiLevelLinesLayout`: не рисовать уровни без данных серии

## Ключевые версии ассетов

| Файл | v |
|------|---|
| `release-marker.js` | 6 |
| `screener.js` | 74 |
| `dashboard.js` | 82 |
| `terminal.js` | 302 |
| `terminal/coins-table.js` | 11 |
| `chart/chart-factory.js` | 29 |
| `chart-import.js` | 31 |
| `chart.js` | 138 |
| `chart-widget-host.js` | 9 |
| `asset-manifest.js` | 2 |
| `screener.css` | 32 |
| `terminal.css` | 133 |
| `dashboard.css` | 39 |
| `coins.css` | 39 |
| `critical-shell.css` | 5 |
| `common.css` | 27 |

Полный список: `js/asset-manifest.js` → `node scripts/sync-asset-versions.cjs`.

## Аудит сайта (2026-06-14)

| Проверка | Результат |
|----------|-----------|
| Asset manifest | OK — 124 ассета, 158 файлов |
| Site nav | OK — 5 `site-nav-page`, 7 ссылок |
| Unit tests | `npm run check:all` — chart-ruler, draw-magnet, scale-label-layout, draw-hit, fib-spec, drawings-cloud-shapes, position-sizing, page-routes, coins-layout-resize |
| Главная RSI | OK — 4/6 с RSI, 9 без; hotkeys 1/2/3 |
| Терминал RSI | OK — ≤6 с RSI, ≥7 без |
| Монеты list | OK — ellipsis длинных символов |
| RSI flash fix | OK — уровни скрыты до данных |
| Фон site/chart | OK — `#16181f` / `#141721` (metka-20) |
| Terminal crosshair | OK — crosshair + «+» алерт (metka-20) |

### Страницы (inventory)

| URL | Файл | Статус |
|-----|------|--------|
| `/` | `index.html` | screener + **v0.21** + RSI widgets |
| `/coins` | `coins.html` | chart + RSI + list ellipsis + drawings |
| `/terminal` | `terminal.html` | widgets + RSI (1–2 ряда) + alerts |
| `/alerts` | `alerts/index.html` | alerts UI + cloud |
| `/listings` | `listings.html` | Bybit listings |
| `/statistics` | `statistics.html` | kline stats |
| `/trade-calculator` | `trade-calculator.html` | position sizing |
| `/system` | `system/index.html` | admin |
| `/btc-d` | `btc-d.html` | BTC.D |

### Ручной smoke

| Страница | Что проверить |
|----------|----------------|
| `/` | **v0.21**; layout 4/6 — RSI + шкала под RSI; **9** — без RSI; клавиши 1/2/3 |
| `/terminal` | 4–6 флагов — RSI; 7–9 — без RSI |
| `/coins` | `1000000BABYDOGEUSDT` — обрезка; RSI без пунктира при загрузке |
| Nav pages | 7 ссылок в шапке |

## Метки в репозитории

| Тег | Роль |
|-----|------|
| `metka-22` | **Текущий** эталон |
| `metka-21` | **Предыдущий** эталон (RSI widgets / ellipsis) |
| `metka-20` | до RSI на Главной/Терминале |

## Откат

```bash
git fetch --tags
git checkout metka-21   # текущий эталон
git checkout metka-20   # до RSI widgets / ellipsis / flash fix
```
