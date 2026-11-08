/**
 * Решение, что перерисовывать на тике.
 * История — готовая картинка. Пока свеча та же и цена внутри шкалы,
 * трогаем только последнюю свечу и подпись.
 */

export function sameOhlc(a, b){

return (
!!a &&
!!b &&
a.time === b.time &&
a.open === b.open &&
a.high === b.high &&
a.low === b.low &&
a.close === b.close
);

}

/**
 * @returns {"skip"|"store"|"live"|"rebuild"}
 * skip — тот же бар и те же OHLC, рисовать нечего
 * store — бар обновился за экраном, картинку не трогаем
 * live — только последняя свеча и подпись
 * rebuild — новая свеча или цена вышла за автошкалу
 */
export function liveUpdateKind(
prev,
next,
scale,
liveVisible = true,
autoscale = true
){

if(
!next ||
!Number.isFinite(next.time)
){
return "skip";
}

if(!prev){
return "rebuild";
}

if(next.time < prev.time){
return "skip";
}

if(next.time > prev.time){
return "rebuild";
}

if(sameOhlc(prev, next)){
return "skip";
}

if(!liveVisible){
return "store";
}

if(!autoscale){
return "live";
}

if(
!scale ||
next.high > scale.max ||
next.low < scale.min
){
return "rebuild";
}

return "live";

}

/** Видимый тик рисуем сразу. Ожидание полного кадра линию не держит. */
export function paintsLiveTick(kind){

return kind === "live" || kind === "rebuild";

}

export function candleX(
index,
lastIndex,
plotRight,
rightGap,
barSpacing,
panPx
){

return (
plotRight -
rightGap -
(lastIndex - index) * barSpacing +
panPx
);

}

export function panForAnchor(
index,
x,
lastIndex,
plotRight,
rightGap,
barSpacing
){

return (
x -
(
plotRight -
rightGap -
(lastIndex - index) * barSpacing
)
);

}

/** Пустое место справа: не меньше доли ширины и не меньше отступа в барах. */
export function rightGapPx(barSpacing, rightOffsetBars, plotW, ratio){

const bars =
Math.max(0, Number(rightOffsetBars) || 0) *
Math.max(0, Number(barSpacing) || 0);
const width =
Number(plotW) || 0;
const share =
Number(ratio) || 0;

if(!(share > 0) || !(width > 0)){
return bars;
}

return Math.max(bars, width * share);

}

export function candleIndexAt(
x,
lastIndex,
plotRight,
rightGap,
barSpacing,
panPx
){

if(!(barSpacing > 0)){
return lastIndex;
}

return (
lastIndex -
(
plotRight -
rightGap +
panPx -
x
) / barSpacing
);

}

export function clampPan(
panPx,
count,
plotLeft,
plotRight,
rightGap,
barSpacing
){

if(
!(count > 0) ||
!(barSpacing > 0)
){
return 0;
}

const last =
count - 1;
const minPan =
plotLeft -
(plotRight - rightGap);
const maxPan =
rightGap +
last * barSpacing;

return Math.min(
maxPan,
Math.max(minPan, panPx)
);

}

export function visibleIndexSpan(
count,
plotLeft,
plotRight,
rightGap,
barSpacing,
panPx
){

if(
!(count > 0) ||
!(barSpacing > 0)
){
return {
i0: 0,
i1: -1
};
}

const last =
count - 1;
const iLeft =
candleIndexAt(
plotLeft,
last,
plotRight,
rightGap,
barSpacing,
panPx
);
const iRight =
candleIndexAt(
plotRight,
last,
plotRight,
rightGap,
barSpacing,
panPx
);
const lo =
Math.min(iLeft, iRight);
const hi =
Math.max(iLeft, iRight);

return {
i0: Math.max(
0,
Math.floor(lo) - 1
),
i1: Math.min(
last,
Math.ceil(hi) + 1
)
};

}

