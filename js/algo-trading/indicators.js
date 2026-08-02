/**
 * Меню индикаторов на АлгоТрейдинг — prefs изолированы.
 * Pattern 1-2 на графике — копия (`./pattern-12.js` + math MAX_HIST=10000),
 * чтобы отрисовка совпадала с аналитикой/ботом на полной истории.
 * Оригинал `js/indicators/pattern-12*` не трогаем.
 */
import {
initChartIndicators
} from "../chart-indicators.js?v=43";

import {
createPattern12Indicator
} from "./pattern-12.js?v=4";

import {
ALGO_INDICATORS_STORAGE_KEY
} from "./indicators-storage.js?v=1";

export {
ALGO_INDICATORS_STORAGE_KEY
} from "./indicators-storage.js?v=1";

/**
 * @param {Parameters<typeof initChartIndicators>[0]} opts
 * @returns {ReturnType<typeof initChartIndicators>}
 */
export function mountAlgoTradingIndicators(
opts
){

const root =
opts?.root;

const api =
initChartIndicators(
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
ensureIndicatorEnabled(
root,
"pattern-12"
);

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
