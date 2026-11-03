/**
 * Панель RSI: шкала 0–100, полоса 30–70.
 * Линия истории — картинка. Тик дорисовывает только последний отрезок и подпись.
 */

import {
candleX,
visibleIndexSpan
} from "./live-plan.js";

import {
rollRsi,
rsiReplaceLast
} from "./rsi.js";

const BG =
"#0e1116";
const BAND =
"#1e1e31";
const LINE =
"#b2b5be";
const LEVEL =
"rgba(174,174,182,0.55)";
const AXIS =
"#d1d5db";
const FONT =
"11px -apple-system, BlinkMacSystemFont, 'Trebuchet MS', Roboto, Ubuntu, sans-serif";

const LEVELS =
[30, 50, 70];

function formatRsi(value){

return Number(value).toFixed(2);

}

function formatTime(sec, tf){

const date =
new Date(sec * 1000);

if(
tf === "D" ||
tf === "W"
){
return `${date.getDate()}.${date.getMonth() + 1}`;
}

const hh =
String(date.getHours()).padStart(2, "0");
const mm =
String(date.getMinutes()).padStart(2, "0");

return `${hh}:${mm}`;

}

function lastFiniteIndex(points){

for(
let i = points.length - 1;
i >= 0;
i--
){

if(Number.isFinite(points[i]?.value)){
return i;
}

}

return -1;

}

