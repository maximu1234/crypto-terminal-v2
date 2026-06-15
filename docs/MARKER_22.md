# Метка 22 — рабочая версия (июнь 2026)

**Тег:** `metka-22` · **Коммит:** `git rev-parse metka-22`

**Текущий эталон отката.** Предыдущая: [MARKER_21.md](./MARKER_21.md) (`metka-21`).

Проверено: asset manifest (python audit, 0 mismatches); site-nav (5 страниц × 7 ссылок). Unit tests — `npm run check:all` (CI / node локально).

## Что добавлено после metka-21

### Монеты — iPad: шкала цены
- **Палец по правой шкале** — вертикальный zoom (кастомная полоска `.price-scale-touch-strip`, `TABLET_LW_NATIVE_PRICE_SCALE=false`)
- **Двойной тап по шкале** — сброс автомасштаба (`autoscaleInfoProvider` с паттерном `original()`, без `() => null`)
- **Рисунки** двигаются плавно при drag шкалы (динамические hooks в `mountTabletPriceScaleTouch`)
- Десктоп: нативный LW на canvas, полоска скрыта — поведение без изменений

### Монеты — горячие клавиши
- **1–6** → таймфреймы **1m / 5m / 15m / 1h / 4h / D** (`bindCoinsTfHotkeys`)
- **Option/Alt + I** → инверсия свечей на странице Монеты

### Рисунки — десктоп
- **Hover-select** как TradingView: наведение мыши показывает опорные точки без клика; уход курсора снимает выделение (`isDesktopDrawHoverSelect`)
- iPad / touch — без изменений (тап для выбора)

### Рисунки — undo (Cmd+Z / Ctrl+Z)
- Отмена последнего сохранённого действия (move, edit, style, create, delete)
- Стек **только для текущего графика в сессии** — сброс при смене монеты, `pagehide`, `destroy`, внешней cloud-sync
- Не перехватывает Cmd+Z в полях ввода

## Ключевые версии ассетов

| Файл | v |
|------|---|
| `release-marker.js` | 7 |
| `screener.js` | 74 |
| `dashboard.js` | 82 |
| `terminal.js` | 307 |
| `terminal/coins-table.js` | 11 |
| `chart/chart-factory.js` | 31 |
| `chart-import.js` | 40 |
| `chart.js` | 147 |
| `chart-widget-host.js` | 9 |
| `drawings/init.js` | 68 |
| `drawings.js` | 211 |
| `asset-manifest.js` | 2 |
| `screener.css` | 32 |
| `terminal.css` | 135 |
| `dashboard.css` | 40 |
| `coins.css` | 39 |
| `critical-shell.css` | 5 |
| `common.css` | 27 |

Полный список: `js/asset-manifest.js` → `node scripts/sync-asset-versions.cjs`.

## Аудит сайта (2026-06-15)

| Проверка | Результат |
|----------|-----------|
| Asset manifest | OK — 124 ассета, 157 файлов, 0 mismatches |
| Site nav | OK — 5 `site-nav-page`, 7 ссылок |
| Unit tests | `npm run check:all` — chart-ruler, draw-magnet, scale-label-layout, draw-hit, fib-spec, drawings-cloud-shapes, position-sizing, page-routes, coins-layout-resize |
| Монеты iPad scale | OK — drag zoom, double-tap reset, drawings sync |
| Монеты hotkeys | OK — 1–6 TF, Alt/Option+I invert |
| Drawings hover | OK — desktop only |
| Drawings undo | OK — Cmd+Z, stack reset on symbol/page leave |
| Главная RSI | OK — metka-21 baseline |
| Фон site/chart | OK — `#16181f` / `#141721` |

### Страницы (inventory)

| URL | Файл | Статус |
|-----|------|--------|
| `/` | `index.html` | screener + **v0.22** + RSI widgets |
| `/coins` | `coins.html` | chart + iPad scale + hotkeys + drawings undo/hover |
| `/terminal` | `terminal.html` | widgets + RSI + alerts |
| `/alerts` | `alerts/index.html` | alerts UI + cloud |
| `/listings` | `listings.html` | Bybit listings |
| `/statistics` | `statistics.html` | kline stats |
| `/trade-calculator` | `trade-calculator.html` | position sizing |
| `/system` | `system/index.html` | admin |
| `/btc-d` | `btc-d.html` | BTC.D |

### Ручной smoke

| Страница | Что проверить |
|----------|----------------|
| `/` | **v0.22**; RSI widgets 4/6; hotkeys 1/2/3 layout |
| `/coins` | iPad: zoom/dbl-tap шкала; **1–6** TF; **Alt+I** invert; hover handles; **Cmd+Z** |
| `/terminal` | widgets RSI ≤6; crosshair + алерт |
| Nav pages | 7 ссылок в шапке |

## Метки в репозитории

| Тег | Роль |
|-----|------|
| `metka-22` | **Текущий** эталон |
| `metka-21` | **Предыдущий** эталон (RSI widgets / ellipsis) |

## Откат

```bash
git fetch --tags
git checkout metka-22   # текущий эталон
git checkout metka-21   # до iPad scale / hover / undo
```
