/**
 * Меню индикаторов на АлгоТрейдинг — prefs изолированы.
 * Pattern 1-2 на графике — копия (`./pattern-12.js` + math MAX_HIST=10000),
 * чтобы отрисовка совпадала с аналитикой/ботом на полной истории.
 * Оригинал `js/indicators/pattern-12*` не трогаем.
 */
import {
initChartIndicators
} from "../chart-indicators.js?v=54";

import {
createPattern12Indicator
} from "./pattern-12.js?v=15";

import {
ALGO_INDICATORS_STORAGE_KEY
} from "./indicators-storage.js?v=1";

export {
ALGO_INDICATORS_STORAGE_KEY
} from "./indicators-storage.js?v=1";

/**
 * @param {Parameters<typeof initChartIndicators>[0]} opts
 * @returns {Promise<Awaited<ReturnType<typeof initChartIndicators>>>}
 */
export async function mountAlgoTradingIndicators(
opts
){

const root =
opts?.root;

const api =
await initChartIndicators(
{
...opts,
storageKey:
ALGO_INDICATORS_STORAGE_KEY,
createPattern12Indicator
}
);

ensureIndicatorEnabled(
root,
"rsi"
);

/* Pattern-12: enable after first candles (algo-trading.js) so cold start
   is not blocked by scene compute before history arrives. */

return api;

}

function ensureIndicatorEnabled(
root,
id
){

const input =
root?.querySelector?.(
`input[data-indicator-id="${id}"]`
);

if(
!input ||
input.checked
){
return;
}

input.checked =
true;
input.dispatchEvent(
new Event(
"change",
{
bubbles:
true
}
)
);

}
