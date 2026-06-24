export const CHART_RULER_COLOR_UP =
"#2962FF";

export const CHART_RULER_COLOR_DOWN =
"#E64C4C";

export const CHART_RULER_LINE_WIDTH =
1;

export const CHART_RULER_ARROW_LEN =
5;

export const CHART_RULER_ARROW_HALF =
2.5;

/** Горизонт «плечи» у курсора: ±N px от точки измерения. */
export const CHART_RULER_SHOULDER_HALF =
20;

export function chartRulerShoulderSpan(
cursorX,
half = CHART_RULER_SHOULDER_HALF
){

const x =
Number(
cursorX
);

if(
!Number.isFinite(
x
)
){
return null;
}

return {
x0:
x -
half,
x1:
x +
half
};

}

export function tfPeriodSec(
tf
){

const map = {
"1":60,
"5":300,
"15":900,
"60":3600,
"240":14400,
"D":86400,
"W":604800
};

return map[
tf
] ||
900;

}

export function candleIndexAtOrBefore(
candles,
time
){

if(
!candles?.length
){
return 0;
}

if(
time <=
candles[
0
].time
){
return 0;
}

let lo =
0;
let hi =
candles.length -
1;

if(
time >=
candles[
hi
].time
){
return hi;
}

while(
lo <
hi
){

const mid =
Math.ceil(
(lo + hi) /
2
);

if(
candles[
mid
].time <=
time
){
lo = mid;
}else{
hi = mid - 1;
}

}

return lo;

}

export function countBarsBetween(
candles,
timeA,
timeB
){

if(
!candles?.length
){
return 0;
}

const iA =
candleIndexAtOrBefore(
candles,
timeA
);
const iB =
candleIndexAtOrBefore(
candles,
timeB
);

return Math.abs(
iB - iA
);

}

export function formatRulerDuration(
seconds
){

const s =
Math.abs(
Math.round(
seconds
)
);

if(
s <
60
){
return "0 мин";
}

if(
s <
3600
){

const m =
Math.max(
1,
Math.round(
s / 60
)
);

return `${m} мин`;

}

if(
s <
86400
){

const h =
Math.max(
1,
Math.round(
s / 3600
)
);

return `${h}ч`;

}

const d =
Math.max(
1,
Math.round(
s / 86400
)
);

return `${d}д`;

}

export function formatRulerPercent(
pct
){

const sign =
pct >
0
? "+"
:pct <
0
? "-"
:"";

const abs =
Math.abs(
pct
).toFixed(
2
);

return `${sign}${abs}%`;

}

export function computeChartRulerMetrics(
start,
end,
candles
){

const startPrice =
start?.price;
const endPrice =
end?.price;

let pct =
0;

if(
Number.isFinite(
startPrice
) &&
startPrice !==
0 &&
Number.isFinite(
endPrice
)
){
pct =
((
endPrice - startPrice
) /
startPrice) *
100;
}

const bars =
countBarsBetween(
candles,
start?.time,
end?.time
);

const deltaSec =
Math.abs(
(end?.time ??
0) -
(start?.time ??
0)
);

return {
pct,
bars,
deltaSec,
pctLabel: formatRulerPercent(
pct
),
durationLabel: formatRulerDuration(
deltaSec
),
barsLabel: `${bars} bars, ${formatRulerDuration(deltaSec)}`
};

}

export const CHART_RULER_LABEL_CROSSHAIR_SHIFT =
10;

export const CHART_RULER_LABEL_CURSOR_GAP =
16;

export function ensureChartRulerLabelEl(
wrapEl
){

if(
!wrapEl
){
return null;
}

let el =
wrapEl.querySelector(
".chart-ruler-label"
);

if(
el
){
return el;
}

el =
document.createElement(
"div"
);

el.className =
"chart-ruler-label hidden";

el.setAttribute(
"aria-hidden",
"true"
);

el.innerHTML =
`<div class="chart-ruler-label-inner"><div class="chart-ruler-label-pct"></div><div class="chart-ruler-label-meta"></div></div>`;

wrapEl.appendChild(
el
);

return el;

}

export function hideChartRulerLabelEl(
el
){

if(
!el
){
return;
}

el.classList.add(
"hidden"
);

}

