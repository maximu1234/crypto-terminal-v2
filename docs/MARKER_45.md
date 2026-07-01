# Метка 45 — RSI drawings, Bybit в шестерёнке (июнь 2026)

**Тег:** `metka-45` · **Desktop:** `desktop-v1.0.37` (DMG)

**Текущий эталон отката (стабильный).** WIP: [MARKER_46.md](./MARKER_46.md) (`metka-46`, без коммита). Предыдущий: [MARKER_44.md](./MARKER_44.md) (`metka-44` / `desktop-v1.0.36`).

Проверено: `npm run check:all`, `desktop/npm run bundle:site`.

## Что вошло после metka-44

### Терминал — рисунки на RSI

| Компонент | Описание |
|-----------|----------|
| Рисование на RSI | Отдельный слой `rsiDrawingTools`, переключение панели main/rsi |
| Resize панели RSI | `syncDrawingToolsLayout` — canvas и redraw RSI при изменении `--coins-rsi-h` |
| Ось времени | `timeChart: chart` — X рисунков RSI с основного графика |
| Pan / price scale | Связанный pan-redraw и price-scale touch на обеих панелях |

### Скринер

| Компонент | Описание |
|-----------|----------|
| Zoom + invert | `getInvertCharts` в опциях zoom-mount — ПКМ-zoom учитывает «Перевернуть графики» |

### Desktop — торговля в шестерёнке

| Компонент | Описание |
|-----------|----------|
| Bybit | Выпадающее меню настроек (API, объёмы, auto SL/TP) вместо ссылки на `/trade` |
| Портал dropdown | `positionTradeExchangeDropdown` — панель в `body`, слева от шестерёнки |
| Дневник | Ссылка в settings dropdown, выравнивание с системными пунктами |

## Ключевые версии

| Файл | v |
|------|---|
| `terminal.js` | 349 |
| `terminal/terminal-chart-layout.js` | 4 |
| `drawings/init.js` | 132 |
| `trade-exchange-settings.js` | 14 |
| `screener-widget-zoom.js` | 8 |
| `auth-ui.js` | 29 |
| `common.css` | 32 |
