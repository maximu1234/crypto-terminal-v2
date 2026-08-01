# Паттерн 1-2 1-2 — оригинал индикатора

Автономная копия оригинального индикатора из Multichart
(`js/indicators/pattern-12*`). Оригинал в репозитории **не изменён**.

Порт логики из Pine (RSI swing + точки 1–4).

## Состав

| Файл | Назначение |
|------|------------|
| `pattern-12-math.js` | Ядро: настройки, `computePattern12Scene` |
| `pattern-12-paint.js` | Отрисовка сцены на canvas: `paintPattern12Scene` |
| `pattern-12.js` | Обёртка под host Multichart: `createPattern12Indicator` |
| `rsi.js` | RSI (Wilder) — зависимость math |
| `chart-layout-gate.js` | Гейт готовности layout — зависимость UI-обёртки |

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
