# Метка 15 — рабочая версия (июнь 2026)

**Тег:** `metka-15` · **Коммит:** `git rev-parse metka-15`

**Текущий эталон отката.** Предыдущая: [MARKER_14.md](./MARKER_14.md) (`metka-14`).

Проверено: asset manifest (ручная сверка + CI `check-asset-manifest.cjs`); site-nav (CI `check-site-nav.cjs`); `npm run check:all` — syntax + unit tests (CI / локально при наличии Node).

## Что добавлено после metka-14

### Рисование — color picker (TradingView-style)
- `draw-color-palette.js` v2: палитра 10×8, opacity 0–100%, `parseDrawColor` / `formatDrawColor` / `mountTvColorPicker`
- Стили в `terminal.css` v112 (`/coins`) и `dashboard.css` v22 (`/terminal`) — dashboard не грузит `terminal.css`

### Fibonacci — настройки уровней
- Глобальные «Levels line»: стиль и толщина линии
- Per-level: checkbox, узкое поле ratio, цвет через новый picker
- Иконка настроек: inline SVG (hex + nut) в `draw-ui-shared.js` v14
- Persist: `touchShapeRevision` + defer cloud sync пока открыта панель fib (`shouldDeferExternalDrawingsSync`)
- `fib-spec.js`: rgba в дополнение к hex

### Long / Short — позиции
- Дефолты `long`/`short` в `loadToolDefaults`; risk USD не сбрасывается при фокусе input
- Drag в «будущее» без свечей: extrapolation `timeFromX`, `defaultPositionP2` для future
- **Min-width только при создании** — после установки объект можно сжать без отскока на mouseup
- Handle drag: `preserveTpSl`, мягкий clamp TP/SL без сброса к дефолтным %

### Облако рисунков (документировано)
- `disableDrawingsCloud` в `/system`: только localStorage, без push/pull
- При включении обратно: `hydrateDrawingsAfterAuth` → push + reconcile + merge по `updatedAt` (не слепая перезапись)
- Удаление с другого устройства пропагируется через reconcile (если shape был синхронизирован)

## Ключевые версии ассетов

| Файл | v |
|------|---|
| `drawings/init.js` | 36 |
| `drawings.js` | 198 |
| `draw-color-palette.js` | 2 |
| `draw-ui-shared.js` | 14 |
| `draw-toolbar-icon-data.js` | 8 |
| `dashboard-draw-ui.js` | 14 |
| `fib-spec.js` | 9 |
| `terminal.css` | 112 |
| `dashboard.css` | 22 |
| `terminal.js` | 289 |
| `chart.js` | 133 |
| `CHART_BUILD_ID` | `20260609-future-timescale-v10` |

Полный список: `js/asset-manifest.js` → `node scripts/sync-asset-versions.cjs`.

## Аудит сайта (2026-06-10)

| Проверка | Результат |
|----------|-----------|
| Asset manifest | OK после sync `drawings.js` → init v36 |
| Site nav | OK — 5 pages, 7 links (CI) |
| Stale `?v=` | исправлен `drawings.js` (был v35 при manifest 36) |
| Syntax / unit tests | `npm run check:all` (CI) |

### Страницы (inventory)

| URL | Файл | Статус |
|-----|------|--------|
| `/` | `index.html` | screener, nav OK |
| `/coins` | `coins.html` | chart + RSI + drawings + listings |
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
| `drawings.js` → `drawings/*` | prod, init v36 |
| `drawings-cloud-sync.js` | barrel → sync-lifecycle / worker-client / pull-reconcile |
| `chart.js` | chart-options, dom-crosshair, factory |
| `site-boot.js` | auth, cloud, lazy sync |
| `alerts-cloud-sync.js` | монолит; `alerts-cloud/*` prep, не wired |

### Ручной smoke

| Страница | Что проверить |
|----------|----------------|
| `/coins` | Fib: панель настроек, цвет/opacity, persist после reload |
| `/coins` | Long/Short: создание, сжатие width, drag в future, risk USD |
| `/coins` | Color picker на trendline / fib level |
| `/terminal` | Рисование на виджете (dashboard.css picker) |
| `/system` | disableDrawingsCloud → локально; включить → merge |
| Главная / Statistics / Alerts | nav, без регрессий metka-14 |

### Известные ограничения

- Forex на Bybit: публичный API может вернуть 0 инструментов
- Фаза 4 refactor: split `alerts-cloud-sync.js` — отложена
- Color picker CSS дублирован в `terminal.css` + `dashboard.css` (намеренно)
- `icons/draw-settings-nut.png` — не используется (UI на inline SVG)
- После смены prefs в `/system` — F5 на вкладках графика

## Метки в репозитории

Только **две** git-метки:

| Тег | Роль |
|-----|------|
| `metka-15` | **Текущий** эталон |
| `metka-14` | **Предыдущий** эталон (Statistics, future scale, crosshair) |

Старые `metka-12`, `metka-13` и их MARKER_*.md удалены.

## Откат

```bash
git fetch --tags
git checkout metka-15   # текущий эталон
git checkout metka-14   # до drawings polish / fib / long-short fixes
```

## Следующий шаг

- Фаза 4 alerts-cloud **или** стабилизация Bybit proxy
- После крупных правок: `sync-asset-versions` → `check:all` → обновить эту метку (re-tag `metka-15`)
