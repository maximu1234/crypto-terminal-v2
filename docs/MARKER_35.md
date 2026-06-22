# Метка 35 — шаблоны рисования, TF focus, veil, trade book (июнь 2026)

**Тег:** `metka-35` · **Desktop:** `desktop-v1.0.27` (DMG)

Предыдущий эталон. Актуальный: [MARKER_36.md](./MARKER_36.md) (`metka-36` / `desktop-v1.0.28`).

Проверено: `npm run check:all` (syntax, asset-manifest, desktop bundle, site-nav, **47** unit tests).

## Аудит: web vs desktop trade

| Проверка | Статус |
|----------|--------|
| Web `/coins`: `isTradePage() === false` | ✅ |
| `body.trade-page` только при `cryptoTerminalDesktop.isDesktop` | ✅ |
| Trade CSS — dynamic inject, не в `coins.html` | ✅ |
| Trade init — gate `trade-page` / `isDesktop` | ✅ |
| Web: нет trade UI в DOM на `/coins` | ✅ |
| `trade-book-panel`, overlay, volume — только desktop trade | ✅ |

**Замечание (не регрессия):** `coins-page-boot.js` статически импортирует `trade-desktop-boot.js`; на web init no-op, модуль парсится без монтирования UI. `draw-style-bar.js` — static import `trade-volume-presets.js`, вызов только при `trade-page`.

**Вывод:** торговый слой не утекает в открытую web-версию. Общие фичи — в веб и `.app` (bundle-site при сборке DMG).

## Что вошло после metka-34

### Рисование (web + desktop)

| Компонент | Описание |
|-----------|----------|
| Шаблоны настроек | `draw-templates.js`, иконка template, Save / Apply Default / список / удаление |
| Apply Default | Заводские дефолты (`buildFactoryDefaultSnapshot`), не `toolDefaults` |
| Объекты | trendline, hray, fib, channel, arrow, rectangle (не Long/Short) |

### Монеты / UX (web + desktop)

| Компонент | Описание |
|-----------|----------|
| TF + Space | Клик по таймфрейму не держит focus; Space листает монеты |
| Chart switch veil | Затемнение stack (candles + Vol + RSI), badges не исчезают раньше veil |
| Mobile layout | `coins.css` — flex column на узком viewport |

### Desktop trade only

| Компонент | Описание |
|-----------|----------|
| Trade book tickers | Клик по тикеру позиции → смена символа на графике |
| SL/TP drag | Badge синхрон с линией (double rAF redraw) |

### Инфра / prefs

| Компонент | Описание |
|-----------|----------|
| Alerts cloud disabled | Client + worker guard, migration SQL |
| Manifest / CI | Версии синхронизированы, `check:all` OK |

## Ключевые версии

| Файл | v |
|------|---|
| `release-marker.js` | METKA=35, desktop=1.0.27 |
| `terminal.js` | 336 |
| `draw-style-bar.js` | 11 |
| `draw-templates.js` | 3 |
| `terminal.css` | 153 |
| `coins.css` | 51 |
| `desktop/package.json` | 1.0.27 |

## Откат

```bash
git fetch --tags
git checkout metka-35   # текущий
git checkout metka-34   # предыдущий
```

## Smoke

| Платформа | Проверка |
|-----------|----------|
| Web `/coins` | TF → Space листает монеты; шаблоны рисования; v0.35; **нет** trade UI |
| Web `/` | Screener без console errors |
| Desktop `/coins` | Trade book, шаблоны, veil при смене монеты |
| Desktop Dock | v0.35 / v1.0.27 после rebuild DMG |

## Теги

```bash
git tag -a metka-35 -m "metka-35: draw templates, TF focus, veil, trade book tickers"
git tag -a desktop-v1.0.27 -m "desktop-v1.0.27: bundled UI metka-35"
```
