/**
 * Closure slice. `host` is the surrounding function's bindings.
 */
export function rsiPaneSettingsFromFlipPrefs(host, 
raw
){

const fromColumn =
raw &&
typeof raw ===
"object" &&
(
raw.rsiLen !=
null ||
raw.osLevel !=
null ||
raw.obLevel !=
null ||
raw.rsiTf !=
null
);
const prefs =
fromColumn
? raw
: host.loadRsiTouchFlipPrefs();

return {
period:
prefs.rsiLen,
overbought:
prefs.obLevel,
oversold:
prefs.osLevel,
tf:
prefs.rsiTf ||
""
};

}

export function readFlipPanePatchFromDom(host){

const lenEl =
document.getElementById(
"algo-rsi-flip-len"
);

if(
!lenEl
){
return host.loadRsiTouchFlipPrefs();
}

return {
rsiLen:
lenEl.value,
osLevel:
document.getElementById(
"algo-rsi-flip-os"
)?.value,
obLevel:
document.getElementById(
"algo-rsi-flip-ob"
)?.value,
rsiTf:
document.getElementById(
"algo-rsi-flip-tf"
)?.value
};

}

export function applyEffectiveRsiPaneSettings(host, 
flipPatch
){

if(
host.isActiveAnalysisBot(
host.ALGO_ANALYSIS_BOT_RSI_TOUCH_FLIP
)
){
host.rsiPaneSettings =
host.normalizeRsiPaneSettings(
{
...rsiPaneSettingsFromFlipPrefs(host, 
flipPatch ||
readFlipPanePatchFromDom(host)
),
colorLines:
host.userRsiPaneSettings?.colorLines ===
true
}
);
}else{
host.rsiPaneSettings =
host.userRsiPaneSettings;
}

host.applyRsiSeriesColorMode?.(
host.rsiSeries,
host.rsiPaneSettings.colorLines ===
true
);
syncRsiHudPeriod(host);
syncRsiLevelDom(host);
host.applyRsiData();

}

export function getRsiPaneSettings(host){

if(
!host.isActiveAnalysisBot(
host.ALGO_ANALYSIS_BOT_RSI_TOUCH_FLIP
)
){
return null;
}

return host.normalizeRsiPaneSettings(
rsiPaneSettingsFromFlipPrefs(host, 
readFlipPanePatchFromDom(host)
)
);

}

export function commitRsiPaneSettings(host, 
next
){

if(
!host.isActiveAnalysisBot(
host.ALGO_ANALYSIS_BOT_RSI_TOUCH_FLIP
)
){
return false;
}

host.userRsiPaneSettings =
host.normalizeRsiPaneSettings(
{
...host.userRsiPaneSettings,
colorLines:
next?.colorLines ===
true
}
);

host.saveRsiTouchFlipPrefs(
{
rsiLen:
next?.period,
osLevel:
next?.oversold,
obLevel:
next?.overbought,
rsiTf:
next?.tf ||
""
}
);
host.rsiTouchFlipHost?.applyColumnFromPrefs?.();
applyEffectiveRsiPaneSettings(host);
void host.rsiTouchFlipHost?.refresh?.();
host.ignoreNextRsiSettingsCapture =
true;
return true;

}

export function syncRsiHudPeriod(host){

host.syncRsiHudPeriodEl(
host.rsiHudPeriodEl,
host.rsiPaneSettings.period
);

}

export function syncRsiLevelDom(host){

host.syncRsiLevelDomEl(
host.rsiWrapEl,
host.rsiPaneSettings
);

}

export function onRsiSettingsChange(host, 
next
){

if(
host.ignoreNextRsiSettingsCapture
){
host.ignoreNextRsiSettingsCapture =
false;
applyEffectiveRsiPaneSettings(host);
return;
}

if(
next
){
host.userRsiPaneSettings =
host.normalizeRsiPaneSettings(
next
);
}

applyEffectiveRsiPaneSettings(host);

}

