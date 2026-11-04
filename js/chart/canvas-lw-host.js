/**
 * Свечной график на своём холсте с тем же интерфейсом, что ждал Lightweight Charts.
 * Рисунки, алерты и линии сделок остаются своими: им отдаются те же координаты.
 * Тик не шлёт смену видимого диапазона, поэтому эти слои на тике не перерисовываются.
 */

import {
CandleBenchChart
} from "../canvas-bench/chart.js?v=scale-pan3";

import {
candleIndexAt,
candleX
} from "../canvas-bench/live-plan.js";

import {
PRICE_SCALE_LOG,
PRICE_SCALE_REGULAR,
yToPrice
} from "../canvas-bench/price-scale.js";

import {
formatChartPrice,
scaleLabelTextColorForBackground
} from "./chart-options.js?v=ccf11c66";

import {
chartTimeToDate
} from "./chart-local-time.js?v=027bb0cc";

import {
fractionalIndexAtTime,
timeAtFractionalIndex
} from "../canvas-bench/drawings.js";

function applyPaneFormat(host, options){

const precision =
options?.priceFormat?.precision;
const engine =
host?.engine;

if(!engine){
return;
}

const formatter =
options?.priceFormat?.formatter;

if(typeof formatter === "function"){
engine.formatAxisPrice = price=>{

try{
return formatter(price);
}catch{
return "";
}

};
return;
}

if(!Number.isFinite(precision)){
return;
}

engine.formatAxisPrice = price=>
Number.isFinite(price) ? price.toFixed(precision) : "";

}

