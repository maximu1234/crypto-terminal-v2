/**
 * UI скана тикеров в 4-й колонке АлгоТрейдинг.
 */
import {
scanAlgoTickersByWinRate,
normalizeAlgoScanTf,
ALGO_TICKER_SCAN_TF
} from "./ticker-scanner.js?v=6";

import {
scanAlgoTickersAllStrategyStats
} from "./ticker-scan-all-stats.js?v=2";

import {
ALGO_FLAG_LONG_5M,
ALGO_FLAG_SHORT_5M,
ALGO_FLAG_BOTH_5M,
replaceAlgoTickerFlagList
} from "./ticker-flags.js?v=6";

const GLOBAL_ST_LABELS =
{
st1:
"Стратегия 1",
st2:
"Стратегия 2",
st3:
"Стратегия 3"
};

/**
 * @param {number|null|undefined} value
 * @param {{ signed?: boolean }} [opts]
 */
function formatUsdShort(
value,
opts =
{}
){

const n =
Number(
value
);

if(
!Number.isFinite(
n
)
){
return "—";
}

const abs =
Math.abs(
n
);
const body =
abs >=
100
? abs.toFixed(
0
)
: abs.toFixed(
2
);
const signed =
opts.signed !==
false;
const sign =
n >
0 &&
signed
? "+"
: n <
0
? "−"
: "";

return `${sign}${body}$`;

}

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
const globalRunBtn =
document.getElementById(
"algo-global-scan-run"
);
const globalStopBtn =
document.getElementById(
"algo-global-scan-stop"
);
const globalStatusEl =
document.getElementById(
"algo-global-scan-status"
);
const globalRealCheck =
document.getElementById(
"algo-global-scan-real"
);
const globalPopover =
document.getElementById(
"algo-global-scan-popover"
);
const globalStBtns =
[
...(
document.querySelectorAll(
"[data-global-st]"
) ||
[]
)
];

/** @type {Record<"long"|"short"|"both", {
 *   min: HTMLInputElement|null,
 *   real: HTMLInputElement|null,
 *   find: HTMLButtonElement|null,
 *   stop: HTMLButtonElement|null,
 *   found: HTMLElement|null,
 *   add: HTMLButtonElement|null,
 *   prefKey: string,
 *   label: string,
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
}
};

let strategyId =
"st1";
let scanTf =
ALGO_TICKER_SCAN_TF;
/** @type {{ cancelled: boolean }|null} */
let globalSignal =
null;
/** @type {Record<"st1"|"st2"|"st3", import("./ticker-scan-all-stats.js").AlgoGlobalStrategyAgg>|null} */
let globalByStrategy =
null;
/** @type {"st1"|"st2"|"st3"|null} */
let openGlobalSt =
null;

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

function setGlobalStatus(
text,
scanning =
false
){

if(
!globalStatusEl
){
return;
}

globalStatusEl.textContent =
text ||
"";
globalStatusEl.classList.toggle(
"is-scanning",
scanning
);

}

function setGlobalRunning(
running
){

if(
globalRunBtn
){
globalRunBtn.disabled =
running;
}

if(
globalStopBtn
){
globalStopBtn.disabled =
!running;
}

}

function closeGlobalPopover(){

openGlobalSt =
null;

if(
globalPopover
){
globalPopover.classList.add(
"hidden"
);
globalPopover.hidden =
true;
}

for(
const btn of globalStBtns
){
btn.classList.remove(
"is-open"
);
}

}

/**
 * @param {number|null|undefined} value
 */
function formatPctShort(
value
){

if(
!Number.isFinite(
value
)
){
return "—";
}

return `${Number(
value
).toFixed(
1
)}%`;

}

/**
 * @param {number} wins
 * @param {number} losses
 */
function sideRate(
wins,
losses,
kind
){

const closed =
wins +
losses;

if(
closed <=
0
){
return null;
}

const n =
kind ===
"loss"
? losses
: wins;

return n /
closed *
100;

}

/**
 * @param {"st1"|"st2"|"st3"} id
 */
function renderGlobalPopover(
id
){

const stats =
globalByStrategy?.[
id
];

if(
!globalPopover ||
!stats
){
return;
}

const titleEl =
globalPopover.querySelector(
"[data-global-pop-title]"
);

if(
titleEl
){
titleEl.textContent =
GLOBAL_ST_LABELS[
id
] ||
id;
}

const longWinRate =
sideRate(
stats.longWins,
stats.longLosses,
"win"
);
const longLossRate =
sideRate(
stats.longWins,
stats.longLosses,
"loss"
);
const shortWinRate =
sideRate(
stats.shortWins,
stats.shortLosses,
"win"
);
const shortLossRate =
sideRate(
stats.shortWins,
stats.shortLosses,
"loss"
);

const map =
{
longWins:
String(
stats.longWins
),
longWinRate:
formatPctShort(
longWinRate
),
longWinUsd:
formatUsdShort(
stats.longWinUsd,
{
signed:
false
}
),
longLosses:
String(
stats.longLosses
),
longLossRate:
formatPctShort(
longLossRate
),
longLossUsd:
formatUsdShort(
stats.longLossUsd,
{
signed:
false
}
),
shortWins:
String(
stats.shortWins
),
shortWinRate:
formatPctShort(
shortWinRate
),
shortWinUsd:
formatUsdShort(
stats.shortWinUsd,
{
signed:
false
}
),
shortLosses:
String(
stats.shortLosses
),
shortLossRate:
formatPctShort(
shortLossRate
),
shortLossUsd:
formatUsdShort(
stats.shortLossUsd,
{
signed:
false
}
),
longNetUsd:
formatUsdShort(
stats.longNetUsd
),
shortNetUsd:
formatUsdShort(
stats.shortNetUsd
)
};

for(
const [
key,
value
] of Object.entries(
map
)
){
const el =
globalPopover.querySelector(
`[data-global-pop="${key}"]`
);

if(
el
){
el.textContent =
value;

if(
key ===
"longNetUsd" ||
key ===
"shortNetUsd"
){
const n =
Number(
stats[
key
]
);
el.classList.toggle(
"is-pos",
n >
0
);
el.classList.toggle(
"is-neg",
n <
0
);
}
}
}

}