export function algoGate(host, 
id
){

return host.algoGateFromMemory(
host.mem,
id
);

}

export function chartStrategyId(host){

return host.chartStrategyIdFromMemory(
host.mem
);

}

export function chartGate(host){

return host.chartGateFromMemory(
host.mem
);

}

export function buildTradeOpts(host, 
strategyId
){

return host.buildTradeOptsFromMemory(
host.mem,
strategyId,
{
chartTf:
host.tf,
patternSettings:
host.readAlgoPattern12Settings()
}
);

}

export function isAlgoStatsAnalysisPaused(host){

return host.algoStatsPanelCollapsed;

}

export function markAlgoHistoryStatsPending(host){

host.historyStatsReady =
false;
host.patternAnalysisSeq++;

if(
host.patternAnalysisTimer
){
clearTimeout(
host.patternAnalysisTimer
);
host.patternAnalysisTimer =
0;
}

host.clearAlgoPatternAnalysisUi(
host.entryOverlay
);

}

export function markAlgoHistoryStatsReadyAndAnalyze(host){

host.historyStatsReady =
true;

if(
!host.algoChartDbg(
"analysis"
)
){
return;
}

ensureAlgoPattern12Enabled(host);
host.schedulePatternAnalysis(
{
force:
true
}
);
host.drawingTools?.scheduleRedraw?.();
host.rsiTouchFlipHost?.refresh?.();
host.macdFlipTouchHost?.refresh?.();

}

export function dispatchAlgoChartCandlesLoaded(host, 
loadId
){

try{
window.dispatchEvent(
new CustomEvent(
"chart-candles-loaded",
{
detail:{
symbol:
String(
host.symbol ||
""
).replace(
/\.P$/i,
""
).trim().toUpperCase(),
loadSeq:
Number(
loadId
) ||
0
}
}
)
);
}catch{
/* ignore */
}

}

export function ensureAlgoPattern12Enabled(host){

if(
!host.algoChartDbg(
"indicators"
) ||
!host.algoChartDbg(
"analysis"
)
){
return;
}

if(
host.algoPattern12EnabledOnce ||
host.disposed
){
return;
}

if(
!host.isActiveAnalysisBot(
host.ALGO_ANALYSIS_BOT_PATTERN_12
)
){
return;
}

host.algoPattern12EnabledOnce =
true;

if(
host.isAlgoBotLiteMode()
){
return;
}

const root =
document.getElementById(
"chart-indicators-wrap"
);
const input =
root?.querySelector?.(
'input[data-indicator-id="pattern-12"]'
);

if(
!input ||
input.checked
){
return;
}

input.checked =
true;
input.dispatchEvent(
new host.Event(
"change",
{
bubbles:
true
}
)
);

}

export function applyActiveAnalysisBotChartUi(host){

const botId =
host.getActiveAnalysisBotId();

document.body?.setAttribute(
"data-algo-analysis-bot",
botId
);

const pattern12 =
botId ===
host.ALGO_ANALYSIS_BOT_PATTERN_12;

if(
!pattern12
){
host.patternAnalysisSeq++;
if(
host.patternAnalysisTimer
){
clearTimeout(
host.patternAnalysisTimer
);
host.patternAnalysisTimer =
0;
}
host.tickerScanUi?.stopAll?.();
host.entryOverlay?.setEvents?.(
[]
);
host.entryOverlay?.refreshPositions?.();
host.algoPattern12EnabledOnce =
false;
refreshSupertrendFilterLines(host);
host.rsiTouchFlipHost?.refresh?.();
host.macdFlipTouchHost?.refresh?.();
applyEffectiveRsiPaneSettings(host);
if(
host.isActiveAnalysisBot(
host.ALGO_ANALYSIS_BOT_MACD_FLIP_TOUCH
)
){
syncChartMacdPaneFromFlip(host);
}else{
host.chartIndicators?.setIndicatorEnabled?.(
"macd",
false
);
}
requestAnimationFrame(
()=>{
host.recaptureAlgoStatsPanelHeight();
}
);
return;
}

if(
host.historyStatsReady &&
!host.disposed
){
host.algoPattern12EnabledOnce =
false;
requestAnimationFrame(
()=>{

if(
host.disposed ||
!host.isActiveAnalysisBot(
host.ALGO_ANALYSIS_BOT_PATTERN_12
)
){
return;
}

ensureAlgoPattern12Enabled(host);
refreshSupertrendFilterLines(host);
host.schedulePatternAnalysis(
{
force:
true
}
);

}
);
}

applyEffectiveRsiPaneSettings(host);
requestAnimationFrame(
()=>{
host.recaptureAlgoStatsPanelHeight();
}
);

}

