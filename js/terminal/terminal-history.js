import {
stopTerminalReplay,
isTerminalReplayActive
} from "./terminal-replay.js?v=1b9e6de6";

/**
 * Closure slice. `host` is the surrounding function's bindings.
 */
export async function loadSymbol(host, symbol){

stopTerminalReplay({
restore: false
});

if(
symbol !==
host.currentSymbol
){
host.rememberTerminalHistory(
host.currentSymbol,
host.currentTF
);
}

if(
host.viewportSettleRaf.value
){

cancelAnimationFrame(
host.viewportSettleRaf.value
);

host.viewportSettleRaf.value =
0;

}

const loadSeq = ++host.symbolLoadSeq;
host.historyExhausted =
false;
host.historyLoadingOlder =
false;

host.disconnectKlineStream();
host.stopLivePriceFallbacks();
host.coinsState().chartCandlesSymbol =
"";
host.chartSwitchVeil.startChartSwitchVeil();
host.setChartLayoutReady(
false
);
host.dispatchChartSwitchStart(
symbol,
loadSeq
);

host.chartCrosshairLink?.clearLinked?.();

try{
host.chart.clearCrosshairPosition();
}catch{
/* ignore */
}

try{
host.rsiChart?.clearCrosshairPosition();
}catch{
/* ignore */
}

host.currentSymbol = symbol;
host.setCoinsChartSymbol(symbol);
host.highlightActiveSymbol();
host.syncCoinsChartTurnover24(
symbol
);

if(
host.isTradePage
){
void import(
"../trade-volume-presets.js?v=5f674712"
).then(
({
switchTradeVolumeSymbol
})=>{
switchTradeVolumeSymbol(
symbol
);
}
).catch(
()=>{
/* ignore */
}
);
}

host.persistCoinsPrefs();

host.setCoinsChartStatus(
`Загрузка ${host.formatCoinsSymbolLabel(symbol)}…`,
true
);

try{

const cached =
host.peekHistoryCache(
host.getActiveExchangeId(),
symbol,
host.currentTF
);
let nextCandles =
[];
let fromCache =
false;

if(
cached &&
(
cached.candles.length >=
host.TERMINAL_VISIBLE_BARS ||
cached.coversVisible
)
){
nextCandles =
cached.candles.slice();
fromCache =
true;
}else{
nextCandles =
await loadVisibleTerminalHistory(host, 
symbol,
host.currentTF,
loadSeq
);

if(
nextCandles ==
null ||
loadSeq !==
host.symbolLoadSeq
){
return;
}

}

host.candles = nextCandles;
host.coinsState().chartCandlesSymbol =
host.candles.length
? symbol
: "";
host.historyExhausted =
fromCache
? (
nextCandles.length >=
host.getTerminalHistoryDepth() ||
nextCandles.length <
host.TERMINAL_VISIBLE_BARS
)
: (
!nextCandles.length ||
nextCandles.length <
host.TERMINAL_VISIBLE_BARS
);

if(
!host.candles.length &&
host.isActiveRealtimeMarketDataset(
host.currentDataset
)
){

void import("../bybit-network-ui.js?v=3b530ded").then(m=>{
m.showBybitNetworkIssue(
new Error(
`История свечей ${host.getActiveExchangeDefinition().name} пуста`
)
);
});

host.setChartLayoutReady(
true
);
host.chartSwitchVeil.finishChartSwitchVeil(
loadSeq
);
return;

}

host.clearBybitNetworkIssue();

host.dispatchChartSwitchCandlesApply(
host.currentSymbol,
loadSeq
);

host.chartIndicators?.clearMainChartOverlays?.();

const displayCandles =
host.buildChartDisplayCandles();

const refPrice =
host.candles[host.candles.length - 1]?.close ?? 1;

host.applyChartPriceFormat(
host.candleSeries,
refPrice
);

host.replaceCoinsChartCandles(
host.candleSeries,
displayCandles
);

host.resetCoinsChartPriceScale();

host.rebuildRsiFromCandles();

host.applyDefaultZoom({
scheduleDrawingRedraw:
false,
skipViewportSettle:
true
});

host.chartIndicators?.notifyMainChartOverlaysSync?.();

host.coinsDrawOnSymbolChange({
skipRedraw:
true
});

host.scheduleChartLayoutSettled(
()=>{

if(
loadSeq !==
host.symbolLoadSeq
){
return;
}

host.setChartLayoutReady(
true
);

host.chartIndicators?.notifySymbolChange?.();
host.chartIndicators?.flushIndicatorDataRefreshNow?.();
/*
 * Full viewport plan from candles (keeps future margin + rightOffset).
 * AO + RSI sync only copies main → panes and must not re-fit main.
 */
host.settleCoinsChartViewport();
host.syncCoinsChartLinkedViewports();
host.refreshCoinsChartBarSpacing(
host.chart,
null
);
host.syncCoinsChartLinkedViewports();
host.chartIndicators?.notifyLayoutSettled?.();

host.scheduleCoinsDrawRedraw();

requestAnimationFrame(
()=>{
requestAnimationFrame(
()=>{

if(
loadSeq !==
host.symbolLoadSeq
){
return;
}

/* Late AO/RSI/position overlay may change price-scale width. */
host.settleCoinsChartViewport();
host.syncCoinsChartLinkedViewports();
host.refreshCoinsChartBarSpacing(
host.chart,
null
);
host.syncCoinsChartLinkedViewports();

}
);
}
);

host.dispatchChartCandlesLoaded(
host.currentSymbol,
loadSeq
);

host.highlightActiveSymbol();

host.startRealtime();
host.startPriceHud();

void host.terminalMultiChartApi?.scheduleSecondaryReload?.();

host.syncBackgroundAlertStreams(
host.currentSymbol,
host.currentTF
);

host.persistCoinsPrefs();

void settleTerminalHistoryAfterPaint(host, 
loadSeq
);

host.chartSwitchVeil.finishChartSwitchVeil(
loadSeq
);

}
);

}catch(
err
){

console.error(
"loadSymbol:",
err
);

if(
loadSeq ===
host.symbolLoadSeq
){
host.setChartLayoutReady(
true
);
host.chartSwitchVeil.finishChartSwitchVeil(
loadSeq
);
}

}finally{

if(loadSeq === host.symbolLoadSeq){
host.setCoinsChartStatus(
"",
false
);
}

}

}

