# Метка 4 — инструменты рисования / Fibonacci (эталон)

**Зафиксировано:** 2026-06-02  
**Тег:** `metka-4` · **Коммит:** `git rev-parse metka-4`

## Что работает

- **Fibonacci** — уровни видны, hit-test и перетаскивание якорей работают.
- **Preview при постановке** — первая точка без лишней горизонтали; при растягивании ко второй точке уровни между якорем и курсором (без flash на весь график).
- **Trend line фибы** — по умолчанию выключена; включается явно в панели инструмента.
- **Остальные инструменты** — trendline, channel, hray, long/short, алерты на графике.

## Исправления относительно сломанного состояния после split `drawings.js`

| Проблема | Решение |
|----------|---------|
| Фиба невидима, но выделяется | Импорт `normalizeFibLevelWidth` в `init.js` |
| Trend line всегда включена | `fibShowTrendLine: false` по умолчанию, строгая проверка `=== true` |
| Горизонталь на весь экран при первой точке | Preview: якорь только при `stretchPx < 12` |
| Flash на весь экран при движении курсора | `fibPlacementPreview` — без `fibLevelXSpan` expand до второго клика |

## Версии ассетов (для проверки деплоя)

| Параметр | Значение |
|----------|----------|
| `drawings.js` | `v=193` |
| `drawings/init.js` | `v=15` |
| `drawings/fib-spec.js` | `v=6` |

## Ключевые файлы

| Область | Файлы |
|--------|--------|
| Точка входа | `js/drawings.js` |
| Рисование / preview / hit-test | `js/drawings/init.js` |
| Уровни, миграции, defaults | `js/drawings/fib-spec.js`, `js/drawings/constants.js` |
| Меню стилей линий | `js/drawings/fib-portals.js` |

## Откат к метке 4

```bash
git checkout metka-4 -- js/drawings.js js/drawings/ js/chart-widget-host.js js/asset-manifest.js docs/MARKER_4.md
```

Вся ветка на метке: `git checkout metka-4` (сохраните незакоммиченное отдельно).
