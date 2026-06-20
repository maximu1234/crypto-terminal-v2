# Метка 30 — торговля на Терминале + позиция → объём (июнь 2026)

**Тег:** `metka-30` · **Desktop:** `desktop-v1.0.21`

Предыдущий эталон: [MARKER_29.md](./MARKER_29.md) (`metka-29`). Следующий: [MARKER_31.md](./MARKER_31.md) (`metka-31`).

Проверено: `npm run check:all` (syntax, asset-manifest, site-nav, 38 unit tests).

## Что добавлено после metka-29

### Торговля на Терминале (desktop-only)

| Компонент | Файлы | Описание |
|-----------|-------|----------|
| Per-widget trade | `js/trade-widget-mount.js`, `js/trade-desktop-boot.js` | Объём, Buy/Sell, overlay, orders на каждом виджете `/terminal.html` |
| Compact UI | `css/trade-widget-compact.css` | Компактные контролы в шапке виджета |
| Lazy boot | `js/dashboard.js`, `terminal.html` | Trade-модули только при `cryptoTerminalDesktop.isDesktop` |

### Long/Short → объём сделки

| Компонент | Описание |
|-----------|----------|
| «Применить» | Кнопка в панели Long/Short — объём с жёлтой плашки → 6-й пресет USDT |
| 5 дефолтов Bybit | В настройках Bybit — 5 полей (6-й слот — auto из позиции) |
| `trade-volume-presets.js` | `applyPositionVolumeFromDrawing()`, событие `trade-apply-position-volume` |

### Исправления (desktop)

| Проблема | Фикс |
|----------|------|
| Стоп-лосс ($) не сохранялся | Импорт `parseMoneyInput` в `draw-style-bar.js` |
| Selection сбрасывалась при blur | `pinDrawingSelection` + `releaseDrawingSelectionPin` |
| Bybit 500 на `127.0.0.1` | `isLocalDevHost()` исключает `cryptoTerminalDesktop.isDesktop` |
| Alerts `Assignment to constant` | Сеттеры `setAlertsRealtimeChannel/UserId` в `debug.js` |
| Терминал не грузился | Синтаксис `polling-realtime.js` (закрытие `setAlertsRealtimeChannel`) |
| Объём не в пресет | `getPositionEntryVolumeUsd` вынесен из `resolvePositionRiskTarget` |

## Аудит (metka-30)

| Проверка | Статус |
|----------|--------|
| Торговля только desktop `.app` (`trade-page` + bridge) | ✅ |
| Web / iPad / smartphone без trade UI | ✅ |
| Long/Short: стоп ($) → объём на объекте | ✅ |
| «Применить» → 6-й пресет активен | ✅ |
| Terminal: trade per-widget | ✅ |
| Bybit settings: 5 default volumes | ✅ |
| Import `?v=` ↔ `asset-manifest.js` | ✅ CI |
| JS syntax + unit tests | ✅ CI |

## Ключевые версии

| Файл | v |
|------|---|
| `release-marker.js` | METKA=30, desktop=1.0.21 |
| `draw-style-bar.js` | 8 |
| `trade-volume-presets.js` | 7 |
| `trade-widget-mount.js` | 4 |
| `trade-chart-overlay.js` | 14 |
| `drawings/init.js` | 101 |
| `desktop/package.json` | 1.0.21 |

## Откат

```bash
git fetch --tags
git checkout metka-30   # текущий
git checkout metka-29   # до terminal-trade + position→volume
```

## Smoke

| Платформа | Проверка |
|-----------|----------|
| Desktop `/coins` | Buy/Sell, SL/TP, объёмы, позиция Long → Применить |
| Desktop `/terminal` | Trade на виджете, объём sync |
| Desktop | Bybit keys, пинг, 5 default volumes |
| Web `/` | v0.30, без trade UI |
| iPad | charts/drawings, без trade |

## Теги

```bash
git tag -a metka-30 -m "metka-30: terminal trade, position volume apply, desktop fixes"
git tag -a desktop-v1.0.21 -m "desktop-v1.0.21: bundled UI metka-30"
```
