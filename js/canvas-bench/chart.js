/**
 * Два холста. Нижний — история, рисуется один раз (пан, зум, новая свеча,
 * выход цены за шкалу). Верхний — прозрачный: последняя свеча и подпись.
 * Постоянного цикла кадров нет.
 */

import {
candleIndexAt,
candleX,
clampPan,
liveUpdateKind,
panForAnchor,
scaleFromCandles,
visibleIndexSpan
} from "./live-plan.js";

import {
PRICE_SCALE_LOG,
PRICE_SCALE_REGULAR,
expandPriceScale,
priceToY,
yToPrice,
zoomPriceScale
} from "./price-scale.js";

const BG =
"#0e1116";
const GRID =
"rgba(255,255,255,0.06)";
const AXIS =
"#d1d5db";
const UP =
"#26a69a";
const DOWN =
"#ef5350";
const FONT =
"11px -apple-system, BlinkMacSystemFont, 'Trebuchet MS', Roboto, Ubuntu, sans-serif";

function priceDigits(price){

const abs =
Math.abs(price);

if(abs >= 1000){
return 1;
}

if(abs >= 100){
return 2;
}

if(abs >= 1){
return 4;
}

if(abs >= 0.01){
return 6;
}

return 8;

}

function formatPrice(price){

if(!Number.isFinite(price)){
return "";
}

const digits =
priceDigits(price);

return price.toLocaleString(
"en-US",
{
minimumFractionDigits: digits,
maximumFractionDigits: digits
}
);

}

function nicePriceTicks(min, max){

const span =
max - min;

if(!(span > 0)){
return [];
}

const raw =
span / 6;
const mag =
10 ** Math.floor(Math.log10(raw));
const err =
raw / mag;
const step =
err >= 7.5
? 10 * mag
: err >= 3.5
? 5 * mag
: err >= 1.5
? 2 * mag
: mag;
const ticks =
[];
const start =
Math.ceil(min / step) * step;

for(
let price = start;
price <= max + step * 0.001 &&
ticks.length < 16;
price += step
){
ticks.push(price);
}

return ticks;

}

function drawCandleBody(ctx, x, candle, yOf, barSpacing){

const yOpen =
yOf(candle.open);
const yClose =
yOf(candle.close);
const yHigh =
yOf(candle.high);
const yLow =
yOf(candle.low);
const up =
candle.close >= candle.open;
const color =
up ? UP : DOWN;
const bodyW =
Math.max(
1,
Math.floor(barSpacing * 0.72)
);
const top =
Math.min(yOpen, yClose);
const height =
Math.max(
1,
Math.abs(yClose - yOpen)
);
const cx =
Math.round(x) + 0.5;

ctx.strokeStyle = color;
ctx.beginPath();
ctx.moveTo(cx, yHigh);
ctx.lineTo(cx, yLow);
ctx.stroke();
ctx.fillStyle = color;
ctx.fillRect(
x - bodyW / 2,
top,
bodyW,
height
);

}

