/**
 * Boot isolated algo trade UI (book + overlay + orders + stream).
 */
import {
refreshAlgoTradingGate
} from "./trading-gate.js?v=2";

import {
initAlgoPositionsCache
} from "./positions-cache.js?v=3";

import {
initAlgoTradeStreamBridge,
stopAlgoTradeStreamBridge
} from "./stream-bridge.js?v=2";

import {
initAlgoTradeBookPanel
} from "./book-panel.js?v=19";

import {
createTradeChartOverlay
} from "./chart-overlay.js?v=5";

import {
createTradeChartOrders
} from "./chart-orders.js?v=4";

/**
 * @param {{
 *   chart: object,
 *   series: object,
 *   wrapEl?: HTMLElement|null,
 *   chartEl?: HTMLElement|null,
 *   getSymbol: () => string,
 *   getDrawingTools?: () => object|null
 * }} host
 */
export async function mountAlgoTradeUi(
host
){

if(
!document.body.classList.contains(
"algo-trading-page"
)
){
return {
destroy(){}
};
}

await refreshAlgoTradingGate();

initAlgoPositionsCache();
initAlgoTradeStreamBridge();

const book =
initAlgoTradeBookPanel();

window.__algoTradeChartHost =
host;
window.dispatchEvent(
new CustomEvent(
"algo-trade-chart-host-ready",
{
detail:
host
}
)
);

const hasChart =
!!host?.chart &&
!!host?.series;

const overlay =
hasChart
? createTradeChartOverlay(
host
)
: null;
const orders =
hasChart
? createTradeChartOrders(
host
)
: null;

return {
destroy(){
overlay?.destroy?.();
orders?.destroy?.();
book?.destroy?.();
stopAlgoTradeStreamBridge();
if(
window.__algoTradeChartHost ===
host
){
window.__algoTradeChartHost =
null;
}
}
};

}
