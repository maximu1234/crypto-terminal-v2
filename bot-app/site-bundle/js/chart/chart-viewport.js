import {
effectiveChartPriceScaleWidth
} from "./chart-options.js?v=f4be0094";

import {
liveBarPeriodSec
} from "./live-bar-roll.js?v=6ff2b718";

/** Свечей в видимой области (плотный обзор). */
export const SCREENER_VISIBLE_BARS = 1500;

/** Максимум в серии: 2 запроса × 1000 к Bybit. */
export const SCREENER_MAX_BARS = 2000;

export const SCREENER_LOAD_BARS = SCREENER_MAX_BARS;

export function applyDashboardZoom(chart, candles, tf){

if(!candles.length){
return;
}

let visibleBars = 900;

if(tf === "1"){
visibleBars = 300;
}

if(tf === "5"){
visibleBars = 500;
}

if(tf === "15"){
visibleBars = 900;
}

if(tf === "60"){
visibleBars = 700;
}

if(tf === "240"){
visibleBars = 500;
}

if(tf === "D"){
visibleBars = 300;
}

if(tf === "W"){
visibleBars = 200;
}

visibleBars =
Math.min(visibleBars, candles.length);

chart.timeScale().setVisibleLogicalRange({

from: candles.length - visibleBars,

to: candles.length + 25

});

}

/**
 * Пустое место справа на шкале времени (подписи «в будущее»).
 * ~15% видимого окна, как у TradingView (без жёсткого потолка в 80 баров).
 */
export function computeChartFutureMarginBars(
visibleBars
){

const visible =
Math.max(
1,
Math.floor(
Number(
visibleBars
) ||
1
)
);

return Math.max(
12,
Math.round(
visible *
0.15
)
);

}

/** Пустые точки справа — LW рисует подписи шкалы времени «в будущее». */
export function appendFutureWhitespaceBars(
candles,
barCount,
tf
){

if(
!Array.isArray(
candles
) ||
!candles.length ||
barCount <
1
){
return candles;
}

const period =
tfPeriodSec(
tf
);

const lastTime =
candles[
candles.length -
1
].time;

const out =
candles.slice();

for(
let i =
1;
i <=
barCount;
i++
){

out.push({
time:
lastTime +
period *
i
});

}

return out;

}

export function coinsTfVisibleBars(
tf,
candleCount
){

let visibleBars =
Math.max(
1,
Number(
candleCount
) ||
1
);

if(
tf ===
"1"
){
visibleBars =
Math.min(
visibleBars,
1500
);
}

if(
tf ===
"5"
){
visibleBars =
Math.min(
visibleBars,
2000
);
}

if(
tf ===
"15"
){
visibleBars =
Math.min(
visibleBars,
2500
);
}

if(
tf ===
"60"
){
visibleBars =
Math.min(
visibleBars,
3000
);
}

if(
tf ===
"240"
){
visibleBars =
Math.min(
visibleBars,
2000
);
}

if(
tf ===
"D"
){
visibleBars =
Math.min(
visibleBars,
1000
);
}

if(
tf ===
"W"
){
visibleBars =
Math.min(
visibleBars,
800
);
}

return visibleBars;

}

/**
 * @returns {{
 *   range: { from: number, to: number },
 *   timeOpts: object,
 *   futureMargin: number,
 *   realTotal: number,
 *   visibleBars: number
 * }|null}
 */
