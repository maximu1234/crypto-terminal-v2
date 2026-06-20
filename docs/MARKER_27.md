# Метка 27 — рабочая версия (июнь 2026)

**Тег:** `metka-27` · **Коммит:** `git rev-parse metka-27`

**Текущий эталон отката.** Предыдущий: [MARKER_26.md](./MARKER_26.md) (`metka-26`).

Проверено: `/coins` — топбар по Photoshop-макету, fib на вертикальных якорях, Plus-алерты, глобальная очистка рисунков в `/system`; CI gate (manifest, nav, unit tests).

## Что добавлено после metka-26

### Fib / рисование
- Fib не пропадает при почти вертикальных якорях — расширение узкого span в `fib-spec.js`, правки `draw-render` / `draw-hit`
- Ужатые desktop hit-zones для edit/drag

### UI / график
- Plus-алерты у price scale (`price-alert-ui.js`), единое форматирование цены на графике
- Screener: invert-charts, digit hotkeys, QWERTY-поиск монет
- **Топбар `/coins`:** этalon 40px hit-zones, gap 2px между TF/иконками, hover/active, иконки 22×22 (xl 41×41), кнопки 34×40

### `/system` admin
- Глобальная очистка `user_drawings` для всех пользователей (`POST /admin/purge-all-drawings`)
- Inline UX: фраза `PURGE_ALL_DRAWINGS`, без `prompt()`

### CI / тесты
- `screener.css?v=34` в `terminal.html` и `system/index.html`
- `isCoarseTouchViewport()` guard для Node unit tests
- Re-export `FIB_MIN_ANCHOR_SPAN_PX` из `fib-spec.js`

## Ключевые версии ассетов

| Файл | v |
|------|---|
| `release-marker.js` | 11 |
| `coins.css` | 41 |
| `terminal.css` | 138 |
| `price-alert-ui.js` | 39 |
| `terminal.js` | 312 |
| `drawings/init.js` | 92 |
| `draw-ui-shared.js` | 23 |
| `system-admin-drawings-purge.js` | 2 |
| `system-admin-page.js` | 5 |
| `screener.css` | 34 |

## Аудит (июнь 2026)

| Проверка | Статус |
|----------|--------|
| Import `?v=` ↔ `asset-manifest.js` | ✅ 136 assets |
| Site nav partial ↔ HTML pages | ✅ |
| JS syntax (`node --check`) | ✅ CI |
| Unit tests (`tests/*.test.mjs`) | ✅ CI |
| `/coins` топбар vs макет | ✅ user |

## Откат

```bash
git fetch --tags
git checkout metka-27   # текущий
git checkout metka-26   # до fib/topbar/system-purge
```

## Smoke

| Платформа | Проверка |
|-----------|----------|
| Desktop `/coins` | топбар TF/tools, fib вертикальный, рисование |
| Desktop | Plus-алерт у шкалы |
| `/` | v0.27 после выбора таймфрейма |
| `/system` | purge drawings (фраза + admin email) |

## Тег после коммита

```bash
git tag -a metka-27 -m "metka-27: coins topbar, fib fix, system drawings purge"
```