export class CandleBenchChart {

constructor(stage){

this.stage = stage;
this.history = document.createElement("canvas");
this.live = document.createElement("canvas");
this.history.className = "bench-canvas";
this.live.className = "bench-canvas";
this.stage.append(
this.history,
this.live
);
this.hctx =
this.history.getContext(
"2d",
{ alpha: false }
);
this.lctx =
this.live.getContext(
"2d",
{ alpha: true }
);
this.candles = [];
this.tf = "1";
this.barSpacing = 8;
this.panPx = 0;
this.axisW = 64;
this.timeH = 0;
this.rightOffsetBars = 12;
this.priceScaleMode = PRICE_SCALE_LOG;
this.manualScale = null;
this.scale = null;
this.layout = null;
this.dirty = null;
this.liveFull = true;
this.queued = false;
this.drag = null;
this.scaleDrag = null;
this.counts = {
live: 0,
skip: 0,
rebuild: 0
};
this.onActivity = null;
this.onView = null;
this.onLive = null;
this._bindInput(stage, true);
this._mountScaleMenu();
this._ro =
new ResizeObserver(()=>{
this.scheduleRebuild();
});
this._ro.observe(stage);

}

get candleCount(){

return this.candles.length;

}

get rightGap(){

return this.rightOffsetBars * this.barSpacing;

}

lastPriceText(){

const candle =
this.candles[this.candles.length - 1];

return candle
? formatPrice(candle.close)
: "";

}

setSeries(candles, tf){

this.tf = tf || "1";
this.candles =
(candles || []).map(candle=>({
time: Number(candle.time),
open: Number(candle.open),
high: Number(candle.high),
low: Number(candle.low),
close: Number(candle.close),
volume: Number(candle.volume) || 0
}));
this.panPx = 0;
this.manualScale = null;
this.dirty = null;
this.liveFull = true;
this.counts = {
live: 0,
skip: 0,
rebuild: 0
};
this.rebuild();

}

onCandle(next){

const prev =
this.candles[this.candles.length - 1] ||
null;
const kind =
liveUpdateKind(
prev,
next,
this.scale,
this.liveCandleVisible(),
!this.manualScale
);

if(kind === "skip"){
this.counts.skip++;
this.note();
return kind;
}

if(
!prev ||
next.time > prev.time
){
this.candles.push({
time: Number(next.time),
open: Number(next.open),
high: Number(next.high),
low: Number(next.low),
close: Number(next.close),
volume: Number(next.volume) || 0
});
}else{
prev.open = Number(next.open);
prev.high = Number(next.high);
prev.low = Number(next.low);
prev.close = Number(next.close);
prev.volume = Number(next.volume) || 0;
}

if(
kind === "store" ||
this.queued
){
this.note();
return kind;
}

if(kind === "live"){
this.paintLive();
this.counts.live++;
this.onLive?.();
this.note();
return kind;
}

this.rebuild();
return "rebuild";

}

liveCandleVisible(){

const count =
this.candles.length;

if(
!count ||
!this.layout
){
return true;
}

const x =
candleX(
count - 1,
count - 1,
this.layout.plotRight,
this.rightGap,
this.barSpacing,
this.panPx
);

return (
x >= this.layout.plotLeft &&
x <= this.layout.plotRight
);

}

scheduleRebuild(){

if(this.queued){
return;
}

this.queued = true;
requestAnimationFrame(()=>{
this.queued = false;
this.rebuild();
});

}

rebuild(){

this.syncCanvasSize();

if(
!this.layout ||
this.layout.plotW < 2 ||
this.layout.plotH < 2
){
return;
}

const span =
visibleIndexSpan(
this.candles.length,
this.layout.plotLeft,
this.layout.plotRight,
this.rightGap,
this.barSpacing,
this.panPx
);

if(this.manualScale){
this.scale = this.manualScale;
}else{

const data =
scaleFromCandles(
this.candles,
span.i0,
span.i1,
0
);

this.scale =
data
? expandPriceScale(
data.min,
data.max,
this.priceScaleMode
)
: null;

}

this.drawHistory(span);
this.liveFull = true;
this.paintLive();
this.counts.rebuild++;
this.onView?.();
this.note();

}

note(){

this.onActivity?.();

}

syncCanvasSize(){

const rect =
this.stage.getBoundingClientRect();
const cssW =
Math.max(
1,
Math.floor(rect.width)
);
const cssH =
Math.max(
1,
Math.floor(rect.height)
);
const dpr =
window.devicePixelRatio || 1;
const plotRight =
Math.max(
1,
cssW - this.axisW
);
const plotBottom =
Math.max(
1,
cssH - this.timeH
);

this.layout = {
cssW,
cssH,
dpr,
plotLeft: 0,
plotTop: 6,
plotRight,
plotBottom,
plotW: plotRight,
plotH: Math.max(
1,
plotBottom - 6
)
};

const bw =
Math.floor(cssW * dpr);
const bh =
Math.floor(cssH * dpr);

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

this.hctx.setTransform(
dpr, 0, 0, dpr, 0, 0
);
this.lctx.setTransform(
dpr, 0, 0, dpr, 0, 0
);

}

xOf(index){

const last =
this.candles.length - 1;

return candleX(
index,
last,
this.layout.plotRight,
this.rightGap,
this.barSpacing,
this.panPx
);

}

yOf(price){

return priceToY(
price,
this.scale,
this.layout.plotTop,
this.layout.plotH,
this.priceScaleMode
);

}

drawHistory(span){

const ctx =
this.hctx;
const {
cssW,
cssH,
plotLeft,
plotTop,
plotRight,
plotBottom,
plotW,
plotH
} =
this.layout;

ctx.fillStyle = BG;
ctx.fillRect(0, 0, cssW, cssH);
ctx.font = FONT;
ctx.lineWidth = 1;
ctx.textBaseline = "middle";

if(!this.scale){
return;
}

const ticks =
nicePriceTicks(
this.scale.min,
this.scale.max
);

ctx.strokeStyle = GRID;
ctx.fillStyle = AXIS;
ctx.textAlign = "left";
ctx.beginPath();

for(const price of ticks){

const y =
Math.round(this.yOf(price)) + 0.5;

if(
y < plotTop ||
y > plotBottom
){
continue;
}

ctx.moveTo(plotLeft, y);
ctx.lineTo(plotRight, y);
ctx.fillText(
formatPrice(price),
plotRight + 8,
y
);

}

ctx.stroke();

const last =
this.candles.length - 1;

ctx.fillStyle = "rgba(255,255,255,0.12)";
ctx.fillRect(plotRight, 0, 1, cssH);

if(last < 1){
return;
}

ctx.save();
ctx.beginPath();
ctx.rect(
plotLeft,
plotTop,
plotW,
plotH
);
ctx.clip();

const iEnd =
Math.min(span.i1, last - 1);

for(
let i = span.i0;
i <= iEnd;
i++
){

const candle =
this.candles[i];

if(!candle){
continue;
}

drawCandleBody(
ctx,
this.xOf(i),
candle,
price=>this.yOf(price),
this.barSpacing
);

}

ctx.restore();

}

paintLive(){

const ctx =
this.lctx;
const layout =
this.layout;

if(!layout){
return;
}

if(this.liveFull){
ctx.clearRect(
0,
0,
layout.cssW,
layout.cssH
);
this.dirty = null;
this.liveFull = false;
}else if(this.dirty){

for(const rect of this.dirty){
ctx.clearRect(
rect.x,
rect.y,
rect.w,
rect.h
);
}

this.dirty = null;

}

const candle =
this.candles[this.candles.length - 1];

if(
!candle ||
!this.scale ||
!this.liveCandleVisible()
){
return;
}

const x =
this.xOf(this.candles.length - 1);
const y =
this.yOf(candle.close);
const color =
candle.close >= candle.open
? UP
: DOWN;
const rects =
[];
const col = {
x: Math.floor(x - this.barSpacing / 2) - 2,
y: layout.plotTop - 2,
w: Math.ceil(this.barSpacing) + 4,
h: layout.plotH + 4
};
const line = {
x: layout.plotLeft,
y: Math.floor(y) - 2,
w: layout.plotW,
h: 5
};

ctx.save();
ctx.beginPath();
ctx.rect(
layout.plotLeft,
layout.plotTop,
layout.plotW,
layout.plotH
);
ctx.clip();
ctx.lineWidth = 1;
ctx.strokeStyle = color;
ctx.setLineDash([3, 3]);
ctx.beginPath();
ctx.moveTo(layout.plotLeft, Math.round(y) + 0.5);
ctx.lineTo(layout.plotRight, Math.round(y) + 0.5);
ctx.stroke();
ctx.setLineDash([]);
drawCandleBody(
ctx,
x,
candle,
price=>this.yOf(price),
this.barSpacing
);
ctx.restore();

const text =
formatPrice(candle.close);
ctx.font = FONT;
ctx.textBaseline = "middle";
ctx.textAlign = "left";
const padX = 6;
const tagW =
Math.min(
this.axisW - 8,
ctx.measureText(text).width + padX * 2
);
const tagH = 16;
const tagX =
layout.plotRight + 4;
const tagY =
Math.round(y - tagH / 2);
const tag = {
x: tagX - 2,
y: tagY - 2,
w: layout.cssW - tagX + 4,
h: tagH + 4
};

ctx.fillStyle = color;
ctx.fillRect(tagX, tagY, tagW, tagH);
ctx.fillStyle = "#ffffff";
ctx.fillText(
text,
tagX + padX,
tagY + tagH / 2
);

rects.push(col, line, tag);
this.dirty = rects;

}

bindPlot(stage){

this._bindInput(stage, false);

}

_localX(stage, event){

return (
event.clientX -
stage.getBoundingClientRect().left
);

}

_onPriceAxis(stage, event){

return (
!!this.layout &&
this._localX(stage, event) >=
this.layout.plotRight
);

}

_mountScaleMenu(){

const menu =
document.createElement("div");
menu.id = "scale-menu";
menu.hidden = true;

const logBtn =
document.createElement("button");
logBtn.type = "button";
logBtn.textContent = "Logarithmic";

const regBtn =
document.createElement("button");
regBtn.type = "button";
regBtn.textContent = "Regular";

const pick =
mode=>{

this.priceScaleMode = mode;
this.manualScale = null;
menu.hidden = true;
this.scheduleRebuild();

};

logBtn.addEventListener("click", ()=>pick(PRICE_SCALE_LOG));
regBtn.addEventListener("click", ()=>pick(PRICE_SCALE_REGULAR));
menu.append(logBtn, regBtn);
document.body.append(menu);
this.scaleMenu = menu;

}

_bindInput(stage, priceAxis){

stage.addEventListener(
"pointerdown",
event=>{

if(event.button !== 0){
return;
}

this.scaleMenu.hidden = true;

if(
priceAxis &&
this._onPriceAxis(stage, event) &&
this.scale
){
this.scaleDrag = {
id: event.pointerId,
y: event.clientY,
scale: {
min: this.scale.min,
max: this.scale.max
}
};
stage.setPointerCapture(event.pointerId);
return;
}

this.drag = {
id: event.pointerId,
x: event.clientX,
pan: this.panPx
};
stage.classList.add("dragging");
stage.setPointerCapture(event.pointerId);

}
);

stage.addEventListener(
"pointermove",
event=>{

if(
this.scaleDrag &&
event.pointerId === this.scaleDrag.id &&
this.layout
){

const dy =
event.clientY - this.scaleDrag.y;
const factor =
Math.exp(-dy * 0.006);
const rect =
stage.getBoundingClientRect();
const y =
this.scaleDrag.y - rect.top;
const ratio =
(
y - this.layout.plotTop
) / this.layout.plotH;
const price =
yToPrice(
y,
this.scaleDrag.scale,
this.layout.plotTop,
this.layout.plotH,
this.priceScaleMode
);

this.manualScale =
zoomPriceScale(
this.scaleDrag.scale,
price,
ratio,
factor,
this.priceScaleMode
);
this.scheduleRebuild();
return;

}

if(
!this.drag ||
event.pointerId !== this.drag.id
){
return;
}

const layout =
this.layout;

if(!layout){
return;
}

const next =
clampPan(
this.drag.pan + (event.clientX - this.drag.x),
this.candles.length,
layout.plotLeft,
layout.plotRight,
this.rightGap,
this.barSpacing
);

if(next === this.panPx){
return;
}

this.panPx = next;
this.scheduleRebuild();

}
);

const endDrag =
event=>{

if(
this.scaleDrag &&
event.pointerId === this.scaleDrag.id
){
this.scaleDrag = null;
}

if(
!this.drag ||
event.pointerId !== this.drag.id
){
return;
}

this.drag = null;
stage.classList.remove("dragging");

};

stage.addEventListener("pointerup", endDrag);
stage.addEventListener("pointercancel", endDrag);

stage.addEventListener(
"wheel",
event=>{

event.preventDefault();

const layout =
this.layout;

if(
!layout ||
!this.candles.length
){
return;
}

const dy =
event.deltaMode === 1
? event.deltaY * 16
: event.deltaY;
const dx =
event.deltaMode === 1
? event.deltaX * 16
: event.deltaX;
const pan =
event.shiftKey ||
Math.abs(dx) > Math.abs(dy);

if(pan){

const delta =
Math.abs(dx) > Math.abs(dy)
? dx
: dy;

this.panPx =
clampPan(
this.panPx - delta,
this.candles.length,
layout.plotLeft,
layout.plotRight,
this.rightGap,
this.barSpacing
);
this.scheduleRebuild();
return;

}

if(!dy){
return;
}

const factor =
Math.exp(-dy * 0.0012);
const nextSpacing =
Math.min(
32,
Math.max(
2,
this.barSpacing * factor
)
);

if(nextSpacing === this.barSpacing){
return;
}

const rect =
stage.getBoundingClientRect();
const x =
event.clientX - rect.left;
const last =
this.candles.length - 1;
const index =
candleIndexAt(
x,
last,
layout.plotRight,
this.rightGap,
this.barSpacing,
this.panPx
);

this.barSpacing = nextSpacing;
this.panPx =
clampPan(
panForAnchor(
index,
x,
last,
layout.plotRight,
this.rightGap,
nextSpacing
),
this.candles.length,
layout.plotLeft,
layout.plotRight,
this.rightGap,
nextSpacing
);
this.scheduleRebuild();

},
{ passive: false }
);

stage.addEventListener(
"dblclick",
event=>{

if(
priceAxis &&
this._onPriceAxis(stage, event)
){
this.manualScale = null;
this.scheduleRebuild();
return;
}

this.barSpacing = 8;
this.panPx = 0;
this.manualScale = null;
this.scheduleRebuild();

}
);

if(!priceAxis){
return;
}

stage.addEventListener(
"contextmenu",
event=>{

if(!this._onPriceAxis(stage, event)){
return;
}

event.preventDefault();
const menu = this.scaleMenu;
menu.hidden = false;
menu.style.left = `${event.clientX}px`;
menu.style.top = `${event.clientY}px`;

}
);

}

}
