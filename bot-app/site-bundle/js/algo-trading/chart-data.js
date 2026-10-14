/**
 * Closure slice. `host` is the surrounding function's bindings.
 */
import {
noteAlgoRsiPlaced
} from "./chart-pane-settle.js?v=3ecfb41d";

export function applyRsiData(host, 
{
notifyIndicators =
true,
liveLastOnly =
false
} =
{}
){

if(
!host.rsiSeries
){
return;
}

if(
!host.algoChartDbg(
"rsi"
) ||
!host.rsiPaneActive
){
noteAlgoRsiPlaced(
host.loadSeq
);
if(
notifyIndicators &&
host.algoChartDbg(
"indicators"
)
){
host.chartIndicators?.notifyCandlesUpdate?.();
}
return;
}

const rsiTf =
String(
host.rsiPaneSettings.tf ||
""
).trim();
const chartTf =
String(
host.tf ||
""
).trim();

if(
liveLastOnly &&
rsiTf &&
rsiTf !==
chartTf
){
return;
}

if(
!host.candles.length
){
host.rsiSeries.setData(
[]
);
host.lastRsiHudValue =
null;
host.setRsiHud(
null
);
noteAlgoRsiPlaced(
host.loadSeq
);
if(
notifyIndicators
){
host.chartIndicators?.notifyCandlesUpdate?.();
}
return;
}

const seq =
++host.rsiRebuildSeq;
const chartCandles =
host.candles;

void (
async()=>{

const points =
await host.buildChartRsiPoints(
{
chartCandles,
period:
host.rsiPaneSettings.period,
tf:
host.rsiPaneSettings.tf,
chartTf:
host.tf,
symbol: host.symbol,
loadHistory:(
histSymbol,
histTf,
requests
)=>
host.loadMarketHistory(
histSymbol,
histTf,
requests ||
host.HISTORY_REQUESTS,
{
parallel:
true,
batchGapMs:
0
}
)
}
);

if(
seq !==
host.rsiRebuildSeq ||
!host.rsiPaneActive
){
if(
!host.rsiPaneActive
){
noteAlgoRsiPlaced(
host.loadSeq
);
}
return;
}

host.rsiSeries.setData(
host.appendFutureWhitespaceBars(
points,
host.computeChartFutureMarginBars(
host.terminalVisibleBars(
host.candles.length
)
),
host.tf
)
);
host.applyRsiFixedPriceScale(
host.rsiChart,
host.rsiSeries
);
host.syncLinkedChartTimescales(
host.chart,
host.rsiChart
);
host.layoutRsi();
noteAlgoRsiPlaced(
host.loadSeq
);

let last =
null;

for(
let i =
points.length -
1;
i >=
0;
i--
){

if(
Number.isFinite(
points[i]?.value
)
){
last =
points[i];
break;
}

}

host.lastRsiHudValue =
last?.value ??
null;
host.setRsiHud(
host.lastRsiHudValue
);

if(
notifyIndicators
){
host.chartIndicators?.notifyCandlesUpdate?.();
}

}
)();

}

