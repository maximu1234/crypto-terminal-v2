/**
 * UI скана тикеров в 4-й колонке АлгоТрейдинг.
 */
import {
scanAlgoTickersByWinRate
} from "./ticker-scanner.js?v=2";

import {
ALGO_FLAG_LONG_5M,
ALGO_FLAG_SHORT_5M,
ALGO_FLAG_BOTH_5M,
replaceAlgoTickerFlagList
} from "./ticker-flags.js?v=2";

/**
 * @param {{
 *   getTradeOpts: () => object,
 *   persistPrefs?: (patch: object) => void,
 *   readPrefs?: () => object,
 *   onListsChanged?: () => void
 * }} host
 */
export function mountAlgoTickerScanUi(
host
){

const st1 =
document.getElementById(
"algo-scan-st1"
);
const st2 =
document.getElementById(
"algo-scan-st2"
);
const st3 =
document.getElementById(
"algo-scan-st3"
);

/** @type {Record<"long"|"short"|"both", {
 *   min: HTMLInputElement|null,
 *   find: HTMLButtonElement|null,
 *   stop: HTMLButtonElement|null,
 *   found: HTMLElement|null,
 *   add: HTMLButtonElement|null,
 *   status: HTMLElement|null,
 *   prefKey: string,
 *   hits: string[],
 *   signal: { cancelled: boolean }|null
 * }>} */
const lanes =
{
long:{
min:
document.getElementById(
"algo-scan-long-min"
),
find:
document.getElementById(
"algo-scan-long-find"
),
stop:
document.getElementById(
"algo-scan-long-stop"
),
found:
document.getElementById(
"algo-scan-long-found"
),
add:
document.getElementById(
"algo-scan-long-add"
),
status:
document.getElementById(
"algo-scan-long-status"
),
prefKey:
"scanLongMinWinRate",
hits:
[],
signal:
null
},
short:{
min:
document.getElementById(
"algo-scan-short-min"
),
find:
document.getElementById(
"algo-scan-short-find"
),
stop:
document.getElementById(
"algo-scan-short-stop"
),
found:
document.getElementById(
"algo-scan-short-found"
),
add:
document.getElementById(
"algo-scan-short-add"
),
status:
document.getElementById(
"algo-scan-short-status"
),
prefKey:
"scanShortMinWinRate",
hits:
[],
signal:
null
},
both:{
min:
document.getElementById(
"algo-scan-both-min"
),
find:
document.getElementById(
"algo-scan-both-find"
),
stop:
document.getElementById(
"algo-scan-both-stop"
),
found:
document.getElementById(
"algo-scan-both-found"
),
add:
document.getElementById(
"algo-scan-both-add"
),
status:
document.getElementById(
"algo-scan-both-status"
),
prefKey:
"scanBothMinWinRate",
hits:
[],
signal:
null
}
};

let strategyId =
"st1";

function clampMin(
raw
){

const n =
Number(
raw
);

if(
!Number.isFinite(
n
)
){
return 60;
}

return Math.min(
100,
Math.max(
10,
Math.round(
n
)
)
);

}

function setStrategy(
id
){

strategyId =
id ===
"st2" ||
id ===
"st3"
? id
: "st1";

if(
st1
){
st1.checked =
strategyId ===
"st1";
}

if(
st2
){
st2.checked =
strategyId ===
"st2";
}

if(
st3
){
st3.checked =
strategyId ===
"st3";
}

host.persistPrefs?.(
{
scanStrategy:
strategyId
}
);

}

function syncFoundUi(
side
){

const lane =
lanes[
side
];

if(
!lane
){
return;
}

if(
lane.found
){
lane.found.textContent =
String(
lane.hits.length
);
}

if(
lane.add
){
lane.add.disabled =
lane.hits.length ===
0;
}

}

function setStatus(
side,
text,
scanning =
false
){

const lane =
lanes[
side
];

if(
!lane?.status
){
return;
}

lane.status.textContent =
text ||
"";
lane.status.classList.toggle(
"is-scanning",
scanning
);

}

function setRunning(
side,
running
){

const lane =
lanes[
side
];

if(
!lane
){
return;
}

if(
lane.find
){
lane.find.disabled =
running;
}

if(
lane.stop
){
lane.stop.disabled =
!running;
}

}

async function runScan(
side
){

const lane =
lanes[
side
];

if(
!lane
){
return;
}

const minWinRate =
clampMin(
lane.min?.value
);

if(
lane.min
){
lane.min.value =
String(
minWinRate
);
}

host.persistPrefs?.(
{
[
lane.prefKey
]:
minWinRate
}
);

if(
lane.signal
){
lane.signal.cancelled =
true;
}

lane.signal =
{
cancelled:
false
};
const signal =
lane.signal;

setRunning(
side,
true
);
setStatus(
side,
"скан…",
true
);
lane.hits =
[];
syncFoundUi(
side
);

try{
const result =
await scanAlgoTickersByWinRate(
{
strategyId,
side,
minWinRate,
tradeOpts:
host.getTradeOpts?.() ||
{},
signal,
onProgress:(
done,
total,
hitCount
)=>{
setStatus(
side,
`${done}/${total} · найдено ${hitCount}`,
true
);
}
}
);

if(
signal.cancelled
){
setStatus(
side,
"остановлено"
);
return;
}

lane.hits =
result.symbols ||
[];
syncFoundUi(
side
);
setStatus(
side,
`готово · ${lane.hits.length}`
);
}catch(
err
){
console.warn(
"[algo-trading] scan ui",
err
);
setStatus(
side,
"ошибка"
);
}finally{
setRunning(
side,
false
);
}

}

function stopScan(
side
){

const lane =
lanes[
side
];

if(
!lane
){
return;
}

if(
lane.signal
){
lane.signal.cancelled =
true;
}

setStatus(
side,
"остановка…"
);

}

function addToList(
side
){

const lane =
lanes[
side
];

if(
!lane
){
return;
}

const symbols =
lane.hits;

if(
side ===
"both"
){
replaceAlgoTickerFlagList(
ALGO_FLAG_BOTH_5M,
symbols
);
}else{
replaceAlgoTickerFlagList(
side ===
"long"
? ALGO_FLAG_LONG_5M
: ALGO_FLAG_SHORT_5M,
symbols
);
}

host.onListsChanged?.();
setStatus(
side,
`в списке: ${symbols.length}`
);

}

const prefs =
host.readPrefs?.() ||
{};

setStrategy(
prefs.scanStrategy ||
"st1"
);

for(
const side of [
"long",
"short",
"both"
]
){

const lane =
lanes[
side
];
const prefVal =
prefs[
lane.prefKey
];

if(
lane.min
){
lane.min.value =
String(
clampMin(
prefVal ??
60
)
);
}

syncFoundUi(
side
);
setRunning(
side,
false
);

}

st1?.addEventListener(
"change",
()=>{
if(
st1.checked
){
setStrategy(
"st1"
);
}else{
st1.checked =
true;
}
}
);
st2?.addEventListener(
"change",
()=>{
if(
st2.checked
){
setStrategy(
"st2"
);
}else{
st2.checked =
true;
}
}
);
st3?.addEventListener(
"change",
()=>{
if(
st3.checked
){
setStrategy(
"st3"
);
}else{
st3.checked =
true;
}
}
);

for(
const side of [
"long",
"short",
"both"
]
){

const lane =
lanes[
side
];

lane.find?.addEventListener(
"click",
()=>{
void runScan(
side
);
}
);
lane.stop?.addEventListener(
"click",
()=>{
stopScan(
side
);
}
);
lane.add?.addEventListener(
"click",
()=>{
addToList(
side
);
}
);

}

return {
stopAll(){
stopScan(
"long"
);
stopScan(
"short"
);
stopScan(
"both"
);
}
};

}
