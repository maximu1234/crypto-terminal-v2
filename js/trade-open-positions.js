/**
 * /trade — символы с открытыми позициями (для списка монет).
 */
import {
syncTradePositionsCache
} from "./trade-positions-cache.js?v=35";

import {
isExchangeTradingEnabled
} from "./market-api.js?v=5";

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

async function syncOpenPositions(){

if(
!isExchangeTradingEnabled()
){

if(
applySymbols(
new Set()
)
){
notifyChanged();
}

return;

}

const result =
await syncTradePositionsCache();

const next =
new Set();

if(
result?.ok
){
for(
const row of result.positions ||
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
}

if(
applySymbols(
next
)
){
notifyChanged();
}

}

function notifyChanged(){

window.dispatchEvent(
new CustomEvent(
"trade-open-positions-changed"
)
);

void import(
"./terminal/terminal-table.js?v=27"
).then(
({
renderList
})=>{
renderList();
}
).catch(
()=>{
/* ignore */
}
);

}

export function initTradeOpenPositions(){

if(
!document.body.classList.contains(
"trade-page"
)
){
return;
}

void syncOpenPositions();

window.addEventListener(
"trade-stream-positions",
event=>{

if(
!isExchangeTradingEnabled()
){

if(
applySymbols(
new Set()
)
){
notifyChanged();
}

return;

}

const next =
new Set();

for(
const row of event.detail?.positions ||
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
"trade-book-refresh",
()=>{
void syncOpenPositions();
}
);

window.addEventListener(
"exchange-trading-gate-changed",
event=>{

if(
event.detail?.active
){
void syncOpenPositions();
return;
}

if(
applySymbols(
new Set()
)
){
notifyChanged();
}

}
);

}
