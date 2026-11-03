/**
 * Заявки и позиция поверх рисунков, под живой свечой.
 * Тик слой не перерисовывает: линия двигается только если меняется её цена.
 */

import {
hitTradeLevel
} from "./trade-levels.js";

import {
yToPrice
} from "./price-scale.js";

const COLOR = {
long: "#22c55e",
short: "#ef4444",
entry: "#facc15"
};

export class TradeLayer {

constructor(stage, chart){

this.stage = stage;
this.chart = chart;
this.canvas = document.createElement("canvas");
this.canvas.className = "bench-canvas";
stage.insertBefore(this.canvas, chart.live);
this.ctx = this.canvas.getContext("2d", { alpha: true });
this.levels = [];
this.selected = -1;
this.drag = null;
this.paints = 0;
this.onSelect = null;
this._bindPointer();
this._bindKeys();

}

setLevels(levels){

this.levels = levels || [];
this.selected = -1;
this.drag = null;

}

clearSelection(){

if(this.selected < 0){
return;
}

this.selected = -1;
this.paint();

}

paint(){

const layout = this.chart.layout;
const ctx = this.ctx;

if(!layout || !this.chart.scale){
return;
}

const dpr = layout.dpr || window.devicePixelRatio || 1;
const bw = Math.floor(layout.cssW * dpr);
const bh = Math.floor(layout.cssH * dpr);

if(this.canvas.width !== bw || this.canvas.height !== bh){
this.canvas.width = bw;
this.canvas.height = bh;
}

ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
ctx.clearRect(0, 0, layout.cssW, layout.cssH);
ctx.save();
ctx.beginPath();
ctx.rect(layout.plotLeft, layout.plotTop, layout.plotW, layout.plotH);
ctx.clip();
ctx.font = "11px -apple-system, BlinkMacSystemFont, 'Trebuchet MS', Roboto, Ubuntu, sans-serif";
ctx.textBaseline = "middle";
ctx.lineWidth = 1;

for(let i = 0; i < this.levels.length; i++){
this._drawLevel(ctx, this.levels[i], i === this.selected, layout);
}

ctx.restore();
this.paints++;
this.chart.note?.();
this.onPaint?.();

}

_color(level){

return level.kind === "entry"
? COLOR.entry
: COLOR[level.side] || COLOR.long;

}

_drawLevel(ctx, level, selected, layout){

const y = Math.round(this.chart.yOf(level.price)) + 0.5;
const color = this._color(level);
const text = level.label;
const padX = 6;
const textW = ctx.measureText(text).width;
const badgeW = textW + padX * 2;
const badgeH = 16;
const badgeX = layout.plotLeft + 8;
const badgeY = y - badgeH / 2;

ctx.setLineDash(level.dash ? [4, 4] : []);
ctx.strokeStyle = selected ? "#ffffff" : color;
ctx.beginPath();
ctx.moveTo(badgeX + badgeW + 4, y);
ctx.lineTo(layout.plotRight, y);
ctx.stroke();
ctx.setLineDash([]);

ctx.fillStyle = color;
ctx.fillRect(badgeX, badgeY, badgeW, badgeH);
ctx.fillStyle = "#0e1116";
ctx.textAlign = "left";
ctx.fillText(text, badgeX + padX, badgeY + badgeH / 2);

}

_pointY(event){

const layout = this.chart.layout;

if(!layout){
return null;
}

const rect = this.stage.getBoundingClientRect();

return {
x: event.clientX - rect.left,
y: event.clientY - rect.top
};

}

_hitIndex(pointerY){

const layout = this.chart.layout;

if(!layout){
return -1;
}

for(let i = this.levels.length - 1; i >= 0; i--){

const y = this.chart.yOf(this.levels[i].price);

if(
hitTradeLevel(this.levels[i], y, pointerY, 6) &&
pointerY >= layout.plotTop &&
pointerY <= layout.plotBottom
){
return i;
}

}

return -1;

}

_bindPointer(){

this.stage.addEventListener(
"pointerdown",
event=>{

if(event.button !== 0 || this.drag){
return;
}

const point = this._pointY(event);

if(!point || !this.chart.scale){
return;
}

const index = this._hitIndex(point.y);

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
pointerId: event.pointerId,
index
};
this.stage.setPointerCapture(event.pointerId);
event.stopImmediatePropagation();
event.preventDefault();
this.paint();

},
true
);

this.stage.addEventListener("pointermove", event=>{

if(!this.drag || event.pointerId !== this.drag.pointerId){
return;
}

const layout = this.chart.layout;
const point = this._pointY(event);
const level = this.levels[this.drag.index];

if(!layout || !point || !level){
return;
}

level.price = yToPrice(
point.y,
this.chart.scale,
layout.plotTop,
layout.plotH,
this.chart.priceScaleMode
);
this.paint();

});

const end = event=>{

if(!this.drag || event.pointerId !== this.drag.pointerId){
return;
}

this.drag = null;

};

this.stage.addEventListener("pointerup", end);
this.stage.addEventListener("pointercancel", end);

}

_bindKeys(){

window.addEventListener("keydown", event=>{

const tag = event.target?.tagName;

if(tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT"){
return;
}

if(
(event.key === "Backspace" || event.key === "Delete") &&
this.selected >= 0
){
this.levels.splice(this.selected, 1);
this.selected = -1;
this.paint();
}

});

}

}
