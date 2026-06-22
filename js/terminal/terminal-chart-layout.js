/**
 * Coins page — chart dimensions, resize, viewport settle.
 */
import {
appendFutureWhitespaceBars,
computeChartFutureMarginBars,
coinsTfVisibleBars
} from "../chart-import.js?v=42";

let layoutCtx =
null;

export function registerCoinsChartLayoutContext(
ctx
){

layoutCtx =
ctx;

}

function ctx(){

if(
!layoutCtx
){
throw new Error(
"coins chart layout context not registered"
);
}

return layoutCtx;

}

export function buildChartDisplayCandles(){

const {
getCandles,
getTf
} =
ctx();

const candles =
getCandles?.() ||
[];

const currentTF =
getTf?.() ||
"60";

if(
!candles.length
){
return [];
}

return appendFutureWhitespaceBars(
candles,
computeChartFutureMarginBars(
coinsTfVisibleBars(
currentTF,
candles.length
)
),
currentTF
);

}

export function getCoinsPaneHeightPx(){

const candidates =
[
document.getElementById(
"rsi-wrap"
),
document.getElementById(
"volume-wrap"
)
];

for(
const wrap of candidates
){

if(
!wrap ||
wrap.classList.contains(
"indicator-pane-hidden"
)
){
continue;
}

const h =
wrap.getBoundingClientRect().height;

if(
h >=
2
){
return h;
}

}

return Math.max(
document.getElementById(
"rsi-wrap"
)?.getBoundingClientRect().height ||
0,
102
);

}

export function applyChartDimensions(){

const {
chart,
getChartIndicators,
getRsiChart,
rsiPaneActive,
layoutRsiBand
} =
ctx();

const chartWrap =
document.getElementById(
"chart-wrap"
);

if(
!chartWrap ||
!chart
){
return false;
}

const w =
Math.max(
chartWrap.clientWidth,
1
);

const chartH =
Math.max(
chartWrap.clientHeight,
1
);

const paneH =
getCoinsPaneHeightPx();

if(
w <
2 ||
chartH <
2
){
return false;
}

chart.applyOptions({
width:
w,
height:
chartH
});

const chartIndicators =
getChartIndicators?.();

chartIndicators?.resizePanes?.(
w
);

const rsiChart =
getRsiChart?.();

if(
!chartIndicators &&
rsiChart &&
rsiPaneActive?.()
){

const rsiPaneH =
document.getElementById(
"rsi-wrap"
)?.getBoundingClientRect().height ||
paneH;

if(
rsiPaneH >=
2
){

rsiChart.applyOptions({
width:
w,
height:
rsiPaneH
});

layoutRsiBand?.();

}

}

return true;

}

export function settleCoinsChartViewport(){

const {
getCandles,
chart,
chartEl,
getTf,
getChartIndicators,
getRsiChart,
rsiPaneActive,
layoutRsiBand,
applyCoinsChartViewport
} =
ctx();

const candles =
getCandles?.() ||
[];

const currentTF =
getTf?.() ||
"60";

if(
!candles.length ||
!chart
){
return;
}

const chartWrap =
document.getElementById(
"chart-wrap"
);

const chartWidth =
Math.max(
chartWrap?.clientWidth ||
0,
chartEl?.clientWidth ||
0,
1
);

const viewportCtx =
{
mainChart:
chart,
candles:
buildChartDisplayCandles(),
tf:
currentTF,
chartWidth,
realCandleCount:
candles.length,
applyCoinsChartViewport
};

const chartIndicators =
getChartIndicators?.();

chartIndicators?.syncViewports?.(
viewportCtx
);

const rsiChart =
getRsiChart?.();

if(
!chartIndicators &&
rsiChart &&
rsiPaneActive?.()
){

applyCoinsChartViewport(
chart,
rsiChart,
viewportCtx.candles,
currentTF,
chartWidth,
candles.length
);

layoutRsiBand?.();

}

}

export function resizeCharts(){

if(
!applyChartDimensions()
){
return;
}

const {
getCandles,
chart,
getChartIndicators,
getRsiChart,
rsiPaneActive,
layoutRsiBand,
refreshCoinsChartBarSpacing,
getDrawingTools
} =
ctx();

const candles =
getCandles?.() ||
[];
const drawingTools =
getDrawingTools?.();

if(
candles.length
){

const chartIndicators =
getChartIndicators?.();

const linked =
chartIndicators?.getLinkedPaneCharts?.() ||
[];

if(
linked.length
){

linked.forEach(
linkedChart=>{
refreshCoinsChartBarSpacing(
chart,
linkedChart
);
}
);

}else{

refreshCoinsChartBarSpacing(
chart,
rsiPaneActive?.()
? getRsiChart?.()
: null
);

}

if(
rsiPaneActive?.()
){
layoutRsiBand?.();
}

}

drawingTools?.resize?.();
drawingTools?.scheduleRedraw?.();

}

let coinsResizeRaf =
0;

export function scheduleResizeCharts(){

if(
coinsResizeRaf
){
cancelAnimationFrame(
coinsResizeRaf
);
}

coinsResizeRaf =
requestAnimationFrame(
()=>{
coinsResizeRaf =
0;
resizeCharts();
}
);

}

export function applyDefaultZoom(
options = {}
){

const scheduleDrawingRedraw =
options.scheduleDrawingRedraw !==
false;

const {
getCandles,
getDrawingTools,
viewportSettleRaf
} =
ctx();

const candles =
getCandles?.() ||
[];

if(
!candles.length
){
return;
}

const drawingTools =
getDrawingTools?.();

const run =
()=>{
applyChartDimensions();
settleCoinsChartViewport();
drawingTools?.resize?.();

if(
scheduleDrawingRedraw
){
drawingTools?.scheduleRedraw?.();
}

};

run();

if(
viewportSettleRaf.value
){
cancelAnimationFrame(
viewportSettleRaf.value
);
}

viewportSettleRaf.value =
requestAnimationFrame(
()=>{
viewportSettleRaf.value =
0;
run();
}
);

}