export function syncChartMacdPaneFromFlip(host, 
flipPatch
){

if(
!host.isActiveAnalysisBot(
host.ALGO_ANALYSIS_BOT_MACD_FLIP_TOUCH
)
){
return;
}

const prefs =
flipPatch &&
typeof flipPatch ===
"object"
? flipPatch
: host.loadMacdFlipTouchPrefs();
const macdInd =
host.chartIndicators?.getIndicator?.(
"macd"
);

if(
!macdInd
){
return;
}

host.chartIndicators?.setIndicatorEnabled?.(
"macd",
true
);
macdInd.applySettings?.(
{
fastLength:
prefs.fastLength,
slowLength:
prefs.slowLength,
signalLength:
prefs.signalLength,
tf:
prefs.macdTf ||
""
}
);
host.chartIndicators?.notifyCandlesUpdate?.();

}

export function setRsiPaneActive(host, 
active
){

host.rsiPaneActive =
!!active;

if(
host.rsiPaneActive
){
host.applyRsiData();
return;
}

host.rsiSeries?.setData(
[]
);
layoutRsi(host);
setRsiHud(host, 
null
);

}

export function setSymbolLabel(host, 
previewSymbol
){

const labelSymbol =
previewSymbol !=
null &&
String(
previewSymbol
).trim()
? host.normalizeSymbol(
previewSymbol
)
: host.symbol;

if(
host.symbolEl
){
host.symbolEl.textContent =
host.displaySymbol(
labelSymbol
);
}

document.title =
`${host.displaySymbol(
labelSymbol
)} — АлгоТрейдинг`;

host.coinsState().currentSymbol =
host.normalizeSymbol(
labelSymbol
);

syncAlgoChartTurnover24(host, 
labelSymbol
);

}

export function syncAlgoChartTurnover24(host,
nextSymbol =
host.symbol
){

const el =
document.getElementById(
"coins-chart-turnover24"
);

if(
!el
){
return;
}

const item =
host.marketMap.get(
host.normalizeSymbol(
nextSymbol
)
);

el.textContent =
host.formatTurnover24Label(
item?.volume24
);

}

export function setActiveTfButton(host){

host.tfBar?.querySelectorAll(
".tf-btn"
).forEach(
btn=>{
btn.classList.toggle(
"active",
btn.dataset.tf ===
host.tf
);
}
);

const chartTfSel =
document.getElementById(
"algo-rsi-flip-chart-tf"
);

if(
chartTfSel &&
document.activeElement !==
chartTfSel &&
[
...chartTfSel.options
].some(
opt=>
opt.value ===
host.tf
)
){
chartTfSel.value =
host.tf;
}

}

export function setRsiHud(host, 
value
){

host.setRsiHudEl(
host.rsiHudValueEl,
value
);

}

export function layoutRsi(host){

if(
!host.rsiSeries
){
return;
}

host.layoutRsiPane(
host.rsiSeries,
host.rsiWrapEl,
host.rsiPaneSettings
);

}

export function scheduleResizeAlgoCharts(host){

if(
host.algoResizeRaf
){
cancelAnimationFrame(
host.algoResizeRaf
);
}

host.algoResizeRaf =
requestAnimationFrame(
()=>{
host.algoResizeRaf =
0;
host.resizeAlgoCharts();
}
);

}

