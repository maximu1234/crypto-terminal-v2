# Метка 36 — дневник сделок, алерты offline, аудит web/desktop (июнь 2026)

**Тег:** `metka-36` · **Desktop:** `desktop-v1.0.28` (DMG)

**Предыдущий эталон отката** (до metka-37). Текущий: [MARKER_37.md](./MARKER_37.md) (`metka-37` / `desktop-v1.0.29`).

Проверено: `npm run check:all` (syntax, asset-manifest, desktop bundle, site-nav, unit tests).

## Аудит: web vs desktop trade

| Проверка | Статус |
|----------|--------|
| Web `/coins`: `isTradePage() === false` | ✅ |
| `body.trade-page` только при `cryptoTerminalDesktop.isDesktop` | ✅ |
| Trade init — gate `trade-page` / `isDesktop` | ✅ |
| Web: trade-модули **не грузятся** на `/coins` и `/terminal` | ✅ lazy import |
| Trading IPC — только Electron (`preload` + `register-ipc`) | ✅ |
| Дневник `/diary/` — данные только через `cryptoTerminalDesktop.trading` | ✅ |
| Ссылка «Дневник» — desktop + owner email | ✅ `trade-diary-nav.js` |
| Alerts cloud disabled — локальные алерты не reconcile | ✅ registry-sync + polling |

**Замечание:** `/diary/` и исходники `trade-diary-*` доступны по URL на вебе (runtime gate, без торговых API). Это осознанно: тот же статический деплой, что и `.app` bundle.

## Что вошло после metka-35

### Web + desktop

| Компонент | Описание |
|-----------|----------|
| Алерты offline | При «Отключить облачные алерты» reconcile/pull не удаляют локальные строки |
| Registry sync | `pullRegistryFromCloudNow` / `reconcile` early-return при disabled |
| Polling | fast poll, iOS/fallback — не трогают реестр без облака |

### Desktop only

| Компонент | Описание |
|-----------|----------|
| Дневник сделок | `/diary/` — closed PnL Bybit, период, деталь сделки |
| График в детали | Свечи, TF 1m–1D, маркеры вход/выход, линейная шкала |
| Деталь сделки | Таблица исполнений; «Вход»/«Выход» по цвету стороны (long/short) |
| Backend | `getClosedPnlHistory`, `getTradeDiaryDetail` (chunked 7d API) |

### Инфра

| Компонент | Описание |
|-----------|----------|
| Web isolation | `coins-page-boot` / `terminal.html` — lazy `trade-desktop-boot` |
| Bundle CI | `diary/screener.html` в `check-desktop-bundle.cjs` |
| Manifest | Версии синхронизированы |

## Ключевые версии

| Файл | v |
|------|---|
| `release-marker.js` | METKA=36, desktop=1.0.28 |
| `terminal-page-boot.js` | 18 |
| `trade-diary-page.js` | 11 |
| `trade-diary-chart.js` | 7 |
| `trade-diary-detail.js` | 6 |
| `alerts-cloud/registry-sync.js` | 5 |
| `alerts-cloud/polling-realtime.js` | 6 |
| `desktop/package.json` | 1.0.28 |

## Откат

```bash
git fetch --tags
git checkout metka-36   # текущий
git checkout metka-35   # предыдущий
```

## Smoke

| Платформа | Проверка |
|-----------|----------|
| Web `/coins` | Нет trade UI; Network — нет `trade-desktop-boot.js` |
| Web `/alerts` | Локальный алерт живёт >2 мин при disabled cloud |
| Desktop `/coins` | Trade book, дневник в шапке (owner) |
| Desktop `/diary/` | Сделки, график со шкалой, цвета Вход/Выход |
| Desktop Dock | v0.36 / v1.0.28 |

## Теги

```bash
git tag -a metka-36 -m "metka-36: trade diary, alerts offline, web trade lazy-load"
git tag -a desktop-v1.0.28 -m "desktop-v1.0.28: bundled UI metka-36"
```
