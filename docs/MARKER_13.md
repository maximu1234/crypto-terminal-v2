# Метка 13 — рабочая версия (июнь 2026)

> **Superseded by [MARKER_14.md](./MARKER_14.md)** (`metka-14`) — текущий рабочий эталон.

**Тег:** `metka-13` · **Коммит:** `git rev-parse metka-13`

Наследует [MARKER_12.md](./MARKER_12.md).

Проверено: `check:all` OK (syntax, manifest, nav, 14/14 tests).

## Что добавлено после metka-12

### Монеты — топбар рисования
- Иконки панели из `source-toolbar-sprite.png` → PNG + `draw-toolbar-icon-data.js`
- Размер 20×20, таймфреймы (gap 16px, pill `D`), один разделитель по центру между `D` и иконками
- Исправлено двойное `.P` в тикере (`PHAUSDT.P`)

### Монеты — iPad
- Восстановлены кнопки **«Вверх по списку»** / **«Вниз по списку»** внизу правой колонки
- Детекция через `isTabletChartViewport()`; скролл только `#coins-body`, кнопки закреплены

### BTC.D (`/btc-d.html`)
- iPad: график через **iframe** TradingView (`isTabletChartViewport` / touch), не script-embed
- iOS layout: `html`/`body` `-webkit-fill-available`, `min-height` у `#btc-d-tv-host`
- RSI по умолчанию: `studies` в **hash** URL iframe (`RSI@tv-basicstudies`)
- Десктоп: script-embed с fallback на iframe при сбое

### UX / график
- Сайт: отключено нативное контекстное меню (`suppress-native-context-menu.js`)
- RSI на Монетах: **«Перевернуть график»** на шкале (как у основного графика)

### Аудит и чистка
- Версионированы импорты: `dashboard.js`, `terminal/coins-prefs.js`, `draw-color-palette.js`
- Удалены: `docs/archive/tablet-price-scale.js`, `assets/draw-toolbar-icons/source-sprite.png`
- В репозитории только метки **metka-12** и **metka-13**

## Ключевые версии ассетов

| Файл | v |
|------|---|
| `terminal.js` | 271 |
| `terminal/coins-prefs.js` | 4 |
| `dashboard.js` | 78 |
| `drawings/init.js` | 30 |
| `draw-ui-shared.js` | 12 |
| `draw-toolbar-icon-data.js` | 6 |
| `coins.css` | 30 |
| `terminal.css` | 105 |
| `btc-d-page.css` | 5 |
| `btc-dominance/btc-d-page.js` | 4 |
| `btc-dominance/tv-embed.js` | 3 |
| `site-boot.js` | 82 |

Полный список: `js/asset-manifest.js` → `node scripts/sync-asset-versions.cjs`.

## Аудит (2026-06-05)

| Проверка | Результат |
|----------|-----------|
| `npm run check:all` | OK |
| Syntax (все `.js`) | OK |
| Asset manifest + site nav | OK |
| Unit tests | 14/14 |
| Unversioned imports в `dashboard.js` | исправлено (`symbol-autocomplete`) |

### Ручной smoke

| Страница | Что проверить |
|----------|----------------|
| Монеты (desktop) | топбар TF + 8 иконок, один разделитель, крест |
| Монеты (iPad) | кнопки листания списка внизу колонки |
| `/btc-d.html` (iPad) | график + RSI под свечами |
| `/btc-d.html` (desktop) | TradingView, RSI |
| Терминал / Главная | виджеты, рисование |

### Известные ограничения

- Фаза 4 refactor: split `alerts-cloud-sync.js` — отложена
- `js/alerts-cloud/*` — prep, не wired в проде

## Откат

```bash
git fetch --tags
git checkout metka-13   # текущий эталон
git checkout metka-12   # до toolbar / iPad list / BTC.D fixes
```

## Следующий шаг

- Фаза 4 alerts-cloud **или** стабилизация Bybit proxy
- После крупных правок: `sync-asset-versions` → `check:all` → обновить метку
