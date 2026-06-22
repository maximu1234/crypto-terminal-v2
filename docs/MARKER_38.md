# Метка 38 — realtime trade, AO, UI polish (июнь 2026)

**Тег:** `metka-38` · **Desktop:** `desktop-v1.0.30` (DMG)

**Текущий эталон отката.** Предыдущий: [MARKER_37.md](./MARKER_37.md) (`metka-37` / `desktop-v1.0.29`).

Проверено: `npm run check:all`, `npm run bundle:sync`.

## Аудит: web vs desktop trade

| Проверка | Статус |
|----------|--------|
| Web `/terminal`: trade boot только при `cryptoTerminalDesktop.isDesktop` | ✅ |
| `body.trade-page` только desktop | ✅ |
| Trade init — lazy `trade-desktop-boot` / gate `isDesktop` | ✅ |
| Web: trade-модули не грузятся на `/terminal` без desktop | ✅ |
| `watchlist.html` trade boot — только `isDesktop` | ✅ |
| Bybit private WS / trading IPC — только Electron main | ✅ |
| `trade-stream-bridge` — gate `trade-page` + `onStream` | ✅ |

## Что вошло после metka-37

### Web + desktop

| Компонент | Описание |
|-----------|----------|
| Awesome Oscillator | Индикатор AO на Терминале (pane + math + тест) |
| iPad crosshair | `chart-dom-crosshair.js` — probe относительно `#charts-stack-panes` |
| Focus после select | `focus-blur-after-pick.js` + CSS для select/выпадашек |
| Watchlist TF | `blur()` после смены TF в виджете |
| `#market-filter` / trade-book mode | blur + outline:none |

### Desktop only

| Компонент | Описание |
|-----------|----------|
| Bybit private WS | `bybit-private-ws.cjs` + `trading-stream.cjs` — position/order push |
| Live PnL | `trade-positions-live.js` — ticker mark price, единый кэш |
| Trade UI sync | Панель позиций, бейджи и линии на графике без polling |
| Dock icon | Safe zone ~824px на canvas 1024 |

## Ключевые версии

| Файл | v |
|------|---|
| `release-marker.js` | METKA=38, desktop=1.0.30 |
| `trade-desktop-boot.js` | 11 |
| `trade-stream-bridge.js` | 2 |
| `trade-positions-cache.js` | 3 |
| `focus-blur-after-pick.js` | 1 |
| `desktop/package.json` | 1.0.30 |

## Откат

```bash
git fetch --tags
git checkout metka-38   # текущий
git checkout metka-37   # предыдущий
```

## Smoke

| Платформа | Проверка |
|-----------|----------|
| Web `/terminal` | График, AO, нет trade book |
| Desktop `/terminal` | Позиции/ордера обновляются live, PnL в бейдже = панели |
| Desktop `/watchlist` | Trade на виджетах |
| Select focus | Нет оранжевого кольца после выбора |
| Desktop Dock | v0.38 / v1.0.30 |

## Теги

```bash
git tag -a metka-38 -m "metka-38: realtime trade stream, AO, focus/select fixes"
git tag -a desktop-v1.0.30 -m "desktop-v1.0.30: bundled UI metka-38"
```
