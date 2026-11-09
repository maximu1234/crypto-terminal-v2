import {
effectiveChartPriceScaleWidth
} from "./chart-options.js?v=ccf11c66";

import {
liveBarPeriodSec
} from "./live-bar-roll.js?v=b31f3797";

/** Свечей в видимой области (плотный обзор). */
export const SCREENER_VISIBLE_BARS = 1500;

/** Максимум в серии: 2 запроса × 1000 к Bybit. */
export const SCREENER_MAX_BARS = 2000;

export const SCREENER_LOAD_BARS = SCREENER_MAX_BARS;

/**
 * Проба страницы Скринер: видимое окно как на Терминале,
 * ещё 500 свечей за левым краем (3 запроса × 1000).
 */
export const SCREENER_PAGE_VISIBLE_BARS = 2500;
export const SCREENER_PAGE_MAX_BARS = 3000;
export const SCREENER_PAGE_HISTORY_REQUESTS = 3;

const DASHBOARD_FUTURE_BARS =
25;

function dashboardVisibleBarCount(
tf,
candleCount
){

let visibleBars =
900;

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

const total =
Math.max(
0,
Number(
candleCount
) ||
0
);

return Math.min(
visibleBars,
total ||
visibleBars
);

}

/**
 * До setData: иначе первый кадр берёт barSpacing 6
 * и виджет вспыхивает несколькими крупными свечами.
 */
export function primeDashboardChartScale(
chart,
candleCount,
tf
){

if(
!chart ||
!(
candleCount >
0
)
){
return;
}

const visibleBars =
dashboardVisibleBarCount(
tf,
candleCount
);
const plotWidth =
chart.timeScale().width();

if(
!(
plotWidth >
0
)
){
return;
}

const span =
visibleBars +
DASHBOARD_FUTURE_BARS;

chart.timeScale().applyOptions({
barSpacing:
Math.max(
0.01,
plotWidth /
span
),
minBarSpacing:
0.01
});

}

export function applyDashboardZoom(chart, candles, tf){

if(!candles.length){
return;
}

const visibleBars =
dashboardVisibleBarCount(
tf,
candles.length
);

primeDashboardChartScale(
chart,
candles.length,
tf
);

chart.timeScale().setVisibleLogicalRange({

from: candles.length - visibleBars,

to: candles.length + DASHBOARD_FUTURE_BARS

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

const anchor =
realTotal > 0
? lastRealIndex
: lastIndex;

const logicalSpan =
Math.max(
anchor -
from +
1,
visibleBars,
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
anchor
},
timeOpts:{
barSpacing,
maxZoomOutBars:
Math.max(
anchor - from,
1
),
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
false,
timeVisible:
false,
ticksVisible:
false,
secondsVisible:
false
});

copyVisibleTimeRange(
mainChart,
linkedChart
);

}

return plan.futureMargin;

}

/** Plot width, under which main barSpacing was last fitted. */
const fittedMainPlotWidth = new WeakMap();

/** Запомнить текущую ширину плота, не меняя зум. */
export function rememberMainChartPlotWidth(
chart
){

const plot =
chart?.timeScale?.().width?.() ||
0;

if(
plot >
2
){
fittedMainPlotWidth.set(
chart,
plot
);
}

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

copyVisibleTimeRange(
mainChart,
linkedChart
);

}

}

/**
 * Recompute main barSpacing so `range` fills the current plot width.
 * Always keep rightOffset — otherwise short histories sit flush on the
 * price scale (esp. after AO/RSI price-scale width sync).
 * @returns {boolean} false if plot width is not ready
 */
/** Одинаковое окно времени на панелях, даже если число баров различается. */
export function copyVisibleTimeRange(
sourceChart,
targetChart
){

const source =
sourceChart?.timeScale?.();
const target =
targetChart?.timeScale?.();

if(
!source ||
!target
){
return false;
}

const range =
source.getVisibleRange?.();

if(
range &&
Number.isFinite(range.from) &&
Number.isFinite(range.to) &&
range.to >
range.from &&
typeof target.setVisibleRange ===
"function"
){
target.setVisibleRange(range);
return true;
}

const logical =
source.getVisibleLogicalRange?.();

if(
logical &&
typeof target.setVisibleLogicalRange ===
"function"
){
target.setVisibleLogicalRange(logical);
return true;
}

return false;

}

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

const prevWidth =
fittedMainPlotWidth.get(
mainChart
) ||
0;
const spacing =
mainChart.timeScale().options().barSpacing;

