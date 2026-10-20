/**
 * Boot isolated algo trade UI (book + overlay + orders + stream).
 */
import {
refreshAlgoTradingGate
} from "./trading-gate.js?v=2bd9e2fd";

import {
initAlgoPositionsCache
} from "./positions-cache.js?v=ea4eb9ea";

import {
initAlgoTradeStreamBridge,
stopAlgoTradeStreamBridge
} from "./stream-bridge.js?v=f2f33e88";

import {
initAlgoTradeBookPanel
} from "./book-panel.js?v=d6fc7bc0";

import {
createTradeChartOverlay
} from "./chart-overlay.js?v=37daae1e";

import {
createTradeChartOrders
} from "./chart-orders.js?v=96d06e19";

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