export function lastRsiValue(host){

if(
host.lastRsiHudValue !=
null &&
Number.isFinite(
host.lastRsiHudValue
)
){
return host.lastRsiHudValue;
}

return host.lastRsiValueFromCandles(
host.candles,
host.rsiPaneSettings.period
);

}

export function buildDisplayCandles(host){

if(
!host.candles.length
){
return [];
}

return host.appendFutureWhitespaceBars(
host.candles,
host.computeChartFutureMarginBars(
host.terminalVisibleBars(
host.candles.length
)
),
host.tf
);

}

export function refreshEntryFilterLines(host){

if(
!host.algoChartDbg(
"filterLines"
)
){
return;
}

host.supertrendFilterOverlay?.refresh?.();

}

export function refreshSupertrendFilterLines(host){

refreshEntryFilterLines(host);

}

export function destroySupertrendFilterLines(host){

host.supertrendFilterOverlay?.destroy?.();
host.supertrendFilterOverlay =
null;

}

export function buildPatternAnalysisOpts(host){

return {
...buildTradeOpts(host, 
"st1"
),
gates:{
st1:{
...host.mem.strategyGates.st1
},
st2:{
...host.mem.strategyGates.st2
},
st3:{
...host.mem.strategyGates.st3
}
},
statsMode:
host.mem.statsMode,
statsModeSt2:
host.mem.statsModeSt2,
statsModeSt3:
host.mem.statsModeSt3,
chartPositionsStrategy:
host.mem.chartPositionsStrategy,
symbol: host.symbol
};

}

export function stopKline(host){

try{
host.unbindLiveCatchup?.();
}catch{
/* ignore */
}

host.unbindLiveCatchup =
null;

try{
host.unsubKline?.();
}catch{
/* ignore */
}

host.unsubKline =
null;

if(
host.liveBarRollTimer
){
clearInterval(
host.liveBarRollTimer
);
host.liveBarRollTimer =
null;
}

}

export function bindStrategyGateUi(host, 
id
){

function gate(){

return algoGate(host, 
id
);

}

const g =
gate();
const slEl =
document.getElementById(
`algo-sl-pct-of-x-${id}`
);
const pbEl =
document.getElementById(
`algo-pullback-before-arm-${id}`
);
const pbPctEl =
document.getElementById(
`algo-pullback-before-arm-pct-${id}`
);

if(
slEl
){
slEl.value =
String(
g.slPctOfX
);
const commit =
()=>{
const live =
gate();
const next =
host.clampSlPctOfX(
slEl.value
);
slEl.value =
String(
next
);
if(
next ===
live.slPctOfX
){
return;
}
live.slPctOfX =
next;
persistAlgoSettings(host);
};
host.bindAlgoNumericField(
slEl,
commit
);
}

if(
pbPctEl
){
pbPctEl.value =
String(
g.pullbackBeforeArmPct
);
const commit =
()=>{
const live =
gate();
const next =
host.clampPullbackBeforeArmPct(
pbPctEl.value
);
pbPctEl.value =
String(
next
);
if(
next ===
live.pullbackBeforeArmPct
){
return;
}
live.pullbackBeforeArmPct =
next;
persistAlgoSettings(host);
};
host.bindAlgoNumericField(
pbPctEl,
commit
);
}

if(
pbEl
){
pbEl.checked =
g.pullbackBeforeArm;
pbEl.addEventListener(
"change",
()=>{
gate().pullbackBeforeArm =
!!pbEl.checked;
persistAlgoSettings(host);
}
);
}

function bindStSide(
side
){

const cap =
side ===
"long"
? "Long"
: "Short";
const filterKey =
side ===
"long"
? "supertrendLongFilter"
: "supertrendShortFilter";
const atrKey =
side ===
"long"
? "supertrendLongAtr"
: "supertrendShortAtr";
const factorKey =
side ===
"long"
? "supertrendLongFactor"
: "supertrendShortFactor";
const tfKey =
side ===
"long"
? "supertrendLongTf"
: "supertrendShortTf";
const filterEl =
document.getElementById(
`algo-st-${id}-${side}-filter`
);
const atrEl =
document.getElementById(
`algo-st-${id}-${side}-atr`
);
const factorEl =
document.getElementById(
`algo-st-${id}-${side}-factor`
);
const tfEl =
document.getElementById(
`algo-st-${id}-${side}-tf`
);

if(
filterEl
){
filterEl.checked =
g[
filterKey
];
filterEl.addEventListener(
"change",
()=>{
gate()[
filterKey
] =
!!filterEl.checked;
persistAlgoSettings(host);
refreshEntryFilterLines(host);
}
);
}

if(
atrEl
){
atrEl.value =
String(
g[
atrKey
]
);
atrEl.addEventListener(
"change",
()=>{
const live =
gate();
const next =
host.clampAlgoSupertrendAtr(
atrEl.value
);
atrEl.value =
String(
next
);
live[
atrKey
] =
next;
persistAlgoSettings(host);
refreshEntryFilterLines(host);
}
);
}

if(
factorEl
){
factorEl.value =
String(
g[
factorKey
]
);
factorEl.addEventListener(
"change",
()=>{
const live =
gate();
const next =
host.clampAlgoSupertrendFactor(
factorEl.value
);
factorEl.value =
String(
next
);
live[
factorKey
] =
next;
persistAlgoSettings(host);
refreshEntryFilterLines(host);
}
);
}

if(
tfEl
){
tfEl.value =
g[
tfKey
];
tfEl.addEventListener(
"change",
()=>{
const live =
gate();
const next =
host.normalizeAlgoSupertrendTf(
tfEl.value
);
tfEl.value =
next;
live[
tfKey
] =
next;
persistAlgoSettings(host);
refreshEntryFilterLines(host);
}
);
}

void cap;

}

bindStSide(
"long"
);
bindStSide(
"short"
);

}