/**
 * @param {"st1"|"st2"|"st3"} id
 */
function openGlobalDetail(
id
){

if(
!globalByStrategy?.[
id
]
){
return;
}

if(
openGlobalSt ===
id
){
closeGlobalPopover();
return;
}

openGlobalSt =
id;
renderGlobalPopover(
id
);

if(
globalPopover
){
globalPopover.classList.remove(
"hidden"
);
globalPopover.hidden =
false;
}

for(
const btn of globalStBtns
){
btn.classList.toggle(
"is-open",
btn.getAttribute(
"data-global-st"
) ===
id
);
}

}

function syncGlobalStrategyButtons(){

for(
const btn of globalStBtns
){
const id =
btn.getAttribute(
"data-global-st"
);
const netEl =
btn.querySelector(
"[data-global-net]"
);
const stats =
id &&
globalByStrategy
? globalByStrategy[
id
]
: null;
const ready =
!!stats;
btn.disabled =
!ready;

if(
!netEl
){
continue;
}

if(
!ready
){
netEl.textContent =
"—";
netEl.classList.remove(
"is-pos",
"is-neg"
);
continue;
}

const net =
Number(
stats.netUsd
);
netEl.textContent =
formatUsdShort(
net
);
netEl.classList.toggle(
"is-pos",
net >
0
);
netEl.classList.toggle(
"is-neg",
net <
0
);
}

}

async function runGlobalScan(){

if(
globalSignal
){
globalSignal.cancelled =
true;
}

globalSignal =
{
cancelled:
false
};
const signal =
globalSignal;

closeGlobalPopover();
globalByStrategy =
null;
syncGlobalStrategyButtons();
setGlobalRunning(
true
);
setGlobalStatus(
`скан ${scanTf}…`,
true
);

try{
const result =
await scanAlgoTickersAllStrategyStats(
{
tf:
scanTf,
statsMode:
globalRealCheck?.checked
? "real"
: "direct",
tradeOpts:
host.getTradeOpts?.() ||
{},
signal,
onProgress:(
done,
total
)=>{
setGlobalStatus(
`${scanTf} · ${done}/${total}`,
true
);
}
}
);

if(
signal.cancelled
){
setGlobalStatus(
"остановлено"
);
return;
}

globalByStrategy =
result.byStrategy;
syncGlobalStrategyButtons();
setGlobalStatus(
`готово · ${result.total} · ${result.tf || scanTf}`
);
}catch(
err
){
console.warn(
"[algo-trading] global scan ui",
err
);
setGlobalStatus(
"ошибка"
);
}finally{
setGlobalRunning(
false
);
}

}

function stopGlobalScan(){

if(
globalSignal
){
globalSignal.cancelled =
true;
}

setGlobalStatus(
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

setRunning(
side,
true
);
setStatus(
side,
`скан ${scanTf}…`,
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
side,
minWinRate,
tf:
scanTf,
statsMode,
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
`${scanTf} · ${done}/${total} · найдено ${hitCount}`,
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
setScanTf(
prefs.scanTf ||
ALGO_TICKER_SCAN_TF
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

syncGlobalStrategyButtons();
setGlobalRunning(
false
);
closeGlobalPopover();

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

globalRunBtn?.addEventListener(
"click",
()=>{
void runGlobalScan();
}
);
globalStopBtn?.addEventListener(
"click",
()=>{
stopGlobalScan();
}
);

for(
const btn of globalStBtns
){
btn.addEventListener(
"click",
()=>{
const id =
btn.getAttribute(
"data-global-st"
);

if(
id ===
"st1" ||
id ===
"st2" ||
id ===
"st3"
){
openGlobalDetail(
id
);
}
}
);
}

document.addEventListener(
"pointerdown",
ev=>{
if(
!openGlobalSt ||
!globalPopover
){
return;
}

const target =
ev.target;

if(
!(
target instanceof Node
)
){
return;
}

if(
globalPopover.contains(
target
)
){
return;
}

for(
const btn of globalStBtns
){
if(
btn.contains(
target
)
){
return;
}
}

closeGlobalPopover();
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
stopGlobalScan();
}
};

}
