/**
 * Кэш открытых позиций Bybit — один getPositions вместо N× getPosition на виджеты.
 */
import {
maybeApplyAutoStopsForNewPosition,
clearDismissedStops,
isStopDismissed
} from "./auto-stops.js?v=1";

import {
maybeReconcileOrdersOnPositionOpen
} from "./position-open-orders.js?v=1";

import {
maybeReconcileOrdersOnPositionClose
} from "../../trade-position-close-orders.js?v=1";

import {
applyTradePositionSoundDiff,
establishTradePositionSoundBaseline,
isTradePositionSoundBaselineReady,
resetTradePositionSoundBaseline
} from "../../trade-position-sounds.js?v=3";

import {
getTradeConfig
} from "./config.js?v=1";

const cacheBySymbol =
new Map();

const recentlyClosedUntilBySymbol =
new Map();

let positionsDispatchRaf =
0;

let lastPositionsSyncError =
null;

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

export function markTradePositionRecentlyClosed(
symbol
){

const sym =
normalizeSymbol(
symbol
);

if(
!sym
){
return;
}

recentlyClosedUntilBySymbol.set(
sym,
Date.now() +
getTradeConfig().recentlyClosedMs
);

}

export function isTradePositionRecentlyClosed(
symbolOrKey,
options =
{}
){

const policy =
getTradeConfig();
const raw =
String(
symbolOrKey ||
""
).trim();

if(
!raw
){
return false;
}

/* Prefer side-key when row/options provided (hedge). */
if(
typeof policy.positionMapKey ===
"function" &&
(
options.positionSide ||
options.side ||
options.position ||
(
typeof options ===
"object" &&
options.symbol
)
)
){
const key =
policy.positionMapKey({
symbol:
options.symbol ||
raw,
positionSide:
options.positionSide ||
options.position?.positionSide,
side:
options.side ||
options.position?.side
});

if(
key &&
isTradePositionRecentlyClosedKey(
key
)
){
return true;
}

/* Hedge: bare-symbol marks must not hide the other side. */
if(
key &&
key !==
normalizeSymbol(
options.symbol ||
raw
)
){
return false;
}

}

return isTradePositionRecentlyClosedKey(
raw
);

}

function isTradePositionRecentlyClosedKey(
key
){

const sym =
normalizeSymbol(
key
);

if(
!sym
){
return false;
}

const until =
recentlyClosedUntilBySymbol.get(
sym
);

if(
!until
){
return false;
}

if(
Date.now() >
until
){
recentlyClosedUntilBySymbol.delete(
sym
);
return false;
}

return true;

}

