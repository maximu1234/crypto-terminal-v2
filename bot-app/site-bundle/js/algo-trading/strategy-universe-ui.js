/**
 * UI бэктеста стратегии по Топ-100 / всем тикерам (модалка как в Pattern 1-2).
 */
import {
scanAlgoStrategyUniverse,
normalizeAlgoScanStrategyId
} from "./strategy-universe-scan.js?v=3";

import {
normalizeAlgoScanTf,
ALGO_TICKER_SCAN_TF
} from "./ticker-scanner.js?v=7";

import {
normalizeAlgoStatsMode
} from "./pattern-trade-stats.js?v=12";

const ST_LABELS =
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
 * @param {number|null|undefined} rate
 */
function formatPctShort(
rate
){

const n =
Number(
rate
);

if(
!Number.isFinite(
n
)
){
return "—";
}

return `${n.toFixed(1)}%`;

}

/**
 * @param {number} value
 */
function formatTurnover(
value
){

const n =
Number(
value
);

if(
!Number.isFinite(
n
) ||
n <=
0
){
return "—";
}

if(
n >=
1e9
){
return `${(n / 1e9).toFixed(2)}B`;
}

if(
n >=
1e6
){
return `${(n / 1e6).toFixed(1)}M`;
}

if(
n >=
1e3
){
return `${(n / 1e3).toFixed(0)}K`;
}

return n.toFixed(
0
);

}

/**
 * @param {{
 *   getTradeOpts: () => object,
 *   getStrategyStatsMode?: (id: "st1"|"st2"|"st3") => string,
 *   getScanTf?: () => string
 * }} host
 */