export function scaleFromCandles(
candles,
i0,
i1,
padRatio
){

let dataMin =
Infinity;
let dataMax =
-Infinity;
const start =
Math.max(0, i0);
const end =
Math.min(
i1,
candles.length - 1
);

for(
let i = start;
i <= end;
i++
){

const candle =
candles[i];

if(!candle){
continue;
}

/*
 * Ноль и минус на логарифме недопустимы: одна такая свеча
 * переключает всю шкалу в линейную (внизу появляются
 * отрицательные цены) и сжимает нормальные свечи.
 * Следующий сдвиг окна эту свечу выпускает — и картина прыгает.
 */
const low =
candle.low;
const high =
candle.high;

if(
Number.isFinite(low) &&
low > 0 &&
low < dataMin
){
dataMin = low;
}

if(
Number.isFinite(high) &&
high > 0 &&
high > dataMax
){
dataMax = high;
}

}

if(
!Number.isFinite(dataMin) &&
Number.isFinite(dataMax) &&
dataMax > 0
){
dataMin = dataMax;
}

if(
!Number.isFinite(dataMax) &&
Number.isFinite(dataMin) &&
dataMin > 0
){
dataMax = dataMin;
}

if(
!Number.isFinite(dataMin) ||
!Number.isFinite(dataMax)
){
return null;
}

if(dataMax === dataMin){

const pad =
Math.abs(dataMin) * 0.002 ||
1;

return {
min: dataMin - pad,
max: dataMax + pad
};

}

const pad =
(dataMax - dataMin) *
padRatio;

return {
min: dataMin - pad,
max: dataMax + pad
};

}

/**
 * Обычное кручение не должно упираться в стену; ловим только
 * «огненный шланг» трекпада (десятки событий с dt≪кадра).
 * product затухает к 1 — пауза/нормальный темп снова дают полный шаг.
 */
export const WHEEL_ZOOM_EVENT_MAX =
1.35;
export const WHEEL_ZOOM_GESTURE_MAX =
3.5;
export const WHEEL_ZOOM_GESTURE_MS =
220;
export const WHEEL_ZOOM_SENSITIVITY =
0.0012;
/** Полураспад накопленного product к 1, мс. */
export const WHEEL_ZOOM_PRODUCT_DECAY_MS =
70;
/** Ниже этого dt шаг дополнительно глушится (пачка трекпада). */
export const WHEEL_ZOOM_BURST_DT_MS =
14;

/**
 * @param {number} dyPx уже нормализованный deltaY (вниз +, вверх −)
 * @param {number} gestureProduct накопленный factor жеста (1 = старт)
 * @param {number} [dtMs] мс с прошлого zoom-события
 * @returns {{ factor: number, product: number }}
 */
export function clampWheelZoomStep(
dyPx,
gestureProduct =
1,
dtMs =
Infinity
){

const dy =
Number(dyPx) ||
0;
let product =
Number.isFinite(gestureProduct) &&
gestureProduct >
0
? gestureProduct
: 1;
const dt =
Number(dtMs);

if(
Number.isFinite(dt) &&
dt >
0 &&
product !==
1
){
const keep =
Math.exp(
-dt /
WHEEL_ZOOM_PRODUCT_DECAY_MS
);
product =
1 +
(product - 1) *
keep;
}

if(
!(
Math.abs(dy) >
0
)
){
return {
factor: 1,
product
};
}

const raw =
Math.exp(
-dy * WHEEL_ZOOM_SENSITIVITY
);
const eventMin =
1 /
WHEEL_ZOOM_EVENT_MAX;
let factor =
Math.min(
WHEEL_ZOOM_EVENT_MAX,
Math.max(
eventMin,
raw
)
);

/*
 * Пачка событий с dt < 14ms: оставляем долю шага.
 * Обычный notch / спокойный трекпад (dt≳16) — полный factor.
 */
if(
Number.isFinite(dt) &&
dt >=
0 &&
dt <
WHEEL_ZOOM_BURST_DT_MS
){
const damp =
Math.max(
0.2,
dt /
WHEEL_ZOOM_BURST_DT_MS
);
factor =
1 +
(factor - 1) *
damp;
}

const next =
product * factor;
const gestureMin =
1 /
WHEEL_ZOOM_GESTURE_MAX;

if(
next >
WHEEL_ZOOM_GESTURE_MAX
){
factor =
WHEEL_ZOOM_GESTURE_MAX /
product;
}else if(
next <
gestureMin
){
factor =
gestureMin /
product;
}

if(
!(
factor >
0
) ||
!Number.isFinite(factor)
){
return {
factor: 1,
product
};
}

return {
factor,
product:
product * factor
};

}

/**
 * Ширина свечи, при которой в окне помещается ровно bars баров.
 * Та же формула, что у установки видимого диапазона: правый запас
 * не даёт отдалить сильнее, чем вид при загрузке.
 */
export function zoomOutFloorSpacing(
plotW,
bars,
rightOffsetBars,
rightMarginRatio
){

const width =
Math.max(
1,
Number(plotW) || 0
);
const content =
Math.max(
1,
Number(bars) || 0
);
const offset =
Math.max(
0,
Number(rightOffsetBars) || 0
);
const ratio =
Math.min(
0.35,
Math.max(
0,
Number(rightMarginRatio) || 0
)
);
let spacing =
width / (content + offset);

if(
ratio > 0 &&
offset * spacing < width * ratio
){
spacing =
(width * (1 - ratio)) / content;
}

return Math.min(
500,
Math.max(0.01, spacing)
);

}

