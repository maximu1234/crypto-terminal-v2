import {
stopTerminalReplay,
isTerminalReplayActive
} from "./terminal-replay.js?v=1b9e6de6";

import {
getLastHealthyVisibleLogicalRange,
isIndicatorSettingsModalOpen,
isPreservingVisibleLogicalRange,
isTerminalHistoryLazyLoadSuppressed,
noteHealthyVisibleLogicalRange,
restoreLastHealthyVisibleLogicalRange,
suppressTerminalHistoryLazyLoad
} from "../chart-visible-range.js?v=d523062b";

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
host.initialHistoryReady =
null;
host.markTerminalRsiPending(
loadSeq,
()=>{
const finish =
()=>{

if(
loadSeq !==
host.symbolLoadSeq
){
return;
}

host.chartSwitchVeil.finishChartSwitchVeil(
loadSeq
);

};
const ready =
host.initialHistoryReady;

if(
ready &&
typeof ready.then ===
"function"
){
void Promise.race(
[
ready,
new Promise(
resolve=>{
setTimeout(
resolve,
8000
);
}
)
]
).then(
finish,
finish
);
return;
}

finish();
}
);
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
"../trade-volume-presets.js?v=adb9109d"
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

void import("../bybit-network-ui.js?v=2d117b93").then(m=>{
m.showBybitNetworkIssue(
new Error(
`История свечей ${host.getActiveExchangeDefinition().name} пуста`
)
);
});

host.setChartLayoutReady(
true
);
host.revealTerminalRsiPane();
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
host.noteTerminalRsiViewportReady(
loadSeq
);

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

const historyTask =
settleTerminalHistoryAfterPaint(host, 
loadSeq
);
const deepenHistory =
!host.historyExhausted &&
host.candles.length <
host.TERMINAL_HISTORY_INITIAL_BARS &&
host.candles.length <
host.getTerminalHistoryDepth();

/*
 * У части монет первая пачка короче начальной глубины.
 * Хвост доезжает уже после открытия и пересчитывает шкалу AO.
 * Держим крышку, пока эта догрузка не встала.
 */
host.initialHistoryReady =
deepenHistory
? historyTask
: null;

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
host.revealTerminalRsiPane();
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

/*
 * Диапазон в момент старта загрузки. После await шкала уже может
 * быть «починена» или снова from≈0 — якорь держим отсюда.
 */
let rangeAtStart =
null;

try{
rangeAtStart =
host.chart?.timeScale?.().getVisibleLogicalRange?.() ||
null;
}catch{
rangeAtStart =
null;
}

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

/*
 * Если старт был с from≈0 (ложный триггер после Volume), якорь от
 * «здорового» окна — иначе после setData снова пустой график.
 */
const healthy =
getLastHealthyVisibleLogicalRange();
const anchor =
rangeAtStart &&
rangeAtStart.from >
80
? rangeAtStart
: healthy &&
healthy.from >
80
? healthy
: rangeAtStart;

host.candles =
merged;

host.candleSeries?.setData(
host.buildChartDisplayCandles()
);

/*
 * Сначала вернуть шкалу, потом RSI/индикаторы: их setData иначе
 * захватывает from≈0 после setData свечей и через rAF откатывает вид.
 */
const restored =
anchor &&
host.chart
? {
from:
anchor.from +
added,
to:
anchor.to +
added
}
: null;

if(
restored
){
host.chart.timeScale().setVisibleLogicalRange(
restored
);
noteHealthyVisibleLogicalRange(
restored
);
suppressTerminalHistoryLazyLoad(
2000
);
}

requestAnimationFrame(
()=>{

if(
restored &&
host.chart
){
try{
host.chart.timeScale().setVisibleLogicalRange(
restored
);
}catch{
/* ignore */
}
}

requestAnimationFrame(
()=>{

if(
restored &&
host.chart
){
try{
host.chart.timeScale().setVisibleLogicalRange(
restored
);
}catch{
/* ignore */
}
}

host.rebuildRsiFromCandles();
host.chartIndicators?.notifyCandlesUpdate?.();
host.scheduleCoinsDrawRedraw();

}
);

}
);

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

host.rebuildRsiFromCandles();
host.chartIndicators?.notifyCandlesUpdate?.();

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
host.chartIndicators?.flushIndicatorDataRefreshNow?.();
await new Promise(
resolve=>{
requestAnimationFrame(
()=>{
requestAnimationFrame(
resolve
);
}
);
}
);
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
()=>{

/*
 * setData индикатора на кадр ставит from≈0. Если грузить историю
 * сразу, ответ через несколько секунд переписывает свечи и график пустой.
 * Ждём, пока шкала вернётся, и только потом догружаем.
 */
if(
host.historyLazyTimer
){
clearTimeout(
host.historyLazyTimer
);
}

host.historyLazyTimer =
setTimeout(
()=>{

host.historyLazyTimer =
0;

if(
host.historyLoadingOlder ||
host.historyExhausted ||
!host.candles.length ||
host.candles.length >=
host.getTerminalHistoryDepth()
){
host.historyLazyLeftEdgeHits =
0;
return;
}

/*
 * Пока setData индикатора откатывает шкалу, cool-down после preserve,
 * или открыты настройки — не грузим историю (ответ через ~5с
 * переписывает свечи → пустой график). Перенесём проверку.
 */
if(
isPreservingVisibleLogicalRange() ||
isTerminalHistoryLazyLoadSuppressed() ||
isIndicatorSettingsModalOpen()
){
host.historyLazyLeftEdgeHits =
0;
host.historyLazyTimer =
setTimeout(
onRange,
400
);
return;
}

let range =
null;

try{
range =
host.chart.timeScale().getVisibleLogicalRange();
}catch{
range =
null;
}

if(
!range
){
host.historyLazyLeftEdgeHits =
0;
return;
}

if(
range.from >
120
){
noteHealthyVisibleLogicalRange(
range
);
host.historyLazyLeftEdgeHits =
0;
return;
}

if(
range.from >
80
){
host.historyLazyLeftEdgeHits =
0;
return;
}

/*
 * from≈0 скачком (было from≫0) после Volume/resize — шок шкалы,
 * не уход пользователя влево. Иначе ложная история гасит график на 3–6с.
 * Плавный pan (healthy.from близко к 80) — не трогаем, грузим историю.
 */
const healthy =
getLastHealthyVisibleLogicalRange();

if(
healthy &&
healthy.from -
range.from >
400 &&
restoreLastHealthyVisibleLogicalRange(
host.chart
)
){
host.historyLazyLeftEdgeHits =
0;
suppressTerminalHistoryLazyLoad(
4000
);
return;
}

/*
 * Настоящий уход влево без якоря: два стабильных тика подряд.
 */
host.historyLazyLeftEdgeHits =
(
host.historyLazyLeftEdgeHits ||
0
) +
1;

if(
host.historyLazyLeftEdgeHits <
2
){
host.historyLazyTimer =
setTimeout(
onRange,
350
);
return;
}

host.historyLazyLeftEdgeHits =
0;

void maybeLoadOlderTerminalHistory(
host
);

},
400
);

};

host.chart.timeScale().subscribeVisibleLogicalRangeChange(
onRange
);

host.historyRangeUnsub =
()=>{

if(
host.historyLazyTimer
){
clearTimeout(
host.historyLazyTimer
);
host.historyLazyTimer =
0;
}

try{
host.chart.timeScale().unsubscribeVisibleLogicalRangeChange(
onRange
);
}catch{
/* ignore */
}

};

}
