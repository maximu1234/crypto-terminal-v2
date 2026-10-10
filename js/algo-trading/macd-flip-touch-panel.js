/**
 * Панель «Данные» + метки MACD Flip Touch на текущем графике Алго.
 * Live/Запустить — не здесь.
 */
import {
ALGO_ANALYSIS_BOT_CHANGE_EVENT,
ALGO_ANALYSIS_BOT_MACD_FLIP_TOUCH,
isActiveAnalysisBot
} from "./active-analysis-bot.js?v=4";
import {
loadMarketHistory
} from "../market-api.js?v=14";
import {
MACD_FLIP_TOUCH_SIZE_AVERAGE,
loadMacdFlipTouchPrefs,
saveMacdFlipTouchPrefs,
hydrateMacdFlipTouchPrefsForSymbol,
saveMacdFlipTouchTickerPrefs,
loadMacdFlipTouchTickerPrefs,
normalizeMacdFlipTouchPrefs,
shouldReloadMacdFlipTouchColumn,
loadMacdFlipTouchBalancePct
} from "./macd-flip-touch-prefs.js?v=9";
import {
MACD_FLIP_TOUCH_BOOK_CHANGE_EVENT,
MACD_FLIP_TOUCH_BOOK_OPEN_EVENT,
getMacdFlipTouchBookRow,
loadMacdFlipTouchBook,
macdFlipTouchShareBudgetFits,
upsertMacdFlipTouchBookRow,
removeMacdFlipTouchBookRow
} from "./macd-flip-touch-book.js?v=5";
import {
getAlgoTradingWalletBalance
} from "./runtime-bridge.js?v=6";
import {
runMacdFlipTouch
} from "./macd-flip-touch-engine.js?v=8";
import {
resolveMacdFlipTouchChartMacd,
macdFlipTouchChartDays
} from "./macd-flip-touch-mtf.js?v=5";
import {
mountMacdFlipTouchOverlay
} from "./macd-flip-touch-overlay.js?v=3";
import {
mountMacdFlipTouchFit,
loadMacdFlipTouchFitRowForSymbol
} from "./macd-flip-touch-fit-panel.js?v=15";
import {
MACD_FLIP_TOUCH_DEFAULT_TRAIN_PCT,
macdFlipTouchFitPrefsForHydrate
} from "./macd-flip-touch-walkforward.js?v=13";
import {
buildMacdFlipTouchEquityModel
} from "./macd-flip-touch-equity.js?v=7";

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
export function mountMacdFlipTouchHost(
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
mountMacdFlipTouchOverlay(
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
let prefsInputTimer =
0;
let lastHydratedSymbol =
"";
let fitApi =
null;
let statsTab =
"data";
let equityChart =
null;
let equityChartMod =
null;
let equityPaintSeq =
0;
let lastEquityInput =
null;

function isEquityTab(){

return statsTab ===
"equity";

}

function readTrainPct(){

return el(
"algo-macd-flip-train-pct"
)?.value ||
MACD_FLIP_TOUCH_DEFAULT_TRAIN_PCT;

}

function syncStatsTabUi(){

const dataBtn =
el(
"algo-macd-flip-tab-data"
);
const equityBtn =
el(
"algo-macd-flip-tab-equity"
);
const dataPanel =
el(
"algo-macd-flip-panel-data"
);
const equityPanel =
el(
"algo-macd-flip-panel-equity"
);
const dataOn =
!isEquityTab();

if(
dataBtn
){
dataBtn.classList.toggle(
"active",
dataOn
);
dataBtn.setAttribute(
"aria-selected",
dataOn
? "true"
: "false"
);
}

if(
equityBtn
){
equityBtn.classList.toggle(
"active",
!dataOn
);
equityBtn.setAttribute(
"aria-selected",
dataOn
? "false"
: "true"
);
}

if(
dataPanel
){
dataPanel.hidden =
!dataOn;
}

if(
equityPanel
){
equityPanel.hidden =
dataOn;
}

}

function setEquityEmpty(
on
){

const node =
el(
"algo-macd-flip-equity-empty"
);
const chart =
el(
"algo-macd-flip-equity-chart"
);

if(
node
){
node.hidden =
!on;
}

if(
chart
){
chart.hidden =
!!on;
}

}

async function paintEquityChart(
candles,
prefs,
macdSeries,
precomputed
){

if(
disposed ||
!isEquityTab()
){
return;
}

const mySeq =
++equityPaintSeq;
const emptyNode =
el(
"algo-macd-flip-equity-empty"
);

if(
emptyNode &&
!equityChart
){
emptyNode.hidden =
false;
emptyNode.textContent =
"Считаем кривую…";
}

if(
!equityChartMod
){
equityChartMod =
await import(
"./macd-flip-touch-equity-chart.js?v=7"
);
}

if(
disposed ||
mySeq !==
equityPaintSeq ||
!isEquityTab()
){
return;
}

const hostEl =
el(
"algo-macd-flip-equity-chart"
);

if(
!hostEl
){
return;
}

if(
!equityChart
){
equityChart =
equityChartMod.mountMacdFlipTouchEquityChart(
hostEl
);
}

const result =
precomputed &&
Array.isArray(
precomputed.equityCurve
)
? precomputed
: runMacdFlipTouch(
candles,
prefs,
{
macdValues:
macdSeries?.macdValues,
signalValues:
macdSeries?.signalValues,
collectEquity:
true,
excludeFormingBar:
true
}
);
const model =
buildMacdFlipTouchEquityModel(
{
equityCurve:
result.equityCurve,
closedTrades:
result.closedTrades,
candles,
capital:
prefs.budget,
trainPct:
readTrainPct()
}
);
lastEquityInput =
{
equityCurve:
result.equityCurve,
closedTrades:
result.closedTrades,
candles,
capital:
prefs.budget
};
const empty =
!(
Array.isArray(
model.line
) &&
model.line.length
);

setEquityEmpty(
empty
);

if(
emptyNode &&
empty
){
emptyNode.textContent =
"Нет данных для кривой";
}

if(
!empty
){
await equityChart.setModel(
model
);
}

}

async function onStatsTabClick(
event
){

const btn =
event.currentTarget;
const next =
btn?.dataset?.algoMacdFlipStatsTab ===
"equity"
? "equity"
: "data";

if(
next ===
statsTab
){
return;
}

statsTab =
next;
syncStatsTabUi();

if(
!isEquityTab()
){
return;
}

if(
!isActive() ||
!host?.isHistoryReady?.()
){
setEquityEmpty(
true
);
const emptyNode =
el(
"algo-macd-flip-equity-empty"
);
if(
emptyNode
){
emptyNode.textContent =
"Нет данных для кривой";
}
return;
}

const candles =
host.getCandles?.() ||
[];
const prefs =
columnPrefs();

if(
!candles.length
){
setEquityEmpty(
true
);
return;
}

let macdSeries;
try{
macdSeries =
await resolveMacdFlipTouchChartMacd(
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
"[algo-macd-flip-touch] equity macd",
err?.message ||
err
);
}

await paintEquityChart(
candles,
prefs,
macdSeries
);

}

function onTrainPctForEquity(){

if(
disposed ||
!isEquityTab()
){
return;
}

if(
equityChart &&
lastEquityInput
){
void equityChart.setModel(
buildMacdFlipTouchEquityModel(
{
...lastEquityInput,
trainPct:
readTrainPct()
}
)
);
return;
}

void refresh();

}

function isActive(){

return isActiveAnalysisBot(
ALGO_ANALYSIS_BOT_MACD_FLIP_TOUCH
);

}

function readUiPatch(){

const sizeMode =
el(
"algo-macd-flip-size-mode"
)?.value;

return {
fastLength:
el(
"algo-macd-flip-fast"
)?.value,
slowLength:
el(
"algo-macd-flip-slow"
)?.value,
signalLength:
el(
"algo-macd-flip-signal"
)?.value,
macdTf:
el(
"algo-macd-flip-tf"
)?.value,
tradeSide:
el(
"algo-macd-flip-side"
)?.value,
maxStack:
el(
"algo-macd-flip-stack"
)?.value,
budget:
el(
"algo-macd-flip-budget"
)?.value,
sizeMode,
sizeMult:
el(
"algo-macd-flip-mult"
)?.value,
showMarks:
!!el(
"algo-macd-flip-marks"
)?.checked,
commissionPct:
el(
"algo-macd-flip-commission"
)?.value,
slippageTicks:
el(
"algo-macd-flip-slippage"
)?.value,
cycleSlEnabled:
!!el(
"algo-macd-flip-cycle-sl"
)?.checked,
cycleSlPct:
el(
"algo-macd-flip-cycle-sl-pct"
)?.value,
compoundEnabled:
!!el(
"algo-macd-flip-compound"
)?.checked
};

}

function columnPrefs(){

return normalizeMacdFlipTouchPrefs(
{
...loadMacdFlipTouchPrefs(),
...readUiPatch()
}
);

}

function isEditingColumnField(){

const active =
document.activeElement;
const id =
active?.id;

return id ===
"algo-macd-flip-fast" ||
id ===
"algo-macd-flip-signal" ||
id ===
"algo-macd-flip-slow" ||
id ===
"algo-macd-flip-tf" ||
id ===
"algo-macd-flip-side" ||
id ===
"algo-macd-flip-stack" ||
id ===
"algo-macd-flip-budget" ||
id ===
"algo-macd-flip-size-mode" ||
id ===
"algo-macd-flip-mult" ||
id ===
"algo-macd-flip-marks" ||
id ===
"algo-macd-flip-commission" ||
id ===
"algo-macd-flip-slippage" ||
id ===
"algo-macd-flip-cycle-sl" ||
id ===
"algo-macd-flip-cycle-sl-pct" ||
id ===
"algo-macd-flip-compound";

}

function syncDerivedRows(
prefs
){

el(
"algo-macd-flip-mult-row"
)?.toggleAttribute(
"hidden",
prefs.sizeMode !==
MACD_FLIP_TOUCH_SIZE_AVERAGE
);
el(
"algo-macd-flip-cycle-sl-pct-row"
)?.toggleAttribute(
"hidden",
prefs.cycleSlEnabled !==
true
);

}

function applyPrefsToUi(
prefs,
opts =
{}
){

const force =
opts.force ===
true;

if(
!force &&
(
prefsDirty ||
isEditingColumnField()
)
){
syncDerivedRows(
prefs
);
return;
}

applyingUi =
true;

try{
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
"algo-macd-flip-fast",
prefs.fastLength
);
assign(
"algo-macd-flip-slow",
prefs.slowLength
);
assign(
"algo-macd-flip-signal",
prefs.signalLength
);
assign(
"algo-macd-flip-tf",
prefs.macdTf
);
assign(
"algo-macd-flip-side",
prefs.tradeSide
);
assign(
"algo-macd-flip-stack",
prefs.maxStack
);
assign(
"algo-macd-flip-budget",
prefs.budget
);
assign(
"algo-macd-flip-size-mode",
prefs.sizeMode
);
assign(
"algo-macd-flip-mult",
prefs.sizeMult
);
assign(
"algo-macd-flip-commission",
prefs.commissionPct
);
assign(
"algo-macd-flip-slippage",
prefs.slippageTicks
);
const marks =
el(
"algo-macd-flip-marks"
);

if(
marks &&
document.activeElement !==
marks
){
marks.checked =
!!prefs.showMarks;
}

const cycleSl =
el(
"algo-macd-flip-cycle-sl"
);

if(
cycleSl &&
document.activeElement !==
cycleSl
){
cycleSl.checked =
prefs.cycleSlEnabled ===
true;
}

assign(
"algo-macd-flip-cycle-sl-pct",
prefs.cycleSlPct
);
syncDerivedRows(
prefs
);
const compound =
el(
"algo-macd-flip-compound"
);

if(
compound &&
document.activeElement !==
compound
){
compound.checked =
prefs.compoundEnabled ===
true;
}
}finally{
applyingUi =
false;
}

}

function renderOverview(
overview
){

const daysEl =
el(
"algo-macd-flip-days"
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
"algo-macd-flip-net",
overview?.netProfit,
overview?.netProfitPct
);
setPair(
"algo-macd-flip-long",
overview?.longProfit,
overview?.longProfitPct
);
setPair(
"algo-macd-flip-short",
overview?.shortProfit,
overview?.shortProfitPct
);
setPair(
"algo-macd-flip-gross-profit",
overview?.grossProfit,
overview?.grossProfitPct
);
setPair(
"algo-macd-flip-gross-loss",
overview?.grossLoss,
overview?.grossLossPct
);
const closed =
el(
"algo-macd-flip-closed"
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
"algo-macd-flip-profitable"
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
"algo-macd-flip-pf"
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
"algo-macd-flip-dd",
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
"algo-macd-flip-trade-mae",
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
"algo-macd-flip-avg",
overview?.avgTrade,
overview?.avgTradePct
);
const bars =
el(
"algo-macd-flip-avg-bars"
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
"algo-macd-flip-liquidations"
);
const liqRow =
el(
"algo-macd-flip-liquidations-row"
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
"algo-macd-flip-liquidations--hit",
liqCount >
0
);

}

function setOverviewError(
message
){

const node =
document.getElementById(
"algo-macd-flip-overview-error"
);

if(
!node
){
return;
}

const text =
String(
message ||
""
).trim();

node.hidden =
!text;
node.textContent =
text;

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

syncChartMacdPaneFromColumn();

if(
!host?.isHistoryReady?.()
){
fitApi?.sync?.(
{
candles:
[],
prefs:
columnPrefs(),
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
columnPrefs();
const mySeq =
++seq;

if(
!candles.length
){
clearOverview();
setOverviewError(
""
);
return;
}

let macdSeries;
try{
macdSeries =
await resolveMacdFlipTouchChartMacd(
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
"[algo-macd-flip-touch] macd",
err?.message ||
err
);
clearOverview();
setOverviewError(
err?.message ||
"нет свечей MACD ТФ"
);
return;
}

if(
disposed ||
mySeq !==
seq
){
return;
}

setOverviewError(
""
);

const result =
runMacdFlipTouch(
candles,
prefs,
{
macdValues:
macdSeries?.macdValues,
signalValues:
macdSeries?.signalValues,
collectEquity:
isEquityTab(),
excludeFormingBar:
true
}
);
renderOverview(
{
...result.overview,
chartDays:
macdFlipTouchChartDays(
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
requestAnimationFrame(
()=>{

if(
disposed ||
mySeq !==
seq
){
return;
}

if(
columnPrefs().showMarks
){
overlay.setMarks(
result.marks
);
}

}
);
}else{
overlay.clear();
}

fitApi?.sync?.(
{
candles,
macdSeries,
prefs,
chartTf:
String(
host.getChartTf?.() ||
""
).trim()
}
);

if(
isEquityTab()
){
await paintEquityChart(
candles,
prefs,
macdSeries,
result
);
}

}

function syncChartMacdPaneFromColumn(){

if(
disposed ||
!isActive()
){
return;
}

host.syncChartMacdPaneFromFlip?.(
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

if(
prefsInputTimer
){
clearTimeout(
prefsInputTimer
);
prefsInputTimer =
0;
}

const patch =
readUiPatch();
const symbol =
currentChartSymbol();

saveMacdFlipTouchPrefs(
patch
);

if(
symbol
){
saveMacdFlipTouchTickerPrefs(
symbol,
patch
);
}

prefsDirty =
true;
syncDerivedRows(
loadMacdFlipTouchPrefs()
);
syncChartMacdPaneFromColumn();
void refresh();

}

function schedulePrefsFromInput(){

if(
applyingUi ||
disposed
){
return;
}

prefsDirty =
true;

if(
prefsInputTimer
){
clearTimeout(
prefsInputTimer
);
}

prefsInputTimer =
setTimeout(
()=>{
prefsInputTimer =
0;
onPrefsField();
},
250
);

}

const fieldIds =
[
"algo-macd-flip-fast",
"algo-macd-flip-signal",
"algo-macd-flip-slow",
"algo-macd-flip-tf",
"algo-macd-flip-side",
"algo-macd-flip-stack",
"algo-macd-flip-budget",
"algo-macd-flip-size-mode",
"algo-macd-flip-mult",
"algo-macd-flip-marks",
"algo-macd-flip-commission",
"algo-macd-flip-slippage",
"algo-macd-flip-cycle-sl",
"algo-macd-flip-cycle-sl-pct",
"algo-macd-flip-compound"
];
const rsiPaneFieldIds =
[
"algo-macd-flip-fast",
"algo-macd-flip-signal",
"algo-macd-flip-slow",
"algo-macd-flip-tf"
];
const prefsInputFieldIds =
[
"algo-macd-flip-fast",
"algo-macd-flip-signal",
"algo-macd-flip-slow",
"algo-macd-flip-stack",
"algo-macd-flip-budget",
"algo-macd-flip-mult",
"algo-macd-flip-commission",
"algo-macd-flip-slippage",
"algo-macd-flip-cycle-sl-pct"
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
syncChartMacdPaneFromColumn
);
}

for(
const id of prefsInputFieldIds
){
el(
id
)?.addEventListener(
"input",
schedulePrefsFromInput
);
}

el(
"algo-macd-flip-tab-data"
)?.addEventListener(
"click",
onStatsTabClick
);
el(
"algo-macd-flip-tab-equity"
)?.addEventListener(
"click",
onStatsTabClick
);
el(
"algo-macd-flip-train-pct"
)?.addEventListener(
"change",
onTrainPctForEquity
);
syncStatsTabUi();

function currentChartSymbol(){

return String(
host.getSymbol?.() ||
""
).trim();

}

function hydrateForSymbol(
nextSymbol,
opts =
{}
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

if(
!shouldReloadMacdFlipTouchColumn(
lastHydratedSymbol,
id,
opts
)
){
return;
}

const bookRow =
getMacdFlipTouchBookRow(
id
);
const tickerStored =
loadMacdFlipTouchTickerPrefs(
id
);
let prefs;

if(
opts.preferBook &&
bookRow?.prefs
){
prefs =
saveMacdFlipTouchPrefs(
bookRow.prefs
);
saveMacdFlipTouchTickerPrefs(
id,
prefs
);
}else if(
tickerStored
){
prefs =
saveMacdFlipTouchPrefs(
tickerStored
);
}else if(
bookRow?.prefs
){
prefs =
saveMacdFlipTouchPrefs(
bookRow.prefs
);
saveMacdFlipTouchTickerPrefs(
id,
prefs
);
}else{
prefs =
hydrateMacdFlipTouchPrefsForSymbol(
id
);
const fit =
loadMacdFlipTouchFitRowForSymbol(
id
);
const fitPrefs =
macdFlipTouchFitPrefsForHydrate(
fit
);

if(
fitPrefs
){
prefs =
saveMacdFlipTouchTickerPrefs(
id,
fitPrefs
);
saveMacdFlipTouchPrefs(
prefs
);
}

}

applyPrefsToUi(
prefs,
{
force:
true
}
);
syncChartMacdPaneFromColumn();
syncBookButtons();
lastHydratedSymbol =
id;
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

saveMacdFlipTouchTickerPrefs(
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
"algo-macd-flip-book-status"
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
getMacdFlipTouchBookRow(
currentChartSymbol()
);
el(
"algo-macd-flip-remove-book"
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

saveMacdFlipTouchPrefs(
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

saveMacdFlipTouchTickerPrefs(
symbol,
patch
);
prefsDirty =
true;

const prefs =
loadMacdFlipTouchPrefs();
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
loadMacdFlipTouchBook();
const replacing =
Boolean(
getMacdFlipTouchBookRow(
symbol
)
);
const tickerCount =
replacing
? book.length
: book.length +
1;
const pct =
loadMacdFlipTouchBalancePct();
const gate =
macdFlipTouchShareBudgetFits(
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

upsertMacdFlipTouchBookRow(
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

removeMacdFlipTouchBookRow(
symbol
);
setBookStatus(
`${symbol} убран из книги. Запущенный бот снимет его с торговли.`,
"ok"
);
syncBookButtons();
hydrateForSymbol(
symbol,
{
force:
true
}
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
row.symbol,
{
preferBook:
true
}
);
void refresh();

}

function onBookChanged(){

syncBookButtons();

}

el(
"algo-macd-flip-add-book"
)?.addEventListener(
"click",
onAddBook
);
el(
"algo-macd-flip-remove-book"
)?.addEventListener(
"click",
onRemoveBook
);

window.addEventListener(
MACD_FLIP_TOUCH_BOOK_OPEN_EVENT,
onBookOpen
);
window.addEventListener(
MACD_FLIP_TOUCH_BOOK_CHANGE_EVENT,
onBookChanged
);

fitApi =
mountMacdFlipTouchFit(
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
columnPrefs(),
applyCandidate(
patch
){
const symbol =
currentChartSymbol();
const merged =
{
...columnPrefs(),
...patch
};

saveMacdFlipTouchPrefs(
merged
);

if(
symbol
){
saveMacdFlipTouchTickerPrefs(
symbol,
merged
);
}

prefsDirty =
true;
applyPrefsToUi(
loadMacdFlipTouchPrefs(),
{
force:
true
}
);
syncChartMacdPaneFromColumn();
void refresh();
},
resolveMacd(
candles,
prefs
){
return resolveMacdFlipTouchChartMacd(
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
loadMacdFlipTouchPrefs()
);
syncChartMacdPaneFromColumn();
void refresh();
}else{
statsTab =
"data";
syncStatsTabUi();
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
loadMacdFlipTouchPrefs(),
{
force:
true
}
);

},
destroy(){

disposed =
true;
seq +=
1;

if(
prefsInputTimer
){
clearTimeout(
prefsInputTimer
);
prefsInputTimer =
0;
}

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
syncChartMacdPaneFromColumn
);
}

for(
const id of prefsInputFieldIds
){
el(
id
)?.removeEventListener(
"input",
schedulePrefsFromInput
);
}

el(
"algo-macd-flip-add-book"
)?.removeEventListener(
"click",
onAddBook
);
el(
"algo-macd-flip-remove-book"
)?.removeEventListener(
"click",
onRemoveBook
);
window.removeEventListener(
MACD_FLIP_TOUCH_BOOK_OPEN_EVENT,
onBookOpen
);
window.removeEventListener(
MACD_FLIP_TOUCH_BOOK_CHANGE_EVENT,
onBookChanged
);

el(
"algo-macd-flip-tab-data"
)?.removeEventListener(
"click",
onStatsTabClick
);
el(
"algo-macd-flip-tab-equity"
)?.removeEventListener(
"click",
onStatsTabClick
);
el(
"algo-macd-flip-train-pct"
)?.removeEventListener(
"change",
onTrainPctForEquity
);

equityChart?.destroy?.();
equityChart =
null;
equityChartMod =
null;
lastEquityInput =
null;

overlay.destroy();
fitApi?.destroy?.();
fitApi =
null;

}
};

}
