/**
 * Кэш открытых позиций Bybit — один getPositions вместо N× getPosition на виджеты.
 */
const cacheBySymbol =
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

cacheBySymbol.set(
sym,
row
);

if(
changed
){
dispatchPositionUpdate(
sym,
row
);
}

}

}

let inflightSync =
null;

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

window.addEventListener(
"trade-book-refresh",
()=>{
void syncTradePositionsCache();
}
);

}