/*
 * Высота панели индикатора меняется, ширина плота — нет.
 * Пересчёт barSpacing из логического окна сбрасывал зум
 * и несколько кадров боролся с pin при включении MACD.
 */
if(
prevWidth >
2 &&
Math.abs(
plotWidth -
prevWidth
) <
1
){
return true;
}

if(
prevWidth >
2 &&
spacing >
0
){
const scaled =
Math.min(
500,
Math.max(
0.01,
spacing * (
plotWidth /
prevWidth
)
)
);

mainChart.timeScale().applyOptions({
barSpacing:
scaled,
preserveLogicalRange:
true
});
fittedMainPlotWidth.set(
mainChart,
plotWidth
);
return true;
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
fittedMainPlotWidth.set(
mainChart,
plotWidth
);

return true;

}

/** Доля правого запаса у createScreenerChart (rightMarginRatio). */
const SCREENER_RIGHT_MARGIN_RATIO =
0.15;

/**
 * Ширина плота для зума виджета: сначала измеренная, иначе
 * ширина ячейки минус фиксированная шкала (как на Терминале).
 */
function screenerPlotWidthPx(
chart,
chartWidth
){

const width =
Math.max(
chartWidth || 0,
120
);
const measured =
chart?.timeScale?.().width?.() ||
0;

if(measured > 2){
return measured;
}

return Math.max(
width -
effectiveChartPriceScaleWidth(),
40
);

}

/**
 * Тот же barSpacing, что ставит applyLogicalRange при setVisibleLogicalRange.
 * Иначе setData → sync rebuild рисует с plot/(visible+margin), а range сразу
 * сжимает до 0.85*plot/visible (~2%) — «доезд» в виджете Скринера.
 */
export function screenerBarSpacingPx(
plotWidth,
visibleBars,
rightMargin,
ratio =
SCREENER_RIGHT_MARGIN_RATIO
){

const width =
Math.max(
Number(plotWidth) || 0,
40
);
const content =
Math.max(
1,
Math.floor(
Number(visibleBars) ||
1
)
);
const offset =
Math.max(
0,
Number(rightMargin) ||
0
);
const share =
Math.min(
0.35,
Math.max(
0,
Number(ratio) ||
0
)
);

let spacing =
width /
(content + offset);

if(
share >
0 &&
offset * spacing <
width * share
){
spacing =
(width * (1 - share)) /
content;
}

return Math.max(
0.01,
spacing
);

}

function applyScreenerViewport(
chart,
chartWidth,
visibleBars,
totalBars,
fixedBarSpacing
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

const plotWidth =
screenerPlotWidthPx(
chart,
chartWidth
);

const contentBars =
Math.max(
1,
lastIndex - from
);

const barSpacing =
Number.isFinite(fixedBarSpacing) &&
fixedBarSpacing >
0
? fixedBarSpacing
: screenerBarSpacingPx(
plotWidth,
contentBars,
rightMargin
);

chart.timeScale().applyOptions({
barSpacing,
rightOffset:rightMargin,
maxZoomOutBars:
contentBars
});

chart.timeScale().setVisibleLogicalRange({

from,

to:lastIndex

});

return barSpacing;

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
const from =
Math.max(
0,
totalBars -
visibleBars
);
const lastIndex =
totalBars -
1;
const contentBars =
Math.max(
1,
lastIndex - from
);

chart.applyOptions({
width,
height
});

/*
  setData → sync rebuild (и fitPriceAxis). Spacing до setData —
  только чтобы не вспыхнул default 6px; финальный — после setData
  по уже сжатому plotW, той же формулой что applyLogicalRange.
*/
const primingPlot =
screenerPlotWidthPx(
chart,
width
);
const primingSpacing =
screenerBarSpacingPx(
primingPlot,
contentBars,
rightMargin
);

chart.timeScale().applyOptions({
barSpacing:
primingSpacing,
rightOffset:
rightMargin,
maxZoomOutBars:
contentBars,
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

const lockedSpacing =
screenerBarSpacingPx(
screenerPlotWidthPx(
chart,
width
),
contentBars,
rightMargin
);

chart.timeScale().applyOptions({
barSpacing:
lockedSpacing,
rightOffset:
rightMargin,
maxZoomOutBars:
contentBars
});

/*
  Повтор на rAF — тот же spacing + range (как на Терминале).
  Не пересчитывать spacing по новому plotW: иначе «доезд».
*/
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
totalBars,
lockedSpacing
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
