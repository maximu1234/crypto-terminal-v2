/**
 * Слой рисунков поверх истории свечей.
 * Тик его не трогает. Перерисовка — пан, зум, новая свеча, правка фигуры.
 */

import {
candleIndexAt,
candleX
} from "./live-plan.js";

import {
yToPrice
} from "./price-scale.js";

import {
drawingScreenPoints,
fibPrices,
fractionalIndexAtTime,
hitDrawing,
timeAtFractionalIndex
} from "./drawings.js";

const STROKE =
"#3b82f6";
const SELECTED =
"#facc15";
const FILL =
"rgba(59,130,246,0.14)";

export class DrawLayer {

constructor(stage, chart, toolbar){

this.stage = stage;
this.chart = chart;
this.canvas = document.createElement("canvas");
this.canvas.className = "bench-canvas";
stage.insertBefore(
this.canvas,
chart.live
);
this.ctx =
this.canvas.getContext("2d", { alpha: true });
this.items = [];
this.tool = "cursor";
this.selected = -1;
this.drag = null;
this.paints = 0;
this.onSelect = null;
this._bindToolbar(toolbar);
this._bindPointer();
this._bindKeys();

}

setItems(items){

this.items = items || [];
this.selected = -1;
this.drag = null;

}

paint(){

const layout = this.chart.layout;
const ctx = this.ctx;

if(!layout){
return;
}

const dpr =
layout.dpr || window.devicePixelRatio || 1;
const bw = Math.floor(layout.cssW * dpr);
const bh = Math.floor(layout.cssH * dpr);

if(
this.canvas.width !== bw ||
this.canvas.height !== bh
){
this.canvas.width = bw;
this.canvas.height = bh;
}

ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
ctx.clearRect(0, 0, layout.cssW, layout.cssH);
ctx.save();
ctx.beginPath();
ctx.rect(
layout.plotLeft,
layout.plotTop,
layout.plotW,
layout.plotH
);
ctx.clip();

const list =
this.drag?.preview
? this.items.concat(this.drag.preview)
: this.items;

list.forEach((drawing, index)=>{
this._drawOne(
ctx,
drawing,
index === this.selected
);
});

ctx.restore();
this.paints++;
this.chart.note?.();

}

_xOfTime(time){

const candles = this.chart.candles;
const layout = this.chart.layout;

return candleX(
fractionalIndexAtTime(candles, time),
candles.length - 1,
layout.plotRight,
this.chart.rightGap,
this.chart.barSpacing,
this.chart.panPx
);

}

_drawOne(ctx, drawing, selected){

const layout = this.chart.layout;
const screen =
drawingScreenPoints(
drawing,
time=>this._xOfTime(time),
price=>this.chart.yOf(price),
layout.plotLeft,
layout.plotRight
);

if(screen.length < 2){
return;
}

ctx.lineWidth = selected ? 2 : 1.5;
ctx.strokeStyle = selected ? SELECTED : STROKE;
ctx.setLineDash(
drawing === this.drag?.preview
? [5, 4]
: []
);

if(drawing.type === "fib" && drawing.points?.length >= 2){

const x0 = this._xOfTime(drawing.points[0].time);
const x1 = this._xOfTime(drawing.points[1].time);
const left = Math.min(x0, x1);
const right = Math.max(x0, x1);

ctx.beginPath();

for(const price of fibPrices(drawing)){

const y = this.chart.yOf(price);

ctx.moveTo(left, y);
ctx.lineTo(right, y);

}

ctx.moveTo(x0, this.chart.yOf(drawing.points[0].price));
ctx.lineTo(x1, this.chart.yOf(drawing.points[1].price));
ctx.stroke();
ctx.setLineDash([]);
this._handles(ctx, drawing, selected);
return;

}

if(drawing.type === "channel" && screen.length >= 2){

const a = screen[0];
const b = screen[1];

ctx.beginPath();
ctx.moveTo(a.x, a.y);
ctx.lineTo(b.x, b.y);

if(screen[2]){

const c = screen[2];

ctx.moveTo(c.x, c.y);
ctx.lineTo(c.x + (b.x - a.x), c.y + (b.y - a.y));

}

ctx.stroke();
ctx.setLineDash([]);
this._handles(ctx, drawing, selected);
return;

}

if(drawing.type === "arrow"){

ctx.beginPath();
ctx.moveTo(screen[0].x, screen[0].y);
ctx.lineTo(screen[1].x, screen[1].y);

const angle = Math.atan2(
screen[1].y - screen[0].y,
screen[1].x - screen[0].x
);
const head = 10;

ctx.moveTo(screen[1].x, screen[1].y);
ctx.lineTo(
screen[1].x - head * Math.cos(angle - 0.45),
screen[1].y - head * Math.sin(angle - 0.45)
);
ctx.moveTo(screen[1].x, screen[1].y);
ctx.lineTo(
screen[1].x - head * Math.cos(angle + 0.45),
screen[1].y - head * Math.sin(angle + 0.45)
);
ctx.stroke();
ctx.setLineDash([]);
this._handles(ctx, drawing, selected);
return;

}

if(drawing.type === "long" && drawing.points?.length >= 2){

const entry = drawing.points[0];
const stop = drawing.points[1];
const target = entry.price + (entry.price - stop.price);
const x0 = this._xOfTime(entry.time);
const x1 = this._xOfTime(stop.time);
const left = Math.min(x0, x1);
const width = Math.max(1, Math.abs(x1 - x0));
const yEntry = this.chart.yOf(entry.price);
const yStop = this.chart.yOf(stop.price);
const yTarget = this.chart.yOf(target);

ctx.fillStyle = "rgba(34,197,94,0.18)";
ctx.fillRect(
left,
Math.min(yEntry, yTarget),
width,
Math.abs(yTarget - yEntry)
);
ctx.fillStyle = "rgba(239,68,68,0.18)";
ctx.fillRect(
left,
Math.min(yEntry, yStop),
width,
Math.abs(yStop - yEntry)
);
ctx.beginPath();
ctx.moveTo(left, yEntry);
ctx.lineTo(left + width, yEntry);
ctx.moveTo(left, yTarget);
ctx.lineTo(left + width, yTarget);
ctx.moveTo(left, yStop);
ctx.lineTo(left + width, yStop);
ctx.stroke();
ctx.setLineDash([]);
this._handles(ctx, drawing, selected);
return;

}

if(drawing.type === "rectangle"){

const left = Math.min(screen[0].x, screen[1].x);
const top = Math.min(screen[0].y, screen[1].y);
const width = Math.abs(screen[1].x - screen[0].x);
const height = Math.abs(screen[1].y - screen[0].y);

ctx.fillStyle = FILL;
ctx.fillRect(left, top, width, height);
ctx.strokeRect(left, top, width, height);

}else{

ctx.beginPath();
ctx.moveTo(screen[0].x, screen[0].y);
ctx.lineTo(screen[1].x, screen[1].y);
ctx.stroke();

}

ctx.setLineDash([]);
this._handles(ctx, drawing, selected);

}

_handles(ctx, drawing, selected){

if(!selected){
return;
}

ctx.fillStyle = SELECTED;

for(const point of drawing.points || []){

const x = this._xOfTime(point.time);
const y = this.chart.yOf(point.price);

ctx.fillRect(x - 3, y - 3, 6, 6);

}

}

_pointFromEvent(event){

const layout = this.chart.layout;
const candles = this.chart.candles;

if(!layout || !candles.length || !this.chart.scale){
return null;
}

const rect =
this.stage.getBoundingClientRect();
const x = event.clientX - rect.left;
const y = event.clientY - rect.top;
const index =
candleIndexAt(
x,
candles.length - 1,
layout.plotRight,
this.chart.rightGap,
this.chart.barSpacing,
this.chart.panPx
);

return {
x,
y,
time: timeAtFractionalIndex(candles, index),
price: yToPrice(
y,
this.chart.scale,
layout.plotTop,
layout.plotH,
this.chart.priceScaleMode
)
};

}

_hitIndex(point){

const layout = this.chart.layout;

for(
let i = this.items.length - 1;
i >= 0;
i--
){

if(
hitDrawing(
this.items[i],
time=>this._xOfTime(time),
price=>this.chart.yOf(price),
point.x,
point.y,
layout.plotLeft,
layout.plotRight,
6
)
){
return i;
}

}

return -1;

}

_bindToolbar(toolbar){

if(!toolbar){
return;
}

toolbar.addEventListener("click", event=>{

const button =
event.target.closest("button[data-tool]");

if(!button){
return;
}

this.tool = button.dataset.tool;
this.drag = null;

for(const node of toolbar.querySelectorAll("button[data-tool]")){
node.classList.toggle(
"active",
node === button
);
}

this.stage.classList.toggle(
"drawing",
this.tool !== "cursor"
);

});

}

_bindPointer(){

this.stage.addEventListener(
"pointerdown",
event=>{

if(event.button !== 0){
return;
}

const point = this._pointFromEvent(event);

if(!point){
return;
}

if(this.tool === "cursor"){

const index = this._hitIndex(point);

if(index < 0){
if(this.selected !== -1){
this.selected = -1;
this.paint();
}
return;
}

this.selected = index;
this.onSelect?.();
this.drag = {
kind: "move",
pointerId: event.pointerId,
start: point,
origin: this.items[index].points.map(item=>({
...item
}))
};
this.stage.setPointerCapture(event.pointerId);
event.stopImmediatePropagation();
event.preventDefault();
this.paint();
return;

}

this.drag = {
kind: "create",
pointerId: event.pointerId,
start: point,
preview: null
};
this.stage.setPointerCapture(event.pointerId);
event.stopImmediatePropagation();
event.preventDefault();

if(
this.tool === "hline" ||
this.tool === "hray"
){
this._commitCreate(point);
}

},
true
);

this.stage.addEventListener(
"pointermove",
event=>{

if(
!this.drag ||
event.pointerId !== this.drag.pointerId
){
return;
}

const point = this._pointFromEvent(event);

if(!point){
return;
}

if(this.drag.kind === "move"){
this._move(point);
return;
}

this.drag.preview = {
type: this.tool,
points: [this.drag.start, point]
};
this.paint();

}
);

this.stage.addEventListener("pointerup", event=>{
this._finishPointer(event);
});
this.stage.addEventListener("pointercancel", event=>{
this._finishPointer(event);
});

}

_move(point){

const drawing = this.items[this.selected];

if(!drawing){
return;
}

const dt = point.time - this.drag.start.time;
const dp = point.price - this.drag.start.price;

drawing.points =
this.drag.origin.map(origin=>{

if(drawing.type === "hline"){
return {
time: origin.time,
price: origin.price + dp
};
}

return {
time: origin.time + dt,
price: origin.price + dp
};

});
this.paint();

}

_commitCreate(end){

const start = this.drag?.start || end;
let drawing = null;

if(this.tool === "hline"){
drawing = {
type: "hline",
points: [{ time: end.time, price: end.price }]
};
}else if(this.tool === "hray"){
drawing = {
type: "hray",
points: [{ time: end.time, price: end.price }]
};
}else if(
Math.hypot(end.x - start.x, end.y - start.y) >= 4
){
const points = [
{ time: start.time, price: start.price },
{ time: end.time, price: end.price }
];

if(this.tool === "channel"){

const shift =
Math.abs(end.price - start.price) * 0.35 ||
Math.abs(end.price) * 0.001;

points.push({
time: (start.time + end.time) / 2,
price: (start.price + end.price) / 2 + shift
});

}

drawing = {
type: this.tool,
points
};
}

this.drag = null;

if(!drawing){
this.paint();
return;
}

this.items.push(drawing);
this.selected = this.items.length - 1;
this.paint();

}

_finishPointer(event){

if(
!this.drag ||
event.pointerId !== this.drag.pointerId
){
return;
}

if(this.drag.kind === "create"){

const point =
this._pointFromEvent(event) ||
this.drag.start;

this._commitCreate(point);
return;

}

this.drag = null;

}

_bindKeys(){

window.addEventListener("keydown", event=>{

const tag =
event.target?.tagName;

if(
tag === "INPUT" ||
tag === "TEXTAREA" ||
tag === "SELECT"
){
return;
}

if(event.key === "Escape"){
this.tool = "cursor";
this.drag = null;
this.stage.classList.remove("drawing");
document
.querySelectorAll("#draw-tools button[data-tool]")
.forEach(button=>{
button.classList.toggle(
"active",
button.dataset.tool === "cursor"
);
});
this.paint();
return;
}

if(
(event.key === "Backspace" || event.key === "Delete") &&
this.selected >= 0
){
this.items.splice(this.selected, 1);
this.selected = -1;
this.paint();
}

});

}

}