export function computeCoinsChartViewportPlan(
candles,
tf,
chartWidthPx,
realCandleCount,
visibleBarsCap,
plotWidthPx
){

if(
!Array.isArray(
candles
) ||
!candles.length
){
return null;
}

const totalBars =
candles.length;

const realTotal =
Math.max(
1,
Math.min(
realCandleCount ??
totalBars,
totalBars
)
);

const futureMargin =
Math.max(
0,
totalBars -
realTotal
);

const visibleBars =
Math.min(
(
typeof visibleBarsCap ===
"number" &&
visibleBarsCap >
0
)
? visibleBarsCap
: coinsTfVisibleBars(
tf,
realTotal
),
realTotal
);

const lastRealIndex =
realTotal -
1;

const lastIndex =
totalBars -
1;

const from =
Math.max(
0,
lastRealIndex -
visibleBars +
1
);

const width =
Math.max(
chartWidthPx ||
0,
120
);

const plotWidth =
Math.max(
plotWidthPx ||
0,
Math.max(
width -
effectiveChartPriceScaleWidth(),
40
)
);

const logicalSpan =
Math.max(
lastIndex -
from +
1,
visibleBars +
futureMargin,
1
);

const barSpacing =
Math.max(
0.01,
plotWidth /
logicalSpan
);

return {
range:{
from,
to:
lastIndex
},
timeOpts:{
barSpacing,
rightOffset:
4,
fixRightEdge:
false,
fixLeftEdge:
false,
shiftVisibleRangeOnNewBar:
false,
lockVisibleTimeRangeOnResize:
false
},
futureMargin,
realTotal,
visibleBars
};

}

/**
 * Монеты: шкала времени с «хвостом» в будущее (как TradingView).
 * Явный barSpacing + rightOffset — иначе LW жмёт последнюю свечу к правому краю.
 */
export function applyCoinsChartViewport(
mainChart,
linkedChart,
candles,
tf,
chartWidthPx,
realCandleCount,
visibleBarsCap
){

if(
!mainChart ||
!Array.isArray(
candles
) ||
!candles.length
){
return 0;
}

const plotWidth =
mainChart.timeScale().width() ||
linkedChart?.timeScale().width() ||
0;

const plan =
computeCoinsChartViewportPlan(
candles,
tf,
chartWidthPx,
realCandleCount,
visibleBarsCap,
plotWidth
);

if(
!plan
){
return 0;
}

mainChart.timeScale().applyOptions(
plan.timeOpts
);

mainChart.timeScale().setVisibleLogicalRange(
plan.range
);

if(
linkedChart
){

linkedChart.timeScale().applyOptions({
...plan.timeOpts,
visible:
true,
timeVisible:
true,
ticksVisible:
true,
secondsVisible:
false
});

linkedChart.timeScale().setVisibleLogicalRange(
plan.range
);

}

return plan.futureMargin;

}

/** После resize — сохранить диапазон, пересчитать barSpacing (будущее не схлопывается). */
export function refreshCoinsChartBarSpacing(
mainChart,
linkedChart
){

if(
!mainChart
){
return;
}

const range =
mainChart.timeScale().getVisibleLogicalRange();

if(
!range
){
return;
}

/*
 * barSpacing always from the main chart plot width.
 * Linked panes (AO / Volume / MACD / RSI) have different price-scale
 * label widths per symbol — using their timeScale().width() made
 * Terminal viewport jump (compressed / stretched / off-screen) when
 * switching tickers with those panes enabled.
 *
 * After applyOptions({ barSpacing }), LW can drift the logical range —
 * always re-apply the saved range (esp. when position overlays /
 * scale-label sync change plot width without a wrap resize).
 */
if(
!fitMainChartBarSpacingToRange(
mainChart,
range
)
){
return;
}

if(
linkedChart
){

const barSpacing =
mainChart.timeScale().options().barSpacing;

if(
barSpacing !== undefined
){
linkedChart.timeScale().applyOptions({
barSpacing
});
}

linkedChart.timeScale().setVisibleLogicalRange(
range
);

}

}

/**
 * Recompute main barSpacing so `range` fills the current plot width.
 * Always keep rightOffset — otherwise short histories sit flush on the
 * price scale (esp. after AO/RSI price-scale width sync).
 * @returns {boolean} false if plot width is not ready
 */
