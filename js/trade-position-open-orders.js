/**
 * Auto order management on position open (desktop trade).
 * Long: cancel Buy orders, convert Sell orders to reduce-only.
 * Short: cancel Sell orders, convert Buy orders to reduce-only.
 */
import {
getTradeExchangePolicy
} from "./trade/exchanges/index.js?v=12";

function normalizeSymbol(
symbol
){

return String(
symbol ||
""
).replace(
/\.P$/i,
""
).trim().toUpperCase();

}

const reconcileInflight =
new Set();

export function maybeReconcileOrdersOnPositionOpen(
symbol,
position
){

if(
!window.cryptoTerminalDesktop?.isDesktop
){
return;
}

if(
!document.body.classList.contains(
"trade-page"
)
){
return;
}

if(
!symbol ||
!position
){
return;
}

const sym =
normalizeSymbol(
symbol
);

const size =
Number(
position.size
);

const posSide =
String(
position.side ||
""
).trim();

if(
!sym ||
!Number.isFinite(
size
) ||
size <=
0 ||
(
posSide !==
"Buy" &&
posSide !==
"Sell"
)
){
return;
}

const api =
window.cryptoTerminalDesktop?.trading;

if(
!api?.reconcileOrdersOnPositionOpen
){
return;
}

if(
reconcileInflight.has(
sym
)
){
return;
}

reconcileInflight.add(
sym
);

void (
async()=>{

try{
const reconcileDelayMs =
getTradeExchangePolicy().reconcileOnOpenDelayMs;

if(
reconcileDelayMs >
0
){
await new Promise(
resolve=>{
setTimeout(
resolve,
reconcileDelayMs
);
}
);
}

const result =
await api.reconcileOrdersOnPositionOpen(
sym,
posSide
);

if(
result?.ok ===
false
){
console.warn(
"[trade-position-open-orders]",
sym,
result.message ||
"reconcile failed"
);
return;
}

if(
result?.canceled ||
result?.converted
){
console.debug(
"[trade-position-open-orders]",
sym,
posSide,
`canceled=${result.canceled || 0}`,
`converted=${result.converted || 0}`
);

window.dispatchEvent(
new CustomEvent(
"trade-book-refresh"
)
);
window.dispatchEvent(
new CustomEvent(
"trade-orders-refresh"
)
);
}

if(
Array.isArray(
result?.errors
) &&
result.errors.length
){
console.warn(
"[trade-position-open-orders]",
sym,
result.errors
);
}
}catch(
err
){
console.warn(
"[trade-position-open-orders]",
sym,
err?.message ||
err
);
}finally{
setTimeout(
()=>{
reconcileInflight.delete(
sym
);
},
3000
);
}

}
)();

}
