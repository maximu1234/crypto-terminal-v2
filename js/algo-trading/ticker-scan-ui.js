/**
 * UI скана тикеров в 4-й колонке АлгоТрейдинг.
 */
import {
scanAlgoTickersByWinRate,
normalizeAlgoScanTf,
ALGO_TICKER_SCAN_TF
} from "./ticker-scanner.js?v=9";

import {
ALGO_FLAG_LONG_5M,
ALGO_FLAG_SHORT_5M,
ALGO_FLAG_BOTH_5M,
ALGO_FLAG_FAVORITES,
replaceAlgoTickerFlagList
} from "./ticker-flags.js?v=8";

import {
mountAlgoStrategyUniverseUi
} from "./strategy-universe-ui.js?v=8";

import {
mountAlgoStrategyParamOptimizeUniverseUi
} from "./strategy-param-optimize-universe-ui.js?v=16";

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
const scanTfBar =
document.getElementById(
"algo-scan-tf"
);
const scanTfBtns =
[
...(
scanTfBar?.querySelectorAll(
"[data-scan-tf]"
) ||
[]
)
];
const statusEl =
document.getElementById(
"algo-scan-status"
);

/** @type {Record<"long"|"short"|"both"|"top100", {
 *   min: HTMLInputElement|null,
 *   real: HTMLInputElement|null,
 *   find: HTMLButtonElement|null,
 *   stop: HTMLButtonElement|null,
 *   found: HTMLElement|null,
 *   add: HTMLButtonElement|null,
 *   prefKey: string,
 *   label: string,
 *   scanSide?: "long"|"short"|"both",
 *   universe?: "all"|"top100",
 *   flagId?: string,
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
real:
document.getElementById(
"algo-scan-long-real"
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
prefKey:
"scanLongMinWinRate",
label:
"Лонг",
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
real:
document.getElementById(
"algo-scan-short-real"
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
prefKey:
"scanShortMinWinRate",
label:
"Шорт",
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
real:
document.getElementById(
"algo-scan-both-real"
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
prefKey:
"scanBothMinWinRate",
label:
"Лонг+Шорт",
hits:
[],
signal:
null
},
top100:{
min:
document.getElementById(
"algo-scan-top100-min"
),
real:
document.getElementById(
"algo-scan-top100-real"
),
find:
document.getElementById(
"algo-scan-top100-find"
),
stop:
document.getElementById(
"algo-scan-top100-stop"
),
found:
document.getElementById(
"algo-scan-top100-found"
),
add:
document.getElementById(
"algo-scan-top100-add"
),
prefKey:
"scanTop100MinWinRate",
label:
"Топ-100",
scanSide:
"both",
universe:
"top100",
flagId:
ALGO_FLAG_FAVORITES,
hits:
[],
signal:
null
}
};

let strategyId =
"st1";
let scanTf =
ALGO_TICKER_SCAN_TF;
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
return 50;
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

function setScanTf(
raw
){

scanTf =
normalizeAlgoScanTf(
raw
);

for(
const btn of scanTfBtns
){
btn.classList.toggle(
"active",
btn.getAttribute(
"data-scan-tf"
) ===
scanTf
);
}

host.persistPrefs?.(
{
scanTf
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

if(
!statusEl
){
return;
}

const lane =
lanes[
side
];
const label =
lane?.label ||
"";
const body =
text ||
"";

statusEl.textContent =
body
? (
label
? `${label} · ${body}`
: body
)
: "";
statusEl.classList.toggle(
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
const scanSide =
lane.scanSide ||
side;
const universe =
lane.universe ||
"all";
const universeLabel =
universe ===
"top100"
? "топ-100"
: "все";

setRunning(
side,
true
);
setStatus(
side,
`скан ${universeLabel} · ${scanTf}…`,
true
);
lane.hits =
[];
syncFoundUi(
side
);

try{
const statsMode =
lane.real?.checked
? "real"
: "direct";
const result =
await scanAlgoTickersByWinRate(
{
strategyId,
side:
scanSide,
universe,
minWinRate,
tf:
scanTf,
statsMode,
tradeOpts:
host.getTradeOpts?.(
strategyId
) ||
{},
signal,
onProgress:(
done,
total,
hitCount
)=>{
setStatus(
side,
`${universeLabel} · ${scanTf} · ${done}/${total} · найдено ${hitCount}`,
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
`готово · ${lane.hits.length} · ${result.tf || scanTf}`
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
lane.flagId
){
replaceAlgoTickerFlagList(
lane.flagId,
symbols
);
}else if(
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
side ===
"top100"
? `в Избранные: ${symbols.length}`
: `в списке: ${symbols.length}`
);

}

const prefs =
host.readPrefs?.() ||
{};

setStrategy(
prefs.scanStrategy ||
"st1"
);
setScanTf(
prefs.scanTf ||
ALGO_TICKER_SCAN_TF
);

for(
const side of [
"long",
"short",
"both",
"top100"
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
50
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
const btn of scanTfBtns
){
btn.addEventListener(
"click",
()=>{
setScanTf(
btn.getAttribute(
"data-scan-tf"
)
);
}
);
}

for(
const side of [
"long",
"short",
"both",
"top100"
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

const universeUi =
mountAlgoStrategyUniverseUi(
{
getTradeOpts:
host.getTradeOpts,
getStrategyStatsMode:
host.getStrategyStatsMode,
getScanTf:()=>
scanTf
}
);

const optimizeUniverseUi =
mountAlgoStrategyParamOptimizeUniverseUi(
{
getTradeOpts:
host.getTradeOpts,
getStrategyStatsMode:
host.getStrategyStatsMode,
getScanTf:()=>
scanTf
}
);

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
stopScan(
"top100"
);
universeUi.stopAll();
optimizeUniverseUi.stopAll();
}
};

}