function fitMainChartBarSpacingToRange(
mainChart,
range
){

if(
!mainChart ||
!range
){
return false;
}

const plotWidth =
mainChart.timeScale().width();

if(
!plotWidth ||
plotWidth <
2
){
return false;
}

const span =
Math.max(
range.to -
range.from +
1,
1
);

const barSpacing =
Math.max(
0.01,
plotWidth /
span
);

mainChart.timeScale().applyOptions({
barSpacing,
rightOffset:
4,
fixRightEdge:
false,
fixLeftEdge:
false,
shiftVisibleRangeOnNewBar:
false
});

mainChart.timeScale().setVisibleLogicalRange(
range
);

return true;

}

function applyScreenerViewport(
chart,
chartWidth,
visibleBars,
totalBars
){

if(!chart || visibleBars < 1){
return;
}

const total =
Math.max(visibleBars, totalBars || visibleBars);

const lastIndex =
total - 1;

const from =
Math.max(0, total - visibleBars);

const rightMargin =
computeChartFutureMarginBars(
visibleBars
);

const width =
Math.max(chartWidth || 0, 120);

const plotWidth =
chart.timeScale().width() || Math.max(width - 52, 40);

const logicalSpan =
visibleBars + rightMargin;

const barSpacing =
Math.max(
0.01,
plotWidth / Math.max(logicalSpan, 1)
);

chart.timeScale().applyOptions({
barSpacing,
rightOffset:rightMargin
});

chart.timeScale().setVisibleLogicalRange({

from,

to:lastIndex + rightMargin

});

}

export function restoreScreenerViewport(
chart,
chartWidth,
visibleBars,
totalBars
){

try{
applyScreenerViewport(
chart,
chartWidth,
visibleBars,
totalBars
);
}catch{
/* chart disposed */
}

}

export function applyScreenerZoom(
chart,
series,
candles,
chartWidth,
chartHeight,
options = {}
){

if(
!chart ||
!series ||
!candles?.length
){
return 0;
}

const shouldContinue =
typeof options.shouldContinue ===
"function"
? options.shouldContinue
: ()=>true;

const width =
Math.max(
chartWidth ||
0,
120
);

const height =
Math.max(
chartHeight ||
0,
80
);

const totalBars =
candles.length;

const visibleBars =
Math.min(
Number(
options.visibleBars
) >
0
? Math.round(
Number(
options.visibleBars
)
)
: SCREENER_VISIBLE_BARS,
totalBars
);

try{

const rightMargin =
computeChartFutureMarginBars(
visibleBars
);
const plotGuess =
Math.max(
chart.timeScale().width() ||
width -
56,
40
);
const initialSpacing =
Math.max(
0.01,
plotGuess /
Math.max(
visibleBars +
rightMargin,
1
)
);

chart.applyOptions({
width,
height
});

/*
  Иначе первый кадр после setData берёт barSpacing 6:
  на виджете вспыхивают несколько крупных свечей, и только
  следующий кадр ставит плотный обзор.
*/
chart.timeScale().applyOptions({
barSpacing:
initialSpacing,
rightOffset:
rightMargin,
fixRightEdge:
false,
shiftVisibleRangeOnNewBar:
false,
lockVisibleTimeRangeOnResize:
false,
minBarSpacing:
0.01
});

series.setData(
candles
);

const fitViewport =
()=>{

if(
!shouldContinue()
){
return;
}

try{
applyScreenerViewport(
chart,
width,
visibleBars,
totalBars
);
}catch{
/* chart disposed */
}

};

fitViewport();

requestAnimationFrame(
()=>{
if(
shouldContinue()
){
fitViewport();
}
}
);

const range =
chart.timeScale().getVisibleLogicalRange();

if(
!range
){
return visibleBars;
}

return Math.max(
0,
Math.round(
range.to -
range.from
)
);

}catch{
return 0;
}

}

export function tfPeriodSec(tf){

return liveBarPeriodSec(tf);

}

export function rsiPlotTimeOffsetSec(tf){

return Math.floor(
tfPeriodSec(tf) / 2
);

}
