/**
 * Algo positions cache — REST/stream for algoTrading keys only.
 */
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

function positionKey(
row
){

const sym =
normalizeSymbol(
row?.symbol
);
const side =
String(
row?.side ||
row?.positionSide ||
""
).toLowerCase();

return side
? `${sym}:${side}`
: sym;

}

/** @type {Map<string, object>} */
const byKey =
new Map();

let inflightSync =
null;

function algoApi(){

return window.cryptoTerminalDesktop?.algoTrading ||
null;

}

function dispatchPositions(
positions
){

window.dispatchEvent(
new CustomEvent(
"algo-trade-stream-positions",
{
detail:{
positions
}
}
)
);
window.dispatchEvent(
new CustomEvent(
"algo-trade-open-positions-changed"
)
);

}

function applyPositionsList(
list
){

byKey.clear();

for(
const row of Array.isArray(
list
)
? list
: []
){

if(
!row?.symbol
){
continue;
}

const size =
Number(
row.size
);

if(
!(
size >
0
)
){
continue;
}

byKey.set(
positionKey(
row
),
{
...row,
symbol:
normalizeSymbol(
row.symbol
)
}
);

}

const positions =
[
...byKey.values()
];

dispatchPositions(
positions
);

return positions;

}

export function getCachedPosition(
symbol
){

const sym =
normalizeSymbol(
symbol
);

for(
const row of byKey.values()
){

if(
normalizeSymbol(
row.symbol
) ===
sym
){
return row;
}

}

return null;

}

export function getAllCachedPositions(){

return [
...byKey.values()
].sort(
(
a,
b
)=>
String(
a.symbol
).localeCompare(
String(
b.symbol
)
)
);

}

export function applyTradePositionsStream(
positions
){

return applyPositionsList(
positions
);

}

export function upsertTradePositionInCache(
position
){

if(
!position?.symbol
){
return;
}

const size =
Number(
position.size
);

if(
!(
size >
0
)
){
byKey.delete(
positionKey(
position
)
);
}else{
byKey.set(
positionKey(
position
),
{
...position,
symbol:
normalizeSymbol(
position.symbol
)
}
);
}

dispatchPositions(
getAllCachedPositions()
);

}

export function removeTradePositionFromCache(
symbol
){

const sym =
normalizeSymbol(
symbol
);
let removed =
false;

for(
const [
key,
row
] of [
...byKey.entries()
]
){

if(
normalizeSymbol(
row.symbol
) ===
sym
){
byKey.delete(
key
);
removed =
true;
}

}

if(
!removed
){
return false;
}

dispatchPositions(
getAllCachedPositions()
);
return true;

}

export function clearTradePositionsCache(){

byKey.clear();
dispatchPositions(
[]
);

}

/** @type {Map<string, number>} */
const recentlyClosed =
new Map();

export function markTradePositionRecentlyClosed(
symbol
){

const sym =
String(
symbol ||
""
).replace(
/\.P$/i,
""
).trim().toUpperCase();

if(
sym
){
recentlyClosed.set(
sym,
Date.now()
);
}

}

export function isTradePositionRecentlyClosed(
symbolOrKey,
options =
{}
){

const sym =
String(
symbolOrKey ||
""
).replace(
/\.P$/i,
""
).trim().toUpperCase().split(
":"
)[
0
];
const at =
recentlyClosed.get(
sym
);

if(
!at
){
return false;
}

const ms =
Number(
options.ms
) ||
5000;

return (
Date.now() -
at
) <
ms;

}

export function clearTradePositionRecentlyClosed(
symbol
){

const sym =
String(
symbol ||
""
).replace(
/\.P$/i,
""
).trim().toUpperCase();

recentlyClosed.delete(
sym
);

}

export async function syncTradePositionsCache(){

if(
inflightSync
){
return inflightSync;
}

inflightSync =
(async()=>{

const api =
algoApi();

if(
!api?.getPositions
){
return {
ok:
false
};
}

const keys =
await api.getKeysStatus?.();

if(
!keys?.configured
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

export function initAlgoPositionsCache(){

if(
!document.body.classList.contains(
"algo-trading-page"
)
){
return;
}

void syncTradePositionsCache();

}
