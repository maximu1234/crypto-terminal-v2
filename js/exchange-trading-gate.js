/**
 * При активной бирже ≠ Bybit — скрыть торговый слой (позиции, ордера).
 * Публичные данные (график, список монет, цветовые флаги) — от выбранной биржи.
 */
import {
isExchangeTradingEnabled,
EXCHANGE_CHANGED_EVENT
} from "./market-api.js?v=1";

import {
clearTradePositionsCache
} from "./trade-positions-cache.js?v=6";

import {
stopTradeStreamBridge,
startTradeStreamBridge
} from "./trade-stream-bridge.js?v=6";

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

async function suspendBybitTrading(){

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

async function resumeBybitTrading(){

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

export function applyExchangeTradingGate(){

const active =
isExchangeTradingActive();

setTradingUiActive(
active
);

if(
active
){
void resumeBybitTrading();
}else{
void suspendBybitTrading();
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
applyExchangeTradingGate();
}
);

applyExchangeTradingGate();

}
