import {
formatPrice,
formatChartPrice
} from "./chart-options.js?v=7";

const DOM_CROSSHAIR_VERT =
"chart-dom-crosshair-vert";

const DOM_CROSSHAIR_HORZ =
"chart-dom-crosshair-horz";

function resolveChartCanvasEl(
wrapEl
){

if(
!wrapEl
){
return null;
}

return (
wrapEl.querySelector(
".chart"
) ||
wrapEl.querySelector(
"#chart"
)
);

}

/**
 * Вертикаль + горизонталь внутри wrap (виджеты, iPhone, рисование).
 */
export function ensureDomChartCrosshair(
wrapEl
){

if(
!wrapEl
){
return;
}

if(
!wrapEl.querySelector(
`.${DOM_CROSSHAIR_VERT}`
)
){

const vert =
document.createElement(
"div"
);

vert.className =
`${DOM_CROSSHAIR_VERT} hidden`;

vert.setAttribute(
"aria-hidden",
"true"
);

wrapEl.appendChild(
vert
);

}

if(
!wrapEl.querySelector(
`.${DOM_CROSSHAIR_HORZ}`
)
){

const horz =
document.createElement(
"div"
);

horz.className =
`${DOM_CROSSHAIR_HORZ} hidden`;

horz.setAttribute(
"aria-hidden",
"true"
);

wrapEl.appendChild(
horz
);

}

}

function resolveTabletProbeHorizLine(
horizLineEl
){

const root =
horizLineEl ||
document.getElementById(
"tablet-probe-crosshair-h"
);

if(
!root
){
return null;
}

return root.querySelector?.(
".tablet-probe-crosshair-h-line"
) ||
root;

}

function resolveTabletProbeHorizEl(
horizLineEl,
chartsStackEl
){

let el =
horizLineEl ||
document.getElementById(
"tablet-probe-crosshair-h"
);

if(
!el ||
!chartsStackEl
){
return null;
}

if(
el.parentElement !==
chartsStackEl
){
chartsStackEl.appendChild(
el
);
}

return el;

}

/**
 * Горизонталь probe в #charts-stack (поверх canvas, как #linked-crosshair-vert).
 */
export function positionTabletProbeHorizInStack({
horizLineEl,
chartsStackEl,
chartEl,
chart,
clientY
}){

chartsStackEl =
chartsStackEl ||
document.getElementById(
"charts-stack"
);

if(
!chartsStackEl ||
!chartEl ||
!chart ||
!Number.isFinite(
clientY
)
){
return;
}

const el =
resolveTabletProbeHorizEl(
horizLineEl,
chartsStackEl
);

if(
!el
){
return;
}

const chartR =
chartEl.getBoundingClientRect();

const stackR =
chartsStackEl.getBoundingClientRect();

let scaleW =
56;

try{
scaleW =
chart.priceScale?.(
"right"
)?.width?.() ||
scaleW;
}catch{
/* ignore */
}

scaleW =
Math.max(
40,
Math.min(
Math.round(
scaleW
),
Math.round(
chartR.width * 0.35
)
)
);

const plotWidth =
Math.max(
0,
chartR.width - scaleW
);

const chartTopInStack =
chartR.top - stackR.top;

const chartBottomInStack =
chartTopInStack + chartR.height;

const topInStack =
clientY - stackR.top;

const clampedTop =
Math.max(
chartTopInStack,
Math.min(
chartBottomInStack,
topInStack
)
);

const plotLeft =
chartR.left - stackR.left;

const lineEl =
resolveTabletProbeHorizLine(
el
);

if(
lineEl?.tagName ===
"line"
){

el.style.removeProperty(
"top"
);

el.style.removeProperty(
"left"
);

el.style.removeProperty(
"width"
);

el.style.removeProperty(
"height"
);

el.style.removeProperty(
"right"
);

el.style.removeProperty(
"display"
);

el.style.removeProperty(
"border"
);

el.style.removeProperty(
"border-top"
);

el.style.removeProperty(
"background"
);

const stackW =
Math.max(
1,
Math.round(
stackR.width
)
);

const stackH =
Math.max(
1,
Math.round(
stackR.height
)
);

el.setAttribute(
"width",
String(
stackW
)
);

el.setAttribute(
"height",
String(
stackH
)
);

el.setAttribute(
"viewBox",
`0 0 ${stackW} ${stackH}`
);

const x1 =
Math.round(
plotLeft
);

const x2 =
Math.max(
x1 + 1,
Math.round(
plotLeft + plotWidth
)
);

const y =
Math.round(
clampedTop
) + 0.5;

lineEl.setAttribute(
"x1",
String(
x1
)
);

lineEl.setAttribute(
"x2",
String(
x2
)
);

lineEl.setAttribute(
"y1",
String(
y
)
);

lineEl.setAttribute(
"y2",
String(
y
)
);

el.classList.remove(
"hidden"
);

return;

}

el.style.top =
`${Math.round(
clampedTop
) + 0.5}px`;

el.style.left =
`${Math.round(
plotLeft
)}px`;

el.style.width =
`${Math.max(
1,
Math.round(
plotWidth
)
)}px`;

el.style.removeProperty(
"right"
);

el.style.removeProperty(
"display"
);

el.style.removeProperty(
"height"
);

el.style.removeProperty(
"border"
);

el.style.removeProperty(
"border-top"
);

el.style.removeProperty(
"background"
);

el.classList.remove(
"hidden"
);

}

