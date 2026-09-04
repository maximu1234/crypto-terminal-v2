/**
 * Stable Lightweight Charts series handle for Terminal.
 * Callers keep one object while candlestick / line series are swapped underneath.
 *
 * Never removeSeries() the original candlestick: that destroys the right
 * price scale and LW recreates it from defaults. Line is an extra series;
 * visibility toggles. First-load scale stays the one createCandlestickChart made.
 *
 * LW series methods are class APIs — call inner.fn(...) so `this` is the series.
 */
import {
CANDLE_SERIES_PAINT,
CHART_DISPLAY_TYPE_CANDLES,
CHART_DISPLAY_TYPE_LINE,
isOhlcBar,
lineSeriesOptions,
mapBarToSeriesPoint,
mapDisplayCandlesToSeriesData,
normalizeChartDisplayStyle,
ohlcPriceRangeFromBars,
seriesBarClose
} from "./chart-display-style.js?v=2";

import {
mergeLiveBarIntoDisplay
} from "./live-bar-roll.js?v=2";

import {
runWithPreservedVisibleLogicalRange
} from "../chart-visible-range.js?v=3";

import {
isChartPriceScaleLogarithmic
} from "./price-scale-mode.js?v=3";

function withClose(
bar
){

const close =
seriesBarClose(bar);

if(
!bar ||
close == null ||
bar.close != null
){
return bar;
}

return {
...bar,
open: bar.open ?? close,
high: bar.high ?? close,
low: bar.low ?? close,
close
};

}