export async function maybeLoadOlderTerminalHistory(host){

if(
isTerminalReplayActive() ||
host.historyLoadingOlder ||
host.historyExhausted ||
!host.candles.length ||
!host.currentSymbol
){
return;
}

const depth =
host.getTerminalHistoryDepth();

if(
host.candles.length >=
depth
){
host.historyExhausted =
true;
return;
}

const remaining =
depth -
host.candles.length;
const pageLimit =
host.slowHistoryPageLimit();
const requests =
pageLimit <
1000
? 1
: Math.max(
1,
Math.min(
2,
Math.ceil(
remaining /
host.TERMINAL_HISTORY_LAZY_BATCH_BARS
)
)
);
const endMs =
host.candles[0].time *
1000 -
1;
const loadSeq =
host.symbolLoadSeq;

host.historyLoadingOlder =
true;

try{
const older =
await host.loadMarketHistory(
host.currentSymbol,
host.currentTF,
requests,
{
parallel:
true,
batchGapMs:
0,
endMs,
pageLimit
}
);

if(
loadSeq !==
host.symbolLoadSeq
){
return;
}

if(
!older?.length
){
host.historyExhausted =
true;
return;
}

const beforeLen =
host.candles.length;
const byTime =
new Map();

for(
const row of older
){

if(
row?.time !=
null
){
byTime.set(
row.time,
row
);
}

}

for(
const row of host.candles
){

if(
row?.time !=
null
){
byTime.set(
row.time,
row
);
}

}

let merged =
Array.from(
byTime.values()
).sort(
(
a,
b
)=>
a.time -
b.time
);

if(
merged.length >
depth
){
merged =
merged.slice(
merged.length -
depth
);
}

const added =
merged.length -
beforeLen;

if(
added <=
0
){
host.historyExhausted =
true;
return;
}

const range =
host.chart?.timeScale?.().getVisibleLogicalRange?.();

host.candles =
merged;

host.candleSeries?.setData(
host.buildChartDisplayCandles()
);

host.rebuildRsiFromCandles();
host.chartIndicators?.notifyCandlesUpdate?.();

if(
range &&
host.chart
){
host.chart.timeScale().setVisibleLogicalRange(
{
from:
range.from +
added,
to:
range.to +
added
}
);
}

host.scheduleCoinsDrawRedraw();

if(
older.length <
requests *
pageLimit *
0.5
){
host.historyExhausted =
true;
}

}catch(
err
){
console.warn(
"terminal history lazy load:",
err?.message ||
err
);
}finally{
host.historyLoadingOlder =
false;
}

}

