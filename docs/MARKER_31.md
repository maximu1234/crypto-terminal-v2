# Метка 31 — zoom screener, auto SL/TP, drag ордеров, «+» над позицией (июнь 2026)

**Тег:** `metka-31` · **Desktop:** `desktop-v1.0.22`

**Текущий эталон отката.** Предыдущий: [MARKER_30.md](./MARKER_30.md) (`metka-30`).

Проверено: `npm run check:all` (syntax, asset-manifest, site-nav, 38 unit tests).

## Что добавлено после metka-30

### Главная — zoom графика (ПКМ)

| Компонент | Файлы | Описание |
|-----------|-------|----------|
| Overlay ~70% | `js/screener-widget-zoom.js`, `css/screener.css` | ПКМ на виджет — увеличенный график; повторный ПКМ — закрыть |
| TF + RSI | `screener-widget-zoom.js` | Переключение таймфреймов, ценовая шкала, RSI 74/26 как на screener |
| Boot | `js/screener.js` | `mountScreenerWidgetZoom()` |

### Auto SL/TP при входе (desktop)

| Компонент | Файлы | Описание |
|-----------|-------|----------|
| Настройки | `js/trade-auto-stops.js`, `js/trade-exchange-settings.js` | SL/TP в USDT в dropdown Bybit |
| Применение | `trade-market-entry.js`, `trade-widget-mount.js` | После рыночного входа — `setPositionStop` |

### Drag лимитных / триггерных ордеров

| Проблема | Фикс |
|----------|------|
| Линия двигалась на короткое расстояние | `clientYToPrice` через `chartEl`, listeners на `document` |
| Рывки / залипание | Стабильный layout key при drag, `scheduleDragRedraw()` (1 кадр) |

### «+» у шкалы vs объект Позиция

| Проблема | Фикс |
|----------|------|
| Клик по «+» / меню ордеров не работал над Long/Short | `isDrawChromeTarget`: plus, menu, trade badges в исключениях (`draw-edit-desktop.js`) |

## Аудит (metka-31)

| Проверка | Статус |
|----------|--------|
| Screener zoom: TF, шкала, RSI, live kline | ✅ |
| Auto SL/TP: settings + market entry (coins + terminal) | ✅ |
| Order drag: плавно, полная дистанция | ✅ |
| Plus / order menu кликабельны над Position | ✅ |
| Import `?v=` ↔ `asset-manifest.js` | ✅ CI |
| JS syntax + unit tests | ✅ CI |

## Ключевые версии

| Файл | v |
|------|---|
| `release-marker.js` | METKA=31, desktop=1.0.22 |
| `screener-widget-zoom.js` | 2 |
| `trade-auto-stops.js` | 1 |
| `trade-chart-orders.js` | 7 |
| `trade-exchange-settings.js` | 9 |
| `drawings/draw-edit-desktop.js` | 5 |
| `drawings/init.js` | 102 |
| `screener.css` | 38 |
| `desktop/package.json` | 1.0.22 |

## Откат

```bash
git fetch --tags
git checkout metka-31   # текущий
git checkout metka-30   # до zoom + auto SL/TP + order drag
```

## Smoke

| Платформа | Проверка |
|-----------|----------|
| Web `/` | ПКМ zoom, TF, RSI, v0.31 |
| Desktop `/coins` | Auto SL/TP, drag orders, «+» над Position |
| Desktop `/terminal` | Trade widget, drag orders, «+» над Position |
| Desktop | Bybit → Auto SL/TP USDT |

## Теги

```bash
git tag -a metka-31 -m "metka-31: screener zoom, auto SL/TP, order drag, plus over position"
git tag -a desktop-v1.0.22 -m "desktop-v1.0.22: bundled UI metka-31"
```