function hideTabletProbeHorizInStack(
horizLineEl
){

const el =
horizLineEl ||
document.getElementById(
"tablet-probe-crosshair-h"
);

if(
!el
){
return;
}

el.classList.add(
"hidden"
);

el.style.removeProperty(
"top"
);

el.style.removeProperty(
"left"
);

el.style.removeProperty(
"width"
);

}

export function positionDomChartCrosshairHorz({
wrapEl,
chartEl,
chart,
clientY,
plotY
}){

const el =
chartEl ||
resolveChartCanvasEl(
wrapEl
);

if(
!wrapEl ||
!el ||
!chart
){
return;
}

const chartR =
el.getBoundingClientRect();

let y =
plotY;

if(
!Number.isFinite(
y
)
){

if(
!Number.isFinite(
clientY
)
){
return;
}

y =
clientY - chartR.top;

}

y =
Math.max(
0,
Math.min(
chartR.height,
y
)
);

let scaleW =
56;

try{
scaleW =
chart.priceScale(
"right"
).width() ||
56;
}catch{
/* ignore */
}

const plotW =
Math.max(
0,
chartR.width - scaleW
);

const horz =
wrapEl.querySelector(
`.${DOM_CROSSHAIR_HORZ}`
);

if(
horz
){

horz.style.top =
`${Math.round(y) + 0.5}px`;

horz.style.left =
"0px";

horz.style.width =
`${Math.round(plotW)}px`;

horz.classList.remove(
"hidden"
);

}

}

export function positionDomChartCrosshair({
wrapEl,
chartEl,
chart,
series,
clientX,
clientY
}){

const el =
chartEl ||
resolveChartCanvasEl(
wrapEl
);

if(
!wrapEl ||
!el ||
!chart
){
return null;
}

const chartR =
el.getBoundingClientRect();

let x =
clientX - chartR.left;

let y =
clientY - chartR.top;

x =
Math.max(
0,
Math.min(
chartR.width,
x
)
);

y =
Math.max(
0,
Math.min(
chartR.height,
y
)
);

const vert =
wrapEl.querySelector(
`.${DOM_CROSSHAIR_VERT}`
);

if(
vert
){

vert.style.left =
`${Math.round(x)}px`;

vert.classList.remove(
"hidden"
);

}

positionDomChartCrosshairHorz({
wrapEl,
chartEl: el,
chart,
plotY: y
});

try{
chart.clearCrosshairPosition();
}catch{
/* ignore */
}

const time =
chart.timeScale().coordinateToTime?.(
x
);

const price =
series?.coordinateToPrice?.(
y
);

return {
x,
y,
time,
price
};

}

