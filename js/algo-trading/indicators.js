/**
 * Меню индикаторов на АлгоТрейдинг — prefs изолированы.
 * Pattern 1-2 на графике — оригинальный индикатор (эталон).
 * Бот/аналитика считают по копии math в js/algo-trading/pattern-12-math.js.
 */
import {
initChartIndicators
} from "../chart-indicators.js?v=40";

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
ALGO_INDICATORS_STORAGE_KEY
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
