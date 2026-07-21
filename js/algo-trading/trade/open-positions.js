/**
 * Algo open-position symbols for coin list (yellow + pin to top).
 */
import {
syncTradePositionsCache,
getAllCachedPositions
} from "./positions-cache.js?v=3";

const openPositionSymbols =
new Set();

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

export function hasOpenPosition(
symbol
){

return openPositionSymbols.has(
normalizeSymbol(
symbol
)
);

}

export function getOpenPositionSymbols(){

return [
...openPositionSymbols
];

}

function setsEqual(
a,
b
){

if(
a.size !==
b.size
){
return false;
}

for(
const item of a
){
if(
!b.has(
item
)
){
return false;
}
}

return true;

}

function applySymbols(
next
){

if(
setsEqual(
openPositionSymbols,
next
)
){
return false;
}

openPositionSymbols.clear();

for(
const sym of next
){
openPositionSymbols.add(
sym
);
}

return true;

}

function notifyChanged(){

window.dispatchEvent(
new CustomEvent(
"algo-trade-open-positions-changed"
)
);

}

function symbolsFromRows(
rows
){

const next =
new Set();

for(
const row of rows ||
[]
){

if(
row?.symbol
){
next.add(
normalizeSymbol(
row.symbol
)
);
}

}

return next;

}

async function syncOpenPositions(){

const result =
await syncTradePositionsCache();
const next =
result?.ok
? symbolsFromRows(
result.positions
)
: symbolsFromRows(
getAllCachedPositions()
);

if(
applySymbols(
next
)
){
notifyChanged();
}

}

export function initAlgoOpenPositions(){

if(
!document.body.classList.contains(
"algo-trading-page"
)
){
return;
}

void syncOpenPositions();

window.addEventListener(
"algo-trade-stream-positions",
event=>{

const next =
symbolsFromRows(
event.detail?.positions
);

if(
applySymbols(
next
)
){
notifyChanged();
}

}
);

window.addEventListener(
"algo-book-refresh",
()=>{
void syncOpenPositions();
}
);

}
