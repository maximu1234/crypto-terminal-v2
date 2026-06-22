# Метка 34 — refactor coins/screener, brand logo, bundle CI (июнь 2026)

**Тег:** `metka-34` · **Desktop:** `desktop-v1.0.26`

Предыдущий эталон. Актуальный: [MARKER_35.md](./MARKER_35.md) (`metka-35` / `desktop-v1.0.27`).

Проверено: `npm run check:all` (syntax, asset-manifest, desktop bundle, site-nav, **47** unit tests) + `npm run bundle:sync`.

## Аудит: web vs desktop trade

| Проверка | Статус |
|----------|--------|
| Web `/coins`: `isTradePage() === false` | ✅ `page-routes.js`, unit tests |
| `body.trade-page` только при `cryptoTerminalDesktop.isDesktop` | ✅ `trade-desktop-boot.js` |
| Trade CSS — dynamic inject, не в `coins.html` | ✅ + `preload` только desktop |
| `trade-open-positions` — lazy import на web | ✅ `coins-table.js` |
| `trade-volume-presets` в `loadSymbol` — только `isTradePage` | ✅ `terminal.js` |
| Trade init (`initTradeVolumePresets`, overlay, book) — `trade-page` gate | ✅ |
| Dashboard trade — `trade-widget-mount` только desktop | ✅ `dashboard.js` |
| Web: нет trade UI в DOM при открытом `/coins` | ✅ |

**Замечание (не регрессия):** `draw-style-bar.js` статически импортирует `applyPositionVolumeFromDrawing` из `trade-volume-presets.js`; вызов только при `body.trade-page`. На web модуль парсится, UI не монтируется.

**Вывод:** торговый слой не утекает в открытую web-версию. Общие изменения — в веб и в `.app` через `site-bundle`.

## Что вошло после metka-33

### Refactor / performance (web + desktop)

| Область | Файлы | Описание |
|---------|-------|----------|
| Split `terminal.js` | `terminal/coins-chart-layout.js`, `coins-chart-switch-veil.js` | resize, viewport, symbol veil |
| Entry alias | `coins-page.js` → `terminal.js` | naming: Монеты ≠ `terminal.html` |
| CSS diet `/coins` | `coins.html` | убран `dashboard.css`; draw-tools в `coins.css` |
| Screener WS pause | `screener.js`, `screener-widget-guard.js` | kline off-screen; guard при пагинации |
| Chart zoom timers | `chart-factory.js` | `shouldContinue` — нет `Object is disposed` |
| Cloud boot defer | `site-boot.js` | idle на `/coins` после chart ready |
| Draw redraw | `draw-redraw-loop.js` | skip при `document.hidden` |

### Инфраструктура

| Компонент | Описание |
|-----------|----------|
| `npm run bundle:check` / `bundle:sync` | drift `desktop/site-bundle` vs web |
| CI + `check:all` | desktop bundle step |
| Unit tests | `page-routes` trade matrix, layout toolbar 46px, screener guard |

### UI / бренд (web + desktop)

| Компонент | Файлы |
|-----------|-------|
| Логотип в шапке | `icons/brand-logo.png`, все `#logo` в HTML |
| Favicon | `index.html`, `coins.html`, `btc-d.html` |
| Desktop app icon | `desktop/build/icon.png` 1024×1024 |
| Позиции в списке монет | `terminal.css` — приглушённый `.has-position` (desktop trade) |

### Исправления багов

| Баг | Фикс |
|-----|------|
| Пустой график `/coins` | `viewportSettleRaf` / `chartSwitchVeil` scope |
| `getCandles` в layout | `coins-chart-layout.js` getters |
| Screener `Object is disposed` | unlink time-scales + zoom timer guards |

## Ключевые версии

| Файл | v |
|------|---|
| `release-marker.js` | METKA=34, desktop=1.0.26 |
| `terminal.js` | см. `asset-manifest.js` |
| `coins-page.js` | 1 |
| `screener.js` | 83 |
| `terminal.css` | 150 |
| `common.css` | 29 |
| `desktop/package.json` | 1.0.26 |

## Откат

```bash
git fetch --tags
git checkout metka-34   # текущий
git checkout metka-33   # до refactor + logo
```

## Smoke

| Платформа | Проверка |
|-----------|----------|
| Web `/coins` | График, logo, v0.34, **нет** trade UI |
| Web `/` | Пагинация screener без console errors |
| Desktop `/coins` | Logo, trade layer, muted position rows |
| Desktop Dock | Иконка после rebuild `.dmg` |

## Теги

```bash
git tag -a metka-34 -m "metka-34: coins refactor, screener perf, brand logo, bundle CI"
git tag -a desktop-v1.0.25 -m "desktop-v1.0.25: bundled UI metka-34"
git tag -a desktop-v1.0.26 -m "desktop-v1.0.26: coins veil, mobile layout, SL/TP drag, alerts prefs"
```
