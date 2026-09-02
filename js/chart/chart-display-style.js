/**
 * Terminal price-chart display: candlesticks vs line.
 * OHLC bars stay the source of truth; this only maps them for Lightweight Charts.
 */

export const CHART_DISPLAY_STYLE_KEY =
"terminal_chart_display_style_v1";

export const CHART_DISPLAY_TYPE_CANDLES =
"candles";

export const CHART_DISPLAY_TYPE_LINE =
"line";

export const CHART_DISPLAY_SOURCES =
Object.freeze([
"close",
"open",
"high",
"low",
"hl2"
]);

export const CHART_DISPLAY_LINE_STYLES =
Object.freeze([
"solid",
"dashed",
"dotted"
]);

export const DEFAULT_LINE_COLOR =
"#5b9cf6";

export const CANDLE_SERIES_PAINT =
Object.freeze({
upColor: "#459782",
downColor: "#ef4444",
borderVisible: false,
wickUpColor: "#459782",
wickDownColor: "#ef4444",
priceLineVisible: true,
lastValueVisible: false
});

export function defaultChartDisplayStyle(){

return {
type: CHART_DISPLAY_TYPE_CANDLES,
source: "close",
lineStyle: "solid",
lineColor: DEFAULT_LINE_COLOR,
lineWidth: 2
};

}

function normalizeHexColor(
raw
){

const hex =
String(raw || "")
.trim()
.toLowerCase();

if(
/^#[0-9a-f]{6}$/.test(hex)
){
return hex;
}

if(
/^#[0-9a-f]{3}$/.test(hex)
){
const r = hex[1];
const g = hex[2];
const b = hex[3];
return `#${r}${r}${g}${g}${b}${b}`;
}

return DEFAULT_LINE_COLOR;

}

function normalizeLineWidth(
raw
){

const n =
Math.round(
Number(raw)
);

if(
n >= 1 &&
n <= 4
){
return n;
}

return 2;

}

export function normalizeChartDisplayStyle(
raw
){

const base =
defaultChartDisplayStyle();
const type =
String(raw?.type || "")
.trim()
.toLowerCase();
const source =
String(raw?.source || "")
.trim()
.toLowerCase();
const lineStyle =
String(raw?.lineStyle || "")
.trim()
.toLowerCase();

return {
type:
type === CHART_DISPLAY_TYPE_LINE
? CHART_DISPLAY_TYPE_LINE
: CHART_DISPLAY_TYPE_CANDLES,
source:
CHART_DISPLAY_SOURCES.includes(source)
? source
: base.source,
lineStyle:
CHART_DISPLAY_LINE_STYLES.includes(lineStyle)
? lineStyle
: base.lineStyle,
lineColor:
normalizeHexColor(raw?.lineColor),
lineWidth:
normalizeLineWidth(raw?.lineWidth)
};

}

export function loadChartDisplayStyle(){

try{
const raw =
localStorage.getItem(CHART_DISPLAY_STYLE_KEY);

if(!raw){
return defaultChartDisplayStyle();
}

return normalizeChartDisplayStyle(
JSON.parse(raw)
);
}catch{
return defaultChartDisplayStyle();
}

}

export function saveChartDisplayStyle(
style
){

const next =
normalizeChartDisplayStyle(style);

try{
localStorage.setItem(
CHART_DISPLAY_STYLE_KEY,
JSON.stringify(next)
);
}catch{
/* ignore quota / private mode */
}

return next;

}

export function lineStyleToLw(
lineStyle
){

  const lw =
globalThis.LightweightCharts?.LineStyle;

if(lw){
if(lineStyle === "dotted"){
return lw.Dotted ?? 1;
}
if(lineStyle === "dashed"){
return lw.Dashed ?? 2;
}
return lw.Solid ?? 0;
}

if(lineStyle === "dotted"){
return 1;
}

if(lineStyle === "dashed"){
return 2;
}

return 0;

}

export function lineSeriesOptions(
style
){

const next =
normalizeChartDisplayStyle(style);

return {
color: next.lineColor,
lineWidth: next.lineWidth,
lineStyle: lineStyleToLw(next.lineStyle),
priceLineVisible: true,
lastValueVisible: false,
crosshairMarkerVisible: true
};

}

function finitePrice(
value
){

const n =
Number(value);

return Number.isFinite(n)
? n
: null;

}

export function sourcePriceFromBar(
bar,
source
){

if(!bar){
return null;
}

const key =
String(source || "close")
.trim()
.toLowerCase();

if(key === "open"){
return finitePrice(bar.open);
}

if(key === "high"){
return finitePrice(bar.high);
}

if(key === "low"){
return finitePrice(bar.low);
}

if(key === "hl2"){
const high =
finitePrice(bar.high);
const low =
finitePrice(bar.low);

if(
high == null ||
low == null
){
return finitePrice(bar.close);
}

return (high + low) / 2;
}

return finitePrice(bar.close);

}

export function isOhlcBar(
bar
){

return (
!!bar &&
bar.time != null &&
finitePrice(bar.close) != null
);

}

export function mapBarToSeriesPoint(
bar,
style
){

if(!bar || bar.time == null){
return null;
}

const next =
normalizeChartDisplayStyle(style);

if(!isOhlcBar(bar)){
return {
time: bar.time
};
}

if(next.type !== CHART_DISPLAY_TYPE_LINE){
return bar;
}

const value =
sourcePriceFromBar(bar, next.source);

if(value == null){
return {
time: bar.time
};
}

return {
time: bar.time,
value
};

}

export function mapDisplayCandlesToSeriesData(
candles,
style
){

if(!Array.isArray(candles)){
return [];
}

const next =
normalizeChartDisplayStyle(style);

if(next.type !== CHART_DISPLAY_TYPE_LINE){
return candles;
}

const out =
[];

for(const bar of candles){
const point =
mapBarToSeriesPoint(bar, next);

if(point){
out.push(point);
}
}

return out;

}

export function seriesBarClose(
bar
){

if(!bar){
return null;
}

const close =
finitePrice(bar.close);

if(close != null){
return close;
}

return finitePrice(bar.value);

}

/**
 * High/low envelope for autoscale. Ignores whitespace and non-positive
 * values (log price scale cannot include 0).
 */
export function ohlcPriceRangeFromBars(
bars
){

if(!Array.isArray(bars) || !bars.length){
return null;
}

let minValue =
Infinity;
let maxValue =
-Infinity;

for(const bar of bars){

if(!bar){
continue;
}

const close =
seriesBarClose(bar);
const high =
finitePrice(bar.high) ??
close;
const low =
finitePrice(bar.low) ??
close;

if(
high !=
null &&
high > maxValue
){
maxValue =
high;
}

if(
low !=
null &&
low > 0 &&
low < minValue
){
minValue =
low;
}

}

if(
!Number.isFinite(minValue) ||
!Number.isFinite(maxValue) ||
minValue <= 0
){
return null;
}

if(minValue > maxValue){
return null;
}

if(minValue === maxValue){
return {
minValue: minValue * 0.999,
maxValue: maxValue * 1.001
};
}

return {
minValue,
maxValue
};

}
