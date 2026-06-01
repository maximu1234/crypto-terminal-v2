# Метка 3 — график /coins на iPad (эталон шкалы)

**Зафиксировано:** 2026-05-29  
**Тег:** `metka-3` · **Коммит:** `git rev-parse metka-3` (код графика в истории: `7e31010`).

## Что работает

- **Свечи и шкала на iPad** — видимый график, нормальные цены (без «нуля» и отрицательных тиков на log-scale).
- **Ценовая шкала как на десктопе** — встроенный LW (`axisPressedMouseMove` / `axisDoubleClickReset` для `price`), без кастомного `priceZoomRange` и `pulsePriceScaleAutoscale` на планшете.
- **Смена монеты** — `setData` → `applyDefaultZoom` → `resizeCharts`, без двойного сброса шкалы до/после данных.
- **Горизонтальный pan и probe** — overlay `tablet-probe-touch-layer`, жесты в `chart-tablet-gestures.js` (без изменений эталона).
- **Десктоп** — не трогали: `isTabletChartViewport()` отделяет планшетные ветки.

## Отключено временно (код на месте, в комментариях)

- Кнопка **«+»** на шкале (`price-alert-ui.js` в `terminal.js`).

## Включено снова

- Меню **«Инвертировать график»** — ПКМ по ценовой шкале; на touch long-press ~520 ms по `#price-scale-touch-strip`.

## Версии ассетов (для проверки деплоя)

| Параметр | Значение |
|----------|----------|
| `CHART_BUILD_ID` | `20260529-tablet-scale-desktop` |
| `chart.js` | `v=102` |
| `terminal.js` | `v=237` |
| `terminal.css` | `v=86` |
| `coins-page-boot.js` | `v=8` |

## Ключевые файлы

| Область | Файлы |
|--------|--------|
| График / шкала | `js/chart.js` (`mountTabletPriceScaleTouch` no-op на iPad, `applyTabletMainChartScroll` price:true) |
| Терминал /coins | `js/terminal.js` (`loadSymbol`, `resetTabletPriceScale`) |
| Touch / probe | `js/chart-tablet-gestures.js` |
| Стили iPad | `css/terminal.css` (`#chart` pointer-events, strip `pointer-events: none`) |
| Версии | `js/coins-asset-versions.js`, `js/coins-page-boot.js`, `coins.html` |

## Откат к метке 3

```bash
git checkout metka-3 -- js/chart.js js/chart-tablet-gestures.js js/terminal.js js/coins-asset-versions.js js/coins-page-boot.js js/chart-import.js css/terminal.css coins.html docs/MARKER_3.md
```

Вся ветка на метке: `git checkout metka-3` (сохраните незакоммиченное отдельно).

## Связанные метки

- [**Метка 2**](MARKER_2.md) — эталон **алертов** (cross-TF, Telegram, звук), тег `metka-2`.
- [**Метка 1**](MARKER_1.md) — старые алерты до cross-TF.

## Дальше

Вернуть «+» и инверсию шкалы после стабилизации; не смешивать с кастомным Y-zoom на strip (черновик: `docs/archive/tablet-price-scale.js`, на iPad не используется).
