# Паттерн 1-2 1-2 — оригинал индикатора

Автономная копия оригинального индикатора из Multichart
(`js/indicators/pattern-12.js`, `pattern-12-math.js`, `pattern-12-paint.js`).

`pattern-12-math.js` и `pattern-12.js` повторяют боевые файлы.
В пакете math импортирует локальный `./rsi.js`, обёртка — локальный
`./chart-layout-gate.js`. Оригинал в `js/indicators/` не править ради этой папки.

`chart-layout-gate.js` здесь — только готовность layout
(`isChartLayoutReady`). Chrome-оверлей живёт в `js/chart-layout-gate.js`
и в пакет не копируется.

Алго-форк `js/algo-trading/pattern-12*` — отдельная копия, не этот каталог.

Порт логики из Pine (RSI swing + точки 1–4).
После валидной точки 4 цепочка 1-2-3-4 фиксируется (append-only): более
низкий/высокий swing после b4 — новый сетап, а не перепись старой тройки.
То же правило — в `Паттерн 1-2 1-2.pine` (TradingView).

## Состав

| Файл | Назначение |
|------|------------|
| `pattern-12-math.js` | Ядро: настройки, `computePattern12Scene` |
| `pattern-12-paint.js` | Отрисовка сцены на canvas: `paintPattern12Scene` |
| `pattern-12.js` | Обёртка под host Multichart: `createPattern12Indicator` |
| `rsi.js` | RSI (Wilder) — зависимость math |
| `chart-layout-gate.js` | Только `isChartLayoutReady` для автономной обёртки |

## Минимальный API для своего приложения

```js
import {
  defaultPattern12Settings,
  normalizePattern12Settings,
  computePattern12Scene
} from "./pattern-12-math.js";

import {
  paintPattern12Scene
} from "./pattern-12-paint.js";

const settings = normalizePattern12Settings(defaultPattern12Settings());
const scene = computePattern12Scene(candles, settings);
// scene: badges, patternLines, pt4Dots, pt4Marks, fractals, swingLines

// paint ожидает Lightweight Charts: chart + series
paintPattern12Scene(ctx, plotW, plotH, {
  chart,
  series,
  candles,
  scene
});
```

Свечи: массив `{ time, open, high, low, close }` (`time` — unix sec, как у Lightweight Charts).

Если график не Lightweight Charts — используйте `computePattern12Scene` и рисуйте
`scene` своим кодом; `paintPattern12Scene` завязан на API LWC.

## Интеграция UI (`pattern-12.js`)

`createPattern12Indicator(getHost, settingsStore)` заточен под Multichart
(панель индикаторов, canvas overlay, persist настроек). В чужом приложении
обычно достаточно **math + paint**; `pattern-12.js` — референс, как это
подключено у нас.

## Зависимости

Только ES modules, без npm-пакетов. Браузер или bundler с поддержкой `import`/`export`.
