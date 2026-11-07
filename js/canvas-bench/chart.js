/**
 * Два холста. Нижний — история, рисуется один раз (пан, зум, новая свеча,
 * выход цены за шкалу). Верхний — прозрачный: последняя свеча и подпись.
 * Постоянного цикла кадров нет.
 */

import {
candleIndexAt,
candleX,
rightGapPx,
clampPan,
clampWheelZoomStep,
liveUpdateKind,
paintsLiveTick,
panForAnchor,
scaleFromCandles,
visibleIndexSpan,
WHEEL_ZOOM_GESTURE_MS,
zoomOutFloorSpacing
} from "./live-plan.js?v=scale-pan9";

import {
PRICE_SCALE_LOG,
PRICE_SCALE_REGULAR,
expandPriceScale,
nicePriceTicks,
priceToY,
yToPrice,
shiftPriceScale,
zoomPriceScale
} from "./price-scale.js?v=scale-pan8";

const BG =
"#0e1116";
const GRID =
"rgba(255,255,255,0.06)";
const AXIS =
"#d1d5db";
function positivePrice(value, fallback){

const n =
Number(value);

if(Number.isFinite(n) && n > 0){
return n;
}

return fallback;

}

const UP =
"#26a69a";
const DOWN =
"#ef5350";
const FONT =
"11px -apple-system, BlinkMacSystemFont, 'Trebuchet MS', Roboto, Ubuntu, sans-serif";
/* Как у плашки текущей цены (.chart-price-hud): 12px и padding-left 10px. */
const AXIS_LABEL_FONT =
"12px -apple-system, BlinkMacSystemFont, 'Trebuchet MS', Roboto, Ubuntu, sans-serif";
const AXIS_LABEL_PAD =
10;

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

