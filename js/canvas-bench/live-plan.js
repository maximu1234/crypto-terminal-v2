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
