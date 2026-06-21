# Метка 33 — вертикальная панель рисования, zoom UI, иконка индикаторов (июнь 2026)

**Тег:** `metka-33` · **Desktop:** `desktop-v1.0.24`

**Текущий эталон отката.** Предыдущий: [MARKER_32.md](./MARKER_32.md) (`metka-32`).

Проверено: `npm run check:all` (syntax, asset-manifest, site-nav, 41 unit tests) + `desktop npm run bundle:site`.

## Аудит: web vs desktop trade

| Проверка | Статус |
|----------|--------|
| Web `/coins`: `isTradePage === false` | ✅ |
| Trade layer: `cryptoTerminalDesktop.isDesktop` + `trade-page` class | ✅ `trade-desktop-boot.js` |
| Trade CSS не в `coins.html` (только dynamic inject desktop) | ✅ |
| `terminal.html` / dashboard — без изменений trade layout | ✅ |
| Вертикальная панель рисования — только `coins.html` / `coins.css` | ✅ не в terminal |
| Индикаторы, autorerefresh, RSI-fix — корень сайта | ✅ |
| Screener zoom (флаг, ↗, шрифт) — web + desktop bundle | ✅ |
| `trade-open-positions` lazy на web | ✅ `coins-table.js` |
| Positions / overlay / Bybit UI — desktop only | ✅ |

**Вывод:** торговый модуль не монтируется в открытой web-версии. Все общие UI-изменения — в веб и в `.app` через bundle.

## Что добавлено после metka-32

### Монеты — вертикальная панель рисования (web + desktop, не Терминал)

| Компонент | Файлы | Описание |
|-----------|-------|----------|
| Layout TV-style | `coins.html`, `css/coins.css` | `#draw-toolbar` слева от графика, `draw-toolbar-vertical` |
| Структура | `coins-chart-pane`, `charts-stack-panes` | Toolbar + chart/volume/RSI column |
| toolsRoot | `terminal.js` | `charts-stack` вместо topbar |

### Монеты — иконка индикаторов (web + desktop)

| Комponent | Файлы |
|-----------|-------|
| PNG + mask | `icons/chart-indicators.png`, `chart-indicators.css` |
| Topbar divider fix | убран дубль разделителя TF / индикаторы |

### Главная — zoom overlay (web + desktop)

| Комponent | Файлы | Описание |
|-----------|-------|----------|
| Флаг + символ | `screener-widget-zoom.js`, `screener.js` | `wireScreenerFlagWrap()` shared |
| ↗ в Монеты | справа в header, как виджеты | `coins.html?symbol=&tf=` |
| Шрифт символа | `.screener-symbol` | единый с мини-виджетами |
| Fix load | `screener.js` | syntax `wireScreenerFlagWrap` |
| Layout fix | `coins.html` | закрыт `#left` (график не схлопывался) |

### Только desktop (trade) — без изменений в этом релизе

Trade overlay, positions, auto SL/TP — без новых утечек в web.

## Ключевые версии

| Файл | v |
|------|---|
| `release-marker.js` | METKA=33, desktop=1.0.24 |
| `coins.css` | 48 |
| `chart-indicators.css` | 12 |
| `screener.js` | 80 |
| `screener-widget-zoom.js` | 4 |
| `screener.css` | 39 |
| `desktop/package.json` | 1.0.24 |

## Откат

```bash
git fetch --tags
git checkout metka-33   # текущий
git checkout metka-32   # до vertical draw + zoom UI
```

## Smoke

| Платforma | Проверка |
|-----------|----------|
| Web `/coins` | Vertical draw left, indicators icon, v0.33, **нет** trade UI |
| Web `/` | Zoom ПКМ: флаг, ↗, TF, RSI |
| Desktop `/coins` | То же + trade layer |
| Desktop `/terminal` | Горизонтальный draw toolbar (без изменений) |

## Теги

```bash
git tag -a metka-33 -m "metka-33: vertical draw toolbar, screener zoom UI, indicators icon"
git tag -a desktop-v1.0.24 -m "desktop-v1.0.24: bundled UI metka-33"
```
