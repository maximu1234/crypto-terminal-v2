# Метка 26 — рабочая версия (июнь 2026)

**Тег:** `metka-26` · **Коммит:** `git rev-parse metka-26`

**Предыдущий эталон отката.** Текущая: [MARKER_27.md](./MARKER_27.md) (`metka-27`).

Проверено локально: `/coins` — график, инструменты рисования, edit/drag, pan/zoom, price-scale labels, Plus-алерты; консоль без SyntaxError в drawings-модулях.

## Что добавлено после metka-25

### Рисунки — init.js orchestrator split (phases 4–10)

| Фаза | Модуль | ~строк |
|------|--------|--------|
| 4 | `draw-style-bar.js` | 2976 |
| 5 | `draw-alerts-chart.js` | 134 |
| 6 | `draw-placement.js` | 995 |
| 7 | `draw-edit-interaction.js` | 1440 |
| 8 | `draw-chart-input.js` | 472 |
| 9 | `draw-redraw-loop.js` | 356 |
| 10 | `draw-price-scale.js` | 583 |

`drawings/init.js`: **12 392 → 5 843** строк (−55% orchestrator).

### Прочее
- Отвязка hray от алерта — алерты только через «+» у price scale (`price-alert-ui.js`)
- `draw-undo.js`, `draw-edit-desktop.js` (phases 1–2)
- CI fix: `dashboard.js` / `coins-mobile.js` → `dashboard-draw-ui.js?v=15`

## Ключевые версии ассетов

| Файл | v |
|------|---|
| `release-marker.js` | 11 |
| `drawings/init.js` | 92 |
| `drawings.js` | 230 |
| `drawings/draw-style-bar.js` | 3 |
| `drawings/draw-placement.js` | 2 |
| `drawings/draw-edit-interaction.js` | 2 |
| `drawings/draw-price-scale.js` | 2 |
| `drawings/draw-chart-input.js` | 1 |
| `drawings/draw-redraw-loop.js` | 1 |
| `drawings/drawings-persist.js` | 2 |
| `drawings/draw-alerts-chart.js` | 2 |
| `draw-ui-shared.js` | 23 |
| `chart-widget-host.js` | 10 |
| `dashboard-draw-ui.js` | 15 |

## Аудит (июнь 2026)

| Проверка | Статус |
|----------|--------|
| JS brace balance (`js/`) | ✅ |
| Import `?v=` ↔ `asset-manifest.js` | ✅ |
| `dashboard-draw-ui` версии | ✅ v15 |
| Drawings smoke (desktop) | ✅ user |
| `[alerts] refresh mode` в консоли | ⚠️ warning (не блокирует) |

## Откат

```bash
git fetch --tags
git checkout metka-27   # текущий
git checkout metka-26   # orchestrator split (persist phase 3–10)
```

## Smoke

| Платформа | Проверка |
|-----------|----------|
| Desktop `/coins` | инструменты, preview, magnet, edit/drag |
| Desktop | pan/wheel, price-scale labels |
| Desktop | Plus-алерт у шкалы — линия на графике |
| Desktop | hray без кнопки алерта |
| `/` | v0.26 после выбора таймфрейма |

## Тег после коммита

```bash
git tag -a metka-26 -m "metka-26: drawings orchestrator split complete"
```
