/**
 * Скринер / Скрипт: overlay паттерна на виджете.
 * Настройки — снимок из Терминала (`chart_indicators_v1`), как у pattern-12-scanner,
 * иначе сканер находит hit, а canvas рисует «пусто» на дефолтах.
 * Скрипт может парсить 1-2 EARLY T3 — тогда `widget.scanIndicatorId`.
 * Early T3 math грузится только если виджет на EARLY T3 (не на публичном скринере).
 */
import {
computePattern12Scene as computePattern12OriginalScene,
defaultPattern12Settings as defaultPattern12OriginalSettings,
normalizePattern12Settings as normalizePattern12OriginalSettings
} from "./indicators/pattern-12-math.js?v=13";

import {
paintPattern12Scene
} from "./indicators/pattern-12-paint.js?v=8";

const SCRIPT_SCAN_INDICATOR_EARLY_T3 =
"pattern-12-early-t3";
const TERMINAL_INDICATORS_STORAGE_KEY =
"chart_indicators_v1";

/** @type {Promise<object> | null} */
let earlyT3MathPromise =
null;

function normalizeScriptScanIndicatorId(
raw
){

return String(
raw ||
""
) ===
SCRIPT_SCAN_INDICATOR_EARLY_T3
? SCRIPT_SCAN_INDICATOR_EARLY_T3
: "pattern-12";

}

function loadEarlyT3Math(){

if(
!earlyT3MathPromise
){
earlyT3MathPromise =
import(
"./indicators/pattern-12-early-t3-math.js?v=1"
);
}

return earlyT3MathPromise;

}

async function overlayEngine(
widget
){

if(
normalizeScriptScanIndicatorId(
widget?.scanIndicatorId
) ===
SCRIPT_SCAN_INDICATOR_EARLY_T3
){
const m =
await loadEarlyT3Math();

return {
id:
SCRIPT_SCAN_INDICATOR_EARLY_T3,
compute:
m.computePattern12Scene,
normalize:
m.normalizePattern12Settings,
defaultSettings:
m.defaultPattern12Settings
};
}

return {
id:
"pattern-12",
compute:
computePattern12OriginalScene,
normalize:
normalizePattern12OriginalSettings,
defaultSettings:
defaultPattern12OriginalSettings
};

}

function readTerminalOverlaySettings(
engine
){

try{
const raw =
localStorage.getItem(
TERMINAL_INDICATORS_STORAGE_KEY
);

if(
!raw
){
return engine.defaultSettings();
}

const prefs =
JSON.parse(
raw
);
const stored =
prefs &&
typeof prefs ===
"object"
? prefs[
`settings_${engine.id}`
]
: null;

return engine.normalize(
stored &&
typeof stored ===
"object"
? stored
: engine.defaultSettings()
);
}catch{
return engine.defaultSettings();
}

}

function patternSettingsForWidget(
widget,
engine
){

const base =
widget?.patternSettings &&
typeof widget.patternSettings ===
"object"
? engine.normalize(
widget.patternSettings
)
: readTerminalOverlaySettings(
engine
);

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
...base,
patternMode:
side
};
}

return base;

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
const bufW =
Math.round(
w *
dpr
);
const bufH =
Math.round(
h *
dpr
);

if(
canvas.width !==
bufW ||
canvas.height !==
bufH
){
canvas.style.width =
`${w}px`;
canvas.style.height =
`${h}px`;
canvas.width =
bufW;
canvas.height =
bufH;
}

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

void recomputeAsync();

}

async function recomputeAsync(){

if(
widget.disposed ||
!widget.candles?.length
){
scene =
null;
redraw();
return;
}

const engine =
await overlayEngine(
widget
);

if(
widget.disposed
){
return;
}

scene =
engine.compute(
widget.candles,
patternSettingsForWidget(
widget,
engine
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
