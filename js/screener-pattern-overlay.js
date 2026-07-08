/**
 * Скринер: overlay паттерна 1-2 1-2 на виджете (дефолтные настройки, без UI).
 */
import {
computePattern12Scene,
defaultPattern12Settings
} from "./indicators/pattern-12-math.js?v=4";

import {
paintPattern12Scene
} from "./indicators/pattern-12-paint.js?v=3";

const PATTERN_SETTINGS =
defaultPattern12Settings();

function patternSettingsForWidget(
widget
){

const side =
String(
widget?.side ||
""
);

if(
side ===
"long" ||
side ===
"short"
){
return {
...PATTERN_SETTINGS,
patternMode:
side
};
}

return PATTERN_SETTINGS;

}

export function mountScreenerPatternOverlay(
widget
){

if(
!widget?.chart ||
!widget?.chartEl
){
return null;
}

destroyScreenerPatternOverlay(
widget
);

const chartEl =
widget.chartEl;
const canvas =
document.createElement(
"canvas"
);

canvas.className =
"screener-pattern-overlay-canvas";
canvas.setAttribute(
"aria-hidden",
"true"
);
chartEl.appendChild(
canvas
);

let scene =
null;
let rafId =
0;
const unsubs =
[];

function getPlotMetrics(){

const w =
chartEl.clientWidth;
const h =
chartEl.clientHeight;
let plotW =
w;

try{
const tw =
widget.chart.timeScale().width();

if(
Number.isFinite(
tw
) &&
tw >
0
){
plotW =
tw;
}
}catch{
/* ignore */
}

return {
w,
h,
plotW
};

}

function redraw(){

if(
rafId
){
return;
}

rafId =
requestAnimationFrame(
()=>{

rafId =
0;

if(
widget.disposed
){
return;
}

const ctx =
canvas.getContext(
"2d"
);

if(
!ctx
){
return;
}

const {
w,
h,
plotW
} =
getPlotMetrics();

if(
w <
2 ||
h <
2
){
return;
}

const dpr =
window.devicePixelRatio ||
1;

canvas.style.width =
`${w}px`;
canvas.style.height =
`${h}px`;
canvas.width =
Math.round(
w *
dpr
);
canvas.height =
Math.round(
h *
dpr
);
ctx.setTransform(
dpr,
0,
0,
dpr,
0,
0
);
ctx.clearRect(
0,
0,
w,
h
);

if(
!scene ||
!widget.candles?.length
){
return;
}

paintPattern12Scene(
ctx,
plotW,
h,
{
chart:
widget.chart,
series:
widget.series,
candles:
widget.candles,
scene
}
);

}
);

}

function recompute(){

if(
widget.disposed ||
!widget.candles?.length
){
scene =
null;
redraw();
return;
}

scene =
computePattern12Scene(
widget.candles,
patternSettingsForWidget(
widget
)
);
redraw();

}

function scheduleLayoutRedraws(){

[
0,
50,
200,
500
].forEach(
delay=>{
setTimeout(
()=>{
if(
!widget.disposed
){
redraw();
}
},
delay
);
}
);

}

const onViewport =
()=>{
redraw();
};

try{
widget.chart.timeScale().subscribeVisibleLogicalRangeChange(
onViewport
);
widget.chart.priceScale(
"right"
)?.subscribeVisibleLogicalRangeChange?.(
onViewport
);
unsubs.push(
()=>{
try{
widget.chart.timeScale().unsubscribeVisibleLogicalRangeChange(
onViewport
);
widget.chart.priceScale(
"right"
)?.unsubscribeVisibleLogicalRangeChange?.(
onViewport
);
}catch{
/* ignore */
}
}
);
}catch{
/* ignore */
}

if(
typeof ResizeObserver !==
"undefined"
){

const resizeObs =
new ResizeObserver(
()=>{
redraw();
}
);

resizeObs.observe(
chartEl
);
unsubs.push(
()=>{
resizeObs.disconnect();
}
);

}

widget.patternOverlayRecompute =
recompute;
widget.patternOverlayRedraw =
redraw;
widget.patternOverlayDestroy =
()=>{
if(
rafId
){
cancelAnimationFrame(
rafId
);
rafId =
0;
}

unsubs.forEach(
fn=>{
try{
fn();
}catch{
/* ignore */
}
}
);
unsubs.length =
0;

const el =
widget.chartEl?.querySelector(
".screener-pattern-overlay-canvas"
);
el?.remove();

widget.patternOverlayRedraw =
null;
widget.patternOverlayRecompute =
null;
widget.patternOverlayDestroy =
null;
};

recompute();
scheduleLayoutRedraws();

return widget;

}

export function destroyScreenerPatternOverlay(
widget
){

widget?.patternOverlayDestroy?.();

}