export function hideDomChartCrosshair(
wrapEl
){

if(
!wrapEl
){
return;
}

wrapEl.querySelectorAll(
`.${DOM_CROSSHAIR_VERT}, .${DOM_CROSSHAIR_HORZ}`
).forEach(
node=>{
node.classList.add(
"hidden"
);
}
);

}

export function hideDomChartCrosshairHorz(
wrapEl
){

if(
!wrapEl
){
return;
}

const horz =
wrapEl.querySelector(
`.${DOM_CROSSHAIR_HORZ}`
);

if(
horz
){
horz.classList.add(
"hidden"
);
}

}

export function hideDomChartCrosshairVert(
wrapEl
){

if(
!wrapEl
){
return;
}

const vert =
wrapEl.querySelector(
`.${DOM_CROSSHAIR_VERT}`
);

if(
vert
){
vert.classList.add(
"hidden"
);
}

}


/**
 * Горизонталь probe в #charts-stack (если в HTML ещё внутри #chart-wrap — переносим).
 */
export function ensureTabletProbeHorizLine(
chartsStackEl
){

if(
!chartsStackEl
){
return null;
}

let el =
document.getElementById(
"tablet-probe-crosshair-h"
);

if(
!el
){

el =
document.createElementNS(
"http://www.w3.org/2000/svg",
"svg"
);

el.id =
"tablet-probe-crosshair-h";

el.className =
"tablet-probe-crosshair-h hidden";

el.setAttribute(
"aria-hidden",
"true"
);

el.setAttribute(
"focusable",
"false"
);

const line =
document.createElementNS(
"http://www.w3.org/2000/svg",
"line"
);

line.className =
"tablet-probe-crosshair-h-line";

line.setAttribute(
"stroke",
"#758696"
);

line.setAttribute(
"stroke-width",
"1"
);

line.setAttribute(
"vector-effect",
"non-scaling-stroke"
);

line.setAttribute(
"stroke-dasharray",
"5 4"
);

el.appendChild(
line
);

}

if(
el.parentElement !==
chartsStackEl
){

chartsStackEl.appendChild(
el
);

}

return el;

}

