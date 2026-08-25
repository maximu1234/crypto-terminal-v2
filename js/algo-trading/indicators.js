/**
 * Меню индикаторов на АлгоТрейдинг — prefs изолированы.
 * Pattern 1-2 на графике — копия (`./pattern-12.js` + math MAX_HIST=10000).
 * «1-2 EARLY T3» — отдельный индикатор (`./pattern-12-early-t3.js`), не бот.
 * Оригинал `js/indicators/pattern-12*` не трогаем.
 */
import {
initChartIndicators
} from "../chart-indicators.js?v=62";

import {
createPattern12Indicator
} from "./pattern-12.js?v=17";

import {
createPattern12EarlyT3Indicator
} from "./pattern-12-early-t3.js?v=2";

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
createPattern12Indicator,
extraIndicators: [
createPattern12EarlyT3Indicator
]
}
);

if(
!opts?.skipApplyPrefs
){
ensureIndicatorEnabled(
root,
"rsi"
);
}

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
