# Метка 13 — рабочая версия (июнь 2026)

**Тег:** `metka-13` · **Коммит:** `git rev-parse metka-13`

**Текущий эталон отката.** Наследует [MARKER_12.md](./MARKER_12.md).

Проверено: `check:all` OK (syntax, manifest, nav, 14/14 tests).

## Что добавлено после metka-12

### Монеты — топбар рисования
- Иконки панели из `source-toolbar-sprite.png` → PNG + `draw-toolbar-icon-data.js`
- Размер 20×20, таймфреймы (gap 16px, pill `D`), один разделитель по центру между `D` и иконками
- Исправлено двойное `.P` в тикере (`PHAUSDT.P`)

### Монеты — iPad
- Восстановлены кнопки **«Вверх по списку»** / **«Вниз по списку»** внизу правой колонки
- Детекция через `isTabletChartViewport()`; скролл только `#coins-body`, кнопки закреплены

### UX / график
- Сайт: отключено нативное контекстное меню (`suppress-native-context-menu.js`)
- RSI на Монетах: **«Перевернуть график»** на шкале (как у основного графика)

### Аудит и чистка (metka-13)
- Версионированы импорты: `dashboard.js` (`storage`, `ws`), `terminal/coins-prefs.js`, `draw-color-palette.js` в manifest
- Удалены: `docs/archive/tablet-price-scale.js`, `assets/draw-toolbar-icons/source-sprite.png`
- Оставлены только метки **metka-12** и **metka-13** (старые теги 7–11 сняты)

## Ключевые версии ассетов

| Файл | v |
|------|---|
| `terminal.js` | 271 |
| `terminal/coins-prefs.js` | 4 |
| `dashboard.js` | 77 |
| `drawings/init.js` | 30 |
| `draw-ui-shared.js` | 12 |
| `draw-toolbar-icon-data.js` | 6 |
| `coins.css` | 30 |
| `terminal.css` | 105 |
| `site-boot.js` | 82 |
| `suppress-native-context-menu.js` | 1 |

Полный список: `js/asset-manifest.js` → `node scripts/sync-asset-versions.cjs`.

## Аудит (2026-06-04)

| Проверка | Результат |
|----------|-----------|
| `npm run check:all` | OK |
| Syntax (все `.js`) | OK |
| Asset manifest + site nav | OK |
| Unit tests | 14/14 |

### Ручной smoke

| Страница | Что проверить |
|----------|----------------|
| Монеты (desktop) | топбар TF + 8 иконок, один разделитель, крест |
| Монеты (iPad) | кнопки листания списка внизу колонки |
| Терминал / Главная | виджеты, рисование |
| Контекстное меню | нет системного ПКМ на графике (кроме input) |

### Известные ограничения

- Фаза 4 refactor: split `alerts-cloud-sync.js` — отложена
- `js/alerts-cloud/*` — prep, не wired в проде

## Откат

```bash
git fetch --tags
git checkout metka-13   # текущий эталон
git checkout metka-12   # до toolbar / iPad list / RSI invert
```

## Следующий шаг

- Фаза 4 alerts-cloud **или** стабилизация Bybit proxy
- После крупных правок: `sync-asset-versions` → `check:all` → новая метка