export function positionTabletProbeCrosshair({
chart,
series,
chartEl,
chartWrapEl = null,
chartsStackEl,
linkedVertEl,
horizLineEl,
timeLabelEl,
priceLabelEl = null,
clientX,
clientY,
onTime
}){

if(
!chart ||
!chartEl
){
return null;
}

chartsStackEl =
chartsStackEl ||
document.getElementById(
"charts-stack"
);

horizLineEl =
horizLineEl ||
document.getElementById(
"tablet-probe-crosshair-h"
);

const chartR =
chartEl.getBoundingClientRect();

let x =
clientX - chartR.left;

let y =
clientY - chartR.top;

let scaleW =
56;

try{
scaleW =
chart.priceScale?.(
"right"
)?.width?.() ||
scaleW;
}catch{
/* ignore */
}

scaleW =
Math.max(
40,
Math.min(
Math.round(
scaleW
),
Math.round(
chartR.width * 0.35
)
)
);

const plotWidth =
Math.max(
0,
chartR.width - scaleW
);

x =
Math.max(
0,
Math.min(
plotWidth,
x
)
);

y =
Math.max(
0,
Math.min(
chartR.height,
y
)
);

if(
chartsStackEl &&
linkedVertEl
){

const stackR =
chartsStackEl.getBoundingClientRect();

const plotRightInStack =
chartR.left - stackR.left + Math.max(
0,
chartR.width - scaleW
);

const lineLeft =
Math.min(
chartR.left - stackR.left + x,
plotRightInStack
);

linkedVertEl.style.left =
`${Math.round(lineLeft)}px`;

linkedVertEl.classList.remove(
"hidden"
);

}

if(
chartsStackEl &&
horizLineEl &&
Number.isFinite(
clientY
)
){

positionTabletProbeHorizInStack({
horizLineEl,
chartsStackEl,
chartEl,
chart,
clientY
});

}

const inFutureGap =
isPlotXBeyondLastCandle(
chart,
series,
x
) ||
isPlotXBeyondLastCandleLogical(
chart,
series,
x
);

let probeTime =
probeTimeFromPlotX(
chart,
series,
x
);

if(
probeTime ===
null
){
probeTime =
crosshairUnix(
chart.timeScale().coordinateToTime?.(
Math.max(
0,
Math.min(
chartR.width - scaleW - 1,
x
)
)
)
);
}

const price =
series?.coordinateToPrice?.(
y
);

const hasPrice =
price != null &&
Number.isFinite(
price
);

let crosshairPrice =
hasPrice
? price
: null;

if(
crosshairPrice ==
null
){
crosshairPrice =
series?.coordinateToPrice?.(
Math.max(
1,
Math.min(
chartR.height - 1,
y
)
)
);

if(
crosshairPrice != null &&
!Number.isFinite(
crosshairPrice
)
){
crosshairPrice = null;
}

}

if(
crosshairPrice ==
null &&
probeTime !=
null &&
!inFutureGap
){
const bars =
series?.data?.();

const last =
bars?.length
? bars[
bars.length - 1
]
: null;

if(
last &&
Number.isFinite(
last.close
)
){
crosshairPrice =
last.close;
}

}

const tabletProbeMode =
!!horizLineEl;

const wrapEl =
chartWrapEl ||
chartEl?.closest?.(
"#chart-wrap"
) ||
document.getElementById(
"chart-wrap"
);

if(
tabletProbeMode
){

try{
chart.clearCrosshairPosition();
}catch{
/* ignore */
}

}else{

const lwHorizOk =
!inFutureGap &&
probeTime !=
null &&
crosshairPrice !=
null &&
Number.isFinite(
crosshairPrice
);

const probeBeyondLastBar =
isProbeTimeBeyondLastBar(
series,
probeTime
);

const useDomHorizLine =
inFutureGap ||
probeBeyondLastBar ||
!lwHorizOk;

if(
lwHorizOk &&
!useDomHorizLine
){

try{
chart.setCrosshairPosition(
crosshairPrice,
probeTime,
series
);
}catch{
/* ignore */
}

}else{

try{
chart.clearCrosshairPosition();
}catch{
/* ignore */
}

}

if(
useDomHorizLine
){

positionTabletProbeHorizInStack({
horizLineEl,
chartsStackEl,
chartEl,
chart,
clientY
});

}else{

if(
horizLineEl
){
horizLineEl.classList.add(
"hidden"
);
}

hideTabletProbeHorizInStack(
horizLineEl
);

hideDomChartCrosshairHorz(
wrapEl
);

}

}

updateCrosshairAxisLabels({
param:{
time: probeTime,
point:{
x,
y
}
},
timeLabelEl,
priceLabelEl,
snappedX:x,
plotY:y,
mainSeries:series,
mainChart:chart
});

if(
probeTime !=
null
){
onTime?.(
probeTime
);
}

return {
time: probeTime,
x,
y,
price: hasPrice
? price
: null
};

}

export function hideTabletProbeCrosshair({
linkedVertEl,
horizLineEl,
timeLabelEl,
priceLabelEl = null,
chartWrapEl = null,
onClear
}){

linkedVertEl?.classList.add(
"hidden"
);

linkedVertEl?.style.removeProperty(
"left"
);

horizLineEl?.classList.add(
"hidden"
);

hideTabletProbeHorizInStack(
horizLineEl
);

hideDomChartCrosshairHorz(
chartWrapEl ||
document.getElementById(
"chart-wrap"
)
);

horizLineEl?.style.removeProperty(
"top"
);

horizLineEl?.style.removeProperty(
"left"
);

horizLineEl?.style.removeProperty(
"width"
);

horizLineEl?.style.removeProperty(
"display"
);

clearCrosshairAxisLabels(
timeLabelEl,
priceLabelEl
);

onClear?.();

}

