/**
 * Auto SL/TP в USDT при открытии позиции (desktop trade).
 */
import {
getTradeConfig
} from "./config.js?v=3";

import {
getCachedPosition
} from "./positions-cache.js?v=2";

const STORAGE_KEY =
"trade_auto_stops_bingx_v1";

const DISMISSED_STOPS_KEY =
"trade_auto_stops_dismissed_bingx_v1";

function normalizeUsd(
value
){

const num =
Number(
value
);

if(
!Number.isFinite(
num
) ||
num <
0
){
return 0;
}

return Math.round(
num *
100
) /
100;

}

export function getAutoStopSettings(){

try{
const raw =
localStorage.getItem(
STORAGE_KEY
);

if(
!raw
){
return {
slEnabled:
false,
tpEnabled:
false,
slUsd:
0,
tpUsd:
0
};
}

const parsed =
JSON.parse(
raw
);

return {
slEnabled:
!!parsed.slEnabled,
tpEnabled:
!!parsed.tpEnabled,
slUsd:
normalizeUsd(
parsed.slUsd
),
tpUsd:
normalizeUsd(
parsed.tpUsd
)
};
}catch{
return {
slEnabled:
false,
tpEnabled:
false,
slUsd:
0,
tpUsd:
0
};
}

}

function normalizeAutoStopSymbol(
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

function readDismissedStops(){

try{
const raw =
localStorage.getItem(
DISMISSED_STOPS_KEY
);

if(
!raw
){
return {};
}

const parsed =
JSON.parse(
raw
);

return parsed &&
typeof parsed ===
"object"
? parsed
: {};
}catch{
return {};
}

}

function writeDismissedStops(
map
){

try{
localStorage.setItem(
DISMISSED_STOPS_KEY,
JSON.stringify(
map
)
);
}catch{
/* ignore */
}

}

export function positionStopIdentity(
symbol,
position
){

const sym =
normalizeAutoStopSymbol(
symbol
);
const side =
position?.side ===
"Sell"
? "Sell"
: "Buy";
const entry =
Number(
position?.avgPrice
);

const entryKey =
Number.isFinite(
entry
) &&
entry >
0
? entry.toFixed(
6
)
: "0";

return `${sym}:${side}:${entryKey}`;

}

export function markStopDismissed(
symbol,
position,
target
){

const id =
positionStopIdentity(
symbol,
position
);

if(
!id
){
return;
}

const map =
readDismissedStops();
const prev =
map[
id
] ||
{};
const next =
{
...prev
};

if(
target ===
"sl" ||
target ===
"both"
){
next.sl =
true;
}

if(
target ===
"tp" ||
target ===
"both"
){
next.tp =
true;
}

map[
id
] =
next;
writeDismissedStops(
map
);

}

export function clearDismissedStops(
symbol,
position
){

const id =
positionStopIdentity(
symbol,
position
);

if(
!id
){
return;
}

const map =
readDismissedStops();

if(
!map[
id
]
){
return;
}

delete map[
id
];
writeDismissedStops(
map
);

}

export function isStopDismissed(
symbol,
position,
target
){

const id =
positionStopIdentity(
symbol,
position
);
const flags =
readDismissedStops()[
id
];

if(
!flags
){
return false;
}

return target ===
"sl"
? !!flags.sl
: !!flags.tp;

}

export function saveAutoStopSettings(
settings
){

const next =
{
slEnabled:
!!settings.slEnabled,
tpEnabled:
!!settings.tpEnabled,
slUsd:
normalizeUsd(
settings.slUsd
),
tpUsd:
normalizeUsd(
settings.tpUsd
)
};

localStorage.setItem(
STORAGE_KEY,
JSON.stringify(
next
)
);

return next;

}

export function calcStopPriceFromUsd(
{
side,
entryPrice,
size,
usd,
kind
}
){

const entry =
Number(
entryPrice
);
const qty =
Number(
size
);
const lossUsd =
Number(
usd
);

if(
!Number.isFinite(
entry
) ||
entry <=
0 ||
!Number.isFinite(
qty
) ||
qty <=
0 ||
!Number.isFinite(
lossUsd
) ||
lossUsd <=
0
){
return null;
}

const isLong =
side ===
"Buy";

if(
kind ===
"sl"
){
return isLong
? entry -
lossUsd /
qty
: entry +
lossUsd /
qty;
}

return isLong
? entry +
lossUsd /
qty
: entry -
lossUsd /
qty;

}

function isRetryableStopError(
result
){

if(
!result ||
result.ok !==
false
){
return false;
}

if(
result.rateLimited
){
return false;
}

const msg =
String(
result.message ||
""
).trim();

return /нет открытой позиции/i.test(
msg
);

}

function tradeStopIpcOptions(
position
){

if(
!position
){
return {};
}

return {
positionSide:
position.positionSide,
side:
position.side,
position
};

}

function autoStopInflightKey(
symbol,
position
){

const policy =
getTradeConfig();

if(
typeof policy.positionMapKey ===
"function"
){
return policy.positionMapKey({
symbol,
positionSide:
position?.positionSide,
side:
position?.side
}) ||
normalizeAutoStopSymbol(
symbol
);
}

return normalizeAutoStopSymbol(
symbol
);

}

async function setPositionStopWithRetry(
api,
symbol,
target,
price,
options =
{}
){

const maxAttempts =
getTradeConfig().setStopMaxAttempts;

for(
let attempt =
0;
attempt <
maxAttempts;
attempt++
){

if(
attempt >
0
){
await new Promise(
resolve=>{
setTimeout(
resolve,
attempt ===
1
? 200
: attempt *
500
);
}
);
}

const result =
await api.setPositionStop(
symbol,
target,
price,
options
);

if(
!isRetryableStopError(
result
) ||
attempt ===
maxAttempts -
1
){
return result;
}

}

return {
ok:
false,
message:
"setPositionStop failed"
};

}

export async function applyAutoStopsAfterEntry(
symbol,
position
){

if(
!symbol ||
!position
){
return;
}

const settings =
getAutoStopSettings();
const api =
window.cryptoTerminalDesktop?.trading;

if(
!api?.setPositionStop
){
return;
}

const side =
position.side ===
"Sell"
? "Sell"
: "Buy";
const entry =
Number(
position.avgPrice
);
const size =
Number(
position.size
);

if(
!Number.isFinite(
entry
) ||
entry <=
0 ||
!Number.isFinite(
size
) ||
size <=
0
){
return;
}

const existingSl =
Number(
position.stopLoss
) ||
0;
const existingTp =
Number(
position.takeProfit
) ||
0;
let nextPosition =
{
...position
};

if(
settings.slEnabled &&
settings.slUsd >
0 &&
existingSl <=
0 &&
!isStopDismissed(
symbol,
position,
"sl"
)
){

const slPrice =
calcStopPriceFromUsd(
{
side,
entryPrice:
entry,
size,
usd:
settings.slUsd,
kind:
"sl"
}
);

if(
slPrice >
0
){
const slResult =
await setPositionStopWithRetry(
api,
symbol,
"sl",
slPrice,
tradeStopIpcOptions(
nextPosition
)
);

if(
slResult?.ok ===
false
){
console.warn(
"[trade-auto-stops]",
symbol,
"sl",
slResult.message ||
"failed"
);

if(
slResult?.rateLimited
){
return;
}
}else{
nextPosition.stopLoss =
slPrice;
}

}

}

if(
getTradeConfig().pauseBeforeTpMs >
0 &&
settings.tpEnabled &&
settings.tpUsd >
0
){
await new Promise(
resolve=>{
setTimeout(
resolve,
getTradeConfig().pauseBeforeTpMs
);
}
);
}

if(
settings.tpEnabled &&
settings.tpUsd >
0 &&
existingTp <=
0 &&
!isStopDismissed(
symbol,
position,
"tp"
)
){

const tpPrice =
calcStopPriceFromUsd(
{
side,
entryPrice:
entry,
size,
usd:
settings.tpUsd,
kind:
"tp"
}
);

if(
tpPrice >
0
){
const tpResult =
await setPositionStopWithRetry(
api,
symbol,
"tp",
tpPrice,
tradeStopIpcOptions(
nextPosition
)
);

if(
tpResult?.ok ===
false
){
console.warn(
"[trade-auto-stops]",
symbol,
"tp",
tpResult.message ||
"failed"
);
}else{
nextPosition.takeProfit =
tpPrice;
}
}
}

try{
const refreshed =
await api.getPosition?.(
symbol,
tradeStopIpcOptions(
nextPosition
)
);

if(
refreshed?.ok &&
refreshed.position
){
const sl =
Number(
refreshed.position.stopLoss
) ||
0;
const tp =
Number(
refreshed.position.takeProfit
) ||
0;

if(
sl >
0 ||
tp >
0
){
nextPosition =
refreshed.position;
}
}
}catch{
/* ignore */
}

window.dispatchEvent(
new CustomEvent(
"trade-position-updated",
{
detail:{
symbol,
position:
nextPosition
}
}
)
);

}

const autoStopInflight =
new Set();

/**
 * Stop/limit fill и другие входы вне market-кнопок — выставить SL/TP из настроек.
 */
export function maybeApplyAutoStopsForNewPosition(
symbol,
position
){

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
normalizeAutoStopSymbol(
symbol
);

const size =
Number(
position.size
);

if(
!sym ||
!Number.isFinite(
size
) ||
size <=
0
){
return;
}

const settings =
getAutoStopSettings();

if(
!settings.slEnabled &&
!settings.tpEnabled
){
return;
}

const existingSl =
Number(
position.stopLoss
) ||
0;
const existingTp =
Number(
position.takeProfit
) ||
0;

const needsSl =
settings.slEnabled &&
settings.slUsd >
0 &&
existingSl <=
0 &&
!isStopDismissed(
symbol,
position,
"sl"
);
const needsTp =
settings.tpEnabled &&
settings.tpUsd >
0 &&
existingTp <=
0 &&
!isStopDismissed(
symbol,
position,
"tp"
);

if(
!needsSl &&
!needsTp
){
return;
}

const inflightKey =
autoStopInflightKey(
sym,
position
);

if(
autoStopInflight.has(
inflightKey
)
){
return;
}

autoStopInflight.add(
inflightKey
);

void (
async()=>{

try{
const policy =
getTradeConfig();

await new Promise(
resolve=>{
setTimeout(
resolve,
policy.autoStopDelayMs
);
}
);

let pos =
position;
const cached =
getCachedPosition(
symbol,
tradeStopIpcOptions(
position
)
);

if(
cached &&
Number(
cached.size
) >
0
){
pos =
cached;
}

const freshSettings =
getAutoStopSettings();
const existingSl =
Number(
pos.stopLoss
) ||
0;
const existingTp =
Number(
pos.takeProfit
) ||
0;
const stillNeedsSl =
freshSettings.slEnabled &&
freshSettings.slUsd >
0 &&
existingSl <=
0 &&
!isStopDismissed(
symbol,
pos,
"sl"
);
const stillNeedsTp =
freshSettings.tpEnabled &&
freshSettings.tpUsd >
0 &&
existingTp <=
0 &&
!isStopDismissed(
symbol,
pos,
"tp"
);

if(
!stillNeedsSl &&
!stillNeedsTp
){
return;
}

/* Main-process attach may have partially applied — still fallback with fresh row. */
await applyAutoStopsAfterEntry(
symbol,
pos
);
}finally{
setTimeout(
()=>{
autoStopInflight.delete(
inflightKey
);
},
3000
);
}

}
)();

}

export function wireAutoStopSettings(
form
){

const panel =
form.querySelector(
"[data-role='auto-stops-panel']"
);
const saveBtn =
form.querySelector(
"[data-role='save-auto-stops']"
);
const statusEl =
form.querySelector(
"[data-role='auto-stops-status']"
);

if(
!panel ||
!saveBtn
){
return;
}

const slEnabled =
panel.querySelector(
"[data-role='auto-sl-enabled']"
);
const tpEnabled =
panel.querySelector(
"[data-role='auto-tp-enabled']"
);
const slInput =
panel.querySelector(
"[data-role='auto-sl-usd']"
);
const tpInput =
panel.querySelector(
"[data-role='auto-tp-usd']"
);

function fillInputs(){

const settings =
getAutoStopSettings();

if(
slEnabled
){
slEnabled.checked =
settings.slEnabled;
}

if(
tpEnabled
){
tpEnabled.checked =
settings.tpEnabled;
}

if(
slInput
){
slInput.value =
settings.slUsd >
0
? String(
settings.slUsd
)
: "";
}

if(
tpInput
){
tpInput.value =
settings.tpUsd >
0
? String(
settings.tpUsd
)
: "";
}

}

function setStatus(
text,
kind =
""
){

if(
!statusEl
){
return;
}

statusEl.textContent =
text ||
"";
statusEl.classList.remove(
"is-ok",
"is-error"
);

if(
kind
){
statusEl.classList.add(
kind
);
}

}

fillInputs();

saveBtn.addEventListener(
"click",
()=>{

const next =
saveAutoStopSettings(
{
slEnabled:
!!slEnabled?.checked,
tpEnabled:
!!tpEnabled?.checked,
slUsd:
slInput?.value,
tpUsd:
tpInput?.value
}
);

fillInputs();
setStatus(
"Сохранено",
"is-ok"
);

}
);

}
