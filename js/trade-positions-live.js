/**
 * Live PnL по mark price (Bybit position WS не пушит каждый тик).
 */
import {
subscribeTicker
} from "./ws.js?v=17";

import {
getAllCachedPositions,
applyLiveMarkPrice
} from "./trade-positions-cache.js?v=9";

const unsubBySymbol =
new Map();

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

function syncTickerSubscriptions(){

const wanted =
new Set();

for(
const row of getAllCachedPositions()
){

const sym =
normalizeSymbol(
row?.symbol
);

if(
sym
){
wanted.add(
sym
);
}

}

for(
const [
sym,
unsub
] of unsubBySymbol
){

if(
!wanted.has(
sym
)
){
unsub?.();
unsubBySymbol.delete(
sym
);
}

}

for(
const sym of wanted
){

if(
unsubBySymbol.has(
sym
)
){
continue;
}

const unsub =
subscribeTicker(
sym,
tick=>{

const mark =
Number(
tick?.markPrice
);

if(
!Number.isFinite(
mark
) ||
mark <=
0
){
return;
}

applyLiveMarkPrice(
sym,
mark
);

}
);

unsubBySymbol.set(
sym,
unsub
);

}

}

export function initTradePositionsLive(){

if(
!document.body.classList.contains(
"trade-page"
)
){
return ()=>{};
}

const onPositionsChange =
()=>{
syncTickerSubscriptions();
};

window.addEventListener(
"trade-stream-positions",
onPositionsChange
);

window.addEventListener(
"trade-open-positions-changed",
onPositionsChange
);

syncTickerSubscriptions();

return ()=>{
window.removeEventListener(
"trade-stream-positions",
onPositionsChange
);

window.removeEventListener(
"trade-open-positions-changed",
onPositionsChange
);

for(
const unsub of unsubBySymbol.values()
){
unsub?.();
}

unsubBySymbol.clear();

};

}
