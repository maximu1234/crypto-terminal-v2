/**
 * Desktop: Bybit private WS → renderer (positions/orders без polling).
 */
import {
applyTradePositionsStream,
syncTradePositionsCache
} from "./trade-positions-cache.js?v=5";

let unsubscribe =
null;
let visibilityHandler =
null;

function dispatch(
name,
detail
){

window.dispatchEvent(
new CustomEvent(
name,
{
detail
}
)
);

}

function handleStreamPayload(
payload
){

if(
!payload ||
typeof payload !==
"object"
){
return;
}

if(
payload.type ===
"positions"
){

const positions =
Array.isArray(
payload.positions
)
? payload.positions
: [];

applyTradePositionsStream(
positions
);

dispatch(
"trade-stream-positions",
{
positions
}
);

window.dispatchEvent(
new CustomEvent(
"trade-open-positions-changed"
)
);

return;

}

if(
payload.type ===
"orders"
){

const orders =
Array.isArray(
payload.orders
)
? payload.orders
: [];

dispatch(
"trade-stream-orders",
{
orders
}
);

window.dispatchEvent(
new CustomEvent(
"trade-orders-refresh",
{
detail:{
orders
}
}
)
);

}

}

export async function initTradeStreamBridge(){

if(
!document.body.classList.contains(
"trade-page"
)
){
return ()=>{};
}

const api =
window.cryptoTerminalDesktop?.trading;

if(
!api?.onStream
){
return ()=>{};
}

if(
unsubscribe
){
return unsubscribe;
}

unsubscribe =
api.onStream(
handleStreamPayload
);

try{
await api.replayStream?.();
}catch{
/* ignore */
}

visibilityHandler =
()=>{

if(
document.hidden
){
return;
}

void syncTradePositionsCache();

};

document.addEventListener(
"visibilitychange",
visibilityHandler
);

return ()=>{
unsubscribe?.();
unsubscribe =
null;

if(
visibilityHandler
){
document.removeEventListener(
"visibilitychange",
visibilityHandler
);
visibilityHandler =
null;
}

};

}