export class RsiBenchPane {

constructor(stage, chart){

this.stage = stage;
this.chart = chart;
this.history = document.createElement("canvas");
this.live = document.createElement("canvas");
this.history.className = "bench-canvas";
this.live.className = "bench-canvas";
this.stage.append(this.history, this.live);
this.hctx =
this.history.getContext("2d", { alpha: false });
this.lctx =
this.live.getContext("2d", { alpha: true });
this.period = 14;
this.state = rollRsi([], this.period);
this.layout = null;
this.dirty = null;
this.liveFull = true;
this.axisW = chart.axisW;
this.timeH = 22;
this.counts = {
live: 0,
rebuild: 0
};
this._ro =
new ResizeObserver(()=>{
this.rebuild();
});
this._ro.observe(stage);

}

syncSize(){

const rect =
this.stage.getBoundingClientRect();
const cssW =
Math.max(1, Math.floor(rect.width));
const cssH =
Math.max(1, Math.floor(rect.height));
const dpr =
window.devicePixelRatio || 1;
const plotRight =
Math.max(1, cssW - this.axisW);
const plotBottom =
Math.max(1, cssH - this.timeH);

this.layout = {
cssW,
cssH,
dpr,
plotLeft: 0,
plotTop: 2,
plotRight,
plotBottom,
plotW: plotRight,
plotH: Math.max(1, plotBottom - 2)
};

const bw = Math.floor(cssW * dpr);
const bh = Math.floor(cssH * dpr);

if(
this.history.width !== bw ||
this.history.height !== bh
){
this.history.width = bw;
this.history.height = bh;
this.live.width = bw;
this.live.height = bh;
this.liveFull = true;
this.dirty = null;
}

this.hctx.setTransform(dpr, 0, 0, dpr, 0, 0);
this.lctx.setTransform(dpr, 0, 0, dpr, 0, 0);

}

yOf(value){

return (
this.layout.plotTop +
(100 - value) / 100 * this.layout.plotH
);

}

xOf(index){

const last =
this.chart.candles.length - 1;
const layout =
this.layout;

return candleX(
index,
last,
layout.plotRight,
this.chart.rightGap,
this.chart.barSpacing,
this.chart.panPx
);

}

rebuild(){

this.syncSize();
this.state =
rollRsi(this.chart.candles, this.period);

if(
!this.layout ||
this.layout.plotH < 2
){
return;
}

this.drawHistory();
this.liveFull = true;
this.paintLive();
this.counts.rebuild++;
this.chart.note();

}

/** Тик той же свечи: только последняя точка RSI. */
paintLast(){

if(!this.state?.ready){
this.rebuild();
return;
}

const before =
this.state.points[this.state.points.length - 1]?.value;

rsiReplaceLast(
this.state,
this.chart.candles
);

const after =
this.state.points[this.state.points.length - 1]?.value;

if(
!Number.isFinite(after) ||
after === before
){
return;
}

this.paintLive();
this.counts.live++;
this.chart.note();

}

drawHistory(){

const ctx = this.hctx;
const layout = this.layout;
const {
cssW,
cssH,
plotLeft,
plotTop,
plotRight,
plotBottom,
plotW,
plotH
} = layout;

ctx.fillStyle = BG;
ctx.fillRect(0, 0, cssW, cssH);

const y70 = this.yOf(70);
const y30 = this.yOf(30);

ctx.fillStyle = BAND;
ctx.fillRect(
plotLeft,
Math.min(y70, y30),
plotW,
Math.abs(y30 - y70)
);

ctx.font = FONT;
ctx.lineWidth = 1;
ctx.textBaseline = "middle";
ctx.textAlign = "left";
ctx.fillStyle = AXIS;
ctx.strokeStyle = LEVEL;
ctx.setLineDash([5, 4]);
ctx.beginPath();

for(const level of [100, ...LEVELS, 0]){

const y =
Math.round(this.yOf(level)) + 0.5;

ctx.fillText(
String(level),
plotRight + 8,
Math.min(plotBottom - 1, Math.max(plotTop + 1, y))
);

if(LEVELS.includes(level)){
ctx.moveTo(plotLeft, y);
ctx.lineTo(plotRight, y);
}

}

ctx.stroke();
ctx.setLineDash([]);
ctx.fillStyle = "rgba(255,255,255,0.12)";
ctx.fillRect(plotRight, 0, 1, cssH);

const points = this.state.points || [];
const end =
lastFiniteIndex(points);

ctx.strokeStyle = LINE;
ctx.lineWidth = 1;
ctx.beginPath();

let started = false;

for(
let i = 0;
i < end;
i++
){

const value = points[i]?.value;

if(!Number.isFinite(value)){
started = false;
continue;
}

const x = this.xOf(i);
const y = this.yOf(value);

if(!started){
ctx.moveTo(x, y);
started = true;
}else{
ctx.lineTo(x, y);
}

}

ctx.stroke();

const span =
visibleIndexSpan(
this.chart.candles.length,
plotLeft,
plotRight,
this.chart.rightGap,
this.chart.barSpacing,
this.chart.panPx
);
const step =
Math.max(
1,
Math.round(88 / this.chart.barSpacing)
);

ctx.fillStyle = AXIS;
ctx.textAlign = "center";
ctx.textBaseline = "top";

for(
let i = span.i0;
i <= span.i1;
i += step
){

const candle = this.chart.candles[i];
const x = this.xOf(i);

if(
!candle ||
x < plotLeft ||
x > plotRight
){
continue;
}

ctx.fillText(
formatTime(candle.time, this.chart.tf),
x,
plotBottom + 4
);

}

}

paintLive(){

const ctx = this.lctx;
const layout = this.layout;

if(!layout){
return;
}

if(this.liveFull){
ctx.clearRect(0, 0, layout.cssW, layout.cssH);
this.dirty = null;
this.liveFull = false;
}else if(this.dirty){

for(const rect of this.dirty){
ctx.clearRect(rect.x, rect.y, rect.w, rect.h);
}

}

const points = this.state.points || [];
const end = lastFiniteIndex(points);
const prev = end - 1;

if(
end < 1 ||
!Number.isFinite(points[prev]?.value)
){
this.dirty = null;
return;
}

const x0 = this.xOf(prev);
const y0 = this.yOf(points[prev].value);
const x1 = this.xOf(end);
const y1 = this.yOf(points[end].value);

ctx.strokeStyle = LINE;
ctx.lineWidth = 1;
ctx.beginPath();
ctx.moveTo(x0, y0);
ctx.lineTo(x1, y1);
ctx.stroke();

const text = formatRsi(points[end].value);

ctx.font = FONT;
ctx.textAlign = "left";
ctx.textBaseline = "middle";
ctx.fillStyle = "#363a45";

const padX = 4;
const tagW =
Math.min(
this.axisW - 6,
ctx.measureText(text).width + padX * 2
);
const tagH = 16;
const tagX = layout.plotRight + 4;
const tagY = Math.round(y1 - tagH / 2);

ctx.fillRect(tagX, tagY, tagW, tagH);
ctx.fillStyle = "#ffffff";
ctx.fillText(text, tagX + padX, tagY + tagH / 2);

const left = Math.min(x0, x1) - 3;
const top = Math.min(y0, y1) - 3;

this.dirty = [
{
x: left,
y: top,
w: Math.abs(x1 - x0) + 6,
h: Math.abs(y1 - y0) + 6
},
{
x: tagX - 2,
y: tagY - 2,
w: layout.cssW - tagX + 4,
h: tagH + 4
}
];

}

}