export function updateChartRulerLabelEl(
el,
{

bx,
by,
goesDown,
metrics,
plotW,
plotH

}
){

if(
!el ||
!metrics
){
return;
}

if(
!Number.isFinite(
bx
) ||
!Number.isFinite(
by
)
){
hideChartRulerLabelEl(
el
);
return;
}

el.querySelector(
".chart-ruler-label-pct"
).textContent =
metrics.pctLabel;

el.querySelector(
".chart-ruler-label-meta"
).textContent =
metrics.barsLabel;

el.style.left =
`${Math.round(bx)}px`;

el.style.top =
`${Math.round(by)}px`;

el.classList.toggle(
"chart-ruler-label--below",
!!goesDown
);

const inner =
el.querySelector(
".chart-ruler-label-inner"
);

if(
inner
){
inner.classList.toggle(
"chart-ruler-label-inner--up",
!goesDown
);
inner.classList.toggle(
"chart-ruler-label-inner--down",
!!goesDown
);
}

el.classList.remove(
"hidden"
);

if(
!inner
){
return;
}

const maxW =
Number.isFinite(
plotW
) &&
plotW >
0
? plotW
:0;

const maxH =
Number.isFinite(
plotH
) &&
plotH >
0
? plotH
:0;

if(
!maxW ||
!maxH
){

const shift =
CHART_RULER_LABEL_CROSSHAIR_SHIFT;
const gap =
CHART_RULER_LABEL_CURSOR_GAP;

inner.style.left =
`${shift}px`;
inner.style.top =
goesDown
? `${gap}px`
:`calc(-100% - ${gap}px)`;

return;

}

const shift =
CHART_RULER_LABEL_CROSSHAIR_SHIFT;
const gap =
CHART_RULER_LABEL_CURSOR_GAP;
const rect =
inner.getBoundingClientRect();
const wrapRect =
el.parentElement?.getBoundingClientRect();

if(
!wrapRect
){
return;
}

let innerLeft =
shift;
let innerTop =
goesDown
? gap
:(
-gap - rect.height
);

let absLeft =
bx + innerLeft;
let absTop =
by + innerTop;

if(
absLeft + rect.width >
maxW
){
innerLeft =
Math.max(
4 - bx,
maxW - rect.width - bx - 4
);
}

if(
absLeft <
4
){
innerLeft =
4 - bx;
}

if(
!goesDown &&
absTop <
4
){
innerTop =
4 - by;
}else if(
goesDown &&
absTop + rect.height >
maxH - 4
){
innerTop =
maxH - 4 - rect.height - by;
}

inner.style.left =
`${Math.round(innerLeft)}px`;
inner.style.top =
`${Math.round(innerTop)}px`;

}

function drawSmallArrow(
ctx,
x,
y,
angle,
color
){

const len =
CHART_RULER_ARROW_LEN;
const half =
CHART_RULER_ARROW_HALF;

ctx.save();
ctx.translate(
x,
y
);
ctx.rotate(
angle
);
ctx.fillStyle = color;
ctx.beginPath();
ctx.moveTo(
0,
0
);
ctx.lineTo(
-len,
-half
);
ctx.lineTo(
-len,
half
);
ctx.closePath();
ctx.fill();
ctx.restore();

}

export function chartRulerColorForDirection(
goesDown
){

return goesDown
? CHART_RULER_COLOR_DOWN
:CHART_RULER_COLOR_UP;

}

export function isChartRulerGoingDown(
startXY,
endXY
){

return (
endXY?.y ??
0
) > (
startXY?.y ??
0
);

}

/**
 * L-линейка: горизонталь (время) от start, вертикаль (цена) к end;
 * «плечи» — короткая горизонталь ±20px у курсора.
 * Плашка — отдельный DOM (.chart-ruler-label), см. updateChartRulerLabelEl.
 */
export function crispCanvasLineCoord(
value
){

return Math.round(
Number(
value
)
) +
0.5;

}

export function drawChartRuler(
ctx,
startXY,
endXY,
goesDown
){

if(
!startXY ||
!endXY
){
return;
}

const ax =
crispCanvasLineCoord(
startXY.x
);
const ay =
crispCanvasLineCoord(
startXY.y
);
const bx =
crispCanvasLineCoord(
endXY.x
);
const by =
crispCanvasLineCoord(
endXY.y
);

const color =
chartRulerColorForDirection(
goesDown
);

ctx.save();
ctx.strokeStyle = color;
ctx.lineWidth = CHART_RULER_LINE_WIDTH;
ctx.setLineDash(
[]
);

ctx.beginPath();
ctx.moveTo(
ax,
ay
);
ctx.lineTo(
bx,
ay
);
ctx.stroke();

ctx.beginPath();
ctx.moveTo(
bx,
ay
);
ctx.lineTo(
bx,
by
);
ctx.stroke();

const horizAngle =
bx >=
ax
? 0
:Math.PI;
const vertAngle =
by <=
ay
? -Math.PI / 2
:Math.PI / 2;

drawSmallArrow(
ctx,
bx,
ay,
horizAngle,
color
);
drawSmallArrow(
ctx,
bx,
by,
vertAngle,
color
);

const shoulder =
chartRulerShoulderSpan(
bx
);

if(
shoulder
){

ctx.beginPath();
ctx.moveTo(
shoulder.x0,
by
);
ctx.lineTo(
shoulder.x1,
by
);
ctx.stroke();

}

ctx.beginPath();
ctx.arc(
ax,
ay,
4,
0,
Math.PI *
2
);
ctx.strokeStyle = color;
ctx.lineWidth = CHART_RULER_LINE_WIDTH;
ctx.stroke();

ctx.restore();

}