export function createPriceSeriesHost(
chart,
innerSeries,
style
){

let currentStyle =
normalizeChartDisplayStyle(style);
let candleInner =
innerSeries;
let lineInner =
null;
let lastDisplay =
[];

function visibleOhlcRange(){

let from =
0;
let to =
lastDisplay.length - 1;

try{
const logical =
chart?.timeScale?.().getVisibleLogicalRange?.();

if(
logical &&
Number.isFinite(
logical.from
) &&
Number.isFinite(
logical.to
)
){
from =
Math.max(
0,
Math.floor(
logical.from
)
);
to =
Math.min(
lastDisplay.length - 1,
Math.ceil(
logical.to
)
);
}
}catch{
/* full series */
}

if(
to <
from
){
return ohlcPriceRangeFromBars(
lastDisplay
);
}

return ohlcPriceRangeFromBars(
lastDisplay.slice(
from,
to + 1
)
);

}

function lineAutoscaleInfoProvider(
original
){

const orig =
typeof original ===
"function"
? original()
: original;
const ohlc =
visibleOhlcRange();

if(ohlc){
return {
...(orig || {}),
priceRange:
ohlc
};
}

const minValue =
orig?.priceRange?.minValue;
const maxValue =
orig?.priceRange?.maxValue;

if(
isChartPriceScaleLogarithmic(
chart
) &&
Number.isFinite(
minValue
) &&
minValue <=
0 &&
Number.isFinite(
maxValue
) &&
maxValue >
0
){
return {
...orig,
priceRange:{
minValue:
maxValue * 0.5,
maxValue
}
};
}

return orig;

}

function ensureLineSeries(){

if(lineInner || !chart){
return lineInner;
}

lineInner =
chart.addLineSeries({
...lineSeriesOptions(
currentStyle
),
visible:
currentStyle.type ===
CHART_DISPLAY_TYPE_LINE,
autoscaleInfoProvider:
lineAutoscaleInfoProvider
});

return lineInner;

}

function isLineType(){

return currentStyle.type ===
CHART_DISPLAY_TYPE_LINE;

}

function activeInner(){

if(
isLineType() &&
lineInner
){
return lineInner;
}

return candleInner;

}

function setSeriesShown(
series,
shown,
priceLineVisible
){

if(!series){
return;
}

series.applyOptions({
visible:
shown,
priceLineVisible:
!!(
shown &&
priceLineVisible
),
lastValueVisible:
false
});

}

function syncVisibility(){

const lineOn =
isLineType();

if(lineOn){
ensureLineSeries();
}

setSeriesShown(
candleInner,
!lineOn,
CANDLE_SERIES_PAINT.priceLineVisible
);

setSeriesShown(
lineInner,
lineOn,
true
);

}

function setInnerData(
inner,
rows
){

if(!inner){
return;
}

try{
inner.setData(
rows
);
}catch{
inner.setData(
rows.filter(
bar=>
isOhlcBar(
bar
) ||
Number.isFinite(
Number(
bar?.value
)
)
)
);
}

}

function paint(){

if(candleInner){
const candleData =
mapDisplayCandlesToSeriesData(
lastDisplay,
{
type:
CHART_DISPLAY_TYPE_CANDLES
}
);

try{
candleInner.setData(
candleData
);
}catch{
candleInner.setData(
candleData.filter(
isOhlcBar
)
);
}
}

if(isLineType()){
ensureLineSeries();
setInnerData(
lineInner,
mapDisplayCandlesToSeriesData(
lastDisplay,
currentStyle
)
);
}else if(lineInner){
lineInner.setData(
[]
);
}

}

if(isLineType()){
ensureLineSeries();
syncVisibility();
}

const host = {
setData(
rows
){
lastDisplay =
Array.isArray(rows)
? rows
: [];
paint();
},
update(
bar
){
if(
!bar ||
bar.time == null
){
return;
}

lastDisplay =
mergeLiveBarIntoDisplay(
lastDisplay,
bar
);

try{
if(candleInner){
const candlePoint =
mapBarToSeriesPoint(
bar,
{
type:
CHART_DISPLAY_TYPE_CANDLES
}
);

if(candlePoint){
candleInner.update(
candlePoint
);
}
}

if(
isLineType() &&
lineInner
){
const point =
mapBarToSeriesPoint(
bar,
currentStyle
);

if(point){
lineInner.update(
point
);
}
}
}catch{
paint();
}
},
applyOptions(
opts
){
if(!opts){
return;
}

if(opts.priceFormat){
const formatOpts = {
priceFormat:
opts.priceFormat
};

candleInner?.applyOptions(
formatOpts
);
lineInner?.applyOptions(
formatOpts
);
}

const rest =
{
...opts
};

delete rest.priceFormat;

if(!Object.keys(rest).length){
return;
}

const target =
activeInner();

if(target){
target.applyOptions(
rest
);
}
},
priceToCoordinate(
price
){
if(candleInner){
return candleInner.priceToCoordinate(
price
);
}

return lineInner
? lineInner.priceToCoordinate(
price
)
: null;
},
coordinateToPrice(
y
){
if(candleInner){
return candleInner.coordinateToPrice(
y
);
}

return lineInner
? lineInner.coordinateToPrice(
y
)
: null;
},
priceScale(){
const target =
candleInner ||
lineInner;

return target
? target.priceScale()
: undefined;
},
options(){
const target =
activeInner();

return target
? target.options()
: undefined;
},
data(){
if(
!candleInner ||
typeof candleInner.data !==
"function"
){
return [];
}

return candleInner.data().map(withClose);
},
getStyle(){
return currentStyle;
},
applyDisplayStyle(
nextStyle
){
const next =
normalizeChartDisplayStyle(
nextStyle
);
const typeChanged =
next.type !==
currentStyle.type;
currentStyle =
next;

function apply(){

if(typeChanged){
syncVisibility();
}else if(
isLineType() &&
lineInner
){
lineInner.applyOptions(
lineSeriesOptions(
currentStyle
)
);
}

paint();

}

if(chart){
runWithPreservedVisibleLogicalRange(
chart,
apply
);
}else{
apply();
}

return typeChanged;
}
};

return new Proxy(
host,
{
get(
target,
prop,
receiver
){

if(prop === "then"){
return undefined;
}

if(
Reflect.has(
target,
prop
)
){
return Reflect.get(
target,
prop,
receiver
);
}

const inner =
activeInner();
const value =
inner?.[
prop
];

if(
typeof value ===
"function"
){
return value.bind(
inner
);
}

return value;

},
set(
target,
prop,
value
){

if(
Reflect.has(
target,
prop
)
){
target[
prop
] =
value;
return true;
}

const inner =
activeInner();

if(inner){
inner[
prop
] =
value;
return true;
}

target[
prop
] =
value;
return true;

}
}
);

}