export function crosshairUnix(
time
){

if(
time === null ||
time === undefined
){
return null;
}

if(
typeof time === "number"
){
return time;
}

if(
typeof time === "object" &&
typeof time.timestamp === "number"
){
return time.timestamp;
}

return null;

}

function segmentPlotTimeX(
ts,
t0,
t1
){

const x0 =
ts.timeToCoordinate(
t0
);

const x1 =
ts.timeToCoordinate(
t1
);

const u0 =
crosshairUnix(
t0
);

const u1 =
crosshairUnix(
t1
);

if(
!Number.isFinite(
x0
) ||
!Number.isFinite(
x1
) ||
u0 ===
null ||
u1 ===
null
){
return null;
}

const dt =
u1 - u0;

if(
dt <=
0
){
return null;
}

return {
x0,
x1,
t0:u0,
dt
};

}

/** Время по X в области без свечей (в т.ч. «будущее» справа от последней свечи). */
function probeTimeFromPlotX(
chart,
series,
x
){

const ts =
chart.timeScale();

const direct =
crosshairUnix(
ts.coordinateToTime?.(
x
)
);

if(
direct !==
null
){
return direct;
}

const bars =
series?.data?.();

if(
!bars ||
bars.length <
2
){
return null;
}

for(
let i =
0;
i <
bars.length - 1;
i++
){

const seg =
segmentPlotTimeX(
ts,
bars[
i
].time,
bars[
i + 1
].time
);

if(
!seg
){
continue;
}

const minX =
Math.min(
seg.x0,
seg.x1
);

const maxX =
Math.max(
seg.x0,
seg.x1
);

if(
x >=
minX &&
x <=
maxX
){
const ratio =
(seg.x1 - seg.x0) !==
0
? (x - seg.x0) / (seg.x1 - seg.x0)
: 0;

return seg.t0 + ratio * seg.dt;
}

}

const prev =
bars[
bars.length - 2
];

const last =
bars[
bars.length - 1
];

const tail =
segmentPlotTimeX(
ts,
prev.time,
last.time
);

if(
tail &&
x >
Math.max(
tail.x0,
tail.x1
)
){

const ratio =
(tail.x1 - tail.x0) !==
0
? (x - tail.x1) / (tail.x1 - tail.x0)
: 0;

return crosshairUnix(
last.time
) + ratio * tail.dt;
}

return null;

}

function isPlotXBeyondLastCandle(
chart,
series,
x
){

const bars =
series?.data?.();

if(
!bars?.length
){
return false;
}

const ts =
chart.timeScale();

const lastX =
ts.timeToCoordinate(
bars[
bars.length - 1
].time
);

if(
Number.isFinite(
lastX
)
){
return x > lastX + 0.5;
}

const logical =
ts.coordinateToLogical?.(
x
);

if(
logical !=
null &&
Number.isFinite(
logical
)
){
return logical > bars.length - 1 + 0.5;
}

return false;

}

function isPlotXBeyondLastCandleLogical(
chart,
series,
x
){

const bars =
series?.data?.();

if(
!bars?.length
){
return false;
}

const logical =
chart.timeScale().coordinateToLogical?.(
x
);

if(
logical ==
null ||
!Number.isFinite(
logical
)
){
return false;
}

return logical > bars.length - 0.5;

}

function isProbeTimeBeyondLastBar(
series,
probeTime
){

const bars =
series?.data?.();

if(
!bars?.length ||
probeTime ==
null
){
return false;
}

const probeTs =
crosshairUnix(
probeTime
);

const lastTs =
crosshairUnix(
bars[
bars.length - 1
].time
);

if(
probeTs ==
null ||
lastTs ==
null
){
return false;
}

return probeTs > lastTs + 1;

}

