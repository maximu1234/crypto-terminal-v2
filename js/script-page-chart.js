/**
 * Страница Скрипт — тот же pane, что доп. графики Терминала + паттерн 1-2.
 */
import {
createTerminalScreenerChartPane
} from "./terminal-screener-chart-pane.js?v=13";

import {
mountScreenerPatternOverlay,
destroyScreenerPatternOverlay
} from "./screener-pattern-overlay.js?v=1";

export function createScriptPageChart(
mountEl
){

const pane =
createTerminalScreenerChartPane(
{
mountEl,
showRsi:
true,
historyRequests:
5,
viewportMode:
"coins",
linkedCrosshairVertEl:
document.getElementById(
"linked-crosshair-vert"
)
}
);

let overlayWidget =
null;

function ensureOverlay(){

const chart =
pane.chart;
const series =
pane.series;
const chartEl =
pane.getChartEl?.();

if(
!chart ||
!series ||
!chartEl
){
return;
}

if(
overlayWidget
){
overlayWidget.chart =
chart;
overlayWidget.series =
series;
overlayWidget.chartEl =
chartEl;
overlayWidget.patternOverlayRecompute?.();
return;
}

overlayWidget =
{
chart,
series,
chartEl,
get candles(){
return pane.getCandles();
},
disposed:
false
};

mountScreenerPatternOverlay(
overlayWidget
);

}

return {
async load(
symbol,
tf
){

await pane.load(
symbol,
tf
);
ensureOverlay();
pane.syncChartSize?.();

},
getSymbol:()=>
pane.getSymbol(),
getTf:()=>
pane.getTf(),
setStreamPaused(
paused
){
pane.setStreamPaused(
paused
);
},
destroy(){

destroyScreenerPatternOverlay(
overlayWidget
);
overlayWidget =
null;
pane.destroy();

}
};

}
