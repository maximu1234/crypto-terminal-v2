# Метка 19 — рабочая версия (июнь 2026)

**Тег:** `metka-19` · **Коммит:** `git rev-parse metka-19`

**Предыдущий эталон отката.** Текущая: [MARKER_20.md](./MARKER_20.md) (`metka-20`).

Проверено: asset manifest (python audit + `check-asset-manifest.cjs` в CI); site-nav (7 ссылок на 5 страницах); unit tests — см. список ниже.

## Что добавлено после metka-18

### Сайт — фон charcoal (без синего slate)
- Палитра: `#0f141a` / `#13181e` / `#171b21` — токены в `css/critical-shell.css`
- Массовая замена `#0b1220`, `#0f172a`, `#111827` во всех CSS, HTML, `chart-factory.js`
- `common.css` v26 — единые стили TV color picker

### Палитра цвета рисования (TradingView)
- `draw-color-palette.js` v6 — таблица 8×10 (серый ряд → насыщенный → градиенты по колонкам)
- Окно −10%, gap +20%, двойной зазор между 2-м и 3-м рядом
- Слайдер Opacity: градиент по шахматке, thumb 13px

### Монеты — резиновый layout
- `coins-layout-resize.js`, `coins-layout-math.js` — drag между chart / RSI / table
- `tests/coins-layout-resize.test.mjs`

### Линейка (Shift)
- `chart-ruler.js` v8 — «плечи» ±20px по горизонтали у курсора
- Слой поверх crosshair (`chart-ruler-active`)

### UI / UX
- Screener widget header: % → объём → ↗ (белая стрелка, двойной gap)
- Coins tab title: `SYMBOL.P — Multichart`
- **Arrow:** в плавающем меню скрыта толщина линии (`updateAlertStyleUI` больше не снимает `hidden`)
- Drawings redraw при resize панелей

### Главная — подпись версии
- `js/release-marker.js` → **v0.19** после `#screener-desktop-tf`

## Ключевые версии ассетов

| Файл | v |
|------|---|
| `release-marker.js` | 4 |
| `screener.js` | 71 |
| `terminal.js` | 300 |
| `dashboard.js` | 80 |
| `drawings/init.js` | 65 |
| `drawings/chart-ruler.js` | 8 |
| `drawings.js` | 211 |
| `draw-color-palette.js` | 6 |
| `chart-widget-host.js` | 8 |
| `chart.js` | 134 |
| `coins-layout-resize.js` | 4 |
| `asset-manifest.js` | 2 |
| `common.css` | 26 |
| `critical-shell.css` | 3 |
| `terminal.css` | 124 |
| `dashboard.css` | 35 |
| `coins.css` | 37 |
| `screener.css` | 27 |

Полный список: `js/asset-manifest.js` → `node scripts/sync-asset-versions.cjs`.

## Аудит сайта (2026-06-14)

| Проверка | Результат |
|----------|-----------|
| Asset manifest | OK — версии `?v=` совпадают с `asset-manifest.js` |
| Site nav | OK — 7 ссылок на alerts, listings, trade-calculator, statistics, system |
| Unit tests | `chart-ruler`, `draw-magnet`, `scale-label-layout`, `draw-hit`, `fib-spec`, `drawings-cloud-shapes`, `position-sizing`, `page-routes`, `coins-layout-resize` |
| Фон сайта | OK — charcoal `#0f141a`, без legacy blue |
| Color picker | OK — палитра по таблице, размеры TV |
| Coins layout | OK — resize + redraw drawings |
| Arrow toolbar | OK — без выбора толщины |

### Страницы (inventory)

| URL | Файл | Статус |
|-----|------|--------|
| `/` | `index.html` | screener + **v0.19** + nav OK |
| `/coins` | `coins.html` | chart + RSI + resize + drawings |
| `/terminal` | `terminal.html` | dynamic grid, screener CSS |
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
| `/` | Подпись **v0.19**; фон charcoal; screener grid |
| `/coins` | Resize панелей; tab title; color picker; Arrow без «1px» |
| `/coins` | Shift-линейка; Cmd-магнит |
| `/terminal` | Виджеты, рисование, фон |
| Nav pages | 7 ссылок в шапке |

### Известные ограничения

- Линейка — desktop (Shift + мышь)
- Магнит — **Cmd** (Meta), не Ctrl на Windows
- `npm run check:all` — требует Node.js локально; CI на GitHub

## Метки в репозитории

Только **две** git-метки:

| Тег | Роль |
|-----|------|
| `metka-20` | **Текущий** эталон — см. [MARKER_20.md](./MARKER_20.md) |
| `metka-19` | **Предыдущий** эталон (этот документ) |

`metka-18` и старее — удалены.

## Откат

```bash
git fetch --tags
git checkout metka-20   # текущий эталон
git checkout metka-19   # charcoal / color picker / coins resize
```

## Следующий шаг

- Ctrl как магнит на Windows
- Фаза 4 alerts-cloud **или** стабилизация Bybit proxy
