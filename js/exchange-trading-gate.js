/**
 * При активной бирже без desktop IPC торговли — скрыть торговый слой.
 * Публичные данные (график, список монет) — от выбранной биржи.
 */
import {
isExchangeTradingEnabled,
EXCHANGE_CHANGED_EVENT
} from "./market-api.js?v=2";

import {
clearTradePositionsCache
} from "./trade-positions-cache.js?v=32";

import {
stopTradeStreamBridge,
startTradeStreamBridge
} from "./trade-stream-bridge.js?v=17";

const BODY_CLASS =
"exchange-trading-inactive";

let gateReady =
false;

export function isExchangeTradingActive(){

return isExchangeTradingEnabled();

}

function setTradingUiActive(
active
){

document.body.classList.toggle(
BODY_CLASS,
!active
);

window.dispatchEvent(
new CustomEvent(
"exchange-trading-gate-changed",
{
detail:{
active
}
}
)
);

}

function dispatchEmptyTradeOrders(){

window.dispatchEvent(
new CustomEvent(
"trade-stream-orders",
{
detail:{
orders:[]
}
}
)
);

window.dispatchEvent(
new CustomEvent(
"trade-orders-refresh",
{
detail:{
orders:[]
}
}
)
);

}

async function suspendExchangeTrading(){

stopTradeStreamBridge();
clearTradePositionsCache();
dispatchEmptyTradeOrders();

window.dispatchEvent(
new CustomEvent(
"trade-book-refresh"
)
);

window.dispatchEvent(
new CustomEvent(
"trade-open-positions-changed"
)
);

}

async function resumeExchangeTrading(){

if(
!document.body.classList.contains(
"trade-page"
)
){
return;
}

await startTradeStreamBridge();

window.dispatchEvent(
new CustomEvent(
"trade-book-refresh"
)
);

}

/**
 * Bybit↔BingX both count as trading-enabled — must stop/clear/restart
 * the renderer bridge so positions/orders cannot leak across exchanges.
 */
async function restartExchangeTrading(){

const active =
isExchangeTradingActive();

setTradingUiActive(
active
);

await suspendExchangeTrading();

if(
active
){
await resumeExchangeTrading();
}

}

export function applyExchangeTradingGate(){

const active =
isExchangeTradingActive();

setTradingUiActive(
active
);

if(
active
){
void resumeExchangeTrading();
}else{
void suspendExchangeTrading();
}

}

export function initExchangeTradingGate(){

if(
gateReady
){
applyExchangeTradingGate();
return;
}

gateReady =
true;

window.addEventListener(
EXCHANGE_CHANGED_EVENT,
()=>{
void restartExchangeTrading();
}
);

applyExchangeTradingGate();

}
