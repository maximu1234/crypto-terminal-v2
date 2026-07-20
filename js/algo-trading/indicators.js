/**
 * Меню индикаторов на АлгоТрейдинг — как на Терминале, prefs изолированы.
 */
import {
initChartIndicators
} from "../chart-indicators.js?v=39";

export const ALGO_INDICATORS_STORAGE_KEY =
"algo_trading_chart_indicators_v1";

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