function formatAxisTime(time){

const date =
chartTimeToDate(time);

if(!date){
return "";
}

const hours =
date.getHours();
const minutes =
date.getMinutes();

if(hours === 0 && minutes === 0){
return String(date.getDate());
}

return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}`;

}

export function logicalRangeFromView(
engine
){

const layout = engine.layout;

if(!layout || !engine.candles.length){
return null;
}

const last = engine.candles.length - 1;
const gapBars =
engine.barSpacing > 0
? engine.rightGap / engine.barSpacing
: 0;

return {
from: candleIndexAt(
layout.plotLeft,
last,
layout.plotRight,
engine.rightGap,
engine.barSpacing,
engine.panPx
),
to: candleIndexAt(
layout.plotRight,
last,
layout.plotRight,
engine.rightGap,
engine.barSpacing,
engine.panPx
) - gapBars
};

}

export function applyLogicalRange(
engine,
range
){

const layout = engine.layout;

if(
!layout ||
!range ||
!Number.isFinite(range.from) ||
!Number.isFinite(range.to) ||
range.to <= range.from
){
return false;
}

const width = Math.max(1, layout.plotW);
const content = range.to - range.from;
const offset = Math.max(0, Number(engine.rightOffsetBars) || 0);
const ratio = Math.min(
0.35,
Math.max(0, Number(engine.rightMarginRatio) || 0)
);

/*
 * Диапазон занимает plot за вычетом правого запаса.
 * Запас — это доля ширины (как раньше 15% окна) либо
 * rightOffset в барах, если он шире. Пол 1.5px здесь
 * нельзя: плотный скринер выталкивало за левый край.
 */
let spacing = width / (content + offset);

if(
ratio > 0 &&
offset * spacing < width * ratio
){
spacing = (width * (1 - ratio)) / content;
}

engine.barSpacing = Math.min(500, Math.max(0.01, spacing));
engine.panPx =
(Math.max(0, engine.candles.length - 1) - range.to) *
engine.barSpacing;
return true;

}

/** Старый индексный диапазон нельзя переносить на другую длину серии. */
export function logicalRangeFitsSeries(range, count, rightOffset = 0){

if(
!range ||
!(count > 0) ||
!Number.isFinite(range.from) ||
!Number.isFinite(range.to) ||
range.to <= range.from
){
return false;
}

return (
range.from > -2 &&
range.to <= count + rightOffset + 1
);

}

/**
 * Симметричные scaleMargins — это запас цены (его уже даёт expandPriceScale),
 * а не пустая полоса пикселей. Асимметрия (линия над гистограммой) остаётся
 * сдвигом по вертикали.
 */
export function mainScalePixelMargins(top, bottom){

const t = Number(top);
const b = Number(bottom);

if(!Number.isFinite(t) || !Number.isFinite(b)){
return null;
}

if(Math.abs(t - b) <= 0.001){
return { top: 0, bottom: 0 };
}

return { top: t, bottom: b };

}

function overlayCanvas(stage, before){

const canvas = document.createElement("canvas");
canvas.style.position = "absolute";
canvas.style.inset = "0";
canvas.style.width = "100%";
canvas.style.height = "100%";
canvas.style.pointerEvents = "none";
stage.insertBefore(canvas, before);
return canvas;

}

function sizeCanvas(canvas, layout){

const dpr = layout.dpr || 1;
const bw = Math.floor(layout.cssW * dpr);
const bh = Math.floor(layout.cssH * dpr);

if(canvas.width !== bw || canvas.height !== bh){
canvas.width = bw;
canvas.height = bh;
}

const ctx = canvas.getContext("2d");
ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
return ctx;

}

function makeSeries(host, kind, options){

const series = {
kind,
options: { ...(options || {}) },
rows: [],
priceLines: [],
applyOptions(next){
Object.assign(this.options, next || {});

if(kind === "candle"){
host.applyCandlePaint(this.options);
}

applyPaneFormat(host, this.options);
host.afterSeriesData?.();
},
setData(rows){
this.rows = Array.isArray(rows) ? rows.slice() : [];
this.rev = (this.rev || 0) + 1;

if(kind === "candle"){
host.replaceCandles(this.rows);
return;
}

host.afterSeriesData?.();
},
update(bar){

if(!bar || bar.time == null){
return;
}

if(kind === "candle"){

const last =
this.rows[this.rows.length - 1];

if(last && last.time === bar.time){
Object.assign(last, bar);
}else if(!last || bar.time > last.time){
this.rows.push({ ...bar });
}else{
return;
}

host.engine.onCandle(bar);
return;

}

if(!placeSeriesPoint(this.rows, bar)){
return;
}

this.rev = (this.rev || 0) + 1;
host.afterSeriesData?.();
},
data(){
return this.rows.map(row=>({ ...row }));
},
setMarkers(markers){

this.markers = Array.isArray(markers) ? markers : [];

if(kind === "candle"){
host.markers = this.markers;
}

host.paintMarkers();
},
priceToCoordinate(price){
return host.priceToCoordinate(price);
},
coordinateToPrice(y){
return host.coordinateToPrice(y);
},
createPriceLine(options){

const line = {
...(options || {})
};

this.priceLines.push(line);
host.paintStudies?.();

return {
applyOptions(next){
Object.assign(line, next || {});
host.paintStudies?.();
},
options(){
return { ...line };
},
remove(){
const index = series.priceLines.indexOf(line);

if(index >= 0){
series.priceLines.splice(index, 1);
}

host.paintStudies?.();
}
};

},
priceScale(){
return host.chart.priceScale("right");
}
};

return series;

}

/** Точка индикатора пишется в свой бар, даже если справа уже есть пустое «будущее». */
export function placeSeriesPoint(
rows,
bar
){

const stamp =
bar?.time;

if(
!Array.isArray(rows) ||
stamp == null
){
return false;
}

for(
let i = rows.length - 1;
i >= 0;
i--
){

if(rows[i].time === stamp){
Object.assign(rows[i], bar);
return true;
}

if(rows[i].time < stamp){
rows.splice(i + 1, 0, { ...bar });
return true;
}

}

if(!rows.length){
rows.push({ ...bar });
return true;
}

return false;

}

/**
 * Колонка свечи переносится на панель сдвигом левого края.
 * Долю ширины не умножаем: более узкая шкала RSI растягивала
 * конец линии вправо от последней свечи.
 */
export function mapGuideX(
x,
originDelta
){

if(!Number.isFinite(x)){
return null;
}

const shift =
Number.isFinite(originDelta)
? originDelta
: 0;

return x + shift;

}

export function createCanvasLwChart(
container,
chartOpts = {}
){

const position = getComputedStyle(container).position;

if(position === "static"){
container.style.position = "relative";
}

const engine = new CandleBenchChart(container, {
opaque: false,
scaleMenu: false
});
engine.axisMin = chartOpts.axisWidth || engine.axisW;
engine.axisW = engine.axisMin;
engine.alignAxisLabelsLeft = true;
engine.formatAxisPrice = price=>{

const ref =
engine.candles.at(-1)?.close;

return formatChartPrice(
price,
Number.isFinite(ref) ? ref : price
);

};
engine.priceScaleMode =
chartOpts.priceScaleMode === "regular"
? PRICE_SCALE_REGULAR
: PRICE_SCALE_LOG;
engine.showGrid = chartOpts.showGrid === true;

if(chartOpts.background){
container.style.background = chartOpts.background;
}

if(Number.isFinite(chartOpts.rightOffsetBars)){
engine.rightOffsetBars = chartOpts.rightOffsetBars;
}

if(Number.isFinite(chartOpts.rightMarginRatio)){
engine.rightMarginRatio = chartOpts.rightMarginRatio;
}

if(chartOpts.timeScaleVisible){
engine.timeH = 22;
engine.formatTime = formatAxisTime;
}

const studies = overlayCanvas(container, engine.live);
const markers = overlayCanvas(container, engine.live);
engine.history.style.zIndex = "1";
studies.style.zIndex = "2";
engine.live.style.zIndex = "3";
markers.style.zIndex = "4";
const lineSeries = [];
const overlayScales = new Map();
const pane = chartOpts.pane === true;

if(pane){
engine.candlesVisible = false;
engine.priceLineVisible = false;
engine.lastValueVisible = false;
}
const rangeListeners = new Set();
let lastNotified = null;
let pinnedRange = null;
let pinWaitingForLayout = false;
let reportedScaleMargins = { top: 0.12, bottom: 0.12 };
const priceRangeListeners = new Set();
let lastPriceNotified = null;
let paneAligned = -1;
let paneAutoScale = true;
let timeGuide = null;
let guideShiftX = 0;
let guideShiftAt = -1;

function rangesClose(a, b){

return !!(
a &&
b &&
Math.abs(a.from - b.from) < 0.25 &&
Math.abs(a.to - b.to) < 0.25
);

}
const clickListeners = new Set();
const crosshairListeners = new Set();
let candleSeries = null;

const host = {
engine,
markers: [],
chart: null,
series: null
};

function collectTimes(){

const times =
new Set();

for(const series of lineSeries){

for(const row of series.rows){

if(row?.time != null){
times.add(row.time);
}

}

}

return [...times].sort((a, b)=>a - b);

}

function syncPaneIndex(){

if(!pane){
return;
}

const times =
collectTimes();

if(!times.length){
return;
}

const close =
engine.manualScale
? (engine.manualScale.min + engine.manualScale.max) / 2
: 1;

engine.candles = times.map(time=>({
time: Number(time),
open: close,
high: close,
low: close,
close,
volume: 0
}));
engine.candlesVisible = false;

}

function fitPaneScale(){

if(!pane || !paneAutoScale){
return;
}

for(const series of lineSeries){

if(!onRightScale(series)){
continue;
}

let fixed =
null;

try{
fixed =
series.options.autoscaleInfoProvider?.(()=>null);
}catch{
fixed = null;
}

if(
fixed?.priceRange &&
Number.isFinite(fixed.priceRange.minValue) &&
Number.isFinite(fixed.priceRange.maxValue)
){
engine.manualScale = {
min: fixed.priceRange.minValue,
max: fixed.priceRange.maxValue
};
engine.priceScaleMode = PRICE_SCALE_REGULAR;
return;
}

}

let min =
Infinity;
let max =
-Infinity;
let includeZero =
false;

for(const series of lineSeries){

if(series.options.visible === false || !onRightScale(series)){
continue;
}

if(series.options.base === 0 || series.options.autoscaleInfoProvider){
includeZero = true;
}

for(const row of series.rows){

const value =
seriesValue(row);

if(value == null){
continue;
}

min = Math.min(min, value);
max = Math.max(max, value);

}

}

if(min === Infinity){
return;
}

if(includeZero){
min = Math.min(0, min);
max = Math.max(0, max);
}

if(min === max){
min -= 1;
max += 1;
}

const pad =
(max - min) * 0.08 || 1;

engine.manualScale = {
min: min - pad,
max: max + pad
};
engine.priceScaleMode = PRICE_SCALE_REGULAR;

}

host.afterSeriesData = function afterSeriesData(){

if(!pane){
host.paintStudies?.();
return;
}

paneAligned = -1;
syncPaneIndex();
fitPaneScale();
engine.scheduleRebuild();

};

function notifyRange(){

const range = logicalRangeFromView(engine);

if(!range || rangesClose(range, lastNotified)){
return;
}

lastNotified = {
from: range.from,
to: range.to
};

for(const listener of rangeListeners){
listener(range);
}

}

function onRightScale(series){

const id =
series?.options?.priceScaleId;

return !id || id === "right";

}

function seriesValue(row){

const value =
row?.value ?? row?.close;

return Number.isFinite(value) ? value : null;

}

function guideOriginDelta(){

const sourceEl =
timeGuide?.hostElement;

if(
!sourceEl ||
typeof sourceEl.getBoundingClientRect !== "function" ||
typeof container.getBoundingClientRect !== "function"
){
return 0;
}

const now =
typeof performance !== "undefined"
? performance.now()
: Date.now();

if(
guideShiftAt >= 0 &&
now - guideShiftAt < 32
){
return guideShiftX;
}

guideShiftAt = now;
guideShiftX =
sourceEl.getBoundingClientRect().left -
container.getBoundingClientRect().left;

return guideShiftX;

}

function guideX(time){

const scale =
timeGuide?.timeScale?.();

if(!scale || time == null){
return null;
}

return mapGuideX(
scale.timeToCoordinate?.(time),
guideOriginDelta()
);

}

function guideTime(x){

const scale =
timeGuide?.timeScale?.();

if(!scale || !Number.isFinite(x)){
return null;
}

const time =
scale.coordinateToTime?.(
x - guideOriginDelta()
);

return time == null ? null : time;

}

function seriesX(layout, time){

const guided =
guideX(time);

if(guided != null){
return guided;
}

const stamp =
Number(time);

if(!engine.candles.length || !Number.isFinite(stamp)){
return null;
}

const index =
fractionalIndexAtTime(engine.candles, stamp);

if(!Number.isFinite(index)){
return null;
}

return candleX(
index,
engine.candles.length - 1,
layout.plotRight,
engine.rightGap,
engine.barSpacing,
engine.panPx
);

}

function clampSeriesCoord(value, min, max){

if(!Number.isFinite(value)){
return null;
}

const pad =
Math.max(1, max - min) * 2;

return Math.min(
max + pad,
Math.max(min - pad, value)
);

}

function overlaySlot(series){

const id =
series.options.priceScaleId;

if(!id || id === "right"){
return null;
}

if(!overlayScales.has(id)){
overlayScales.set(id, {
top: 0,
bottom: 0,
invert: false
});
}

return overlayScales.get(id);

}

function overlaySpan(series){

const rev =
series.rev ||
0;

if(
series._spanRev ===
rev &&
series._span
){
return series._span;
}

let min =
0;
let max =
0;
const rows =
series.rows;

for(let i = 0; i < rows.length; i++){

const v =
seriesValue(rows[i]);

if(v == null){
continue;
}

if(v < min){
min = v;
}

if(v > max){
max = v;
}

}

if(max === min){
max = min + 1;
}

const span =
{
min,
max
};

series._spanRev = rev;
series._span = span;

return span;

}

function yFor(layout, series, value){

const slot =
overlaySlot(series);

if(!slot){
return engine.yOf(value);
}

const span =
overlaySpan(series);
const min =
span.min;
const max =
span.max;

const top =
layout.plotTop + layout.plotH * (slot.top || 0);
const height =
Math.max(
1,
layout.plotH * (1 - (slot.top || 0) - (slot.bottom || 0))
);
let t =
(value - min) / (max - min);

if(slot.invert){
t = 1 - t;
}

return top + (1 - t) * height;

}

function paintStudies(){

const layout = engine.layout;

if(!layout || !engine.scale){
return;
}

paintStudyLayer(
sizeCanvas(studies, layout),
true
);

}

function paintStudyLayer(ctx, clear){

const layout = engine.layout;

if(!layout || !engine.scale || !ctx){
return;
}

if(clear){
ctx.clearRect(0, 0, layout.cssW, layout.cssH);
}

ctx.save();
ctx.beginPath();
ctx.rect(layout.plotLeft, layout.plotTop, layout.plotW, layout.plotH);
ctx.clip();
ctx.lineWidth = 1;

const tags =
[];

for(const series of lineSeries){

if(series.options.visible === false){
continue;
}

if(series.kind === "histogram"){
paintHistogram(ctx, layout, series);
}else if(series.kind === "baseline"){
paintBaseline(ctx, layout, series);
}else{
paintLine(ctx, layout, series);
}

for(const priceLine of series.priceLines || []){

const y =
yFor(layout, series, priceLine.price);

if(!Number.isFinite(y)){
continue;
}

ctx.strokeStyle = priceLine.color || "#374151";
ctx.setLineDash(priceLine.lineStyle === 2 ? [4, 4] : []);
ctx.beginPath();
ctx.moveTo(layout.plotLeft, y);
ctx.lineTo(layout.plotRight, y);
ctx.stroke();
ctx.setLineDash([]);

}

if(series.options.lastValueVisible){
const last =
[...series.rows].reverse().map(seriesValue).find(v => v != null);

if(last != null){
tags.push({
y: yFor(layout, series, last),
color: series.options.topLineColor || series.options.color || "#b2b5be",
text: engine.formatAxisPrice
? engine.formatAxisPrice(last)
: formatChartPrice(last, last)
});
}

}

}

ctx.restore();

for(const tag of tags){

if(!Number.isFinite(tag.y)){
continue;
}

ctx.font = "12px -apple-system, BlinkMacSystemFont, 'Trebuchet MS', Roboto, Ubuntu, sans-serif";
ctx.textBaseline = "middle";
ctx.textAlign = "left";
const w =
Math.max(0, layout.cssW - layout.plotRight);
const h =
16;
const y =
tag.y - h / 2;

ctx.fillStyle = tag.color;
ctx.fillRect(layout.plotRight, y, w, h);
ctx.fillStyle = scaleLabelTextColorForBackground(tag.color);
ctx.fillText(String(tag.text), layout.plotRight + 10, tag.y);

}

}

function visibleRowBounds(rows){

if(!rows.length || !engine.layout || !engine.candles.length){
return [0, rows.length];
}

const layout =
engine.layout;
const last =
engine.candles.length - 1;
const iLeft =
candleIndexAt(
layout.plotLeft,
last,
layout.plotRight,
engine.rightGap,
engine.barSpacing,
engine.panPx
);
const iRight =
candleIndexAt(
layout.plotRight,
last,
layout.plotRight,
engine.rightGap,
engine.barSpacing,
engine.panPx
);
const lo =
Math.max(0, Math.floor(Math.min(iLeft, iRight)) - 1);
const hi =
Math.min(last, Math.ceil(Math.max(iLeft, iRight)) + 1);
const t0 =
Number(engine.candles[lo]?.time);
const t1 =
Number(engine.candles[hi]?.time);

if(!Number.isFinite(t0) || !Number.isFinite(t1)){
return [0, rows.length];
}

const from =
Math.min(t0, t1);
const to =
Math.max(t0, t1);
let start =
0;
let endSearch =
rows.length;

while(start < endSearch){

const mid =
(start + endSearch) >> 1;

if(Number(rows[mid].time) < from){
start = mid + 1;
}else{
endSearch = mid;
}

}

let end =
start;

while(end < rows.length && Number(rows[end].time) <= to){
end++;
}

return [
Math.max(0, start - 1),
Math.min(rows.length, end + 1)
];

}

function paintHistogram(ctx, layout, series){

const base =
Number.isFinite(series.options.base) ? series.options.base : 0;
const width =
Math.max(1, Math.min(engine.barSpacing * 0.72, 18));
const y0 =
yFor(layout, series, base);
const bounds =
visibleRowBounds(series.rows);

if(!Number.isFinite(y0)){
return;
}

for(let i = bounds[0]; i < bounds[1]; i++){

const row =
series.rows[i];

const value =
seriesValue(row);

if(value == null){
continue;
}

const x =
seriesX(layout, row.time);

if(x == null || x < layout.plotLeft - width || x > layout.plotRight + width){
continue;
}

const y =
yFor(layout, series, value);

ctx.fillStyle = row.color || series.options.color || "#26a69a";
ctx.fillRect(
x - width / 2,
Math.min(y, y0),
width,
Math.max(1, Math.abs(y - y0))
);

}

}

function paintBaseline(ctx, layout, series){

const base =
series.options.baseValue?.price ?? 0;
let prev =
null;

ctx.lineWidth = series.options.lineWidth || 1;
ctx.lineJoin = "round";
ctx.lineCap = "round";
ctx.setLineDash([]);
ctx.beginPath();

for(const row of series.rows){

const value =
seriesValue(row);
const x =
clampSeriesCoord(
seriesX(layout, row.time),
layout.plotLeft,
layout.plotRight
);
const y =
clampSeriesCoord(
value == null ? null : yFor(layout, series, value),
layout.plotTop,
layout.plotTop + layout.plotH
);

if(value == null || x == null || y == null){
if(prev){
ctx.stroke();
}
prev = null;
continue;
}

const color =
value >= base
? (series.options.topLineColor || series.options.color || "#b2b5be")
: (series.options.bottomLineColor || series.options.color || "#b2b5be");

if(!prev || prev.color !== color){
if(prev){
ctx.stroke();
}
ctx.beginPath();
ctx.strokeStyle = color;
if(prev){
ctx.moveTo(prev.x, prev.y);
ctx.lineTo(x, y);
}else{
ctx.moveTo(x, y);
}
}else{
ctx.lineTo(x, y);
}

prev = { x, y, color };

}

if(prev){
ctx.stroke();
}

}

function paintLine(ctx, layout, series){

ctx.strokeStyle = series.options.color || "#5b9cf6";
ctx.lineWidth = series.options.lineWidth || 1;
ctx.lineJoin = "round";
ctx.lineCap = "round";
ctx.setLineDash(series.options.lineStyle === 2 ? [4, 4] : []);
ctx.beginPath();

let started =
false;

for(const row of series.rows){

const value =
seriesValue(row);

if(value == null){
if(started){
ctx.stroke();
ctx.beginPath();
}
started = false;
continue;
}

const x =
clampSeriesCoord(
seriesX(layout, row.time),
layout.plotLeft,
layout.plotRight
);
const y =
clampSeriesCoord(
yFor(layout, series, value),
layout.plotTop,
layout.plotTop + layout.plotH
);

if(x == null || y == null){
if(started){
ctx.stroke();
ctx.beginPath();
}
started = false;
continue;
}

if(!started){
ctx.moveTo(x, y);
started = true;
}else{
ctx.lineTo(x, y);
}

}

ctx.stroke();
ctx.setLineDash([]);

}

function paintStudyLive(){

paintStudies();

}

function paintMarkers(){

const layout = engine.layout;

if(!layout){
return;
}

const ctx = sizeCanvas(markers, layout);
ctx.clearRect(0, 0, layout.cssW, layout.cssH);

for(const marker of host.markers){

const index = fractionalIndexAtTime(engine.candles, marker.time);
const candle = engine.candles[Math.round(index)];

if(!candle){
continue;
}

const x = candleX(
index,
engine.candles.length - 1,
layout.plotRight,
engine.rightGap,
engine.barSpacing,
engine.panPx
);
const above = marker.position !== "belowBar";
const y = engine.yOf(above ? candle.high : candle.low) + (above ? -8 : 8);

ctx.fillStyle = marker.color || "#22c55e";
ctx.beginPath();
ctx.moveTo(x, y);
ctx.lineTo(x - 4, y + (above ? -7 : 7));
ctx.lineTo(x + 4, y + (above ? -7 : 7));
ctx.closePath();
ctx.fill();

}

for(const series of lineSeries){

for(const marker of series.markers || []){

const value =
seriesValue(marker) ?? seriesValue(
series.rows.find(row => row.time === marker.time) || null
);
const x =
seriesX(layout, marker.time);
const y =
value == null ? null : yFor(layout, series, value);

if(x == null || y == null){
continue;
}

const above = marker.position !== "belowBar";
const tip = y + (above ? -8 : 8);

ctx.fillStyle = marker.color || "#22c55e";
ctx.beginPath();
ctx.moveTo(x, tip);
ctx.lineTo(x - 4, tip + (above ? -7 : 7));
ctx.lineTo(x + 4, tip + (above ? -7 : 7));
ctx.closePath();
ctx.fill();

}

}

}

host.applyCandlePaint = function applyCandlePaint(options){

if(options.upColor){
engine.candleColors.up = options.upColor;
}

if(options.downColor){
engine.candleColors.down = options.downColor;
}

if("visible" in (options || {})){
engine.candlesVisible = options.visible !== false;
}

if("priceLineVisible" in (options || {})){
engine.priceLineVisible = !!options.priceLineVisible;
}

if("lastValueVisible" in (options || {})){
engine.lastValueVisible = !!options.lastValueVisible;
}

engine.scheduleRebuild();

};

host.replaceCandles = function replaceCandles(rows){

const prevCount = engine.candles.length;
const range = logicalRangeFromView(engine);
const onView = engine.onView;
engine.onView = null;
engine.setSeries(rows, engine.tf || "1");
engine.onView = onView;

const nextCount = engine.candles.length;
const shift = Math.abs(nextCount - prevCount);
const sameSeries =
prevCount > 0 &&
shift <= Math.max(3, prevCount * 0.05);
const keep =
sameSeries &&
logicalRangeFitsSeries(
range,
nextCount,
engine.rightOffsetBars
);

if(keep && engine.layout){
applyLogicalRange(engine, range);
pinnedRange = {
from: range.from,
to: range.to
};
pinWaitingForLayout = false;
}else if(!sameSeries){
pinnedRange = null;
pinWaitingForLayout = false;
}

engine.scheduleRebuild();

};

host.paintStudies = paintStudies;
host.paintStudyLive = paintStudyLive;
host.paintMarkers = paintMarkers;

const rebuildChart =
engine.rebuild.bind(engine);

engine.rebuild = function rebuildWithStudies(){
rebuildChart();
paintStudies();
paintMarkers();
};

if(pane){

function paneValueX(row){

const value =
seriesValue(row);

if(value == null || row?.time == null || !engine.layout){
return null;
}

const index =
fractionalIndexAtTime(
engine.candles,
Number(row.time)
);

return candleX(
index,
engine.candles.length - 1,
engine.layout.plotRight,
engine.rightGap,
engine.barSpacing,
engine.panPx
);

}

function paneHasVisibleValue(){

const layout =
engine.layout;

for(const series of lineSeries){

if(!onRightScale(series) || series.options.visible === false){
continue;
}

for(const row of series.rows){

const x =
paneValueX(row);

if(
x != null &&
x >= layout.plotLeft &&
x <= layout.plotRight
){
return true;
}

}

}

return false;

}

function revealLastPaneValue(){

let lastIndex =
-1;

for(const series of lineSeries){

if(!onRightScale(series) || series.options.visible === false){
continue;
}

for(const row of series.rows){

if(seriesValue(row) == null || row?.time == null){
continue;
}

const index =
fractionalIndexAtTime(
engine.candles,
Number(row.time)
);

if(index > lastIndex){
lastIndex = index;
}

}

}

if(lastIndex < 0 || !engine.layout){
return;
}

const plotW =
Math.max(1, engine.layout.plotW);
const desiredGap =
Math.min(
engine.rightGap,
plotW * 0.22
);

engine.panPx =
(
engine.candles.length -
1 -
lastIndex
) * engine.barSpacing -
engine.rightGap +
desiredGap;

}

engine.beforeDraw = function alignPaneRange(){

if(!engine.layout || !engine.candles.length){
return;
}

const mark =
engine.candles.length + engine.layout.plotW / 1000;

if(engine.userMovedView){
engine.userMovedView = false;
const seen = logicalRangeFromView(engine);
if(seen){
pinnedRange = {
from: seen.from,
to: seen.to
};
}
paneAligned = mark;
return;
}

if(paneAligned === mark){
return;
}

if(pinnedRange){

const current =
logicalRangeFromView(engine);

if(!rangesClose(current, pinnedRange)){
applyLogicalRange(engine, pinnedRange);
}

}

if(!paneHasVisibleValue()){
revealLastPaneValue();
}

paneAligned = mark;

};

}else{

engine.beforeDraw = function applyPinnedWhenReady(){

if(engine.userMovedView){
engine.userMovedView = false;
pinWaitingForLayout = false;
const seen = logicalRangeFromView(engine);
if(seen){
pinnedRange = {
from: seen.from,
to: seen.to
};
}
return;
}

if(
!pinWaitingForLayout ||
!pinnedRange ||
!engine.layout ||
engine.layout.plotW < 2 ||
!engine.candles.length
){
return;
}

applyLogicalRange(engine, pinnedRange);
pinWaitingForLayout = false;

};

}

engine.afterDraw = function drawStudiesOnHistory(){

if(!engine.layout || !engine.scale || !lineSeries.length){
return;
}

paintStudyLayer(engine.hctx, false);

};

engine.onAutoScale = function onAutoScale(){
paneAutoScale = true;

if(pane){
fitPaneScale();
}

};
host.priceToCoordinate = function priceToCoordinate(price){

if(!engine.scale || !Number.isFinite(Number(price))){
return null;
}

return engine.yOf(Number(price));

};
host.coordinateToPrice = function coordinateToPrice(y){

if(typeof engine.priceAtY === "function"){
return engine.priceAtY(y);
}

if(!engine.scale || !engine.layout){
return null;
}

return yToPrice(
y,
engine.scale,
engine.layout.plotTop,
engine.layout.plotH,
engine.priceScaleMode
);

};

let publishedScaleW = 0;

function publishScaleWidth(){

if(engine.axisW === publishedScaleW){
return;
}

publishedScaleW = engine.axisW;
const px = `${publishedScaleW}px`;
const wrap =
container.closest("#chart-wrap, .widget-chart-wrap");

wrap?.style.setProperty("--chart-scale-width", px);

for(const id of ["rsi-wrap", "ao-wrap", "macd-wrap", "volume-wrap"]){
document.getElementById(id)?.style.setProperty("--chart-scale-width", px);
}

}

function notifyPriceRange(){

const scale =
engine.manualScale || engine.scale;

if(!scale || !Number.isFinite(scale.min) || !Number.isFinite(scale.max)){
return;
}

const next = {
from: scale.min,
to: scale.max
};
const span =
Math.max(
Math.abs(next.to),
Math.abs(next.from),
1e-12
);

if(
lastPriceNotified &&
Math.abs(next.from - lastPriceNotified.from) <= span * 1e-6 &&
Math.abs(next.to - lastPriceNotified.to) <= span * 1e-6
){
return;
}

lastPriceNotified = next;

for(const listener of priceRangeListeners){
listener(next);
}

}

engine.onView = ()=>{
publishScaleWidth();
paintStudies();
paintMarkers();
notifyRange();
notifyPriceRange();
};
engine.onLive = ()=>{

if(lineSeries.length){
paintStudyLive();
}

};

container.addEventListener("pointermove", event=>{

if(!crosshairListeners.size || !engine.layout){
return;
}

const rect = container.getBoundingClientRect();
const x = event.clientX - rect.left;
const y = event.clientY - rect.top;
const last = engine.candles.length - 1;
const index = candleIndexAt(
x,
last,
engine.layout.plotRight,
engine.rightGap,
engine.barSpacing,
engine.panPx
);
const param = {
point: { x, y },
time: engine.candles.length
? timeAtFractionalIndex(engine.candles, index)
: null,
seriesData: new Map()
};

for(const listener of crosshairListeners){
listener(param);
}

});

/*
 * pointerdown на холсте вызывает preventDefault, и браузер
 * уже не шлёт click. Реплей и рисунки ждут именно его,
 * вместе со временем свечи под курсором.
 */
const CLICK_SLOP_PX = 5;
let chartPress = null;

function emitChartClick(event){

if(!clickListeners.size || !engine.layout || !engine.candles.length){
return;
}

const rect = container.getBoundingClientRect();
const x = event.clientX - rect.left;
const y = event.clientY - rect.top;

if(x < engine.layout.plotLeft || x >= engine.layout.plotRight){
return;
}

const last = engine.candles.length - 1;
const index = candleIndexAt(
x,
last,
engine.layout.plotRight,
engine.rightGap,
engine.barSpacing,
engine.panPx
);
const bar = Math.min(
last,
Math.max(0, Math.round(index))
);
const time = Number(engine.candles[bar]?.time);

if(!Number.isFinite(time)){
return;
}

const param = {
point: { x, y },
time,
seriesData: new Map()
};

for(const listener of clickListeners){
listener(param);
}

}

container.addEventListener("pointerdown", event=>{

if(event.button !== 0){
return;
}

chartPress = {
id: event.pointerId,
x: event.clientX,
y: event.clientY
};

});

container.addEventListener("pointerup", event=>{

if(!chartPress || event.pointerId !== chartPress.id){
return;
}

const dx = event.clientX - chartPress.x;
const dy = event.clientY - chartPress.y;
chartPress = null;

if(dx * dx + dy * dy > CLICK_SLOP_PX * CLICK_SLOP_PX){
return;
}

emitChartClick(event);

});

container.addEventListener("pointercancel", event=>{

if(chartPress && event.pointerId === chartPress.id){
chartPress = null;
}

});

const timeScale = {
getVisibleLogicalRange(){
return logicalRangeFromView(engine);
},
setVisibleLogicalRange(range){

if(!Number.isFinite(range?.from) || !Number.isFinite(range?.to)){
return;
}

/*
 * Сразу после колёсика не принимать чужое узкое окно:
 * оно раздувает свечи и выглядит как сброс зума.
 */
if(
engine.layout &&
engine.wheelZoomAt &&
(typeof performance !== "undefined"
? performance.now()
: Date.now()) - engine.wheelZoomAt < 500
){

const content =
Math.abs(range.to - range.from);
const nextSpacing =
engine.layout.plotW / Math.max(content, 1e-6);

if(nextSpacing > engine.barSpacing * 2.2){
return;
}

}

pinnedRange = {
from: range.from,
to: range.to
};
paneAligned = -1;

if(
!engine.layout ||
!engine.candles.length ||
engine.layout.plotW < 2
){
pinWaitingForLayout = true;
return;
}

pinWaitingForLayout = false;

const current = logicalRangeFromView(engine);

if(rangesClose(current, range)){
return;
}

const pan = engine.panPx;
const spacing = engine.barSpacing;

if(!applyLogicalRange(engine, range)){
return;
}

if(
Math.abs(engine.panPx - pan) < 0.5 &&
Math.abs(engine.barSpacing - spacing) < 0.01
){
return;
}

lastNotified = null;
engine.scheduleRebuild();

},
subscribeVisibleLogicalRangeChange(listener){
rangeListeners.add(listener);
},
unsubscribeVisibleLogicalRangeChange(listener){
rangeListeners.delete(listener);
},
timeToCoordinate(time){

const guided =
guideX(time);

if(guided != null){
return guided;
}

if(!engine.layout || !engine.candles.length || !Number.isFinite(Number(time))){
return null;
}

const index = fractionalIndexAtTime(engine.candles, Number(time));

return candleX(
index,
engine.candles.length - 1,
engine.layout.plotRight,
engine.rightGap,
engine.barSpacing,
engine.panPx
);

},
logicalToCoordinate(index){

if(!engine.layout || !engine.candles.length || !Number.isFinite(Number(index))){
return null;
}

return candleX(
Number(index),
engine.candles.length - 1,
engine.layout.plotRight,
engine.rightGap,
engine.barSpacing,
engine.panPx
);

},
coordinateToLogical(x){

if(!engine.layout || !engine.candles.length || !Number.isFinite(Number(x))){
return null;
}

return candleIndexAt(
Number(x),
engine.candles.length - 1,
engine.layout.plotRight,
engine.rightGap,
engine.barSpacing,
engine.panPx
);

},
getVisibleRange(){

const range =
logicalRangeFromView(engine);

if(!range || !engine.candles.length){
return null;
}

return {
from: timeAtFractionalIndex(engine.candles, range.from),
to: timeAtFractionalIndex(engine.candles, range.to)
};

},
setVisibleRange(range){

if(!engine.candles.length || !Number.isFinite(range?.from) || !Number.isFinite(range?.to)){
return;
}

timeScale.setVisibleLogicalRange({
from: fractionalIndexAtTime(engine.candles, range.from),
to: fractionalIndexAtTime(engine.candles, range.to)
});

},
coordinateToTime(x){

const guided =
guideTime(x);

if(guided != null){
return guided;
}

if(!engine.layout || !engine.candles.length){
return null;
}

const index = candleIndexAt(
x,
engine.candles.length - 1,
engine.layout.plotRight,
engine.rightGap,
engine.barSpacing,
engine.panPx
);

return timeAtFractionalIndex(engine.candles, index);

},
applyOptions(options){

if(Number.isFinite(options?.rightOffset)){
engine.rightOffsetBars = options.rightOffset;
}

if(Number.isFinite(options?.barSpacing)){
engine.barSpacing = options.barSpacing;
}

if(options?.visible === true){
engine.timeH = 22;
engine.formatTime = formatAxisTime;
}

if(options?.visible === false){
engine.timeH = 0;
}

engine.scheduleRebuild();
},
width(){
return engine.layout?.plotW || 0;
},
fitContent(){
engine.panPx = 0;
const count = engine.candles.length || 1;
const width = engine.layout?.plotW || 1;
engine.barSpacing = Math.max(
1.5,
width / (count + engine.rightOffsetBars)
);
engine.scheduleRebuild();
},
options(){
return {
rightOffset: engine.rightOffsetBars,
barSpacing: engine.barSpacing
};
}
};

const priceScale = {
applyOptions(options){

if(Number.isFinite(options?.minimumWidth) && options.minimumWidth > 0){

const floor =
options.minimumWidth;
const prevMin =
engine.axisMin;

engine.axisMin = floor;

let grew =
false;

if(engine.axisW < floor){
engine.axisW = floor;
grew = true;
}

if(prevMin !== floor || grew){
engine.scheduleRebuild();
}

}

if(options && "mode" in options){
engine.priceScaleMode =
options.mode === 0
? PRICE_SCALE_REGULAR
: PRICE_SCALE_LOG;

if(!pane){
engine.manualScale = null;
}

engine.scheduleRebuild();
}

if("invertScale" in (options || {})){
engine.invertScale = !!options.invertScale;
engine.scheduleRebuild();
}

if(options?.scaleMargins){

if(Number.isFinite(options.scaleMargins.top)){
reportedScaleMargins = {
...reportedScaleMargins,
top: options.scaleMargins.top
};
}

if(Number.isFinite(options.scaleMargins.bottom)){
reportedScaleMargins = {
...reportedScaleMargins,
bottom: options.scaleMargins.bottom
};
}

const pixel =
mainScalePixelMargins(
reportedScaleMargins.top,
reportedScaleMargins.bottom
);

if(pixel){
engine.marginTop = pixel.top;
engine.marginBottom = pixel.bottom;
}

engine.scheduleRebuild();

}

if(options?.autoScale === false){
paneAutoScale = false;
engine.manualScale = engine.manualScale || engine.scale;
}

if(options?.autoScale === true && !pane){
paneAutoScale = true;
engine.manualScale = null;
engine.scheduleRebuild();
}

if(options?.autoScale === true && pane){
paneAutoScale = true;
fitPaneScale();
engine.scheduleRebuild();
}

},
options(){
return {
mode: engine.priceScaleMode === PRICE_SCALE_REGULAR ? 0 : 1,
autoScale: !engine.manualScale,
scaleMargins: {
top: reportedScaleMargins.top,
bottom: reportedScaleMargins.bottom
}
};
},
width(){
return engine.axisW;
},
getVisibleRange(){

const scale =
engine.manualScale || engine.scale;

if(!scale || !Number.isFinite(scale.min) || !Number.isFinite(scale.max)){
return null;
}

return {
from: scale.min,
to: scale.max
};

},
setVisibleRange(range){

if(!Number.isFinite(range?.from) || !Number.isFinite(range?.to) || range.from === range.to){
return;
}

paneAutoScale = false;
engine.manualScale = {
min: Math.min(range.from, range.to),
max: Math.max(range.from, range.to)
};
engine.scheduleRebuild();

},
subscribeVisibleLogicalRangeChange(listener){
priceRangeListeners.add(listener);
},
unsubscribeVisibleLogicalRangeChange(listener){
priceRangeListeners.delete(listener);
}
};

const chart = {
takeover: "canvas",
hostElement: container,
applyOptions(options){

if(options?.width || options?.height){
container.style.width = options.width ? `${options.width}px` : container.style.width;
container.style.height = options.height ? `${options.height}px` : container.style.height;
}

const right = options?.rightPriceScale;

if(right){
priceScale.applyOptions(right);
}

const time = options?.timeScale;

if(time){
timeScale.applyOptions(time);
}

},
priceScale(id){

if(!id || id === "right"){
return priceScale;
}

if(!overlayScales.has(id)){
overlayScales.set(id, {
top: 0,
bottom: 0,
invert: false
});
}

return {
applyOptions(options){

const slot =
overlayScales.get(id);

if(options?.scaleMargins){

if(Number.isFinite(options.scaleMargins.top)){
slot.top = options.scaleMargins.top;
}

if(Number.isFinite(options.scaleMargins.bottom)){
slot.bottom = options.scaleMargins.bottom;
}

}

if("invertScale" in (options || {})){
slot.invert = !!options.invertScale;
}

host.paintStudies?.();

},
options(){
return {
mode: 0,
autoScale: true
};
},
width(){
return engine.axisW;
}
};

},
bindTimeGuide(source){

const next =
source &&
source !== chart &&
source.timeScale
? source
: null;

const same =
timeGuide === next;

timeGuide = next;
guideShiftAt = -1;

if(same){
return;
}

paneAligned = -1;
engine.scheduleRebuild();

},
timeScale(){
return timeScale;
},
resize(width, height){
chart.applyOptions({ width, height });
engine.scheduleRebuild();
},
remove(){
engine._ro?.disconnect();
container.replaceChildren();
},
subscribeClick(listener){
clickListeners.add(listener);
},
unsubscribeClick(listener){
clickListeners.delete(listener);
},
subscribeCrosshairMove(listener){
crosshairListeners.add(listener);
},
unsubscribeCrosshairMove(listener){
crosshairListeners.delete(listener);
},
setCrosshairPosition(){},
clearCrosshairPosition(){},
addCandlestickSeries(options){
candleSeries = makeSeries(host, "candle", options);
host.applyCandlePaint(candleSeries.options);
return candleSeries;
},
addLineSeries(options){
const series = makeSeries(host, "line", options);
lineSeries.push(series);
return series;
},
addBaselineSeries(options){
const series = makeSeries(host, "baseline", {
...options,
color: options?.topLineColor || options?.bottomLineColor || options?.color
});
lineSeries.push(series);
return series;
},
addHistogramSeries(options){
const series = makeSeries(host, "histogram", options);
lineSeries.push(series);
return series;
},
removeSeries(series){
const index = lineSeries.indexOf(series);

if(index >= 0){
lineSeries.splice(index, 1);
paintStudies();
}

}
};

host.chart = chart;

if(!chartOpts.pane && !chartOpts.bare){
candleSeries = chart.addCandlestickSeries(chartOpts.paint || {});
host.series = candleSeries;
}

return {
chart,
series: candleSeries
};

}
