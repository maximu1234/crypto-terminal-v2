# Метка 39 — trade book polish, stream sync fixes (июнь 2026)

**Тег:** `metka-39` · **Desktop:** `desktop-v1.0.31` (DMG)

Предыдущий: [MARKER_38.md](./MARKER_38.md) — удалён; см. [MARKER_40.md](./MARKER_40.md) (текущий).

Проверено: `npm run check:all`, `npm run bundle:sync`.

## Аудит: web vs desktop trade

| Проверка | Статус |
|----------|--------|
| Web `/terminal`: trade boot только при `cryptoTerminalDesktop.isDesktop` | ✅ |
| `body.trade-page` только desktop | ✅ |
| Trade init — lazy `trade-desktop-boot` / gate `isDesktop` | ✅ |
| Bybit private WS / trading IPC — только Electron main | ✅ |
| `trade-stream-bridge` — gate `trade-page` + `onStream` | ✅ |

## Что вошло после metka-38

### Desktop only — торговля

| Компонент | Описание |
|-----------|----------|
| Панель Позиции/Ордера | Сортировка по колонкам; ордера — тот же стиль строк, клик → график |
| Синхронизация панели | `trade-book-refresh`, `removeStreamOrder`/`removeStreamPosition`; нет смешения строк при смене вкладки |
| Отмена ордера с графика | Работает при активной вкладке «Позиции» (`skipChartOrdersSync`, без лишнего refresh-loop) |
| Закрытие позиции | WS `execution`, reconcile REST, мгновенное удаление из кэша стрима |
| Auto SL/TP | Для stop-order входа (`trade-auto-stops.js`, `maybeApplyAutoStopsForNewPosition`) |
| Клик по строке позиции | Стабильный `pointerup` + `reorderBookRows` без DOM-thrash на каждом тике PnL |
| Разделители блоков | 2px `#2a2e39` — график / список / позиции / индикаторы (как TV) |

## Ключевые версии

| Файл | v |
|------|---|
| `release-marker.js` | METKA=39, desktop=1.0.31 |
| `trade-book-panel.js` | 17 |
| `trade-chart-orders.js` | 13 |
| `trade-positions-cache.js` | 5 |
| `trade-stream-bridge.js` | 3 |
| `trade-auto-stops.js` | 2 |
| `trade-book-panel.css` | 10 |
| `desktop/package.json` | 1.0.31 |

## Откат

```bash
git fetch --tags
git checkout metka-39   # текущий
git checkout metka-38   # предыдущий
```

## Smoke

| Платформа | Проверка |
|-----------|----------|
| Desktop `/terminal` | Позиции ↔ Ордера без артефактов; сортировка колонок |
| Desktop | Клик по строке позиции/ордера → график с первого раза |
| Desktop | Крестик на бейдже ордера при вкладке «Позиции» |
| Desktop | Закрытие позиции / отмена ордера — панель и график в sync |
| Desktop Dock | v0.39 / v1.0.31 |

## Теги

```bash
git tag -a metka-39 -m "metka-39: trade book sync, sorting, stream reconcile"
git tag -a desktop-v1.0.31 -m "desktop-v1.0.31: bundled UI metka-39"
```
