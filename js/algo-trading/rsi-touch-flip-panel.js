/**
 * Панель «Данные» + метки RSI Touch Flip на текущем графике Алго.
 * Live/Запустить — не здесь.
 */
import {
ALGO_ANALYSIS_BOT_CHANGE_EVENT,
ALGO_ANALYSIS_BOT_RSI_TOUCH_FLIP,
isActiveAnalysisBot
} from "./active-analysis-bot.js?v=4";
import {
loadMarketHistory
} from "../market-api.js?v=6";
import {
RSI_TOUCH_FLIP_SIZE_AVERAGE,
loadRsiTouchFlipPrefs,
saveRsiTouchFlipPrefs,
hydrateRsiTouchFlipPrefsForSymbol,
saveRsiTouchFlipTickerPrefs,
hasRsiTouchFlipTickerPrefs,
loadRsiTouchFlipBalancePct
} from "./rsi-touch-flip-prefs.js?v=8";
import {
RSI_TOUCH_FLIP_BOOK_CHANGE_EVENT,
RSI_TOUCH_FLIP_BOOK_OPEN_EVENT,
getRsiTouchFlipBookRow,
loadRsiTouchFlipBook,
rsiTouchFlipShareBudgetFits,
upsertRsiTouchFlipBookRow,
removeRsiTouchFlipBookRow
} from "./rsi-touch-flip-book.js?v=5";
import {
getAlgoTradingWalletBalance
} from "./runtime-bridge.js?v=6";
import {
runRsiTouchFlip
} from "./rsi-touch-flip-engine.js?v=6";
import {
resolveRsiTouchFlipChartRsi,
rsiTouchFlipChartDays
} from "./rsi-touch-flip-mtf.js?v=3";
import {
mountRsiTouchFlipOverlay
} from "./rsi-touch-flip-overlay.js?v=3";
import {
mountRsiTouchFlipFit,
loadRsiTouchFlipFitRowForSymbol
} from "./rsi-touch-flip-fit-panel.js?v=11";

function el(
id
){

return document.getElementById(
id
);

}

function formatUsd(
value
){

if(
!Number.isFinite(
value
)
){
return "—";
}

const abs =
Math.abs(
value
);
const text =
abs.toLocaleString(
"en-US",
{
minimumFractionDigits:
2,
maximumFractionDigits:
2
}
);

return value <
0
? `-${text}`
: text;

}

function formatPct(
value
){

if(
!Number.isFinite(
value
)
){
return "—";
}

const sign =
value >
0
? "+"
: "";
return `${sign}${value.toFixed(
2
)}%`;

}

function formatInt(
value
){

if(
!Number.isFinite(
value
)
){
return "—";
}

return String(
Math.round(
value
)
);

}

function formatFactor(
value
){

if(
value ===
Infinity
){
return "∞";
}

if(
!Number.isFinite(
value
)
){
return "—";
}

return value.toFixed(
3
);

}

function formatBars(
value
){

if(
!Number.isFinite(
value
)
){
return "—";
}

return value.toFixed(
2
);

}

function paintSigned(
node,
value
){

if(
!node
){
return;
}

node.classList.toggle(
"algo-stats-value--long",
Number.isFinite(
value
) &&
value >
0
);
node.classList.toggle(
"algo-stats-value--short",
Number.isFinite(
value
) &&
value <
0
);

}

function setPair(
id,
usd,
pct
){

const node =
el(
id
);

if(
!node
){
return;
}

node.textContent =
Number.isFinite(
usd
)
? `${formatUsd(
usd
)} (${formatPct(
pct
)})`
: "—";
paintSigned(
node,
usd
);

}

/**
 * @param {{
 *   getCandles: () => Array,
 *   getSeries: () => object|null,
 *   getChartTf: () => string,
 *   getSymbol: () => string,
 *   isHistoryReady: () => boolean,
 *   loadHistory?: Function
 * }} host
 */