export async function loadVisibleTerminalHistory(host, 
symbol,
tf,
loadSeq
){

const visibleRequests =
Math.max(
1,
Math.ceil(
host.TERMINAL_VISIBLE_BARS /
host.TERMINAL_HISTORY_LAZY_BATCH_BARS
)
);
let rows =
await host.loadMarketHistory(
symbol,
tf,
visibleRequests,
{
parallel:
true,
batchGapMs:
0
}
);

if(
loadSeq !==
host.symbolLoadSeq
){
return null;
}

let guard =
0;

while(
rows.length <
host.TERMINAL_VISIBLE_BARS &&
rows.length &&
guard <
host.terminalHistoryInitialRequests()
){

guard++;
const older =
await host.loadMarketHistory(
symbol,
tf,
1,
{
parallel:
true,
batchGapMs:
0,
endMs:
rows[
0
].time *
1000 -
1
}
);

if(
loadSeq !==
host.symbolLoadSeq
){
return null;
}

if(
!older?.length
){
break;
}

const before =
rows.length;

rows =
host.mergeCandleRows(
rows,
older
);

if(
rows.length <=
before
){
break;
}

}

return rows;

}

export function applyMergedTerminalCandles(host, 
merged,
loadSeq
){

if(
loadSeq !==
host.symbolLoadSeq ||
!merged?.length
){
return;
}

const previous =
host.candles;
const shift =
host.logicalIndexShift(
previous,
merged
);
const range =
host.chart?.timeScale?.().getVisibleLogicalRange?.();

host.candles =
merged;
host.coinsState().chartCandlesSymbol =
host.currentSymbol;

host.candleSeries?.setData(
host.buildChartDisplayCandles()
);

host.rebuildRsiFromCandles();
host.chartIndicators?.notifyCandlesUpdate?.();

if(
range &&
host.chart &&
shift
){
host.chart.timeScale().setVisibleLogicalRange(
{
from:
range.from +
shift,
to:
range.to +
shift
}
);
}

host.scheduleCoinsDrawRedraw();

if(
host.candles.length >=
host.getTerminalHistoryDepth()
){
host.historyExhausted =
true;
}

host.putHistoryCache(
host.getActiveExchangeId(),
host.currentSymbol,
host.currentTF,
host.candles,
{
coversVisible:
host.candles.length >=
host.TERMINAL_VISIBLE_BARS ||
host.historyExhausted
}
);

}

export async function settleTerminalHistoryAfterPaint(host, 
loadSeq
){

try{
await host.refreshTerminalHistoryTail(
loadSeq
);
}catch(
err
){
console.warn(
"terminal history tail:",
err?.message ||
err
);
}

let guard =
0;
let guardMax =
8;

while(
loadSeq ===
host.symbolLoadSeq &&
!host.historyExhausted &&
host.candles.length <
host.TERMINAL_HISTORY_INITIAL_BARS &&
host.candles.length <
host.getTerminalHistoryDepth() &&
guard <
guardMax
){

if(
host.isSlowHistoryLink()
){
guardMax =
48;
}

guard++;
const before =
host.candles.length;

await maybeLoadOlderTerminalHistory(host);

if(
host.candles.length <=
before
){
break;
}

}

if(
loadSeq ===
host.symbolLoadSeq
){
host.rememberTerminalHistory(
host.currentSymbol,
host.currentTF
);
}

}

export function bindTerminalHistoryLazyLoad(host){

host.unbindTerminalHistoryLazyLoad();

if(
!host.chart?.timeScale
){
return;
}

const onRange =
range=>{

if(
!range ||
host.historyLoadingOlder ||
host.historyExhausted ||
!host.candles.length
){
return;
}

if(
host.candles.length >=
host.getTerminalHistoryDepth()
){
return;
}

if(
range.from >
80
){
return;
}

void maybeLoadOlderTerminalHistory(host);

};

host.chart.timeScale().subscribeVisibleLogicalRangeChange(
onRange
);

host.historyRangeUnsub =
()=>{

try{
host.chart.timeScale().unsubscribeVisibleLogicalRangeChange(
onRange
);
}catch{
/* ignore */
}

};

}