export async function deepenAlgoHistoryIfNeeded(host, 
seq
){

if(
!host.isAnyAnalysisBotActive() ||
!host.candles.length
){
return;
}

const havePages =
Math.max(
1,
Math.ceil(
host.candles.length /
host.TERMINAL_HISTORY_LAZY_BATCH_BARS
)
);
const extra =
host.HISTORY_REQUESTS -
havePages;

if(
extra <=
0
){
return;
}

try{
const older =
await host.loadMarketHistory(
host.symbol,
host.tf,
extra,
{
parallel:
true,
batchGapMs:
0,
endMs:
host.candles[0].time *
1000 -
1
}
);

if(
host.disposed ||
seq !==
host.loadSeq ||
!older?.length
){
return;
}

const beforeLen =
host.candles.length;
const range =
host.chart?.timeScale?.().getVisibleLogicalRange?.();
host.candles =
mergeOlderAlgoCandles(host, 
older
);
const added =
host.candles.length -
beforeLen;

if(
added <=
0
){
return;
}

applyCandleData(host, 
{
light:
true,
skipAnalysis:
true
}
);
host.chartIndicators?.notifyCandlesUpdate?.();
host.chartIndicators?.notifyMainChartOverlaysSync?.();

if(
range &&
host.chart?.timeScale?.().setVisibleLogicalRange
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

host.drawingTools?.scheduleRedraw?.();
host.markAlgoHistoryStatsReadyAndAnalyze();
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
}catch{
/* first paint already on screen */
}

}

export async function refreshAlgoHistoryTail(host, 
seq
){

if(
host.disposed ||
seq !==
host.loadSeq ||
!host.symbol ||
!host.candles.length
){
return;
}

try{
const latest =
await host.loadMarketHistory(
host.symbol,
host.tf,
1,
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
host.loadSeq ||
!latest?.length
){
return;
}

const merged =
host.mergeCandleRows(
host.candles,
latest,
{
preferIncoming:
true,
limit:
host.HISTORY_REQUESTS *
host.TERMINAL_HISTORY_LAZY_BATCH_BARS
}
);
const shift =
host.logicalIndexShift(
host.candles,
merged
);
const sameEdge =
shift ===
0 &&
merged.length ===
host.candles.length &&
merged[
merged.length -
1
]?.close ===
host.candles[
host.candles.length -
1
]?.close;

if(
sameEdge
){
return;
}

const range =
host.chart?.timeScale?.().getVisibleLogicalRange?.();
host.candles =
merged;
applyCandleData(host, 
{
light:
true,
skipAnalysis:
true
}
);

if(
range &&
host.chart?.timeScale?.().setVisibleLogicalRange
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
}catch{
/* cached chart is already on screen */
}

}

export function applyCandleData(host, 
{
fit =
false,
light =
false,
skipAnalysis =
false,
forceAnalysis =
false
} =
{}
){

if(
!host.candleSeries
){
return;
}

const refPrice =
host.candles[
host.candles.length -
1
]?.close ??
1;

host.applyChartPriceFormat(
host.candleSeries,
refPrice
);

const display =
host.buildDisplayCandles();

if(
!light &&
host.algoChartDbg(
"indicators"
)
){
host.chartIndicators?.clearMainChartOverlays?.();
}

host.candleSeries.setData(
display
);

if(
host.algoChartDbg(
"rsi"
)
){
applyRsiData(host, 
{
notifyIndicators:
!light
}
);
}

if(
!light &&
host.algoChartDbg(
"filterLines"
)
){
host.refreshEntryFilterLines();
}

if(
!light &&
host.algoChartDbg(
"indicators"
) &&
(
fit ||
host.isChartLayoutReady()
)
){
host.chartIndicators?.flushIndicatorDataRefreshNow?.();
host.chartIndicators?.notifyMainChartOverlaysSync?.();
}

/* fit строго после оверлеев: иначе flush/ST перетирают viewport (мигание cold-open). */
if(
fit
){
fitViewport(host);

if(
!light
){
host.setChartLayoutReady(
true
);
}

}

if(
!skipAnalysis &&
!light &&
host.candles.length
){
schedulePatternAnalysis(host, 
{
force:
!!fit ||
!!forceAnalysis
}
);
}

host.rsiTouchFlipHost?.refresh?.();
host.macdFlipTouchHost?.refresh?.();

host.drawingTools?.scheduleRedraw?.();

}

export function schedulePatternAnalysis(host, 
{
force =
false
} =
{}
){

if(
!host.algoChartDbg(
"analysis"
)
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

if(
!host.historyStatsReady
){
return;
}

if(
!force &&
host.isAlgoStatsAnalysisPaused()
){
return;
}

const seq =
++host.patternAnalysisSeq;
const runForced =
!!force;

if(
host.patternAnalysisTimer
){
clearTimeout(
host.patternAnalysisTimer
);
}

const delay =
runForced
? 0
: Math.max(
0,
host.PATTERN_ANALYSIS_LIVE_MS -
(
Date.now() -
host.lastPatternAnalysisAt
)
);

host.patternAnalysisTimer =
setTimeout(
()=>{
host.patternAnalysisTimer =
0;

if(
host.disposed ||
seq !==
host.patternAnalysisSeq
){
return;
}

if(
!runForced &&
host.isAlgoStatsAnalysisPaused()
){
return;
}

host.lastPatternAnalysisAt =
Date.now();

host.refreshAlgoPatternAnalysis(
host.candles,
host.entryOverlay,
host.buildPatternAnalysisOpts()
);
/* Paint filter applied in pattern-12 paint — достаточно redraw, без полного flush индикаторов. */
host.drawingTools?.scheduleRedraw?.();
},
delay
);

}

export function resizeAlgoCharts(host){

if(
!host.chart ||
!host.chartWrapEl
){
return;
}

const w =
Math.max(
host.chartWrapEl.clientWidth,
1
);
const chartH =
Math.max(
host.chartWrapEl.clientHeight,
1
);

if(
w <
2 ||
chartH <
2
){
/* Cold-open: wrap ещё без layout — fit отложим до первого валидного resize. */
if(
host.candles.length
){
host.pendingFitViewport =
true;
}
return;
}

host.chart.applyOptions(
{
width:
w,
height:
chartH
}
);

host.chartIndicators?.resizePanes?.(
w
);

if(
host.rsiChart &&
host.rsiPaneActive &&
host.rsiWrapEl
){

const rsiH =
Math.max(
host.rsiWrapEl.clientHeight,
1
);

if(
rsiH >=
2
){
host.rsiChart.applyOptions(
{
width:
w,
height:
rsiH
}
);
}

}

host.layoutRsi();
host.chartIndicators?.notifyLayoutChange?.();
host.drawingTools?.resize?.();
host.drawingTools?.scheduleRedraw?.();
host.runWithPreservedVisibleLogicalRange(
host.chart,
()=>{
host.chartIndicators?.notifyMainChartOverlaysSync?.();
host.entryOverlay?.refreshPositions?.();
}
);

if(
host.pendingFitViewport &&
host.candles.length
){
fitViewport(host);
}

}

export function fitViewport(host){

if(
!host.chart ||
!host.chartWrapEl
){
return;
}

const wrapW =
Math.max(
host.chartWrapEl.clientWidth,
0
);
const wrapH =
Math.max(
host.chartWrapEl.clientHeight,
0
);

if(
wrapW <
2 ||
wrapH <
2
){
if(
host.candles.length
){
host.pendingFitViewport =
true;
}
return;
}

/* #chart position:absolute — clientWidth часто 0; размер берём с wrap. */
host.chart.applyOptions(
{
width:
wrapW,
height:
wrapH
}
);

if(
host.rsiChart &&
host.rsiPaneActive &&
host.rsiWrapEl
){

const rsiH =
Math.max(
host.rsiWrapEl.clientHeight,
1
);

if(
rsiH >=
2
){
host.rsiChart.applyOptions(
{
width:
wrapW,
height:
rsiH
}
);
}

}

const display =
host.buildDisplayCandles();

if(
!display.length
){
return;
}

host.pendingFitViewport =
false;
host.invalidatePreservedVisibleLogicalRange();

host.applyCoinsChartViewport(
host.chart,
host.rsiChart,
display,
host.tf,
wrapW,
host.candles.length,
host.TERMINAL_VISIBLE_BARS
);

}

export function mergeOlderAlgoCandles(host, 
older
){

const byTime =
new Map();

for(
const row of older ||
[]
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

return Array.from(
byTime.values()
).sort(
(
a,
b
)=>
a.time -
b.time
);

}

export function applyLiveCandleTick(host){

if(
!host.candleSeries ||
!host.algoChartDbg(
"livePrice"
) ||
!host.candles.length
){
return;
}

host.ensureOhlcRollover(
host.candles,
host.liveBarPeriodSec(
host.tf
)
);

const last =
host.candles[
host.candles.length -
1
];

host.applyLiveSeriesUpdate(
host.candleSeries,
{
time:
last.time,
open:
last.open,
high:
last.high,
low:
last.low,
close:
last.close
},
host.buildDisplayCandles
);

}