function drawCandleBody(ctx, x, candle, yOf, barSpacing, colors){

if(!Number.isFinite(candle?.close)){
return;
}

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
up ? colors.up : colors.down;
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

constructor(stage, options = {}){

this.stage = stage;
this.history = document.createElement("canvas");
this.live = document.createElement("canvas");
this.history.className = "bench-canvas";
this.live.className = "bench-canvas";
this.stage.append(
this.history,
this.live
);

for(const canvas of [this.history, this.live]){
canvas.style.position = "absolute";
canvas.style.inset = "0";
canvas.style.width = "100%";
canvas.style.height = "100%";
canvas.style.pointerEvents = "none";
}
this.opaque = options.opaque !== false;
this.candlesVisible = true;
this.priceLineVisible = true;
this.lastValueVisible = true;
this.candleColors = {
up: UP,
down: DOWN
};
this.hctx =
this.history.getContext(
"2d",
{ alpha: !this.opaque }
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
this.axisW = options.axisWidth || 64;
this.axisMin = this.axisW;
this.timeH = 0;
this.rightOffsetBars = 12;
this.rightMarginRatio = 0;
this.maxZoomOutBars = 0;
this.priceScaleMode = PRICE_SCALE_LOG;
this.invertScale = false;
this.marginTop = 0;
this.marginBottom = 0;
this.showGrid = options.showGrid === true;
this.formatTime = null;
this.manualScale = null;
this.scale = null;
this.layout = null;
this.dirty = null;
this.liveFull = true;
this.queued = false;
this.drag = null;
this.scaleDrag = null;
this.timeDrag = null;
this.counts = {
live: 0,
skip: 0,
rebuild: 0
};
this.onActivity = null;
this.onView = null;
this.onLive = null;
this.scaleMenu = null;
stage.style.touchAction = "none";
this._bindInput(stage, true);

if(options.scaleMenu !== false){
this._mountScaleMenu();
}
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

return rightGapPx(
this.barSpacing,
this.rightOffsetBars,
this.layout?.plotW || 0,
this.rightMarginRatio
);

}

zoomOutFloor(){

if(
!(this.maxZoomOutBars > 0) ||
!(this.layout?.plotW > 0)
){
return 0.05;
}

return zoomOutFloorSpacing(
this.layout.plotW,
this.maxZoomOutBars,
this.rightOffsetBars,
this.rightMarginRatio
);

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
(candles || []).flatMap(candle=>{

const close =
Number(candle.close);

if(!Number.isFinite(close)){
return [];
}

return [{
time: Number(candle.time),
open: positivePrice(candle.open, close),
high: positivePrice(candle.high, close),
low: positivePrice(candle.low, close),
close,
volume: Number(candle.volume) || 0
}];

});
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

const finite =
(value, fallback)=>{

const n =
Number(value);

return Number.isFinite(n) ? n : fallback;

};

const close =
finite(next.close, prev?.close);

if(!Number.isFinite(close)){
this.note();
return kind;
}

if(
!prev ||
next.time > prev.time
){
this.candles.push({
time: Number(next.time),
open: positivePrice(next.open, close),
high: positivePrice(next.high, close),
low: positivePrice(next.low, close),
close,
volume: Number(next.volume) || 0
});
}else{
prev.open = positivePrice(next.open, prev.open);
prev.high = positivePrice(next.high, prev.high);
prev.low = positivePrice(next.low, prev.low);
prev.close = close;
if(Number.isFinite(Number(next.volume))){
prev.volume = Number(next.volume);
}
}

/*
 * Очередь полного кадра не должна глотать тик: плашка читает
 * уже новую цену, а линия оставалась на старом кадре.
 */
if(paintsLiveTick(kind)){
this.paintLive();
this.counts.live++;
this.onLive?.();
}

if(kind === "store"){
this.note();
return kind;
}

if(kind === "live"){
this.note();
return kind;
}

if(this.queued){
this.rebuildWanted = true;
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

this.rebuildWanted = true;

if(this.queued){
return;
}

this.queued = true;
let ran =
false;

const run =
()=>{

if(ran){
return;
}

ran = true;
this.queued = false;
const wanted =
this.rebuildWanted;
this.rebuildWanted = false;

if(wanted){
this.rebuild();
}

if(this.rebuildWanted){
this.scheduleRebuild();
}

};

/*
 * Пока окно не в фокусе, кадр анимации не вызывается.
 * Таймер всё равно дорисовывает кадр. Первый из двух
 * вызовов делает работу, второй уже ничего не повторяет.
 */
if(typeof requestAnimationFrame === "function"){
requestAnimationFrame(run);
}

setTimeout(run, 32);

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

let span =
null;

for(let pass = 0; pass < 2; pass++){

this.beforeDraw?.();

span =
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

if(
pass === 0 &&
this.fitPriceAxis()
){
this.syncCanvasSize();
continue;
}

break;

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

fitPriceAxis(){

if(!this.scale || !this.layout){
return false;
}

const ctx =
this.hctx;
const fmt =
this.formatAxisPrice || formatPrice;
const ticks =
nicePriceTicks(
this.scale.min,
this.scale.max,
this.layout.plotH,
this.priceScaleMode
);

ctx.font = AXIS_LABEL_FONT;

let labelW =
0;

for(const price of ticks){
labelW = Math.max(
labelW,
ctx.measureText(fmt(price)).width
);
}

const last =
this.candles[this.candles.length - 1];

if(
last &&
Number.isFinite(last.close)
){
ctx.font =
"12px -apple-system, BlinkMacSystemFont, 'Trebuchet MS', Roboto, Ubuntu, sans-serif";
labelW = Math.max(
labelW,
ctx.measureText(fmt(last.close)).width
);
ctx.font = FONT;
}

const need =
Math.min(
140,
Math.max(
this.axisMin || 48,
Math.ceil(labelW) + 18
)
);

if(Math.abs(need - this.axisW) <= 2){
return false;
}

this.axisW = need;
return true;

}

yOf(price){

let y =
priceToY(
price,
this.scale,
this.layout.plotTop,
this.layout.plotH,
this.priceScaleMode
);

if(this.invertScale && this.layout){
y =
this.layout.plotTop +
this.layout.plotH -
(y - this.layout.plotTop);
}

return this.applyScaleMargins(y);

}

applyScaleMargins(y){

const top =
this.marginTop || 0;
const bottom =
this.marginBottom || 0;

if((!top && !bottom) || !this.layout || !Number.isFinite(y)){
return y;
}

const rel =
(y - this.layout.plotTop) / this.layout.plotH;

return (
this.layout.plotTop +
this.layout.plotH * top +
rel * this.layout.plotH * (1 - top - bottom)
);

}

undoScaleMargins(y){

const top =
this.marginTop || 0;
const bottom =
this.marginBottom || 0;

if((!top && !bottom) || !this.layout || !Number.isFinite(y)){
return y;
}

const span =
1 - top - bottom;

if(span <= 0){
return y;
}

const rel =
(
y -
this.layout.plotTop -
this.layout.plotH * top
) / (this.layout.plotH * span);

return this.layout.plotTop + rel * this.layout.plotH;

}

priceAtY(y){

if(!this.scale || !this.layout || !Number.isFinite(y)){
return null;
}

let py =
this.undoScaleMargins(y);

if(this.invertScale){
py =
this.layout.plotTop +
this.layout.plotH -
(py - this.layout.plotTop);
}

return yToPrice(
py,
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

if(this.opaque){
ctx.fillStyle = BG;
ctx.fillRect(0, 0, cssW, cssH);
}else{
ctx.clearRect(0, 0, cssW, cssH);
}
ctx.font = FONT;
ctx.lineWidth = 1;
ctx.textBaseline = "middle";

if(!this.scale){
return;
}

const ticks =
nicePriceTicks(
this.scale.min,
this.scale.max,
this.layout.plotH,
this.priceScaleMode
);
const fmt =
this.formatAxisPrice || formatPrice;
const labels =
[];

for(const price of ticks){

const y =
Math.round(this.yOf(price)) + 0.5;

if(
y < plotTop ||
y > plotBottom
){
continue;
}

labels.push({
y,
text: fmt(price)
});

}

ctx.strokeStyle =
this.showGrid || this.opaque
? GRID
: "rgba(0,0,0,0)";
ctx.font = AXIS_LABEL_FONT;
ctx.fillStyle = AXIS;
ctx.textAlign = this.alignAxisLabelsLeft ? "left" : "right";
ctx.beginPath();

for(const label of labels){
ctx.moveTo(plotLeft, label.y);
ctx.lineTo(plotRight, label.y);
}

ctx.stroke();
ctx.save();
ctx.beginPath();
ctx.rect(
plotRight,
0,
Math.max(0, cssW - plotRight),
cssH
);
ctx.clip();

for(const label of labels){
ctx.fillText(
label.text,
this.alignAxisLabelsLeft
? plotRight + AXIS_LABEL_PAD
: cssW - 6,
label.y
);
}

ctx.restore();

const last =
this.candles.length - 1;

ctx.fillStyle = "rgba(255,255,255,0.12)";
ctx.fillRect(plotRight, 0, 1, cssH);

if(last < 1){
this.afterDraw?.();
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

if(!candle || !this.candlesVisible){
continue;
}

drawCandleBody(
ctx,
this.xOf(i),
candle,
price=>this.yOf(price),
this.barSpacing,
this.candleColors
);

}

ctx.restore();
this.drawTimeAxis();
this.afterDraw?.();

}

drawTimeAxis(){

if(
!(this.timeH > 0) ||
typeof this.formatTime !== "function" ||
this.candles.length < 2
){
return;
}

const ctx =
this.hctx;
const {
cssH,
plotLeft,
plotRight
} =
this.layout;

ctx.save();
ctx.beginPath();
ctx.rect(
plotLeft,
cssH - this.timeH,
Math.max(0, plotRight - plotLeft),
this.timeH
);
ctx.clip();
ctx.font = FONT;
ctx.fillStyle = AXIS;
ctx.textAlign = "center";
ctx.textBaseline = "top";

const y =
cssH - this.timeH + 4;
let lastX =
-Infinity;

for(let i = 0; i < this.candles.length; i++){

const x =
this.xOf(i);

if(x < plotLeft || x > plotRight || x - lastX < 72){
continue;
}

lastX = x;
ctx.fillText(
this.formatTime(this.candles[i].time),
x,
y
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

if(!candle || !this.scale || !Number.isFinite(candle.close)){
return;
}

const x =
this.xOf(this.candles.length - 1);
const y =
this.yOf(candle.close);
const color =
candle.close >= candle.open
? this.candleColors.up
: this.candleColors.down;
const showLine =
this.priceLineVisible &&
Number.isFinite(y) &&
y >= layout.plotTop &&
y <= layout.plotBottom;
const showBody =
this.candlesVisible &&
this.liveCandleVisible();
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
const dpr =
layout.dpr || 1;
const yLine =
(Math.floor(y * dpr) + 0.5) / dpr;

ctx.lineWidth = 1 / dpr;
ctx.strokeStyle = color;
ctx.setLineDash([]);

if(showLine){
ctx.beginPath();
ctx.moveTo(layout.plotLeft, yLine);
ctx.lineTo(layout.plotRight, yLine);
ctx.stroke();
}

ctx.lineWidth = 1;

if(showBody){
drawCandleBody(
ctx,
x,
candle,
price=>this.yOf(price),
this.barSpacing,
this.candleColors
);
}
ctx.restore();

const tagColor =
candle.close >= candle.open
? "#16a34a"
: "#dc2626";
const text =
(this.formatAxisPrice || formatPrice)(candle.close);
ctx.font = AXIS_LABEL_FONT;
ctx.textBaseline = "middle";
ctx.textAlign = "left";
const tagH = 16;
const tagX =
layout.plotRight;
const tagW =
Math.max(0, layout.cssW - layout.plotRight);
const tagY =
Math.round(y - tagH / 2);
const tag = {
x: tagX - 2,
y: tagY - 2,
w: tagW + 4,
h: tagH + 4
};

if(showLine){
rects.push(line);
}

if(showBody){
rects.push(col);
}

if(this.lastValueVisible){
ctx.fillStyle = tagColor;
ctx.fillRect(tagX, tagY, tagW, tagH);
ctx.fillStyle = "#ffffff";
ctx.fillText(
text,
tagX + AXIS_LABEL_PAD,
tagY + tagH / 2
);
rects.push(tag);
}

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

_localY(stage, event){

return (
event.clientY -
stage.getBoundingClientRect().top
);

}

_onTimeAxis(stage, event){

if(
!this.layout ||
!(this.timeH > 0)
){
return false;
}

const y =
this._localY(stage, event);
const x =
this._localX(stage, event);

return (
y >= this.layout.plotBottom &&
x < this.layout.plotRight
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

if(event.button !== 0 || event.defaultPrevented){
return;
}

if(stage.closest(".chart-draw-interaction")){
return;
}

if(this.scaleMenu){
this.scaleMenu.hidden = true;
}

if(
priceAxis &&
this._onPriceAxis(stage, event) &&
this.scale
){
this.drag = null;
this.scaleDrag = {
id: event.pointerId,
y: event.clientY,
scale: {
min: this.scale.min,
max: this.scale.max
}
};
stage.setPointerCapture(event.pointerId);
event.preventDefault();
return;
}

if(
this._onTimeAxis(stage, event) &&
this.candles.length
){
const x =
this._localX(stage, event);
const last =
this.candles.length - 1;
this.scaleDrag = null;
this.drag = null;
this.timeDrag = {
id: event.pointerId,
x: event.clientX,
anchorX: x,
anchorIndex: candleIndexAt(
x,
last,
this.layout.plotRight,
this.rightGap,
this.barSpacing,
this.panPx
),
spacing: this.barSpacing
};
stage.setPointerCapture(event.pointerId);
event.preventDefault();
return;
}

this.scaleDrag = null;
this.timeDrag = null;
this.drag = {
id: event.pointerId,
x: event.clientX,
y: event.clientY,
pan: this.panPx,
scale: this.manualScale
? {
min: this.manualScale.min,
max: this.manualScale.max
}
: null
};
stage.classList.add("dragging");
stage.setPointerCapture(event.pointerId);
event.preventDefault();

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
this.timeDrag &&
event.pointerId === this.timeDrag.id &&
this.layout
){

const factor =
Math.exp(
-(event.clientX - this.timeDrag.x) * 0.005
);
const nextSpacing =
Math.min(
64,
Math.max(
this.zoomOutFloor(),
this.timeDrag.spacing * factor
)
);
const last =
this.candles.length - 1;

this.barSpacing = nextSpacing;
this.panPx =
clampPan(
panForAnchor(
this.timeDrag.anchorIndex,
this.timeDrag.anchorX,
last,
this.layout.plotRight,
this.rightGap,
nextSpacing
),
this.candles.length,
this.layout.plotLeft,
this.layout.plotRight,
this.rightGap,
nextSpacing
);
this.userMovedView = true;
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
let shifted =
null;

if(this.drag.scale){
shifted =
shiftPriceScale(
this.drag.scale,
event.clientY - this.drag.y,
layout.plotH,
this.priceScaleMode
);
}

const samePan =
next === this.panPx;
const sameScale =
!shifted ||
(
shifted.min === this.manualScale?.min &&
shifted.max === this.manualScale?.max
);

if(samePan && sameScale){
return;
}

this.panPx = next;
this.userMovedView = true;

if(shifted){
this.manualScale = shifted;
}

this.scheduleRebuild();

}
);

const endDrag =
event=>{

const scale =
this.scaleDrag &&
event.pointerId === this.scaleDrag.id;
const time =
this.timeDrag &&
event.pointerId === this.timeDrag.id;
const pan =
this.drag &&
event.pointerId === this.drag.id;

if(!scale && !time && !pan){
return;
}

if(scale){
this.scaleDrag = null;
}

if(time){
this.timeDrag = null;
}

if(pan){
this.drag = null;
stage.classList.remove("dragging");
}

try{
stage.releasePointerCapture(event.pointerId);
}catch{
/* ignore */
}

};

const releaseDrags =
()=>{

this.scaleDrag = null;
this.timeDrag = null;

if(this.drag){
this.drag = null;
stage.classList.remove("dragging");
}

};

stage.addEventListener("pointerup", endDrag);
stage.addEventListener("pointercancel", endDrag);
stage.addEventListener("lostpointercapture", endDrag);
window.addEventListener("pointerup", endDrag, true);
window.addEventListener("pointercancel", endDrag, true);
window.addEventListener("mouseup", releaseDrags, true);

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

const wheelPx =
value=>{

let px =
Number(value) || 0;

if(event.deltaMode === 1){
px *= 16;
}else if(event.deltaMode === 2){
px *= 120;
}

return Math.max(
-160,
Math.min(160, px)
);

};
const dy =
wheelPx(event.deltaY);
const dx =
wheelPx(event.deltaX);
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
this.userMovedView = true;
this.scheduleRebuild();
return;

}

if(!dy){
return;
}

const now =
typeof performance !== "undefined"
? performance.now()
: Date.now();
let gesture =
this._wheelZoomGesture;
const dt =
gesture &&
Number.isFinite(gesture.at)
? now - gesture.at
: Infinity;

if(
!gesture ||
now >
gesture.until
){
gesture = {
product: 1,
until: now + WHEEL_ZOOM_GESTURE_MS,
at: now
};
}else{
gesture.until =
now + WHEEL_ZOOM_GESTURE_MS;
}

const stepped =
clampWheelZoomStep(
dy,
gesture.product,
dt
);
gesture.product =
stepped.product;
gesture.at =
now;
this._wheelZoomGesture =
gesture;

const factor =
stepped.factor;
const MIN_SPACING =
this.zoomOutFloor();
const MAX_SPACING =
64;
let nextSpacing =
this.barSpacing * factor;

if(dy > 0){
nextSpacing =
Math.min(
this.barSpacing,
Math.max(MIN_SPACING, nextSpacing)
);
}else{
nextSpacing =
Math.max(
this.barSpacing,
Math.min(MAX_SPACING, nextSpacing)
);
}

if(
!(
Math.abs(
nextSpacing -
this.barSpacing
) >
1e-6
)
){
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
this.wheelZoomAt =
typeof performance !== "undefined"
? performance.now()
: Date.now();
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
this.userMovedView = true;
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
this.onAutoScale?.();
this.scheduleRebuild();
return;
}

this.barSpacing = 8;
this.panPx = 0;
this.manualScale = null;
this.onAutoScale?.();
this.scheduleRebuild();

}
);

if(!priceAxis){
return;
}

stage.addEventListener(
"contextmenu",
event=>{

if(!this.scaleMenu || !this._onPriceAxis(stage, event)){
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
