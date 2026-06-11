# Метка 18 — рабочая версия (июнь 2026)

**Тег:** `metka-18` · **Коммит:** `git rev-parse metka-18`

**Текущий эталон отката.** Предыдущая: [MARKER_17.md](./MARKER_17.md) (`metka-17`).

Проверено: asset manifest (`chart-page.js` → manifest v2); site-nav (7 ссылок на 5 страницах); unit tests `chart-ruler`, `draw-magnet`, `scale-label-layout`, `draw-hit`, `fib-spec`, `position-sizing`, `page-routes`.

## Что добавлено после metka-17

### Статистика — скорость и честные шкалы
- `bybit-fetch.js` v14 — `fetchBybitBulk()` (единый путь: local `/api/bybit` → Vercel → direct → worker)
- `statistics-background.js` v3 — 8 параллельных воркеров, backoff 10006, partial cache каждые 40 монет
- Убран triple-race и serial slot ~220 ms на символ
- Ширина зелёной шкалы **без минимума** — пропорция `(pct / maxPct) * 100%`

### Рисование — магнит Cmd
- `draw-magnet.js` — snap к **high/low** свечи под вертикалью курсора
- Зажатый **Cmd** при placement: перекрестье на тени; **Cmd+клик** ставит точку на snap
- Desktop: `startPlacement` сразу при выборе инструмента (как на iPad)

### Линейка (Shift + курсор)
- `chart-ruler.js` — измерение от точки A до курсора (без второй якорной точки)
- **Shift + клик** — начало; второй **Shift+клик** / отпускание Shift / **Esc** — отмена
- Вертикаль: **%** цены; горизонталь: **bars + время** (мин / ч / д)
- Линии **сплошные**; вверх — **голубые**, вниз — **красные**; плашка DOM поверх перекрестья (z-index 30)

### Long / Short — центральная плашка
- Две строки: **Объем** (строка 1) + **RR** (строка 2, тот же шрифт что TP/SL)
- Все плашки TP / SL / центр — **прямоугольники** (`fillRect`), не pill

### Инфраструктура
- `asset-manifest.js` v2 — sync `coins-page-boot`, `chart-page.js`
- `chart-widget-host.js` → `drawings.js` v201; `drawings/init.js` v55
- Тесты: `tests/chart-ruler.test.mjs`, `tests/draw-magnet.test.mjs`

### Главная — подпись версии
- `js/release-marker.js` → **v0.18** после `#screener-desktop-tf`

## Ключевые версии ассетов

| Файл | v |
|------|---|
| `release-marker.js` | 3 |
| `screener.js` | 70 |
| `terminal.js` | 295 |
| `dashboard.js` | 80 |
| `drawings/init.js` | 55 |
| `drawings/chart-ruler.js` | 5 |
| `drawings/draw-magnet.js` | 1 |
| `drawings.js` | 201 |
| `statistics.js` | 10 |
| `statistics-background.js` | 3 |
| `bybit-fetch.js` | 14 |
| `asset-manifest.js` | 2 |
| `terminal.css` | 120 |
| `dashboard.css` | 31 |
| `statistics.css` | 8 |

Полный список: `js/asset-manifest.js` → `node scripts/sync-asset-versions.cjs`.

## Аудит сайта (2026-06-11)

| Проверка | Результат |
|----------|-----------|
| Asset manifest | OK — `chart-page.js`, `coins-page-boot` → manifest **v2** |
| Site nav | OK — 7 ссылок на alerts, listings, trade-calculator, statistics, system |
| Unit tests | `chart-ruler`, `draw-magnet`, `scale-label-layout`, `draw-hit`, `fib-spec`, `drawings-cloud-shapes`, `position-sizing`, `page-routes` |
| Statistics | OK — bulk fetch, честные шкалы % |
| Drawings magnet | OK — Cmd snap high/low при placement |
| Chart ruler | OK — Shift measure, цвет по направлению |
| Terminal blue flags | OK — без регрессий metka-17 |

### Страницы (inventory)

| URL | Файл | Статус |
|-----|------|--------|
| `/` | `index.html` | screener + **v0.18** + nav OK |
| `/coins` | `coins.html` | chart + RSI + drawings + magnet + ruler |
| `/terminal` | `terminal.html` | синие флаги, dynamic grid |
| `/alerts` | `alerts/index.html` | alerts UI + cloud |
| `/listings` | `listings.html` | Bybit listings |
| `/statistics` | `statistics.html` | kline stats (ускорено) |
| `/trade-calculator` | `trade-calculator.html` | position sizing |
| `/system` | `system/index.html` | admin |
| `/btc-d` | `btc-d.html` | BTC.D |
| `/btc-dominance-test` | `btc-dominance-test.html` | dev (noindex) |

### API (Vercel serverless)

| Route | Назначение |
|-------|------------|
| `GET /api/bybit?path=…` | Bybit REST proxy |
| `GET /api/coingecko?mode=…` | BTC dominance |
| `GET /api/twelvedata?…` | Twelve Data proxy |

### Ручной smoke

| Страница | Что проверить |
|----------|----------------|
| `/` | Подпись **v0.18**; синий флаг 1–9 монет |
| `/coins` | Cmd-магнит при рисовании; Shift-линейка |
| `/coins` | Long/Short — 2 строки в центре, прямоугольные TP/SL |
| `/statistics` | Загрузка быстрее; шкалы пропорциональны % |
| `/terminal` | Синие флаги, рисование без регрессий |
| Nav pages | 7 ссылок в шапке |

### Известные ограничения

- Линейка — только desktop (Shift + мышь)
- Магнит — **Cmd** (Meta), не Ctrl на Windows (можно добавить позже)
- Синий флаг: порядок на Терминале = порядок в `favorites.blue`
- Фаза 4 alerts-cloud split — отложена

## Метки в репозитории

Только **две** git-метки:

| Тег | Роль |
|-----|------|
| `metka-18` | **Текущий** эталон |
| `metka-17` | **Предыдущий** эталон (Терминал + синий флаг + v0.17) |

`metka-16` и старее — удалены.

## Откат

```bash
git fetch --tags
git checkout metka-18   # текущий эталон
git checkout metka-17   # до линейки / магнита / statistics bulk
```

## Следующий шаг

- Ctrl как магнит на Windows
- Объём на линейке (Vol) — опционально как TV
- Фаза 4 alerts-cloud **или** стабилизация Bybit proxy