export function clearTradePositionRecentlyClosed(
symbolOrKey
){

const key =
normalizeSymbol(
symbolOrKey
);

if(
!key
){
return;
}

recentlyClosedUntilBySymbol.delete(
key
);

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

function isActivePosition(
row
){

if(
!row
){
return false;
}

const size =
Number(
row?.size
);

return Number.isFinite(
size
) &&
size >
0 &&
String(
row?.side ||
""
).trim() !==
"";

}

function mergePositionStops(
prev,
next
){

if(
!prev ||
!next
){
return next;
}

if(
String(
prev.side ||
""
).trim() !==
String(
next.side ||
""
).trim()
){
return next;
}

/* Prefer exchange enrichment when merge-from-prev is off, but still honor
 * local dismiss so cancelled SL/TP do not reincarnate from lagging openOrders. */
if(
!getTradeConfig().mergePositionStopsFromPrev
){
let merged =
{
...next
};

if(
isStopDismissed(
next.symbol ||
prev.symbol,
prev,
"sl"
)
){
merged =
{
...merged,
stopLoss:
0
};
delete merged.slOrderId;
}

if(
isStopDismissed(
next.symbol ||
prev.symbol,
prev,
"tp"
)
){
merged =
{
...merged,
takeProfit:
0
};
delete merged.tpOrderId;
}

return merged;
}

let merged =
{
...next
};
const prevSl =
Number(
prev.stopLoss
) ||
0;
const prevTp =
Number(
prev.takeProfit
) ||
0;
let nextSl =
Number(
merged.stopLoss
) ||
0;
let nextTp =
Number(
merged.takeProfit
) ||
0;

if(
isStopDismissed(
next.symbol ||
prev.symbol,
prev,
"sl"
)
){
merged =
{
...merged,
stopLoss:
0
};
delete merged.slOrderId;
nextSl =
0;
}

if(
isStopDismissed(
next.symbol ||
prev.symbol,
prev,
"tp"
)
){
merged =
{
...merged,
takeProfit:
0
};
delete merged.tpOrderId;
nextTp =
0;
}

if(
nextSl <=
0 &&
prevSl >
0 &&
!isStopDismissed(
next.symbol ||
prev.symbol,
prev,
"sl"
)
){
merged =
{
...merged,
stopLoss:
prevSl
};

if(
prev.slOrderId
){
merged.slOrderId =
prev.slOrderId;
}

}

if(
nextTp <=
0 &&
prevTp >
0 &&
!isStopDismissed(
next.symbol ||
prev.symbol,
prev,
"tp"
)
){
merged =
{
...merged,
takeProfit:
prevTp
};

if(
prev.tpOrderId
){
merged.tpOrderId =
prev.tpOrderId;
}

}

return merged;

}

export function getCachedPosition(
symbol,
options =
{}
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

const policy =
getTradeConfig();
const hintKey =
typeof policy.positionMapKey ===
"function"
? policy.positionMapKey({
symbol:
sym,
positionSide:
options.positionSide,
side:
options.side
})
: "";

if(
hintKey
){
const hinted =
cacheBySymbol.get(
hintKey
);

if(
hinted
){
return hinted;
}
}

const direct =
cacheBySymbol.get(
sym
);

if(
direct
){
return direct;
}

const matches =
[];

for(
const [
key,
row
] of cacheBySymbol
){

if(
!policy.keysMatchSymbol?.(
key,
sym
)
){
continue;
}

if(
options.positionSide ||
options.side
){
const rowKey =
typeof policy.positionMapKey ===
"function"
? policy.positionMapKey(
row
)
: key;

if(
hintKey &&
rowKey !==
hintKey
){
continue;
}

return row;
}

matches.push(
row
);

}

if(
matches.length ===
1
){
return matches[
0
];
}

/* Hedge: do not guess when LONG and SHORT both open. */
return null;

}

export function listCachedPositionsForSymbol(
symbol
){

const sym =
normalizeSymbol(
symbol
);

if(
!sym
){
return [];
}

const policy =
getTradeConfig();
const out =
[];

for(
const [
key,
row
] of cacheBySymbol
){

if(
key ===
sym ||
policy.keysMatchSymbol?.(
key,
sym
)
){
out.push(
row
);
}

}

return out;

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

function activePositionSoundKey(
row
){

const sym =
normalizeSymbol(
row?.symbol
);

if(
!sym
){
return "";
}

const side =
String(
row?.side ||
""
).trim();

return side
? `${sym}:${side}`
: sym;

}

function collectActivePositionSoundKeys(
rowsBySymbol
){

const keys =
new Set();

for(
const row of rowsBySymbol.values()
){

if(
!isActivePosition(
row
)
){
continue;
}

const key =
activePositionSoundKey(
row
);

if(
key
){
keys.add(
key
);
}

}

return keys;

}

function syncPositionSounds(
options = {}
){

const activeKeys =
collectActivePositionSoundKeys(
cacheBySymbol
);

if(
options.resetBaseline
){
resetTradePositionSoundBaseline();
return;
}

if(
options.establishBaseline
){

if(
!isTradePositionSoundBaselineReady()
){
establishTradePositionSoundBaseline(
activeKeys
);
}else{
applyTradePositionSoundDiff(
activeKeys
);
}

return;
}

if(
isTradePositionSoundBaselineReady()
){
applyTradePositionSoundDiff(
activeKeys
);
}

}

function applyPositionsList(
positions,
options = {}
){

const next =
new Map();

for(
const row of positions ||
[]
){

const policy =
getTradeConfig();
const key =
typeof policy.positionMapKey ===
"function"
? policy.positionMapKey(
row
)
: normalizeSymbol(
row?.symbol
);

if(
!key
){
continue;
}

const sym =
normalizeSymbol(
row?.symbol
);

if(
isTradePositionRecentlyClosed(
key
)
){
/* Stale REST after close also has size>0 — only our optimistic open clears tombstone. */
if(
row?._optimistic &&
isActivePosition(
row
)
){
clearTradePositionRecentlyClosed(
key
);
}else{
continue;
}
}

next.set(
key,
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

const prev =
cacheBySymbol.get(
sym
);

/* Fresh optimistic open: REST/stream lag must not drop the row. */
const optimisticAt =
Number(
prev?._optimisticAt
) ||
0;
const keepOptimistic =
prev?._optimistic &&
isActivePosition(
prev
) &&
optimisticAt >
0 &&
Date.now() -
optimisticAt <
8000;

if(
keepOptimistic
){
next.set(
sym,
prev
);
continue;
}

if(
isActivePosition(
prev
) &&
!options.establishBaseline
){
maybeReconcileOrdersOnPositionClose(
prev?.symbol ||
sym,
prev
);
}

cacheBySymbol.delete(
sym
);
listChanged =
true;
clearDismissedStops(
sym,
prev
);
dispatchPositionUpdate(
prev?.symbol ||
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
const rowWithStops =
prev
? mergePositionStops(
prev,
row
)
: row;
const changed =
!prev ||
JSON.stringify(
prev
) !==
JSON.stringify(
rowWithStops
);

const isNewOpen =
isActivePosition(
rowWithStops
) &&
(
!prev ||
!isActivePosition(
prev
)
);
const isClosed =
prev &&
isActivePosition(
prev
) &&
!isActivePosition(
rowWithStops
);

cacheBySymbol.set(
sym,
rowWithStops
);

if(
changed
){
listChanged =
true;
dispatchPositionUpdate(
rowWithStops.symbol ||
sym,
rowWithStops
);

if(
isNewOpen &&
!options.establishBaseline
){
maybeReconcileOrdersOnPositionOpen(
rowWithStops.symbol ||
sym,
rowWithStops
);
maybeApplyAutoStopsForNewPosition(
rowWithStops.symbol ||
sym,
rowWithStops
);
}

if(
isClosed &&
!options.establishBaseline
){
maybeReconcileOrdersOnPositionClose(
rowWithStops.symbol ||
sym,
prev
);
}

}

}

syncPositionSounds(
options
);

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
const mark =
Number(
markPrice
);

if(
!sym ||
!Number.isFinite(
mark
) ||
mark <=
0
){
return false;
}

const policy =
getTradeConfig();
let any =
false;

for(
const [
key,
prev
] of cacheBySymbol
){

if(
!policy.keysMatchSymbol?.(
key,
sym
) &&
key !==
sym
){
continue;
}

const next =
{
...prev,
markPrice:
mark,
pnl:
calcUnrealisedPnl(
prev.side,
prev.avgPrice,
mark,
prev.size
),
pnlFromMark:
true
};

cacheBySymbol.set(
key,
next
);
dispatchPositionUpdate(
prev.symbol ||
sym,
next
);
any =
true;

}

if(
any
){
scheduleDispatchAllPositions();
}

return any;

}

export function removeTradePositionFromCache(
symbol,
options =
{}
){

const sym =
normalizeSymbol(
symbol
);

if(
!sym
){
return false;
}

const policy =
getTradeConfig();
const hintKey =
typeof policy.positionMapKey ===
"function" &&
(
options.positionSide ||
options.side ||
options.position
)
? policy.positionMapKey({
symbol:
sym,
positionSide:
options.positionSide ||
options.position?.positionSide,
side:
options.side ||
options.position?.side
})
: "";

if(
hintKey
){
if(
options.markRecentlyClosed !==
false
){
markTradePositionRecentlyClosed(
hintKey
);
}

const prev =
cacheBySymbol.get(
hintKey
);

if(
prev
){
cacheBySymbol.delete(
hintKey
);
clearDismissedStops(
prev?.symbol ||
sym,
prev
);
dispatchPositionUpdate(
prev?.symbol ||
sym,
null
);
scheduleDispatchAllPositions();
syncPositionSounds();
return true;
}

/* Side was known but cache already empty — do not mark bare symbol. */
scheduleDispatchAllPositions();
syncPositionSounds();
return true;

}

const policySideKeyed =
typeof policy.positionMapKey ===
"function" &&
policy.positionMapKey({
symbol:
sym,
positionSide:
"LONG"
}) !==
policy.positionMapKey({
symbol:
sym
});

if(
!policySideKeyed
){
if(
options.markRecentlyClosed !==
false
){
markTradePositionRecentlyClosed(
sym
);
}
}

let removed =
false;

for(
const [
key,
prev
] of [
...cacheBySymbol
]
){

if(
!policy.keysMatchSymbol?.(
key,
sym
) &&
key !==
sym
){
continue;
}

if(
options.markRecentlyClosed !==
false
){
markTradePositionRecentlyClosed(
key
);
}
cacheBySymbol.delete(
key
);
clearDismissedStops(
prev?.symbol ||
sym,
prev
);
dispatchPositionUpdate(
prev?.symbol ||
sym,
null
);
removed =
true;

}

if(
removed
){
scheduleDispatchAllPositions();
/* UI close already confirmed — play sound now, not after exchange WS/REST lag. */
syncPositionSounds();
return true;
}

dispatchPositionUpdate(
sym,
null
);
return false;

}

export function upsertTradePositionInCache(
position
){

const policy =
getTradeConfig();
const key =
typeof policy.positionMapKey ===
"function"
? policy.positionMapKey(
position
)
: normalizeSymbol(
position?.symbol
);

if(
!key ||
!position
){
return false;
}

if(
isTradePositionRecentlyClosed(
key
)
){
clearTradePositionRecentlyClosed(
key
);
}

const row =
{
...position,
_optimistic:
position._optimistic !==
false,
_optimisticAt:
position._optimisticAt ||
Date.now()
};

const prev =
cacheBySymbol.get(
key
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
key,
row
);

if(
changed
){
dispatchPositionUpdate(
row.symbol ||
key,
row
);
scheduleDispatchAllPositions();
}

return changed;

}

let inflightSync =
null;

export function applyTradePositionsStream(
positions,
options = {}
){

applyPositionsList(
positions,
options
);

}

export function clearTradePositionsCache(){

applyTradePositionsStream(
[],
{
resetBaseline:
true
}
);

}

export function getTradePositionsCacheSyncError(){

return lastPositionsSyncError;

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
[],
{
resetBaseline:
true
}
);
return {
ok:
false
};
}

/* Fresh optimistic open: WS/IPC already showed position — skip REST storm. */
if(
!options.forceRefresh
){
const optimisticFresh =
[...cacheBySymbol.values()].some(
row=>
row?._optimistic &&
isActivePosition(
row
) &&
Date.now() -
(
Number(
row._optimisticAt
) ||
0
) <
8000
);

if(
optimisticFresh
){
return {
ok:
true,
positions:
getAllCachedPositions(),
skippedRest:
true
};
}
}

try{
const policy =
getTradeConfig();
const result =
await api.getPositions(
policy.restPositionsForceRefresh
? {
forceRefresh:
true
}
: {}
);

if(
!result?.ok
){
lastPositionsSyncError =
result;
return result;
}

if(
result.stale ||
result.rateLimited
){
lastPositionsSyncError =
result;
return result;
}

lastPositionsSyncError =
null;

applyPositionsList(
result.positions ||
[],
{
establishBaseline:
!isTradePositionSoundBaselineReady()
}
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
