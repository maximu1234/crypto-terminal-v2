# Метка 14 — предыдущий эталон (июнь 2026)

> **Superseded by [MARKER_15.md](./MARKER_15.md)** (`metka-15`) — текущий рабочий эталон.

**Тег:** `metka-14` · **Коммит:** `13107e66ae678a05a488a30b15adc38bc62c0775`

## Что добавлено после metka-13

### Статистика (`/statistics.html`)
- Bybit kline-стatистика, вкладки 1d / 1w / 1m / 1y
- `js/statistics.js`, `js/statistics-background.js` — фоновое обновление при уходе со страницы (sessionStorage, resume без сброса прогресса)
- Пункт **«Статистика»** в site-nav на всех страницах

### Главная (screener)
- Компактный header: layout / sort / TF в pick-меню (desktop)
- Поиск символа (mobile + desktop): jump к виджету + highlight
- `screener.css` v24 — layout header и виджетов

### Монеты — рынки Bybit
- Вкладки: **Все** (первая, по умолчанию), Crypto, Новые, Innovation Zone, Stocks, Commodities, Forex
- `bybit-listings.js`: `filterAllListings`, окно «Новые» 30 дней
- URL `?symbol=` открывает вкладку «Все»

### Монеты — шкала времени «в будущее» (TradingView-style)
- Пустое место справа + подписи на нижней оси RSI
- `applyCoinsChartViewport`, `CHART_BUILD_ID` → `20260609-future-timescale-v10`
- Исправлена «гармошка» при смене монеты: один settle viewport

### Монеты — crosshair (TradingView-style)
- Плашка цены на шкале (`#crosshair-price-label`)
- На **ценовой шкале** — вертикаль и горizontаль **скрываются** (не залипают у края)
- Кнопка **«+»** (алерт): видна на всём plot, на горизонтали; пропадает на шкале вместе с crosshair
- Исправлен дублирующий vert (`.chart-dom-crosshair-vert` vs `#linked-crosshair-vert`)
- **RSI:** горизонталь crosshair в панели RSI при наведении; vert общий; HUD RSI — значение под курсором

### UX
- `suppress-native-context-menu.js` v2: контекстное меню на nav / логотипе
- Флаг монеты: заморозка списка при color picker

## Ключевые версии ассетов (на момент metka-14)

| Файл | v |
|------|---|
| `terminal.js` | 289 |
| `screener.js` | 67 |
| `chart.js` | 133 |
| `terminal.css` | 107 |
| `drawings/init.js` | 30 |
| `statistics.js` | 8 |

## Откат

```bash
git fetch --tags
git checkout metka-14   # этот снимок (до drawings polish)
git checkout metka-15   # текущий эталон
```
