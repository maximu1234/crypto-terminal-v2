# Метка 16 — рабочая версия (июнь 2026)

**Тег:** `metka-16` · **Коммит:** `git rev-parse metka-16`

**Текущий эталон отката.** Предыдущая: [MARKER_15.md](./MARKER_15.md) (`metka-15`).

Проверено: asset manifest (ручная сверка + CI `check-asset-manifest.cjs`); site-nav (CI `check-site-nav.cjs`); `npm run check:all` — syntax + unit tests (CI / локально при наличии Node).

## Что добавлено после metka-15

### Arrow — стрелка (2 клика)
- Новый инструмент в тулбаре: `data-draw-tool="arrow"`
- Рисование: filled arrow между `p1` / `p2`, масштаб головы от длины линии
- Hit-test, выделение, drag якорей и тела — как trendline
- Стиль: только цвет (толщина линии скрыта в панели)
- Облако: generic push/pull через `user_drawings` (без whitelist по `type`)

### Rectangle — прямоугольник (2 клика)
- Два угла → bbox; 8 handles (4 угла + 4 середины сторон)
- Панель ⚙: border (стиль линии), middle line (стиль/толщина/цвет), background (цвет + opacity slider)
- Заливка и медиана через `drawRectangleShape` + `fillOpacity` / `showMedian` / `showFill`
- Color picker: `onChange` для opacity slider (без закрытия панели настроек)
- Persist defaults: `toolDefaults.rectangle` + `saveToolDefaults("rectangle", …)`

### Иконки тулбара
- `arrow.png` / `rectangle.png` в `assets/draw-toolbar-icons/` (42×43, как остальные)
- Класс `draw-tool-icon--xl` — увеличенный размер **только** для arrow и rectangle (+44% от базового 22px → 41px desktop, 37px coins)
- Остальные иконки: **22×22** (terminal/dashboard), **20×20** (coins topbar) — без изменений

### Новые / изменённые модули
- `js/drawings/arrow-rect.js` v2 — render, hit-test, handles, `normalizeRectangleShape`
- `draw-hit.js` / `draw-render.js` v6 — wiring arrow + rectangle
- `drawings/init.js` v41 — placement, settings panel, hitTest, cloud path
- `draw-color-palette.js` v3 — stopPropagation на opacity slider
- `tests/drawings-cloud-shapes.test.mjs` — merge arrow/rectangle в cloud payload

## Ключевые версии ассетов

| Файл | v |
|------|---|
| `drawings/init.js` | 41 |
| `drawings/arrow-rect.js` | 2 |
| `drawings/draw-render.js` | 6 |
| `drawings/draw-hit.js` | 6 |
| `draw-color-palette.js` | 3 |
| `draw-ui-shared.js` | 20 |
| `draw-toolbar-icon-data.js` | 10 |
| `drawings.js` | 198 |
| `terminal.css` | 118 |
| `dashboard.css` | 28 |
| `coins.css` | 35 |
| `terminal.js` | 290 |
| `chart.js` | 133 |
| `CHART_BUILD_ID` | `20260609-future-timescale-v10` |

Полный список: `js/asset-manifest.js` → `node scripts/sync-asset-versions.cjs`.

## Аудит сайта (2026-06-10)

| Проверка | Результат |
|----------|-----------|
| Asset manifest | OK — ключевые `?v=` совпадают с manifest |
| Site nav | OK — 5 pages, 7 links (CI `check-site-nav.cjs`) |
| Syntax / unit tests | `npm run check:all` (CI); + `drawings-cloud-shapes.test.mjs` |
| Drawings cloud | arrow / rectangle — тот же pipeline: `saveDrawings` → push → merge по `updatedAt` |

### Страницы (inventory)

| URL | Файл | Статус |
|-----|------|--------|
| `/` | `index.html` | screener, nav OK |
| `/coins` | `coins.html` | chart + RSI + drawings (arrow, rectangle) + listings |
| `/terminal` | `terminal.html` | dashboard widgets + draw UI |
| `/alerts` | `alerts/index.html` | alerts UI + cloud |
| `/listings` | `listings.html` | Bybit listings |
| `/statistics` | `statistics.html` | kline stats + bg job |
| `/trade-calculator` | `trade-calculator.html` | position sizing |
| `/system` | `system/index.html` | admin + Supabase usage prefs |
| `/btc-d` | `btc-d.html` | BTC.D page |
| `/btc-dominance-test` | `btc-dominance-test.html` | dev/test (noindex) |
| `screener.html` | redirect → `/` | legacy |

### API (Vercel serverless)

| Route | Назначение |
|-------|------------|
| `GET /api/bybit?path=…` | Bybit REST proxy |
| `GET /api/coingecko?mode=…` | BTC dominance (live + history) |
| `GET /api/twelvedata?…` | Twelve Data proxy (Forex/stocks klines) |

### Spine / модули

| Facade | Состояние |
|--------|-----------|
| `drawings.js` → `drawings/*` | prod, init v41, arrow-rect v2 |
| `drawings-cloud-sync.js` | barrel → sync-lifecycle / worker-client / pull-reconcile |
| `chart.js` | chart-options, dom-crosshair, factory |
| `site-boot.js` | auth, cloud, lazy sync |
| `alerts-cloud-sync.js` | монолит; `alerts-cloud/*` prep, не wired |

### Ручной smoke (новое + регрессия)

| Страница | Что проверить |
|----------|----------------|
| `/coins` | Arrow: 2 клика, выделение, drag, цвет |
| `/coins` | Rectangle: заливка, медиана, opacity slider, border style |
| `/coins` | Облако: создать arrow/rect → reload / второе устройство |
| `/terminal` | Arrow + rectangle на виджете |
| `/coins` | Fib / Long-Short / trendline — без регрессий metka-15 |
| `/system` | disableDrawingsCloud → локально; включить → merge |
| Главная / Statistics / Alerts | nav OK |

### Известные ограничения

- Forex на Bybit: публичный API может вернуть 0 инструментов
- Фаза 4 refactor: split `alerts-cloud-sync.js` — отложена
- Color picker CSS дублирован в `terminal.css` + `dashboard.css` (намеренно)
- Arrow icon крупнее остальных (намеренно, класс `--xl`)
- После смены prefs в `/system` — F5 на вкладках графика

## Метки в репозитории

Только **две** git-метки:

| Тег | Роль |
|-----|------|
| `metka-16` | **Текущий** эталон (arrow + rectangle) |
| `metka-15` | **Предыдущий** эталон (fib polish, long/short, TV color picker) |

Старые `metka-14` и прочие удалены.

## Откат

```bash
git fetch --tags
git checkout metka-16   # текущий эталон
git checkout metka-15   # до arrow / rectangle
```

## Следующий шаг

- Фаза 4 alerts-cloud **или** стабилизация Bybit proxy
- После крупных правок: `sync-asset-versions` → `check:all` → обновить эту метку (re-tag `metka-16`)
- При новой metka-N: обновить `js/release-marker.js` (`METKA_NUMBER = N` → на Главной `v0.N`)
