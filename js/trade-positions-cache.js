/**
 * Кэш открытых позиций Bybit — один getPositions вместо N× getPosition на виджеты.
 */
import {
maybeApplyAutoStopsForNewPosition
} from "./trade-auto-stops.js?v=2";

const cacheBySymbol =
new Map();

let positionsDispatchRaf =
0;

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

function calcUnrealisedPnl(
side,
avgPrice,
markPrice,
size
){

const e =
Number(
avgPrice
);
const m =
Number(
markPrice
);
const s =
Number(
size
);

if(
!Number.isFinite(
e
) ||
!Number.isFinite(
m
) ||
!Number.isFinite(
s
) ||
s ===
0
){
return 0;
}

return side ===
"Buy"
? (
m -
e
) *
s
: (
e -
m
) *
s;

}

export function getCachedPosition(
symbol
){

const sym =
normalizeSymbol(
symbol
);

if(
!sym
){
return null;
}

return cacheBySymbol.get(
sym
) ||
null;

}

export function getAllCachedPositions(){

return [
...cacheBySymbol.values()
].sort(
(
a,
b
)=>
String(
a.ticker ||
a.symbol
).localeCompare(
String(
b.ticker ||
b.symbol
),
"ru"
)
);

}

function dispatchPositionUpdate(
symbol,
position
){

window.dispatchEvent(
new CustomEvent(
"trade-position-updated",
{
detail:{
symbol:
normalizeSymbol(
symbol
),
position:
position ||
null
}
}
)
);

}

function dispatchAllPositions(){

window.dispatchEvent(
new CustomEvent(
"trade-stream-positions",
{
detail:{
positions:
getAllCachedPositions()
}
}
)
);

}

function scheduleDispatchAllPositions(){

if(
positionsDispatchRaf
){
return;
}

positionsDispatchRaf =
requestAnimationFrame(
()=>{

positionsDispatchRaf =
0;
dispatchAllPositions();

}
);

}

function applyPositionsList(
positions
){

const next =
new Map();

for(
const row of positions ||
[]
){

const sym =
normalizeSymbol(
row?.symbol
);

if(
!sym
){
continue;
}

next.set(
sym,
row
);
}

const prevKeys =
new Set(
cacheBySymbol.keys()
);
const nextKeys =
new Set(
next.keys()
);

let listChanged =
false;

for(
const sym of prevKeys
){

if(
!nextKeys.has(
sym
)
){
cacheBySymbol.delete(
sym
);
listChanged =
true;
dispatchPositionUpdate(
sym,
null
);
}

}

for(
const [
sym,
row
] of next
){

const prev =
cacheBySymbol.get(
sym
);
const changed =
!prev ||
JSON.stringify(
prev
) !==
JSON.stringify(
row
);

const isNewOpen =
!prev &&
Number(
row?.size
) >
0;

cacheBySymbol.set(
sym,
row
);

if(
changed
){
listChanged =
true;
dispatchPositionUpdate(
sym,
row
);

if(
isNewOpen
){
maybeApplyAutoStopsForNewPosition(
row.symbol ||
sym,
row
);
}

}

}

if(
listChanged
){
scheduleDispatchAllPositions();

window.dispatchEvent(
new CustomEvent(
"trade-open-positions-changed"
)
);
}

}

export function applyLiveMarkPrice(
symbol,
markPrice
){

const sym =
normalizeSymbol(
symbol
);
const prev =
cacheBySymbol.get(
sym
);

if(
!prev
){
return false;
}

const mark =
Number(
markPrice
);

if(
!Number.isFinite(
mark
) ||
mark <=
0
){
return false;
}

const prevMark =
Number(
prev.markPrice
);

if(
Number.isFinite(
prevMark
) &&
Math.abs(
mark -
prevMark
) <
1e-12
){
return false;
}

const pnl =
calcUnrealisedPnl(
prev.side,
prev.avgPrice,
mark,
prev.size
);

const next =
{
...prev,
markPrice:
mark,
pnl,
pnlFromMark:
true
};

if(
JSON.stringify(
prev
) ===
JSON.stringify(
next
)
){
return false;
}

cacheBySymbol.set(
sym,
next
);
dispatchPositionUpdate(
sym,
next
);
scheduleDispatchAllPositions();

return true;

}

let inflightSync =
null;

export function applyTradePositionsStream(
positions
){

applyPositionsList(
positions
);

}

export async function syncTradePositionsCache(
options = {}
){

if(
inflightSync
){
return inflightSync;
}

inflightSync =
(async()=>{

const api =
window.cryptoTerminalDesktop?.trading;

if(
!api?.getPositions
){
applyPositionsList(
[]
);
return {
ok:
false
};
}

const status =
await api.getStatus?.();

if(
!status?.configured
){
applyPositionsList(
[]
);
return {
ok:
false
};
}

try{
const result =
await api.getPositions();

if(
!result?.ok
){
return result;
}

applyPositionsList(
result.positions ||
[]
);

return result;
}catch(
err
){
return {
ok:
false,
message:
err?.message ||
String(
err
)
};
}

})();

try{
return await inflightSync;
}finally{
inflightSync =
null;
}

}

export function initTradePositionsCache(){

if(
!document.body.classList.contains(
"trade-page"
)
){
return;
}

void syncTradePositionsCache();

}
