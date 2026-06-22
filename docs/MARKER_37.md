# Метка 37 — переименование страниц, иконка desktop, EMA ribbon (июнь 2026)

**Тег:** `metka-37` · **Desktop:** `desktop-v1.0.29` (DMG)

**Текущий эталон отката.** Предыдущий: [MARKER_36.md](./MARKER_36.md) (`metka-36` / `desktop-v1.0.28`).

Проверено: `npm run check:all`, `npm run bundle:sync`.

## Аудит: web vs desktop trade

| Проверка | Статус |
|----------|--------|
| Web `/terminal`: `isTradePage() === false` | ✅ |
| `body.trade-page` только при `cryptoTerminalDesktop.isDesktop` | ✅ |
| Trade init — gate `isDesktop` / `isWatchlistTradeMode` | ✅ |
| Web: trade-модули **не грузятся** на `/terminal` и `/watchlist` | ✅ lazy import |
| `watchlist.html` trade boot — только `isDesktop` | ✅ |
| Trading IPC — только Electron | ✅ |
| Дневник `/diary/` — runtime gate desktop | ✅ |

## Что вошло после metka-36

### Web + desktop

| Компонент | Описание |
|-----------|----------|
| Переименование страниц | **Скринер** (`/`, `/screener`), **Терминал** (`/terminal`), **Вотчлист** (`/watchlist`) |
| Legacy redirects | `/index`→Скринер, `/coins`→Терминал; `vercel.json` |
| Навигация | Подписи Скринер / Терминал / Вотчлист во всех шапках |
| EMA Shift Ribbon | Смена TF не сбрасывает viewport в начало истории (`settleChartViewport`) |
| `page-routes.js` | `isScreenerPage`, `isTerminalPage`, `isWatchlistPage` + deprecated aliases |

### Desktop only

| Компонент | Описание |
|-----------|----------|
| Иконка Dock | `desktop/build/icon.png` — сквиркл с градиентом (как в макете) |
| Торговля | Терминал + Вотчлист — lazy `trade-desktop-boot` / `trade-widget-mount` |

## Ключевые версии

| Файл | v |
|------|---|
| `release-marker.js` | METKA=37, desktop=1.0.29 |
| `terminal-page-boot.js` | 18+ |
| `indicators/ema-shift-ribbon.js` | 5 |
| `desktop/package.json` | 1.0.29 |

## Откат

```bash
git fetch --tags
git checkout metka-37   # текущий
git checkout metka-36   # предыдущий
```

## Smoke

| Платформа | Проверка |
|-----------|----------|
| Web `/` | Редирект / Скринер, нет trade UI |
| Web `/terminal` | Графики, нет `trade-desktop-boot.js` в Network |
| Web `/watchlist` | Виджеты, нет trade UI |
| Desktop `/terminal` | Trade book на Терминале |
| Desktop `/watchlist` | Trade на виджетах |
| Desktop Dock | v0.37 / v1.0.29, новая иконка |

## Теги

```bash
git tag -a metka-37 -m "metka-37: page rename, desktop icon, EMA ribbon TF fix"
git tag -a desktop-v1.0.29 -m "desktop-v1.0.29: bundled UI metka-37"
```