/** Шаги оси времени (сек) — как у TradingView: метка привязана ко времени, не к слоту экрана. */
const TIME_AXIS_STEPS_SEC =
[
60,
120,
300,
600,
900,
1800,
3600,
7200,
10800,
14400,
21600,
43200,
86400,
172800,
604800,
1209600,
2592000
];

function pickTimeAxisStepSec(
spanSec,
targetCount
){

const raw =
Math.max(
1,
Number(spanSec) || 1
) / Math.max(1, targetCount);

for(const step of TIME_AXIS_STEPS_SEC){

if(step >= raw){
return step;
}

}

return TIME_AXIS_STEPS_SEC[
TIME_AXIS_STEPS_SEC.length - 1
];

}

/**
 * Не прыгать 7д↔14д на каждом кадре пана — иначе подписи
 * «раздваиваются» на скринере/zoom.
 */
export function stickTimeAxisStepSec(
idealStep,
preferredStep,
spanSec,
targetCount
){

const ideal =
Number(idealStep) || 0;
const preferred =
Number(preferredStep) || 0;

if(!(preferred > 0) || preferred === ideal){
return ideal;
}

const idx =
TIME_AXIS_STEPS_SEC.indexOf(ideal);
const pidx =
TIME_AXIS_STEPS_SEC.indexOf(preferred);

if(idx < 0 || pidx < 0 || Math.abs(idx - pidx) > 1){
return ideal;
}

const target =
Math.max(1, Number(targetCount) || 1);
const count =
Math.max(1, Number(spanSec) || 1) / preferred;

if(
count >= target * 0.55 &&
count <= target * 1.85
){
return preferred;
}

return ideal;

}

function alignTimeAxisSec(
sec,
stepSec
){

const step =
Math.max(1, Math.floor(Number(stepSec) || 1));
const date =
new Date(Number(sec) * 1000);

if(!Number.isFinite(date.getTime())){
return Math.floor(Number(sec) || 0);
}

if(step >= 86400){

const dayStep =
Math.max(1, Math.round(step / 86400));

/*
 * Сетка должна быть стабильной относительно эпохи.
 * Если выравнивать к «полуночи текущего timeLeft», при панорамировании
 * фаза 7/14-дневных меток прыгает — подписи «стоят на месте»,
 * пока свечи уже уехали (Terminal/Скринер на широком зуме).
 */
if(dayStep === 1){
date.setHours(0, 0, 0, 0);
return Math.floor(date.getTime() / 1000);
}

const utcDay =
Math.floor(Number(sec) / 86400);

return (
Math.floor(utcDay / dayStep) *
dayStep *
86400
);

}

if(step >= 3600){

const stepHours =
Math.max(1, Math.round(step / 3600));

date.setMinutes(0, 0, 0);
date.setHours(
Math.floor(date.getHours() / stepHours) *
stepHours
);

return Math.floor(date.getTime() / 1000);

}

const stepMin =
Math.max(1, Math.round(step / 60));

date.setSeconds(0, 0);
date.setMinutes(
Math.floor(date.getMinutes() / stepMin) *
stepMin
);

return Math.floor(date.getTime() / 1000);

}

/**
 * Метки оси времени по видимому диапазону.
 * Возвращает unix-sec; вызывающий сам переводит в x — тогда подписи едут с паном.
 */
export function niceTimeAxisTimes(
fromSec,
toSec,
plotW,
minLabelPx = 72,
preferredStep = 0
){

const t0 =
Number(fromSec);
const t1 =
Number(toSec);

if(
!Number.isFinite(t0) ||
!Number.isFinite(t1) ||
t1 <= t0
){
const empty =
[];
empty.step = 0;
return empty;
}

const width =
Math.max(1, Number(plotW) || 1);
const minPx =
Math.max(32, Number(minLabelPx) || 72);
const target =
Math.max(
2,
Math.floor(width / minPx)
);
const ideal =
pickTimeAxisStepSec(t1 - t0, target);
const step =
stickTimeAxisStepSec(
ideal,
preferredStep,
t1 - t0,
target
);
let cursor =
alignTimeAxisSec(t0, step);
let bump =
0;

while(
cursor < t0 &&
bump < 64
){
cursor += step;
bump += 1;
}

const out =
[];
const guard =
Math.max(8, target * 4);

for(
let n = 0;
n < guard && cursor <= t1 + step * 0.01;
n++
){

if(cursor >= t0 - 1 && cursor <= t1 + 1){
out.push(cursor);
}

cursor += step;

}

out.step = step;
return out;

}