export function formatCrosshairTimeLabel(
time
){

const ts =
crosshairUnix(time);

if(
ts === null
){
return "";
}

const d =
new Date(ts * 1000);

const weekdays =
[
"вс",
"пн",
"вт",
"ср",
"чт",
"пт",
"сб"
];

const months =
[
"янв.",
"февр.",
"мар.",
"апр.",
"май",
"июн.",
"июл.",
"авг.",
"сен.",
"окт.",
"нояб.",
"дек."
];

const wd =
weekdays[d.getDay()];

const day =
d.getDate();

const mon =
months[d.getMonth()];

const yr =
String(d.getFullYear()).slice(-2);

const hh =
String(d.getHours()).padStart(2, "0");

const mm =
String(d.getMinutes()).padStart(2, "0");

return `${wd} ${day} ${mon} '${yr} ${hh}:${mm}`;

}

function crosshairPriceScaleWidth(
mainChart
){

let gutter =
56;

try{
gutter =
mainChart?.priceScale?.(
"right"
)?.width?.() ||
gutter;
}catch{
/* ignore */
}

return gutter;

}

function updateCrosshairPriceLabel({
priceLabelEl,
plotY,
mainSeries,
mainChart
}){

const y =
plotY;

if(
!priceLabelEl ||
!mainSeries ||
!Number.isFinite(
y
)
){

if(
priceLabelEl
){
priceLabelEl.classList.add(
"hidden"
);
priceLabelEl.style.removeProperty(
"top"
);
priceLabelEl.style.removeProperty(
"width"
);
}

return;
}

const price =
mainSeries.coordinateToPrice?.(
y
);

if(
price == null ||
!Number.isFinite(
price
)
){

priceLabelEl.classList.add(
"hidden"
);
priceLabelEl.style.removeProperty(
"top"
);
priceLabelEl.style.removeProperty(
"width"
);
return;
}

const gutter =
crosshairPriceScaleWidth(
mainChart
);

const refData =
mainSeries?.data?.();
const refPrice =
refData?.[
refData.length -
1
]?.close ??
price;

priceLabelEl.textContent =
formatChartPrice(
price,
refPrice
);
priceLabelEl.style.top =
`${Math.round(y)}px`;
priceLabelEl.style.right =
"0";
priceLabelEl.style.left =
"auto";
priceLabelEl.style.width =
`${gutter}px`;
priceLabelEl.classList.remove(
"hidden"
);

}

export function updateCrosshairAxisLabels({
param,
timeLabelEl,
priceLabelEl = null,
snappedX,
plotY,
mainSeries = null,
mainChart = null
}){

const x =
Number.isFinite(snappedX)
? snappedX
: param.point?.x;

if(
timeLabelEl &&
Number.isFinite(x) &&
param.time !=
null
){

timeLabelEl.textContent =
formatCrosshairTimeLabel(param.time);

timeLabelEl.style.left =
`${Math.round(x)}px`;

timeLabelEl.classList.remove(
"hidden"
);

}else if(
timeLabelEl
){

timeLabelEl.classList.add(
"hidden"
);

timeLabelEl.style.removeProperty(
"left"
);

}

const y =
Number.isFinite(
plotY
)
? plotY
: param.point?.y;

updateCrosshairPriceLabel({
priceLabelEl,
plotY:y,
mainSeries,
mainChart
});

}

export function clearCrosshairAxisLabels(
timeLabelEl,
priceLabelEl = null
){

if(
timeLabelEl
){

timeLabelEl.classList.add(
"hidden"
);

timeLabelEl.style.removeProperty(
"left"
);

}

if(
priceLabelEl
){

priceLabelEl.classList.add(
"hidden"
);
priceLabelEl.style.removeProperty(
"top"
);
priceLabelEl.style.removeProperty(
"width"
);

}

}

export function isUserCrosshairEvent(
param
){

return !!(
param &&
param.sourceEvent
);

}