/**
 * Осциллятор в виджетах Скринера (4/6) и в окне увеличения: RSI или MACD.
 * Одновременно включён только один; по умолчанию RSI.
 */
import {
createVolumeChart
} from "./chart-import.js?v=48";

import {
calculateMacd,
macdHistColor,
MACD_LINE_COLOR,
MACD_SIGNAL_COLOR
} from "./indicators/macd-math.js?v=3";

export const SCREENER_WIDGET_OSCILLATOR_KEY =
"multichart_screener_widget_oscillator_v1";

export const SCREENER_WIDGET_OSCILLATOR_CHANGED =
"multichart:screener-widget-oscillator-changed";

export const SCREENER_WIDGET_OSCILLATOR_RSI =
"rsi";

export const SCREENER_WIDGET_OSCILLATOR_MACD =
"macd";

export function normalizeScreenerWidgetOscillator(
value
){

return value ===
SCREENER_WIDGET_OSCILLATOR_MACD
? SCREENER_WIDGET_OSCILLATOR_MACD
: SCREENER_WIDGET_OSCILLATOR_RSI;

}

export function getScreenerWidgetOscillator(){

try{
return normalizeScreenerWidgetOscillator(
localStorage.getItem(
SCREENER_WIDGET_OSCILLATOR_KEY
)
);
}catch{
return SCREENER_WIDGET_OSCILLATOR_RSI;
}

}

export function setScreenerWidgetOscillator(
value
){

const next =
normalizeScreenerWidgetOscillator(
value
);

if(
next ===
getScreenerWidgetOscillator()
){
return next;
}

try{
localStorage.setItem(
SCREENER_WIDGET_OSCILLATOR_KEY,
next
);
}catch{
/* ignore */
}

try{
window.dispatchEvent(
new CustomEvent(
SCREENER_WIDGET_OSCILLATOR_CHANGED,
{
detail:{
kind:
next
}
}
)
);
}catch{
/* ignore */
}

return next;

}

export function createScreenerMacdChart(
container
){

const created =
createVolumeChart(
container
);

const chart =
created.chart;
const histSeries =
created.series;

histSeries.applyOptions(
{
base:
0,
lastValueVisible:
false,
priceLineVisible:
false,
priceFormat:{
type:
"price",
precision:
5,
minMove:
0.00001
}
}
);

const macdSeries =
chart.addLineSeries(
{
color:
MACD_LINE_COLOR,
lineWidth:
1,
priceLineVisible:
false,
lastValueVisible:
true,
crosshairMarkerVisible:
false
}
);

const signalSeries =
chart.addLineSeries(
{
color:
MACD_SIGNAL_COLOR,
lineWidth:
1,
priceLineVisible:
false,
lastValueVisible:
false,
crosshairMarkerVisible:
false
}
);

return {
chart,
histSeries,
macdSeries,
signalSeries
};

}

export function setScreenerMacdData(
macdChart,
candles
){

if(
!macdChart?.histSeries ||
!macdChart?.macdSeries ||
!macdChart?.signalSeries ||
!candles?.length
){
return;
}

const points =
calculateMacd(
candles
);

const histData =
[];
const macdData =
[];
const signalData =
[];
let prevHist =
null;

for(
const bar of points
){

const hist =
bar.hist;
const macd =
bar.macd;
const signal =
bar.signal;

if(
hist ==
null ||
!Number.isFinite(
hist
)
){
histData.push(
{
time:
bar.time,
value:
0,
color:
"rgba(120,123,134,0.2)"
}
);
}else{
histData.push(
{
time:
bar.time,
value:
hist,
color:
macdHistColor(
hist,
prevHist
)
}
);
prevHist =
hist;
}

if(
macd ==
null ||
!Number.isFinite(
macd
)
){
macdData.push(
{
time:
bar.time
}
);
}else{
macdData.push(
{
time:
bar.time,
value:
macd
}
);
}

if(
signal ==
null ||
!Number.isFinite(
signal
)
){
signalData.push(
{
time:
bar.time
}
);
}else{
signalData.push(
{
time:
bar.time,
value:
signal
}
);
}

}

macdChart.histSeries.setData(
histData
);
macdChart.macdSeries.setData(
macdData
);
macdChart.signalSeries.setData(
signalData
);

}
