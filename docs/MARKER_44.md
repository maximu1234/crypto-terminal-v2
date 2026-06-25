# Метка 44 — terminal panel colors and unified separators (июнь 2026)

**Тег:** `metka-44` · **Desktop:** `desktop-v1.0.36` (DMG)

**Предыдущий эталон.** См. [MARKER_45.md](./MARKER_45.md) (`metka-45` / `desktop-v1.0.37`). Был до metka-45: `metka-43` / `desktop-v1.0.35`.

Проверено: `npm run bundle:sync`.

## Что вошло после metka-43

### Терминал / Монеты — цвета и разделители

| Компонент | Описание |
|-----------|----------|
| Фон панелей | `#0f0f0f` — топбар (таймфреймы) и правый список монет (как левый draw-toolbar) |
| Разделители | Единый стиль `3.5px solid #2e2e30` между блоками: toolbar↔график, topbar↔график, график↔индикаторы, график↔список, внутри topbar и списка |
| CSS | `--coins-panel-bg`, `--coins-block-separator` на `body.terminal-page` |

## Ключевые версии

| Файл | v |
|------|---|
| `terminal-layout.css` | 69 |
| `chart-indicators.css` | 14 |
| `trade-book-panel.css` | 26 |