export function strategyPrefKeys(host, 
id
){

return host.strategyPrefKeysFromMemory(
id
);

}

export function strategyPatchFromState(host, 
strategyId
){

return host.strategyPatchFromStateFromMemory(
host.mem,
strategyId
);

}

export function applyStrategyPatchToMemory(host, 
strategyId,
patch
){

return host.applyStrategyPatchToMemoryFromMemory(
host.mem,
strategyId,
patch
);

}

export function syncStrategyDomFromMemory(host){

return host.syncStrategyDomFromMemoryFromMemory(
host.mem
);

}

export function restoreStrategyMemoryFromPrefs(host){

return host.restoreStrategyMemoryFromPrefsFromMemory(
host.mem
);

}

export function hydrateTickerStrategyUi(host, 
opts =
{}
){

restoreStrategyMemoryFromPrefs(host);

for(
const id of host.ALGO_STRATEGY_IDS
){
const overlay =
host.getTickerStrategyOverlay(
id,
host.symbol
);

if(
overlay
){
applyStrategyPatchToMemory(host, 
id,
overlay
);
}

}

syncStrategyDomFromMemory(host);

if(
opts.refreshFilters !==
false
){
refreshEntryFilterLines(host);
}

}

export function applyOptimizedPatchesToTickers(host, 
strategyId,
entries
){

const written =
host.writeTickerStrategyOverlays(
strategyId,
entries
);
const overlay =
host.getTickerStrategyOverlay(
strategyId,
host.symbol
);

if(
overlay
){
applyStrategyPatchToMemory(host, 
strategyId,
overlay
);
}

syncStrategyDomFromMemory(host);
refreshEntryFilterLines(host);
persistAlgoSettings(host, 
{
writeOverlays:
false
}
);
return written;

}

