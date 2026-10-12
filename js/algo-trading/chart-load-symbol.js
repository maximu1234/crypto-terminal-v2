/**
 * Closure slice. `host` is the surrounding function's bindings.
 */
import {
beginAlgoChartPaneSettle,
finishAlgoChartPaneSettle,
noteAlgoChartViewportReady
} from "./chart-pane-settle.js?v=3ecfb41d";

function algoRsiPaneWaiting(host){

const wrap =
document.getElementById(
"rsi-wrap"
);

if(
!wrap ||
wrap.classList.contains(
"indicator-pane-hidden"
)
){
return false;
}

if(
!host.rsiPaneActive
){
return false;
}

if(
host.algoChartDbg &&
!host.algoChartDbg(
"rsi"
)
){
return false;
}

return true;

}

export async function loadSymbol(host, 
nextSymbol,
nextTf
){

const seq =
++host.loadSeq;
const persistFromSymbol =
host.symbol;

if(
seq >
1
){
host.persistAlgoSettings(
{
overlaySymbol:
persistFromSymbol
}
);
host.rsiTouchFlipHost?.persistForSymbol?.(
persistFromSymbol
);
}

host.symbol =
host.normalizeSymbol(
nextSymbol
);
host.tf =
String(
nextTf ||
host.tf ||
host.DEFAULT_TF
);

host.rsiTouchFlipHost?.hydrateForSymbol?.(
host.symbol
);

host.setChartLayoutReady(
false
);
host.stopKline();
host.setSymbolLabel();
host.setActiveTfButton();
host.hydrateTickerStrategyUi(
{
refreshFilters:
false
}
);
host.persistAlgoSettings(
{
writeOverlays:
false
}
);
host.drawingTools?.onSymbolChange?.({
skipRedraw:
true
});

if(
host.isAlgoBotLiteMode()
){
host.markAlgoHistoryStatsPending();

try{
const rows =
await host.loadAlgoBotLiteHistory(
host.symbol,
host.tf,
host.HISTORY_REQUESTS,
{
parallel:
true,
batchGapMs:
0
}
);

if(
host.disposed ||
seq !==
host.loadSeq
){
return;
}

host.candles =
Array.isArray(
rows
)
? rows.slice()
: [];

host.markAlgoHistoryStatsReadyAndAnalyze();
host.listApi?.highlight?.();
}catch(
err
){
console.error(
"[algo-trading] lite history",
host.getActiveExchangeId(),
host.symbol,
host.tf,
err
);

if(
seq ===
host.loadSeq
){
host.candles =
[];
host.markAlgoHistoryStatsReadyAndAnalyze();
}
}

return;
}

/* Индикаторы обновим после полной истории — не flush на пустых/старых свечах. */
beginAlgoChartPaneSettle(
seq,
{
waitForRsi:
algoRsiPaneWaiting(
host
)
}
);

try{
host.chartIndicators?.clearMainChartOverlays?.();
}catch{
/* ignore */
}
host.invalidateAlgoPattern12SceneCache();
host.algoPattern12EnabledOnce =
false;

host.markAlgoHistoryStatsPending();

try{
const cached =
host.peekHistoryCache(
host.getActiveExchangeId(),
host.symbol,
host.tf
);
let fromCache =
false;
let rows;

if(
cached &&
(
cached.candles.length >=
host.TERMINAL_VISIBLE_BARS ||
cached.coversVisible
)
){
rows =
cached.candles.slice();
fromCache =
true;
}else{
rows =
await host.loadMarketHistory(
host.symbol,
host.tf,
host.terminalHistoryInitialRequests(),
{
parallel:
true,
batchGapMs:
0
}
);
}

if(
host.disposed ||
seq !==
host.loadSeq
){
if(
host.disposed &&
seq ===
host.loadSeq
){
finishAlgoChartPaneSettle(
seq
);
}
return;
}

host.candles =
Array.isArray(
rows
)
? rows.slice()
: [];

host.putHistoryCache(
host.getActiveExchangeId(),
host.symbol,
host.tf,
host.candles,
{
coversVisible:
host.candles.length <
host.TERMINAL_VISIBLE_BARS ||
host.candles.length >=
host.HISTORY_REQUESTS *
host.TERMINAL_HISTORY_LAZY_BATCH_BARS
}
);

/* Как Терминал: сначала свечи + fit, без тяжёлых оверлеев. */
host.applyCandleData(
{
fit:
true,
light:
true,
skipAnalysis:
true
}
);
void host.deepenAlgoHistoryIfNeeded(
seq
);
if(
fromCache
){
void host.refreshAlgoHistoryTail(
seq
);
}

host.unsubKline =
host.subscribeKline(
host.symbol,
host.tf,
candle=>{

if(
host.disposed ||
seq !==
host.loadSeq
){
return;
}

host.ensureOhlcRollover(
host.candles,
host.liveBarPeriodSec(
host.tf
)
);

const beforeLen =
host.candles.length;
const beforeTime =
host.candles[
host.candles.length -
1
]?.time;

if(
!host.mergeLiveCandle(
host.candles,
candle,
0,
host.liveBarPeriodSec(
host.tf
)
)
){
return;
}

const isNewBar =
host.candles.length !==
beforeLen ||
host.candles[
host.candles.length -
1
]?.time !==
beforeTime;

if(
isNewBar
){
host.applyCandleData(
{
forceAnalysis:
host.algoChartDbg(
"analysis"
),
light:
!host.algoChartDbg(
"analysis"
) &&
!host.algoChartDbg(
"indicators"
) &&
!host.algoChartDbg(
"filterLines"
),
skipAnalysis:
!host.algoChartDbg(
"analysis"
)
}
);
}else{
if(
host.algoChartDbg(
"livePrice"
)
){
host.applyLiveCandleTick();
}
if(
host.algoChartDbg(
"rsi"
) &&
host.rsiPaneActive
){
host.applyRsiData(
{
notifyIndicators:
false,
liveLastOnly:
true
}
);
}
}

}
);

host.liveBarRollTimer =
setInterval(
()=>{
if(
host.disposed ||
seq !==
host.loadSeq ||
!host.candles.length
){
return;
}

if(
host.ensureOhlcRollover(
host.candles,
host.liveBarPeriodSec(
host.tf
)
)
){
host.applyLiveCandleTick();
}
},
1000
);

host.unbindLiveCatchup =
host.bindLiveCandleCatchup({
getSymbol:
()=>
host.symbol,
getTf:
()=>
host.tf,
getCandles:
()=>
host.candles,
maxLen:
0,
isAlive:
()=>
!host.disposed &&
seq ===
host.loadSeq,
paint:
(rows, info)=>{
host.paintCatchupLiveSeries(
host.series,
host.buildDisplayCandles(),
host.chart,
info?.appended,
info?.prevLen
);
if(
info?.appended
){
host.applyCandleData(
{
light:
true,
skipAnalysis:
true
}
);
}else{
host.applyLiveCandleTick();
}
}
});

host.listApi?.highlight?.();

/* Как scheduleChartLayoutSettled на Терминале: индикаторы и позиции поверх стабильного viewport. */
requestAnimationFrame(
()=>{
requestAnimationFrame(
()=>{

if(
host.disposed ||
seq !==
host.loadSeq
){
if(
host.disposed &&
seq ===
host.loadSeq
){
finishAlgoChartPaneSettle(
seq
);
}
return;
}

host.setChartLayoutReady(
true
);
host.fitViewport();
host.runWithPreservedVisibleLogicalRange(
host.chart,
()=>{
if(
host.algoChartDbg(
"analysis"
) ||
host.algoChartDbg(
"indicators"
)
){
host.ensureAlgoPattern12Enabled();
}

if(
host.algoChartDbg(
"filterLines"
)
){
host.refreshEntryFilterLines();
}

if(
host.algoChartDbg(
"indicators"
)
){
host.chartIndicators?.notifyCandlesUpdate?.();
host.chartIndicators?.flushIndicatorDataRefreshNow?.();
host.chartIndicators?.notifyMainChartOverlaysSync?.();
}
}
);
host.fitViewport();
noteAlgoChartViewportReady(
seq,
host.chart,
()=>
host.layoutRsi?.()
);
host.markAlgoHistoryStatsReadyAndAnalyze();
host.dispatchAlgoChartCandlesLoaded(
seq
);

if(
host.algoChartDbg(
"drawings"
)
){
host.drawingTools?.scheduleRedraw?.();
}

}
);
}
);

}catch(
err
){
console.error(
"[algo-trading] load",
host.getActiveExchangeId(),
host.symbol,
host.tf,
err
);

if(
seq ===
host.loadSeq
){
finishAlgoChartPaneSettle(
seq
);
host.candles =
[];
host.applyCandleData(
{
fit:
true
}
);
host.setChartLayoutReady(
true
);
host.dispatchAlgoChartCandlesLoaded(
seq
);
host.markAlgoHistoryStatsReadyAndAnalyze();
}
}

}