export function mountAlgoStrategyUniverseUi(
host
){

const modal =
document.getElementById(
"algo-universe-modal"
);
const titleEl =
document.getElementById(
"algo-universe-modal-title"
);
const noteEl =
document.getElementById(
"algo-universe-modal-note"
);
const progressWrap =
document.getElementById(
"algo-universe-progress"
);
const progressBar =
document.getElementById(
"algo-universe-progress-bar"
);
const progressLabel =
document.getElementById(
"algo-universe-progress-label"
);
const runBtn =
document.getElementById(
"algo-universe-run"
);
const stopBtn =
document.getElementById(
"algo-universe-stop"
);
const closeBtns =
[
...(
document.querySelectorAll(
"[data-close=\"algo-universe-modal\"]"
) ||
[]
)
];
const tableBody =
document.querySelector(
"#algo-universe-table tbody"
);
const scanBtns =
[
...(
document.querySelectorAll(
"[data-algo-universe-scan]"
) ||
[]
)
];

/** @type {{ cancelled: boolean }|null} */
let signal =
null;
let running =
false;
/** @type {"st1"|"st2"|"st3"} */
let pendingStrategy =
"st1";
/** @type {"all"|"top100"} */
let pendingUniverse =
"top100";

/**
 * Last successful backtest per strategy × universe (in-memory until app restart).
 * @type {Map<string, {
 *   agg: object,
 *   rows: object[],
 *   done: number,
 *   total: number,
 *   tf: string,
 *   statsMode: string,
 *   finishedAt: number
 * }>}
 */
const lastResultsBySlot =
new Map();

/**
 * @param {"st1"|"st2"|"st3"|string} strategyId
 * @param {"all"|"top100"|string} universe
 * @returns {string}
 */
function slotKey(
strategyId,
universe
){

const st =
normalizeAlgoScanStrategyId(
strategyId
);
const uni =
universe ===
"all"
? "all"
: "top100";

return `${st}:${uni}`;

}

/**
 * @param {string} key
 * @returns {{
 *   agg: object,
 *   rows: object[],
 *   done: number,
 *   total: number,
 *   tf: string,
 *   statsMode: string,
 *   finishedAt: number
 * }|null}
 */
function loadSlot(
key
){

return lastResultsBySlot.get(
key
) ||
null;

}

/**
 * @param {string} key
 * @param {{
 *   agg: object,
 *   rows: object[],
 *   done: number,
 *   total: number,
 *   tf: string,
 *   statsMode: string
 * }} payload
 */
function saveSlot(
key,
payload
){

lastResultsBySlot.set(
key,
{
agg:
payload.agg,
rows:
Array.isArray(
payload.rows
)
? payload.rows
: [],
done:
Number(
payload.done
) ||
0,
total:
Number(
payload.total
) ||
0,
tf:
String(
payload.tf ||
""
),
statsMode:
String(
payload.statsMode ||
""
),
finishedAt:
Date.now()
}
);

}

function setOpen(
open
){

if(
!modal
){
return;
}

modal.classList.toggle(
"hidden",
!open
);
modal.hidden =
!open;
}

function setProgress(
done,
total
){

if(
progressWrap
){
progressWrap.hidden =
false;
}

const pct =
total
? Math.round(
(
done /
total
) *
100
)
: 0;

if(
progressBar
){
progressBar.style.width =
`${pct}%`;
}

if(
progressLabel
){
progressLabel.textContent =
`${done} / ${total}`;
}

}

function setStatus(
strategyId,
text,
scanning =
false
){

const el =
document.querySelector(
`[data-algo-universe-status="${strategyId}"]`
);

if(
!el
){
return;
}

el.textContent =
text ||
"";
el.classList.toggle(
"is-scanning",
scanning
);

}

function setRunningUi(
isRunning
){

running =
isRunning;

if(
runBtn
){
runBtn.disabled =
isRunning;
runBtn.hidden =
isRunning;
}

if(
stopBtn
){
stopBtn.disabled =
!isRunning;
stopBtn.hidden =
!isRunning;
}

for(
const btn of scanBtns
){
btn.disabled =
isRunning;
}

}

/**
 * @param {number} count
 * @param {number|null|undefined} ratePct 0..100
 */
function formatCountWithPct(
count,
ratePct
){

const n =
Number(
count
) ||
0;
const rate =
Number(
ratePct
);

if(
!Number.isFinite(
rate
)
){
return String(
n
);
}

return `${n} (${rate.toFixed(0)}%)`;

}

/**
 * @param {number|null|undefined} value
 */
function formatR(
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

const digits =
opts.digits ??
2;
const body =
Math.abs(
n
).toFixed(
digits
);

if(
n <
0
){
return `−${body}R`;
}

if(
opts.signed !==
false &&
n >
0
){
return `+${body}R`;
}

return `${body}R`;

}

/**
 * @param {object} agg
 */
function renderAgg(
agg
){

const longWins =
Number(
agg.longWins
) ||
0;
const longLosses =
Number(
agg.longLosses
) ||
0;
const shortWins =
Number(
agg.shortWins
) ||
0;
const shortLosses =
Number(
agg.shortLosses
) ||
0;
const longClosed =
longWins +
longLosses;
const shortClosed =
shortWins +
shortLosses;
const wins =
Number(
agg.wins
) ||
(
longWins +
shortWins
);
const losses =
Number(
agg.losses
) ||
(
longLosses +
shortLosses
);
const bes =
Number(
agg.bes
) ||
0;
const open =
Number(
agg.open
) ||
0;
const sumR =
Number(
agg.sumR
) ||
0;
const closedR =
wins +
losses +
bes;
const wrPct =
closedR
? wins /
closedR *
100
: null;
const expectancyR =
closedR
? sumR /
closedR
: null;
const historySpanSec =
Number(
agg.historySpanSec
);
const spanDays =
Number.isFinite(
historySpanSec
) &&
historySpanSec >
0
? historySpanSec /
86400
: null;
const tradesPerDay =
spanDays &&
closedR >
0
? closedR /
spanDays
: null;

const map =
{
longWins:
formatCountWithPct(
longWins,
longClosed
? longWins /
longClosed *
100
: null
),
longLosses:
formatCountWithPct(
longLosses,
longClosed
? longLosses /
longClosed *
100
: null
),
shortWins:
formatCountWithPct(
shortWins,
shortClosed
? shortWins /
shortClosed *
100
: null
),
shortLosses:
formatCountWithPct(
shortLosses,
shortClosed
? shortLosses /
shortClosed *
100
: null
),
profitUsd:
formatUsdShort(
agg.profitUsd,
{
signed:
false
}
),
lossUsd:
formatUsdShort(
agg.lossUsd,
{
signed:
false
}
),
netUsd:
formatUsdShort(
agg.netUsd
),
bes:
String(
bes
),
open:
String(
open
),
wr:
Number.isFinite(
wrPct
)
? `${wrPct.toFixed(1)}%`
: "—",
expectancyR:
Number.isFinite(
expectancyR
)
? formatR(
expectancyR,
{
signed:
false,
digits:
2
}
)
: "—",
sumR:
formatR(
sumR,
{
digits:
1
}
),
closedR:
String(
closedR
),
tradesPerDay:
Number.isFinite(
tradesPerDay
)
? tradesPerDay.toFixed(
1
)
: "—"
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
modal?.querySelector(
`[data-universe-agg="${key}"]`
);

if(
!el
){
continue;
}

el.textContent =
value;

if(
key ===
"netUsd" ||
key ===
"sumR" ||
key ===
"expectancyR" ||
key ===
"wr"
){
let n =
null;

if(
key ===
"wr"
){
n =
wrPct;
}else if(
key ===
"expectancyR"
){
n =
expectancyR;
}else if(
key ===
"sumR"
){
n =
sumR;
}else{
n =
Number(
agg.netUsd
);
}

const pos =
key ===
"wr"
? Number.isFinite(
n
) &&
n >=
50
: Number.isFinite(
n
) &&
n >
0;
const neg =
key ===
"wr"
? Number.isFinite(
n
) &&
closedR >
0 &&
n <
50
: Number.isFinite(
n
) &&
n <
0;

el.classList.toggle(
"is-pos",
pos
);
el.classList.toggle(
"is-neg",
neg
);
}
}

}

/**
 * @param {object[]} rows
 */
function renderTable(
rows
){

if(
!tableBody
){
return;
}

tableBody.innerHTML =
(
rows ||
[]
).map(
row=>{

if(
row.skipped
){
return `<tr class="is-skip"><td>${row.rank}</td><td>${row.symbol}</td><td>${formatTurnover(row.turnover24h)}</td><td colspan="8">${row.error || "skip"}</td></tr>`;
}

const tone =
row.closed ===
0
? ""
: row.netUsd >
0
? "is-pos-row"
: row.netUsd <
0
? "is-neg-row"
: "";
const wr =
formatPctShort(
row.winRate
);
const sumR =
formatR(
row.sumR,
{
digits:
2
}
);

return `<tr class="${tone}"><td>${row.rank}</td><td>${row.symbol}</td><td>${formatTurnover(row.turnover24h)}</td><td>${row.closed}</td><td class="col-wins">${row.wins}</td><td class="col-losses">${row.losses}</td><td>${row.open}</td><td>${wr}</td><td>${sumR}</td><td>${formatUsdShort(row.netUsd)}</td></tr>`;

}
).join(
""
);

}

function buildNote(
strategyId,
universe,
tf,
statsMode
){

const universeLabel =
universe ===
"top100"
? "Топ-100 по обороту 24ч"
: "все тикеры биржи";
const modeLabel =
statsMode ===
"real"
? "реальный подсчёт"
: "прямой подсчёт";

return `${ST_LABELS[strategyId] || strategyId} · ${universeLabel} · TF ${tf} · ${modeLabel} · параметры колонки стратегии`;

}

function openFor(
strategyId,
universe
){

pendingStrategy =
normalizeAlgoScanStrategyId(
strategyId
);
pendingUniverse =
universe ===
"all"
? "all"
: "top100";

const tf =
normalizeAlgoScanTf(
host.getScanTf?.() ||
ALGO_TICKER_SCAN_TF
);
const statsMode =
normalizeAlgoStatsMode(
host.getStrategyStatsMode?.(
pendingStrategy
) ||
"direct"
);
const cached =
loadSlot(
slotKey(
pendingStrategy,
pendingUniverse
)
);

if(
titleEl
){
titleEl.textContent =
`Бэктест · ${ST_LABELS[pendingStrategy]} · ${pendingUniverse === "top100" ? "Топ-100" : "Все тикеры"}`;
}

if(
cached
){
if(
noteEl
){
noteEl.textContent =
buildNote(
pendingStrategy,
pendingUniverse,
cached.tf ||
tf,
cached.statsMode ||
statsMode
) +
". Последний результат — нажмите «Запустить» для обновления.";
}

renderAgg(
cached.agg ||
{}
);
renderTable(
cached.rows ||
[]
);

if(
progressWrap
){
progressWrap.hidden =
false;
}

setProgress(
cached.done,
cached.total ||
(
pendingUniverse ===
"top100"
? 100
: 0
)
);
}else{
if(
noteEl
){
noteEl.textContent =
buildNote(
pendingStrategy,
pendingUniverse,
tf,
statsMode
) +
". Нажмите «Запустить».";
}

renderAgg(
{
longWins:
0,
longLosses:
0,
shortWins:
0,
shortLosses:
0,
profitUsd:
0,
lossUsd:
0,
netUsd:
0
}
);
renderTable(
[]
);

if(
progressWrap
){
progressWrap.hidden =
true;
}

setProgress(
0,
pendingUniverse ===
"top100"
? 100
: 0
);
}

setOpen(
true
);

}

async function runScan(){

if(
running
){
return;
}

if(
signal
){
signal.cancelled =
true;
}

signal =
{
cancelled:
false
};
const localSignal =
signal;
const strategyId =
pendingStrategy;
const universe =
pendingUniverse;
const tf =
normalizeAlgoScanTf(
host.getScanTf?.() ||
ALGO_TICKER_SCAN_TF
);
const statsMode =
normalizeAlgoStatsMode(
host.getStrategyStatsMode?.(
strategyId
) ||
"direct"
);

if(
titleEl
){
titleEl.textContent =
`Бэктест · ${ST_LABELS[strategyId]} · ${universe === "top100" ? "Топ-100" : "Все тикеры"}`;
}

if(
noteEl
){
noteEl.textContent =
buildNote(
strategyId,
universe,
tf,
statsMode
);
}

setRunningUi(
true
);
setStatus(
strategyId,
`скан…`,
true
);
setProgress(
0,
universe ===
"top100"
? 100
: 0
);
renderAgg(
{
longWins:
0,
longLosses:
0,
shortWins:
0,
shortLosses:
0,
profitUsd:
0,
lossUsd:
0,
netUsd:
0
}
);
renderTable(
[]
);

try{
const result =
await scanAlgoStrategyUniverse(
{
strategyId,
universe,
tf,
statsMode,
tradeOpts:
host.getTradeOpts?.() ||
{},
signal:
localSignal,
onProgress:(
done,
total,
partial
)=>{
setProgress(
done,
total
);
renderAgg(
partial.agg
);

if(
done %
5 ===
0 ||
done ===
total
){
renderTable(
partial.rows
);
}

setStatus(
strategyId,
`${universe === "top100" ? "топ-100" : "все"} · ${tf} · ${done}/${total}`,
true
);
}
}
);

if(
localSignal.cancelled
){
setStatus(
strategyId,
"остановлено"
);

if(
noteEl
){
noteEl.textContent =
"Остановлено";
}

return;
}

renderAgg(
result.agg
);
renderTable(
result.rows
);
setProgress(
result.done,
result.total
);
saveSlot(
slotKey(
strategyId,
universe
),
{
agg:
result.agg,
rows:
result.rows,
done:
result.done,
total:
result.total,
tf,
statsMode
}
);
setStatus(
strategyId,
`готово · ${result.total} · ${formatUsdShort(result.agg.netUsd)}`
);

}catch(
err
){
console.warn(
"[algo-trading] strategy universe ui",
err
);
setStatus(
strategyId,
"ошибка"
);

if(
noteEl
){
noteEl.textContent =
`Ошибка: ${err?.message || err}`;
}

}finally{
setRunningUi(
false
);
}

}

function stopScan(){

if(
signal
){
signal.cancelled =
true;
}

setStatus(
pendingStrategy,
"остановка…"
);

}

for(
const btn of scanBtns
){
btn.addEventListener(
"click",
()=>{
const st =
btn.getAttribute(
"data-algo-universe-st"
);
const universe =
btn.getAttribute(
"data-algo-universe-scan"
);

if(
universe !==
"top100" &&
universe !==
"all"
){
return;
}

openFor(
st,
universe
);
}
);
}

runBtn?.addEventListener(
"click",
()=>{
void runScan();
}
);
stopBtn?.addEventListener(
"click",
()=>{
stopScan();
}
);

for(
const btn of closeBtns
){
btn.addEventListener(
"click",
()=>{
setOpen(
false
);
}
);
}

document.addEventListener(
"keydown",
ev=>{
if(
ev.key !==
"Escape"
){
return;
}

if(
modal &&
!modal.hidden
){
setOpen(
false
);
}
}
);

return {
stopAll(){
stopScan();
},
isOpen(){
return !!(
modal &&
!modal.hidden
);
}
};

}