export function mountRsiTouchFlipHost(
host
){

function loadHistoryForHost(
histSymbol,
histTf,
requests,
options
){

if(
typeof host.loadHistory ===
"function"
){
return host.loadHistory(
histSymbol,
histTf,
requests,
options
);
}

return loadMarketHistory(
histSymbol,
histTf,
requests,
options
);

}

const overlay =
mountRsiTouchFlipOverlay(
host
);
let disposed =
false;
let seq =
0;
let applyingUi =
false;
let prefsDirty =
false;
let fitApi =
null;

function isActive(){

return isActiveAnalysisBot(
ALGO_ANALYSIS_BOT_RSI_TOUCH_FLIP
);

}

function readUiPatch(){

const sizeMode =
el(
"algo-rsi-flip-size-mode"
)?.value;

return {
rsiLen:
el(
"algo-rsi-flip-len"
)?.value,
osLevel:
el(
"algo-rsi-flip-os"
)?.value,
obLevel:
el(
"algo-rsi-flip-ob"
)?.value,
rsiTf:
el(
"algo-rsi-flip-tf"
)?.value,
tradeSide:
el(
"algo-rsi-flip-side"
)?.value,
maxStack:
el(
"algo-rsi-flip-stack"
)?.value,
budget:
el(
"algo-rsi-flip-budget"
)?.value,
sizeMode,
sizeMult:
el(
"algo-rsi-flip-mult"
)?.value,
showMarks:
!!el(
"algo-rsi-flip-marks"
)?.checked,
commissionPct:
el(
"algo-rsi-flip-commission"
)?.value,
slippageTicks:
el(
"algo-rsi-flip-slippage"
)?.value,
cycleSlEnabled:
!!el(
"algo-rsi-flip-cycle-sl"
)?.checked,
cycleSlPct:
el(
"algo-rsi-flip-cycle-sl-pct"
)?.value,
compoundEnabled:
!!el(
"algo-rsi-flip-compound"
)?.checked
};

}

function applyPrefsToUi(
prefs
){

applyingUi =
true;
const assign =
(
id,
value
)=>{

const input =
el(
id
);

if(
input &&
document.activeElement !==
input
){
input.value =
String(
value
);
}

};

assign(
"algo-rsi-flip-len",
prefs.rsiLen
);
assign(
"algo-rsi-flip-os",
prefs.osLevel
);
assign(
"algo-rsi-flip-ob",
prefs.obLevel
);
assign(
"algo-rsi-flip-tf",
prefs.rsiTf
);
assign(
"algo-rsi-flip-side",
prefs.tradeSide
);
assign(
"algo-rsi-flip-stack",
prefs.maxStack
);
assign(
"algo-rsi-flip-budget",
prefs.budget
);
assign(
"algo-rsi-flip-size-mode",
prefs.sizeMode
);
assign(
"algo-rsi-flip-mult",
prefs.sizeMult
);
assign(
"algo-rsi-flip-commission",
prefs.commissionPct
);
assign(
"algo-rsi-flip-slippage",
prefs.slippageTicks
);
const marks =
el(
"algo-rsi-flip-marks"
);

if(
marks
){
marks.checked =
!!prefs.showMarks;
}

const cycleSl =
el(
"algo-rsi-flip-cycle-sl"
);

if(
cycleSl
){
cycleSl.checked =
prefs.cycleSlEnabled ===
true;
}

assign(
"algo-rsi-flip-cycle-sl-pct",
prefs.cycleSlPct
);

const multRow =
el(
"algo-rsi-flip-mult-row"
);
multRow?.toggleAttribute(
"hidden",
prefs.sizeMode !==
RSI_TOUCH_FLIP_SIZE_AVERAGE
);
el(
"algo-rsi-flip-cycle-sl-pct-row"
)?.toggleAttribute(
"hidden",
prefs.cycleSlEnabled !==
true
);
const compound =
el(
"algo-rsi-flip-compound"
);

if(
compound
){
compound.checked =
prefs.compoundEnabled ===
true;
}
applyingUi =
false;

}

function renderOverview(
overview
){

const daysEl =
el(
"algo-rsi-flip-days"
);

if(
daysEl
){
daysEl.textContent =
Number.isFinite(
overview?.chartDays
)
? overview.chartDays.toFixed(
1
)
: "—";
}

setPair(
"algo-rsi-flip-net",
overview?.netProfit,
overview?.netProfitPct
);
setPair(
"algo-rsi-flip-long",
overview?.longProfit,
overview?.longProfitPct
);
setPair(
"algo-rsi-flip-short",
overview?.shortProfit,
overview?.shortProfitPct
);
setPair(
"algo-rsi-flip-gross-profit",
overview?.grossProfit,
overview?.grossProfitPct
);
setPair(
"algo-rsi-flip-gross-loss",
overview?.grossLoss,
overview?.grossLossPct
);
const closed =
el(
"algo-rsi-flip-closed"
);

if(
closed
){
closed.textContent =
formatInt(
overview?.closedTrades
);
}

const profitable =
el(
"algo-rsi-flip-profitable"
);

if(
profitable
){
profitable.textContent =
Number.isFinite(
overview?.percentProfitable
)
? `${overview.percentProfitable.toFixed(
2
)}%`
: "—";
}

const factor =
el(
"algo-rsi-flip-pf"
);

if(
factor
){
factor.textContent =
formatFactor(
overview?.profitFactor
);
}

setPair(
"algo-rsi-flip-dd",
Number.isFinite(
overview?.maxDrawdown
)
? -Math.abs(
overview.maxDrawdown
)
: NaN,
Number.isFinite(
overview?.maxDrawdownPct
)
? -Math.abs(
overview.maxDrawdownPct
)
: NaN
);
setPair(
"algo-rsi-flip-trade-mae",
Number.isFinite(
overview?.maxTradeMae
)
? -Math.abs(
overview.maxTradeMae
)
: NaN,
Number.isFinite(
overview?.maxTradeMaePct
)
? -Math.abs(
overview.maxTradeMaePct
)
: NaN
);
setPair(
"algo-rsi-flip-avg",
overview?.avgTrade,
overview?.avgTradePct
);
const bars =
el(
"algo-rsi-flip-avg-bars"
);

if(
bars
){
bars.textContent =
formatBars(
overview?.avgBars
);
}

const liq =
el(
"algo-rsi-flip-liquidations"
);
const liqRow =
el(
"algo-rsi-flip-liquidations-row"
);
const liqCount =
Number(
overview?.liquidations
) ||
0;

if(
liq
){
if(
liqCount >
0
){
liq.textContent =
overview?.tradingHalted
? `${liqCount} · стоп`
: String(
liqCount
);
liq.classList.add(
"neg"
);
}else{
liq.textContent =
"0";
liq.classList.remove(
"neg"
);
}
}

liqRow?.classList.toggle(
"algo-rsi-flip-liquidations--hit",
liqCount >
0
);

}

function clearOverview(){

renderOverview(
{
netProfit:
NaN,
netProfitPct:
NaN,
longProfit:
NaN,
longProfitPct:
NaN,
shortProfit:
NaN,
shortProfitPct:
NaN,
grossProfit:
NaN,
grossProfitPct:
NaN,
grossLoss:
NaN,
grossLossPct:
NaN,
closedTrades:
NaN,
percentProfitable:
NaN,
profitFactor:
NaN,
maxDrawdown:
NaN,
maxDrawdownPct:
NaN,
maxTradeMae:
NaN,
maxTradeMaePct:
NaN,
avgTrade:
NaN,
avgTradePct:
NaN,
avgBars:
NaN,
chartDays:
NaN
}
);
overlay.clear();

}

async function refresh(){

if(
disposed
){
return;
}

syncBookButtons();

if(
!isActive()
){
clearOverview();
return;
}

syncChartRsiPaneFromColumn();

if(
!host?.isHistoryReady?.()
){
fitApi?.sync?.(
{
candles:
[],
prefs:
loadRsiTouchFlipPrefs(),
chartTf:
String(
host.getChartTf?.() ||
""
).trim()
}
);
return;
}

const candles =
host.getCandles?.() ||
[];
const prefs =
loadRsiTouchFlipPrefs();
applyPrefsToUi(
prefs
);
const mySeq =
++seq;

if(
!candles.length
){
clearOverview();
return;
}

let rsiValues;
try{
rsiValues =
await resolveRsiTouchFlipChartRsi(
candles,
prefs,
{
chartTf:
String(
host.getChartTf?.() ||
""
).trim(),
symbol:
host.getSymbol?.(),
loadHistory:
loadHistoryForHost
}
);
}catch(
err
){
console.warn(
"[algo-rsi-touch-flip] rsi",
err?.message ||
err
);
}

if(
disposed ||
mySeq !==
seq
){
return;
}

const result =
runRsiTouchFlip(
candles,
prefs,
{
rsiValues
}
);
renderOverview(
{
...result.overview,
chartDays:
rsiTouchFlipChartDays(
candles,
String(
host.getChartTf?.() ||
""
).trim()
)
}
);

if(
prefs.showMarks
){
overlay.setMarks(
result.marks
);
}else{
overlay.clear();
}

fitApi?.sync?.(
{
candles,
rsiValues,
prefs,
chartTf:
String(
host.getChartTf?.() ||
""
).trim()
}
);

}

function syncChartRsiPaneFromColumn(){

if(
disposed ||
!isActive()
){
return;
}

host.syncChartRsiPaneFromFlip?.(
readUiPatch()
);

}

function onPrefsField(){

if(
applyingUi ||
disposed
){
return;
}

const patch =
readUiPatch();
const symbol =
currentChartSymbol();

saveRsiTouchFlipPrefs(
patch
);

if(
symbol &&
!getRsiTouchFlipBookRow(
symbol
)
){
saveRsiTouchFlipTickerPrefs(
symbol,
patch
);
}

prefsDirty =
true;
applyPrefsToUi(
loadRsiTouchFlipPrefs()
);
syncChartRsiPaneFromColumn();
void refresh();

}

const fieldIds =
[
"algo-rsi-flip-len",
"algo-rsi-flip-os",
"algo-rsi-flip-ob",
"algo-rsi-flip-tf",
"algo-rsi-flip-side",
"algo-rsi-flip-stack",
"algo-rsi-flip-budget",
"algo-rsi-flip-size-mode",
"algo-rsi-flip-mult",
"algo-rsi-flip-marks",
"algo-rsi-flip-commission",
"algo-rsi-flip-slippage",
"algo-rsi-flip-cycle-sl",
"algo-rsi-flip-cycle-sl-pct",
"algo-rsi-flip-compound"
];
const rsiPaneFieldIds =
[
"algo-rsi-flip-len",
"algo-rsi-flip-os",
"algo-rsi-flip-ob",
"algo-rsi-flip-tf"
];

for(
const id of fieldIds
){
el(
id
)?.addEventListener(
"change",
onPrefsField
);
}

for(
const id of rsiPaneFieldIds
){
el(
id
)?.addEventListener(
"input",
syncChartRsiPaneFromColumn
);
}

function currentChartSymbol(){

return String(
host.getSymbol?.() ||
""
).trim();

}

function hydrateForSymbol(
nextSymbol
){

if(
disposed
){
return;
}

const id =
String(
nextSymbol ||
""
).replace(
/\.P$/i,
""
).trim().toUpperCase();

if(
!id
){
return;
}

const bookRow =
getRsiTouchFlipBookRow(
id
);
let prefs;

if(
bookRow?.prefs
){
prefs =
saveRsiTouchFlipPrefs(
bookRow.prefs
);
}else{
prefs =
hydrateRsiTouchFlipPrefsForSymbol(
id
);

if(
!hasRsiTouchFlipTickerPrefs(
id
)
){
const fit =
loadRsiTouchFlipFitRowForSymbol(
id
);

if(
fit?.prefs
){
prefs =
saveRsiTouchFlipTickerPrefs(
id,
fit.prefs
);
}
}

}

applyPrefsToUi(
prefs
);
syncChartRsiPaneFromColumn();
syncBookButtons();
prefsDirty =
false;

}

function persistForSymbol(
prevSymbol
){

if(
disposed ||
applyingUi
){
return;
}

const id =
String(
prevSymbol ||
""
).replace(
/\.P$/i,
""
).trim().toUpperCase();

if(
!id
){
return;
}

if(
!prefsDirty
){
return;
}

if(
getRsiTouchFlipBookRow(
id
)
){
prefsDirty =
false;
return;
}

saveRsiTouchFlipTickerPrefs(
id,
readUiPatch()
);
prefsDirty =
false;

}

function setBookStatus(
text,
kind
){

const node =
el(
"algo-rsi-flip-book-status"
);

if(
!node
){
return;
}

node.textContent =
text ||
"";
node.classList.toggle(
"is-error",
kind ===
"error"
);
node.classList.toggle(
"is-ok",
kind ===
"ok"
);

}

function syncBookButtons(){

const row =
getRsiTouchFlipBookRow(
currentChartSymbol()
);
el(
"algo-rsi-flip-remove-book"
)?.toggleAttribute(
"hidden",
!row
);

}

async function onAddBook(){

if(
applyingUi ||
disposed
){
return;
}

const patch =
readUiPatch();

saveRsiTouchFlipPrefs(
patch
);
const symbol =
currentChartSymbol();
const tf =
String(
host.getChartTf?.() ||
""
).trim();

if(
!symbol ||
!tf
){
setBookStatus(
"Откройте график с тикером и таймфреймом",
"error"
);
return;
}

saveRsiTouchFlipTickerPrefs(
symbol,
patch
);
prefsDirty =
true;

const prefs =
loadRsiTouchFlipPrefs();
let wallet =
null;

try{
wallet =
await getAlgoTradingWalletBalance();
}catch{
wallet =
null;
}

const book =
loadRsiTouchFlipBook();
const replacing =
Boolean(
getRsiTouchFlipBookRow(
symbol
)
);
const tickerCount =
replacing
? book.length
: book.length +
1;
const pct =
loadRsiTouchFlipBalancePct();
const gate =
rsiTouchFlipShareBudgetFits(
{
available:
wallet,
balancePct:
pct,
tickerCount
}
);

if(
!gate.ok
){
setBookStatus(
gate.message,
"error"
);
return;
}

upsertRsiTouchFlipBookRow(
{
symbol,
tf,
prefs
}
);
const shareLabel =
Number.isFinite(
gate.share
)
? gate.share.toFixed(
0
)
: "—";
setBookStatus(
`${symbol} ${tf} в книге · live ~${shareLabel} USDT на тикер (${pct}% / ${tickerCount}). Запущенный бот подхватывает сразу.`,
"ok"
);
syncBookButtons();

}

function onRemoveBook(){

if(
applyingUi ||
disposed
){
return;
}

const symbol =
currentChartSymbol();

if(
!symbol
){
return;
}

removeRsiTouchFlipBookRow(
symbol
);
setBookStatus(
`${symbol} убран из книги. Запущенный бот снимет его с торговли.`,
"ok"
);
syncBookButtons();
hydrateForSymbol(
symbol
);
void refresh();

}

function onBookOpen(
event
){

const row =
event?.detail;

if(
!row?.symbol ||
disposed
){
return;
}

hydrateForSymbol(
row.symbol
);
void refresh();

}

function onBookChanged(){

syncBookButtons();

}

el(
"algo-rsi-flip-add-book"
)?.addEventListener(
"click",
onAddBook
);
el(
"algo-rsi-flip-remove-book"
)?.addEventListener(
"click",
onRemoveBook
);

window.addEventListener(
RSI_TOUCH_FLIP_BOOK_OPEN_EVENT,
onBookOpen
);
window.addEventListener(
RSI_TOUCH_FLIP_BOOK_CHANGE_EVENT,
onBookChanged
);

fitApi =
mountRsiTouchFlipFit(
{
isActive,
getCandles:()=>
host.getCandles?.() ||
[],
getChartTf:()=>
String(
host.getChartTf?.() ||
""
).trim(),
getSymbol:()=>
host.getSymbol?.(),
getPrefs:()=>
loadRsiTouchFlipPrefs(),
applyCandidate(
patch
){
const symbol =
currentChartSymbol();

saveRsiTouchFlipPrefs(
patch
);

if(
symbol &&
!getRsiTouchFlipBookRow(
symbol
)
){
saveRsiTouchFlipTickerPrefs(
symbol,
patch
);
}

prefsDirty =
true;
applyPrefsToUi(
loadRsiTouchFlipPrefs()
);
syncChartRsiPaneFromColumn();
void refresh();
},
resolveRsi(
candles,
prefs
){
return resolveRsiTouchFlipChartRsi(
candles,
prefs,
{
chartTf:
String(
host.getChartTf?.() ||
""
).trim(),
symbol:
host.getSymbol?.(),
loadHistory:
loadHistoryForHost
}
);
},
isDisposed:()=>
disposed,
isHistoryReady:()=>
!!host.isHistoryReady?.()
}
);

function onBotChanged(){

if(
isActive()
){
applyPrefsToUi(
loadRsiTouchFlipPrefs()
);
syncChartRsiPaneFromColumn();
void refresh();
}else{
clearOverview();
}

}

window.addEventListener(
ALGO_ANALYSIS_BOT_CHANGE_EVENT,
onBotChanged
);
onBotChanged();

return {
refresh,
hydrateForSymbol,
persistForSymbol,
applyColumnFromPrefs(){

if(
disposed
){
return;
}

applyPrefsToUi(
loadRsiTouchFlipPrefs()
);

},
destroy(){

disposed =
true;
seq +=
1;
window.removeEventListener(
ALGO_ANALYSIS_BOT_CHANGE_EVENT,
onBotChanged
);

for(
const id of fieldIds
){
el(
id
)?.removeEventListener(
"change",
onPrefsField
);
}

for(
const id of rsiPaneFieldIds
){
el(
id
)?.removeEventListener(
"input",
syncChartRsiPaneFromColumn
);
}

el(
"algo-rsi-flip-add-book"
)?.removeEventListener(
"click",
onAddBook
);
el(
"algo-rsi-flip-remove-book"
)?.removeEventListener(
"click",
onRemoveBook
);
window.removeEventListener(
RSI_TOUCH_FLIP_BOOK_OPEN_EVENT,
onBookOpen
);
window.removeEventListener(
RSI_TOUCH_FLIP_BOOK_CHANGE_EVENT,
onBookChanged
);

overlay.destroy();
fitApi?.destroy?.();
fitApi =
null;

}
};

}
