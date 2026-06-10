# Метка 17 — рабочая версия (июнь 2026)

**Тег:** `metka-17` · **Коммит:** `git rev-parse metka-17`

**Текущий эталон отката.** Предыдущая: [MARKER_16.md](./MARKER_16.md) (`metka-16`).

Проверено: asset manifest (ручная сверка ключевых `?v=`); site-nav (CI `check-site-nav.cjs`); unit tests `scale-label-layout.test.mjs` (CI при наличии Node).

## Что добавлено после metka-16

### Терминал — синий флаг и динамические виджеты
- Убран переключатель **4/6/9** виджетов в шапке Терминала
- Новый цвет флага **синий** (`favorites.blue`) — монеты для страницы Терминал
- **Максимум 9** монет с синим флагом; при лимите кнопка «Синий» неактивна
- Терминал показывает **только** синие монеты: 2 флага → 2 виджета, 9 → сетка 3×3
- **0 синих** → пустая страница «Нет выбранных графиков»
- Шапка виджета: флаг + **название текстом** (без поиска), TF, %, ↗, рисование
- Снятие синего флага на Терминале → виджет исчезает сразу
- TF сохраняется per-symbol: `widget_sym_${SYMBOL}` в localStorage
- Загрузка: dashboard **до** `site-boot` (графики не блокируются облаком)

### Главная — подпись версии
- `js/release-marker.js` → **v0.17** после `#screener-desktop-tf` (desktop + mobile bar)
- Правило `.cursor/rules/release-marker.mdc` — bump при каждой metka-N

### Ценовая шкала — плашки рисования
- `js/drawings/scale-label-layout.js` — раскладка без перекрытия (TradingView-style)
- Плашка **текущей цены** (`.chart-price-hud`) — фиксированный якорь, остальные смещаются
- Тесты: `tests/scale-label-layout.test.mjs`

### Монеты — исправления
- `coins-table.js`: импорт `../favorites.js` (был ошибочный `./favorites.js` → 404)
- Live-свеча: `setData(buildChartDisplayCandles())` вместо `update()` — нет ошибки LW «Cannot update oldest data» при future whitespace bars

### Флаги (общее)
- `favorites.js` v2: группа `blue`, cloud `blue:SYM`, `canSetBlueFlag`, `getTerminalBlueSymbols`
- Синий флаг в меню: Главная, Монеты, шапка виджета (`widget-favorite-flag.js` v3)

## Ключевые версии ассетов

| Файл | v |
|------|---|
| `dashboard.js` | 79 |
| `favorites.js` | 2 |
| `widget-favorite-flag.js` | 3 |
| `storage.js` | 13 |
| `terminal.js` | 293 |
| `terminal/coins-table.js` | 9 |
| `screener.js` | 69 |
| `release-marker.js` | 2 |
| `drawings/scale-label-layout.js` | 2 |
| `drawings/init.js` | 43 |
| `common.css` | 22 |
| `dashboard.css` | 29 |
| `terminal-page.css` | 2 |
| `screener.css` | 25 |

Полный список: `js/asset-manifest.js` → `node scripts/sync-asset-versions.cjs`.

## Аудит сайта (2026-06-10)

| Проверка | Результат |
|----------|-----------|
| Asset manifest | OK — ключевые entry `?v=` совпадают с manifest |
| Site nav | OK — 5 pages, 7 links (`check-site-nav.cjs`) |
| Unit tests | `scale-label-layout`, `drawings-cloud-shapes`, `fib-spec`, `draw-hit`, `position-sizing`, `page-routes` |
| Terminal blue flags | OK — add/remove/render, max 9, empty state |
| Coins live chart | OK — WS kline без LW errors |
| Drawings scale labels | OK — stack + HUD anchor |

### Страницы (inventory)

| URL | Файл | Статус |
|-----|------|--------|
| `/` | `index.html` | screener + **v0.17** + nav OK |
| `/coins` | `coins.html` | chart + RSI + drawings + **blue flag** |
| `/terminal` | `terminal.html` | **только синие флаги**, dynamic grid |
| `/alerts` | `alerts/index.html` | alerts UI + cloud |
| `/listings` | `listings.html` | Bybit listings |
| `/statistics` | `statistics.html` | kline stats |
| `/trade-calculator` | `trade-calculator.html` | position sizing |
| `/system` | `system/index.html` | admin |
| `/btc-d` | `btc-d.html` | BTC.D |
| `/btc-dominance-test` | `btc-dominance-test.html` | dev (noindex) |

### API (Vercel serverless)

| Route | Назначение |
|-------|------------|
| `GET /api/bybit?path=…` | Bybit REST proxy |
| `GET /api/coingecko?mode=…` | BTC dominance |
| `GET /api/twelvedata?…` | Twelve Data proxy |

### Ручной smoke

| Страница | Что проверить |
|----------|----------------|
| `/` | Синий флаг на 1–9 монет; подпись **v0.17** справа от TF |
| `/terminal` | Только синие; снять флаг → виджет пропал; пустое состояние |
| `/coins` | Консоль без LW errors; синий флаг; график live |
| `/coins` | Arrow / rectangle / fib — без регрессий |
| `/terminal` | Рисование; плашки шкалы не перекрывают HUD |
| Главная / Alerts / Statistics | nav OK |

### Известные ограничения

- Синий флаг: порядок монет на Терминале = порядок добавления в `favorites.blue`
- «Стоит N минут» у плотностей стакана — не реализовано (идея отложена)
- Forex на Bybit: публичный API может вернуть 0 инструментов
- Фаза 4 alerts-cloud split — отложена

## Метки в репозитории

Только **две** git-метки:

| Тег | Роль |
|-----|------|
| `metka-17` | **Текущий** эталон (Терминал + синий флаг + v0.17) |
| `metka-16` | **Предыдущий** эталон (arrow + rectangle + scale labels) |

`metka-15` и старее — удалены.

## Откат

```bash
git fetch --tags
git checkout metka-17   # текущий эталон
git checkout metka-16   # до Терминала / синего флага
```

## Следующий шаг

- Скринер плотностей стакана (идея, отложена)
- Фаза 4 alerts-cloud **или** стабилизация Bybit proxy
- При новой metka-N: `release-marker.js`, `MARKER_N.md`, re-tag; на Главной `v0.N`
