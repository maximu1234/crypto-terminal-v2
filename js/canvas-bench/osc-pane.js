/**
 * Панели AO, MACD и объёма.
 * История — картинка. Тик дорисовывает только последний столбец.
 */

import {
candleX,
visibleIndexSpan
} from "./live-plan.js";

import {
aoReplaceLast,
rollAo
} from "./ao.js";

import {
macdReplaceLast,
rollMacd
} from "./macd.js";

const BG = "#0e1116";
const AXIS = "#d1d5db";
const FONT =
"11px -apple-system, BlinkMacSystemFont, 'Trebuchet MS', Roboto, Ubuntu, sans-serif";
const MACD_LINE = "#2962FF";
const SIGNAL_LINE = "#FF6D00";
const UP = "#26a69a";
const DOWN = "#ef5350";
const UP_SOFT = "rgba(38, 166, 154, 0.85)";
const DOWN_SOFT = "rgba(239, 68, 68, 0.85)";

function finite(value){

return Number.isFinite(value);

}

function histColor(value, prev){

if(!finite(value)){
return "rgba(120,123,134,0.2)";
}

const before = finite(prev) ? prev : value;

if(value >= 0){
return before < value ? "#26A69A" : "#B2DFDB";
}

return before < value ? "#FFCDD2" : "#FF5252";

}