export function persistAlgoSettings(host, 
opts
){

const overlaySymbol =
opts &&
opts.overlaySymbol !=
null
? host.normalizeSymbol(
opts.overlaySymbol
)
: host.symbol;
const writeOverlays =
!opts ||
opts.writeOverlays !==
false;
const prev =
host.readPrefs();
let prevStored =
{};

try{
const raw =
JSON.parse(
localStorage.getItem(
host.ALGO_PREFS_KEY
) ||
"{}"
);
if(
raw &&
typeof raw ===
"object" &&
!Array.isArray(
raw
)
){
prevStored =
raw;
}
}catch{
prevStored =
{};
}
const snapshot =
host.buildAlgoPrefsSnapshot(
host.mem,
{
symbol: host.symbol,
tf: host.tf
}
);

for(
const id of host.ALGO_STRATEGY_IDS
){

if(
writeOverlays &&
host.hasTickerStrategyOverlay(
id,
overlaySymbol
)
){
host.setTickerStrategyOverlay(
id,
overlaySymbol,
strategyPatchFromState(host, 
id
)
);
}

if(
!host.hasTickerStrategyOverlay(
id,
host.symbol
)
){
continue;
}

for(
const key of strategyPrefKeys(host, 
id
)
){
if(
Object.prototype.hasOwnProperty.call(
prevStored,
key
) &&
prevStored[
key
] !=
null
){
snapshot[
key
] =
prevStored[
key
];
continue;
}

if(
Object.prototype.hasOwnProperty.call(
prev,
key
)
){
snapshot[
key
] =
prev[
key
];
}
}

}

host.writePrefs(
snapshot
);
host.entryOverlay?.refreshPositions?.();
host.drawingTools?.scheduleRedraw?.();
host.refreshAlgoPatternAnalysis(
host.candles,
host.entryOverlay,
buildPatternAnalysisOpts(host)
);
host.chartIndicators?.flushIndicatorDataRefreshNow?.();
host.drawingTools?.scheduleRedraw?.();
}

export function getStatsModeForStrategy(host, 
strategy
){

if(
strategy ===
"partial-tp"
){
return host.mem.statsModeSt2;
}

if(
strategy ===
"partial-tp-y"
){
return host.mem.statsModeSt3;
}

return host.mem.statsMode;

}

export function setStatsModeForStrategy(host, 
strategy,
mode
){

const next =
host.normalizeAlgoStatsMode(
mode
);

if(
strategy ===
"partial-tp"
){
host.mem.statsModeSt2 =
next;
}else if(
strategy ===
"partial-tp-y"
){
host.mem.statsModeSt3 =
next;
}else{
host.mem.statsMode =
next;
}

}

export function applyStatsModeButtons(host){

for(
const [
strategy,
root
] of Object.entries(
host.statsModeRoots
)
){

if(
!root
){
continue;
}

const current =
getStatsModeForStrategy(host, 
strategy
);

for(
const btn of root.querySelectorAll(
"[data-algo-stats-mode]"
)
){
const mode =
host.normalizeAlgoStatsMode(
btn.getAttribute(
"data-algo-stats-mode"
)
);
const active =
mode ===
current;
btn.classList.toggle(
"active",
active
);
btn.setAttribute(
"aria-selected",
active
? "true"
: "false"
);
}

}

}

export function applyChartPositionChecks(host){

for(
const input of host.chartPositionChecks
){
const strategy =
input.getAttribute(
"data-algo-chart-positions"
);
input.checked =
strategy ===
host.mem.chartPositionsStrategy;
}

}

export function bindPartialTpInput(host, 
input,
getValue,
setValue,
fallback
){

if(
!input
){
return;
}

input.value =
String(
getValue()
);

const commit =
()=>{
const next =
host.clampPartialTpX(
input.value,
fallback
);
input.value =
String(
next
);

if(
next ===
getValue()
){
return;
}

setValue(
next
);
persistAlgoSettings(host);
};

host.bindAlgoNumericField(
input,
commit
);
}

export function bindTrailSlXInput(host, 
input,
getValue,
setValue,
clamp
){

if(
!input
){
return;
}

input.value =
String(
getValue()
);

const commit =
()=>{
const next =
clamp(
input.value
);
input.value =
String(
next
);

if(
next ===
getValue()
){
return;
}

setValue(
next
);
persistAlgoSettings(host);
};

host.bindAlgoNumericField(
input,
commit
);
}

