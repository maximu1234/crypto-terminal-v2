# Метка 43 — draw toolbar icons, brush tool, screener zoom (июнь 2026)

**Тег:** `metka-43` · **Desktop:** `desktop-v1.0.35` (DMG)

Предыдущий: `metka-42` / `desktop-v1.0.34` (см. git tag `metka-42`).

Проверено: `npm run check:all`, `npm run bundle:sync`.

## Аудит: web vs desktop trade

| Проверка | Статус |
|----------|--------|
| Web `/terminal`: trade boot только при `cryptoTerminalDesktop.isDesktop` | ✅ |
| `body.trade-page` только desktop | ✅ |
| Trade init — lazy `trade-desktop-boot` / gate `isDesktop` | ✅ |
| Position «Применить» — только `trade-page` + `isDesktop` | ✅ |
| Bybit private WS / trading IPC — только Electron main | ✅ |

## Что вошло после metka-42

### Левый тулбар рисования (desktop terminal)

| Компонент | Описание |
|-----------|----------|
| Иконки | Photoshop-набор: `draw-toolbar-icons-original/` (архив), `draw-toolbar-icons-work/` (прозрачный фон, 2×), отображение через CSS 50% |
| Размер полосы | 49.5px (46px + разделитель 3.5px), фон `#0f0f0f` |
| Скрипты | `prepare-draw-toolbar-icons.py`, `encode-draw-toolbar-icon-data.py` |
| Float delete | Корзина в панели стиля — крупнее, та же иконка `trash` |

### Инструмент «Кисть»

| Компонент | Описание |
|-----------|----------|
| Рисование | `brush-placement.js` — freehand pointer-drag |
| После штриха | Остаёмся в режиме кисти (не автокурсор) |
| Перетаскивание | Фикс `applyBrushScreenMove` — смещение от grabX/grabY |

### Скринер

| Компонент | Описание |
|-----------|----------|
| ПКМ zoom | Увеличенное окно виджета: 70% → **80%** viewport (`80vw` × `80vh`) |

## Ключевые версии

| Файл | v |
|------|---|
| `draw-toolbar-icon-data.js` | 29 |
| `terminal-layout.css` | 68 |
| `drawings/init.js` | 123 |
| `drawings/brush.js` | 2 |
| `screener.css` | 41 |