export class OscBenchPane {

constructor(stage, chart, kind){

this.stage = stage;
this.chart = chart;
this.kind = kind;
this.history = document.createElement("canvas");
this.live = document.createElement("canvas");
this.history.className = "bench-canvas";
this.live.className = "bench-canvas";
stage.append(this.history, this.live);
this.hctx = this.history.getContext("2d", { alpha: false });
this.lctx = this.live.getContext("2d", { alpha: true });
this.state = null;
this.scale = { min: -1, max: 1 };
this.layout = null;
this.dirty = null;
this.liveFull = true;
this.axisW = chart.axisW;
this.counts = { live: 0, rebuild: 0 };
this._ro = new ResizeObserver(()=>{
this.rebuild();
});
this._ro.observe(stage);

}

syncSize(){

const rect = this.stage.getBoundingClientRect();
const cssW = Math.max(1, Math.floor(rect.width));
const cssH = Math.max(1, Math.floor(rect.height));
const dpr = window.devicePixelRatio || 1;
const plotRight = Math.max(1, cssW - this.axisW);
const plotBottom = Math.max(1, cssH - 2);

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

if(this.history.width !== bw || this.history.height !== bh){
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

xOf(index){

const last = this.chart.candles.length - 1;

return candleX(
index,
last,
this.layout.plotRight,
this.chart.rightGap,
this.chart.barSpacing,
this.chart.panPx
);

}

yOf(value){

const span = this.scale.max - this.scale.min || 1;

return (
this.layout.plotTop +
(this.scale.max - value) / span * this.layout.plotH
);

}

rebuild(){

this.syncSize();
const candles = this.chart.candles;

if(this.kind === "macd"){
this.state = rollMacd(candles);
}else if(this.kind === "ao"){
this.state = rollAo(candles);
}

if(!this.layout || this.layout.plotH < 2){
return;
}

this.scale = this._scale(false);
this.drawHistory();
this.liveFull = true;
this.paintLive();
this.counts.rebuild++;
this.chart.note();

}

paintLast(){

const candles = this.chart.candles;

if(!candles.length || !this.layout){
return;
}

if(this.kind === "macd"){

if(!this.state){
this.rebuild();
return;
}

const last = candles.length - 1;
const before = this.state.hist[last];

if(!macdReplaceLast(this.state, candles)){
this.rebuild();
return;
}

if(this.state.hist[last] === before){
return;
}

}else if(this.kind === "ao"){

if(!this.state){
this.rebuild();
return;
}

const last = candles.length - 1;
const before = this.state.values[last];

if(!aoReplaceLast(this.state, candles)){
this.rebuild();
return;
}

if(this.state.values[last] === before){
return;
}

}

if(this._breaksScale()){
this.rebuild();
return;
}

this.paintLive();
this.counts.live++;
this.chart.note();

}

_span(){

return visibleIndexSpan(
this.chart.candles.length,
this.layout.plotLeft,
this.layout.plotRight,
this.chart.rightGap,
this.chart.barSpacing,
this.chart.panPx
);

}

_valueAt(index){

const candles = this.chart.candles;

if(this.kind === "volume"){
return Number(candles[index]?.volume) || 0;
}

if(this.kind === "ao"){
return this.state?.values[index];
}

return this.state?.hist[index];

}

_scale(){

const span = this._span();
let min = this.kind === "volume" ? 0 : Infinity;
let max = this.kind === "volume" ? 0 : -Infinity;

for(let i = span.i0; i <= span.i1; i++){

if(this.kind === "macd"){

for(const series of [
this.state.macd,
this.state.signal,
this.state.hist
]){

const value = series[i];

if(!finite(value)){
continue;
}

min = Math.min(min, value);
max = Math.max(max, value);

}

continue;

}

const value = this._valueAt(i);

if(!finite(value)){
continue;
}

min = Math.min(min, value);
max = Math.max(max, value);

}

if(!finite(min) || !finite(max)){
return { min: -1, max: 1 };
}

if(this.kind === "volume"){
return { min: 0, max: (max || 1) * 1.2 };
}

if(min === max){
const pad = Math.abs(min) * 0.2 || 1;
return { min: min - pad, max: max + pad };
}

const pad = (max - min) * 0.12;

return {
min: Math.min(min - pad, 0),
max: Math.max(max + pad, 0)
};

}

_breaksScale(){

const last = this.chart.candles.length - 1;
const values = this.kind === "macd"
? [
this.state.macd[last],
this.state.signal[last],
this.state.hist[last]
]
: [this._valueAt(last)];

return values.some(value=>
finite(value) &&
(value > this.scale.max || value < this.scale.min)
);

}

drawHistory(){

const ctx = this.hctx;
const layout = this.layout;
const last = this.chart.candles.length - 1;

ctx.fillStyle = BG;
ctx.fillRect(0, 0, layout.cssW, layout.cssH);
ctx.font = FONT;
ctx.textBaseline = "middle";
ctx.textAlign = "left";
ctx.fillStyle = AXIS;
ctx.fillText(
this._format(this.scale.max),
layout.plotRight + 6,
layout.plotTop + 8
);
ctx.fillText(
this._format(this.scale.min),
layout.plotRight + 6,
layout.plotBottom - 8
);
ctx.fillStyle = "rgba(255,255,255,0.12)";
ctx.fillRect(layout.plotRight, 0, 1, layout.cssH);

if(this.kind !== "volume"){

const zero = Math.round(this.yOf(0)) + 0.5;

ctx.strokeStyle = "rgba(174,174,182,0.45)";
ctx.setLineDash([4, 4]);
ctx.beginPath();
ctx.moveTo(layout.plotLeft, zero);
ctx.lineTo(layout.plotRight, zero);
ctx.stroke();
ctx.setLineDash([]);

}

const span = this._span();

for(let i = span.i0; i <= Math.min(span.i1, last - 1); i++){
this._bar(ctx, i, false);
}

if(this.kind === "macd"){
this._line(ctx, this.state.macd, MACD_LINE, last);
this._line(ctx, this.state.signal, SIGNAL_LINE, last);
}

}

paintLive(){

const ctx = this.lctx;
const layout = this.layout;
const last = this.chart.candles.length - 1;

if(!layout || last < 0){
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

const prev = Math.max(0, last - 1);
const x0 = this.xOf(prev);
const x1 = this.xOf(last);

this._bar(ctx, last, true);

if(this.kind === "macd" && last > 0){
this._segment(ctx, this.state.macd, MACD_LINE, prev, last);
this._segment(ctx, this.state.signal, SIGNAL_LINE, prev, last);
}

const text = this._tagText(last);

ctx.font = FONT;
ctx.textAlign = "left";
ctx.textBaseline = "middle";

const tagW = Math.min(
this.axisW - 6,
ctx.measureText(text).width + 8
);
const tagH = 16;
const tagX = layout.plotRight + 4;
const anchor = this._valueAt(last);
const tagY = Math.round(
(finite(anchor) ? this.yOf(anchor) : layout.plotH / 2) -
tagH / 2
);

ctx.fillStyle = "#363a45";
ctx.fillRect(tagX, tagY, tagW, tagH);
ctx.fillStyle = "#ffffff";
ctx.fillText(text, tagX + 4, tagY + tagH / 2);

const half = Math.max(4, this.chart.barSpacing);

this.dirty = [
{
x: Math.min(x0, x1) - half,
y: 0,
w: Math.abs(x1 - x0) + half * 2,
h: layout.cssH
},
{
x: tagX - 2,
y: tagY - 2,
w: layout.cssW - tagX + 4,
h: tagH + 4
}
];

}

_bar(ctx, index, live){

const value = this.kind === "macd"
? this.state?.hist[index]
: this._valueAt(index);

if(!finite(value)){
return;
}

const prev = this.kind === "macd"
? this.state.hist[index - 1]
: this.kind === "ao"
? this.state?.values[index - 1]
: null;
const candle = this.chart.candles[index];
const x = this.xOf(index);
const y = this.yOf(value);
const y0 = this.kind === "volume"
? this.yOf(0)
: this.yOf(0);
const width = Math.max(1, this.chart.barSpacing * 0.62);
const top = Math.min(y, y0);
const height = Math.max(1, Math.abs(y - y0));

ctx.fillStyle = this.kind === "volume"
? (candle.close >= candle.open ? UP : DOWN)
: this.kind === "ao"
? (finite(prev) ? (value >= prev ? UP_SOFT : DOWN_SOFT) : (value >= 0 ? UP_SOFT : DOWN_SOFT))
: histColor(value, prev);
ctx.fillRect(x - width / 2, top, width, height);

if(live){
return;
}

}

_line(ctx, series, color, last){

ctx.strokeStyle = color;
ctx.lineWidth = 1;
ctx.beginPath();

let started = false;
const span = this._span();

for(let i = span.i0; i < Math.min(span.i1, last); i++){

const value = series[i];

if(!finite(value)){
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

}

_segment(ctx, series, color, i0, i1){

if(!finite(series[i0]) || !finite(series[i1])){
return;
}

ctx.strokeStyle = color;
ctx.lineWidth = 1;
ctx.beginPath();
ctx.moveTo(this.xOf(i0), this.yOf(series[i0]));
ctx.lineTo(this.xOf(i1), this.yOf(series[i1]));
ctx.stroke();

}

_tagText(index){

if(this.kind === "volume"){

const value = Number(this.chart.candles[index]?.volume) || 0;

return value >= 1000
? `${(value / 1000).toFixed(1)}k`
: value.toFixed(2);

}

if(this.kind === "ao"){
return finite(this.state?.values[index])
? this.state.values[index].toFixed(2)
: "—";
}

return finite(this.state?.macd[index])
? this.state.macd[index].toFixed(2)
: "—";

}

_format(value){

const abs = Math.abs(value);

if(this.kind === "volume"){
return abs >= 1000 ? `${(value / 1000).toFixed(1)}k` : value.toFixed(0);
}

if(abs >= 100){
return value.toFixed(1);
}

return value.toFixed(2);

}

}
