/**
 * При активной бирже без desktop IPC торговли — скрыть торговый слой.
 * Публичные данные (график, список монет) — от выбранной биржи.
 */
import {
getActiveExchangeId,
isExchangeTradingEnabled,
EXCHANGE_CHANGED_EVENT
} from "./market-api.js?v=5";

import {
clearTradePositionsCache
} from "./trade-positions-cache.js?v=35";

import {
stopTradeStreamBridge,
startTradeStreamBridge
} from "./trade-stream-bridge.js?v=19";

import {
loadTradeExchangeModules,
resetTradeExchangeModules
} from "./trade/module-router.js?v=14";

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

/* Exchange modules own DOM listeners and caches. Reload after stopping the old
 * module so no Bybit instance can survive into BingX (or vice versa). */
await suspendExchangeTrading();

resetTradeExchangeModules();

setTradingUiActive(
active
);

window.location.reload();

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

export async function initExchangeTradingGate(){

if(
gateReady
){
applyExchangeTradingGate();
return;
}

gateReady =
true;

await loadTradeExchangeModules(
getActiveExchangeId()
);

window.addEventListener(
EXCHANGE_CHANGED_EVENT,
()=>{
void restartExchangeTrading();
}
);

applyExchangeTradingGate();

}