export function bindTrailSlCheck(host, 
input,
getValue,
setValue
){

if(
!input
){
return;
}

input.checked =
!!getValue();
input.addEventListener(
"change",
()=>{
const next =
!!input.checked;

if(
next ===
!!getValue()
){
return;
}

setValue(
next
);
persistAlgoSettings(host);
}
);

}

export function reclampTrailSlX2(host, 
input,
clamp,
getValue,
setValue
){

const next =
clamp(
getValue()
);

if(
input
){
input.value =
String(
next
);
}

if(
next !==
getValue()
){
setValue(
next
);
}

}

export function bindTpShareInputs(host, 
span,
getShares,
setShares
){

const inputs =
[
1,
2,
3
].map(
n=>
document.getElementById(
`algo-share${n}-${span}`
)
);

const render =
()=>{
const shares =
getShares();

inputs.forEach(
(
input,
i
)=>{
if(
input
){
input.value =
String(
shares[
i
]
);
}
}
);
};

render();

inputs.forEach(
(
input,
index
)=>{

if(
!input
){
return;
}

const commit =
()=>{
const cur =
getShares();
const next =
host.rebalanceTpShares(
index ===
0
? input.value
: cur[
0
],
index ===
1
? input.value
: cur[
1
],
index ===
2
? input.value
: cur[
2
],
index
);

if(
next.every(
(
value,
i
)=>
value ===
cur[
i
]
)
){
render();
return;
}

setShares(
next
);
render();
persistAlgoSettings(host);
};

host.bindAlgoNumericField(
input,
commit
);
}
);

}

export function bindSide(host, 
prefix,
getState,
setState
){

const filterEl =
document.getElementById(
`algo-st-${prefix}-filter`
);
const atrEl =
document.getElementById(
`algo-st-${prefix}-atr`
);
const factorEl =
document.getElementById(
`algo-st-${prefix}-factor`
);
const tfEl =
document.getElementById(
`algo-st-${prefix}-tf`
);
const state =
getState();

if(
filterEl
){
filterEl.checked =
state.filter;
filterEl.addEventListener(
"change",
()=>{
setState(
{
filter:
!!filterEl.checked
}
);
persistAlgoSettings(host);
refreshEntryFilterLines(host);
host.schedulePatternAnalysis(
{
force:
true
}
);
}
);
}

if(
atrEl
){
atrEl.value =
String(
state.atr
);
atrEl.addEventListener(
"change",
()=>{
const next =
host.clampAlgoSupertrendAtr(
atrEl.value
);
atrEl.value =
String(
next
);
setState(
{
atr:
next
}
);
persistAlgoSettings(host);
refreshEntryFilterLines(host);
host.schedulePatternAnalysis(
{
force:
true
}
);
}
);
}

if(
factorEl
){
factorEl.value =
String(
state.factor
);
factorEl.addEventListener(
"change",
()=>{
const next =
host.clampAlgoSupertrendFactor(
factorEl.value
);
factorEl.value =
String(
next
);
setState(
{
factor:
next
}
);
persistAlgoSettings(host);
refreshEntryFilterLines(host);
host.schedulePatternAnalysis(
{
force:
true
}
);
}
);
}

if(
tfEl
){
tfEl.value =
state.tf;
tfEl.addEventListener(
"change",
()=>{
const next =
host.normalizeAlgoSupertrendTf(
tfEl.value
);
tfEl.value =
next;
setState(
{
tf:
next
}
);
persistAlgoSettings(host);
refreshEntryFilterLines(host);
host.schedulePatternAnalysis(
{
force:
true
}
);
}
);
}

}

export function setNum(host, 
id,
value
){
const el =
document.getElementById(
id
);

if(
el
){
el.value =
String(
value
);
}

}

export function setCheck(host, 
id,
value
){
const el =
document.getElementById(
id
);

if(
el
){
el.checked =
!!value;
}

}
