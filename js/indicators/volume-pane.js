/**
 * Volume — вертикальные объёмы на отдельной панели (высота как у RSI).
 */
import {
createVolumeChart,
syncLinkedChartTimescales,
linkPairedChartTimeScales,
appendFutureWhitespaceBars,
computeChartFutureMarginBars,
coinsTfVisibleBars
} from "../chart-import.js?v=42";

export const VOLUME_PANE_ID =
"volume";

const VOL_UP =
"rgba(38, 166, 154, 0.72)";

const VOL_DOWN =
"rgba(239, 68, 68, 0.72)";

function buildVolumeDisplayPoints(
candles,
tf
){

if(
!candles?.length
){
return [];
}

const visibleBars =
coinsTfVisibleBars(
tf,
candles.length
);

const futureMargin =
computeChartFutureMarginBars(
visibleBars
);

return appendFutureWhitespaceBars(
candles.map(
bar=>({
time:
bar.time,
volume:
Number(
bar.volume
) ||
0,
open:
bar.open,
close:
bar.close
})
),
futureMargin,
tf
);

}

function volumeBarColor(
bar
){

if(
bar.volume ==
null ||
bar.volume <=
0
){
return "rgba(120,123,134,0.35)";
}

return bar.close >=
bar.open
? VOL_UP
: VOL_DOWN;

}

export function createVolumePaneIndicator(
getHost
){

let enabled =
false;
let chart =
null;
let series =
null;
let unbindTimeSync =
null;

function wrapEl(){

return document.getElementById(
"volume-wrap"
);

}

function chartEl(){

return document.getElementById(
"volume-chart"
);

}

function isRsiPaneVisible(){

if(
typeof getHost?.()?.isRsiPaneVisible ===
"function"
){
return getHost().isRsiPaneVisible();
}

const rsiWrap =
document.getElementById(
"rsi-wrap"
);

return !!rsiWrap &&
!rsiWrap.classList.contains(
"indicator-pane-hidden"
);

}

function updateTimeScaleVisibility(){

if(
!chart
){
return;
}

const showTimeScale =
!isRsiPaneVisible();

chart.timeScale().applyOptions(
{
visible:
showTimeScale,
timeVisible:
showTimeScale,
ticksVisible:
showTimeScale
}
);

}

function bindTimeSync(){

unbindTimeSync?.();
unbindTimeSync =
null;

const mainChart =
getHost?.()?.chart;

if(
!mainChart ||
!chart
){
return;
}

unbindTimeSync =
linkPairedChartTimeScales(
mainChart,
chart,
updateTimeScaleVisibility
);

syncLinkedChartTimescales(
mainChart,
chart
);
updateTimeScaleVisibility();

}

function ensureChart(){

if(
chart
){
return true;
}

const el =
chartEl();

if(
!el
){
return false;
}

const created =
createVolumeChart(
el
);

chart =
created.chart;
series =
created.series;
return true;

}

function destroyChart(){

unbindTimeSync?.();
unbindTimeSync =
null;

if(
chart
){
try{
chart.remove();
}catch{
/* ignore */
}
}

chart =
null;
series =
null;

}

function applyVisibility(){

wrapEl()?.classList.toggle(
"indicator-pane-hidden",
!enabled
);

}

function refreshData(){

if(
!enabled ||
!series
){
return;
}

const host =
getHost?.();

const raw =
host?.getCandles?.() ||
[];

const tf =
host?.getTf?.() ||
"D";

const points =
buildVolumeDisplayPoints(
raw,
tf
);

series.setData(
points.map(
bar=>({
time:
bar.time,
value:
bar.volume ||
0,
color:
volumeBarColor(
bar
)
})
)
);

}

function enable(){

if(
enabled
){
return;
}

if(
!ensureChart()
){
return;
}

enabled =
true;
applyVisibility();
refreshData();
bindTimeSync();

const host =
getHost?.();
const w =
host?.getChartWrapWidth?.() ||
0;
const h =
host?.getPaneHeight?.() ||
0;

if(
w >
0 &&
h >
0
){
onResize(
w
);
}

}

function disable(){

if(
!enabled
){
return;
}

enabled =
false;
unbindTimeSync?.();
unbindTimeSync =
null;

if(
series
){
series.setData(
[]
);
}

applyVisibility();

}

function onSymbolChange(){

if(
!enabled
){
return;
}

refreshData();

}

function onCandlesUpdate(){

refreshData();

}

function syncViewport(
ctx
){

if(
!enabled ||
!chart ||
!ctx?.mainChart
){
return;
}

syncLinkedChartTimescales(
ctx.mainChart,
chart
);
updateTimeScaleVisibility();

}

function onLayoutChange(){

updateTimeScaleVisibility();

if(
enabled &&
chart
){
syncLinkedChartTimescales(
getHost?.()?.chart,
chart
);
}

}

function onResize(
width
){

if(
!enabled ||
!chart
){
return;
}

const paneHeight =
wrapEl()?.getBoundingClientRect().height ||
0;

if(
paneHeight <
2
){
return;
}

chart.applyOptions(
{
width,
height:
paneHeight
}
);

}

return {
id:
VOLUME_PANE_ID,
label:
"Volume",
legendLabel:
"Vol",
exemptFromLimit:
false,
defaultEnabled:
false,
enable,
disable,
isEnabled:()=>
enabled,
getChart:()=>
enabled
? chart
: null,
onSymbolChange,
onCandlesUpdate,
syncViewport,
onLayoutChange,
onResize,
destroy:()=>{
disable();
destroyChart();
}
};

}
