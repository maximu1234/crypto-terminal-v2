# Метка 23 — рабочая версия (июнь 2026)

**Тег:** `metka-23` · **Коммит:** `git rev-parse metka-23`

**Текущий эталон отката.** Предыдущая: [MARKER_22.md](./MARKER_22.md) (`metka-22`).

Проверено: asset manifest (Python audit, 0 mismatches); site-nav (5 страниц × 7 ссылок). Unit tests — `npm run check:all` (CI / node локально).

## Что добавлено после metka-22

### Рисунки — десктоп: закрепление выбора
- **Hover-select** (metka-22) дополнен **pin-on-click**: клик по объекту закрепляет выделение — уход курсора не снимает handles
- **Drag** завершённый move/edit тоже закрепляет выбор
- Клик по пустому месту снимает закрепление (`clearDrawingSelection`)
- iPad / touch — без изменений

### Статистика — фоновый job v2
- Единый job `stats_bg_job_v2`: **1d** из тикеров + **1w / 1m / 1y** из одного kline-запроса на монету
- `STATS_JOB_PERIOD_ALL` — один прогон обновляет все периоды
- UI: фазовый статус («Загружаем тикеры…», «1w/1m/1y … N/M»), job продолжается при переходе на другие страницы
- Кэш периодов пишется пакетно (`writeKlinePeriodCaches`)

## Ключевые версии ассетов

| Файл | v |
|------|---|
| `release-marker.js` | 8 |
| `screener.js` | 74 |
| `dashboard.js` | 83 |
| `terminal.js` | 308 |
| `terminal/coins-table.js` | 11 |
| `chart/chart-factory.js` | 31 |
| `chart-import.js` | 40 |
| `chart.js` | 147 |
| `chart-widget-host.js` | 10 |
| `drawings/init.js` | 73 |
| `drawings.js` | 212 |
| `statistics.js` | 11 |
| `statistics-background.js` | 5 |
| `asset-manifest.js` | 2 |
| `site-boot.js` | 85 |
| `screener.css` | 32 |
| `terminal.css` | 135 |
| `dashboard.css` | 40 |
| `coins.css` | 39 |
| `critical-shell.css` | 5 |
| `common.css` | 27 |

Полный список: `js/asset-manifest.js` → `node scripts/sync-asset-versions.cjs`.

## Аудит сайта (2026-06-20)

### Автопроверки

| Проверка | Результат |
|----------|-----------|
| Asset manifest | OK — 124 ассета, 158 файлов, 0 mismatches |
| Site nav | OK — 5 `site-nav-page`, 7 ссылок |
| Unit tests | `npm run check:all` — CI green (локально node не в PATH sandbox; прогнать перед деплоем) |
| JS syntax | CI `find … node --check` на все `.js` |

### Страницы (inventory)

| URL | Файл | Статус |
|-----|------|--------|
| `/` | `index.html` | screener + **v0.23** + RSI widgets |
| `/coins` | `coins.html` | chart + iPad scale + hotkeys + drawings undo/hover/pin |
| `/terminal` | `terminal.html` | widgets + RSI + alerts |
| `/alerts` | `alerts/index.html` | alerts UI + cloud |
| `/listings` | `listings.html` | Bybit listings |
| `/statistics` | `statistics.html` | movers + bg job v2 |
| `/trade-calculator` | `trade-calculator.html` | position sizing |
| `/system` | `system/index.html` | admin |
| `/btc-d` | `btc-d.html` | BTC.D |
| *(dev)* | `btc-dominance-test.html` | тестовая страница |

### Навигация

| Страница | Nav |
|----------|-----|
| Главная, Монеты | Своя шапка + mobile drawer (7 ссылок) |
| Terminal | Lazy `site-boot`, без `site-nav-page` |
| alerts, listings, statistics, trade-calculator, system, btc-d | `site-nav-page` + `site-boot.js` |

### Функциональные блоки

| Блок | Статус | Заметки |
|------|--------|---------|
| Screener / RSI | OK | metka-21 baseline |
| Монеты chart | OK | LW + drawings + cloud |
| Монеты iPad | OK | scale zoom, dbl-tap reset, tablet gestures |
| Drawings desktop | OK | hover + pin, undo Cmd+Z |
| Drawings cloud | OK | split `drawings-cloud/*` wired |
| Terminal widgets | OK | до 6 RSI, crosshair + алерт |
| Алерты cloud | ⚠️ | UI «+» на графике **ещё выключен** (см. ALERTS_PHASE1_CHECKLIST) |
| Алерты worker | ⚠️ | Railway + Supabase — проверять на prod |
| Статистика | OK (новое) | job v2, smoke на prod |
| Auth / cloud sync | OK | Supabase + Yandex |
| CI | OK | `.github/workflows/ci.yml` |

### Технический долг (приоритет для следующих итераций)

| # | Область | Проблема | Риск |
|---|---------|----------|------|
| 1 | `drawings/init.js` | **13 243 строк** — монолит внутри split | высокий |
| 2 | `alerts-cloud-sync.js` | **6 072 строк**, фаза 4 refactor pending | высокий |
| 3 | `cloud-sync.js` | **3 262 строк** | средний |
| 4 | Docs rollback refs | `ARCHITECTURE.md`, `REFACTOR_DRAWINGS.md`, `DRAWINGS_REGRESSION.md` ссылаются на `metka-16`…`metka-20` | низкий |
| 5 | Commit messages | 8 коммитов после metka-22 — «обновление» без changelog | низкий |
| 6 | Алерты UI | «+» на terminal/coins не включён | продукт |
| 7 | `coins.html` | `lang="en"` при русском UI | косметика |
| 8 | Refactor backlog | Фаза 4 `alerts-cloud` split — prep есть, не wired | средний |

### Ручной smoke

| Страница | Что проверить |
|----------|----------------|
| `/` | **v0.23**; RSI widgets 4/6; hotkeys 1/2/3 layout |
| `/coins` | iPad: zoom/dbl-tap шкала; **1–6** TF; **Alt+I** invert; hover → click pin handles; **Cmd+Z** |
| `/terminal` | widgets RSI ≤6; crosshair + алерт |
| `/statistics` | Refresh → фоновый job; переключить вкладку 1d/1w/1m/1y; уйти на другую страницу — job продолжается |
| Nav pages | 7 ссылок в шапке |

## Метки в репозитории

| Тег | Роль |
|-----|------|
| `metka-23` | **Текущий** эталон |
| `metka-22` | **Предыдущий** эталон (iPad scale / hover / undo) |

`metka-21` и старее — удалены.

## Откат

```bash
git fetch --tags
git checkout metka-23   # текущий эталон
git checkout metka-22   # до pinned hover / stats job v2
```
