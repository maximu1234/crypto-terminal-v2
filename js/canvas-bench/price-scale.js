/**
 * Правая шкала цены как у графика Терминала:
 * по умолчанию логарифм, данные с отступом 12% сверху и снизу.
 */

export const PRICE_SCALE_LOG =
"logarithmic";

export const PRICE_SCALE_REGULAR =
"regular";

export const PRICE_SCALE_MARGIN =
0.12;

export function expandPriceScale(
dataMin,
dataMax,
mode
){

const margin =
PRICE_SCALE_MARGIN;
const inner =
1 - margin * 2;

if(
!(dataMax >= dataMin) ||
!Number.isFinite(dataMin) ||
!Number.isFinite(dataMax)
){
return null;
}

if(
mode === PRICE_SCALE_LOG &&
dataMin > 0 &&
dataMax > 0
){

const lo =
Math.log(dataMin);
const hi =
Math.log(dataMax);
const span =
hi - lo ||
Math.abs(lo) * 0.002 ||
0.002;
const pad =
span * margin / inner;

return {
min: Math.exp(lo - pad),
max: Math.exp(hi + pad)
};

}

const span =
dataMax - dataMin ||
Math.abs(dataMin) * 0.002 ||
1;
const pad =
span * margin / inner;

return {
min: dataMin - pad,
max: dataMax + pad
};

}

export function priceToY(
price,
scale,
plotTop,
plotH,
mode
){

if(
mode === PRICE_SCALE_LOG &&
scale.min > 0 &&
scale.max > 0 &&
price > 0
){

const lo =
Math.log(scale.min);
const hi =
Math.log(scale.max);
const span =
hi - lo || 1;

return (
plotTop +
(hi - Math.log(price)) / span * plotH
);

}

const span =
scale.max - scale.min || 1;

return (
plotTop +
(scale.max - price) / span * plotH
);

}

export function yToPrice(
y,
scale,
plotTop,
plotH,
mode
){

const ratio =
(y - plotTop) / (plotH || 1);

if(
mode === PRICE_SCALE_LOG &&
scale.min > 0 &&
scale.max > 0
){

const hi =
Math.log(scale.max);
const lo =
Math.log(scale.min);

return Math.exp(
hi - ratio * (hi - lo)
);

}

return (
scale.max -
ratio * (scale.max - scale.min)
);

}

/** factor > 1 приближает. price остаётся на той же доле высоты. */
export function zoomPriceScale(
scale,
price,
yRatio,
factor,
mode
){

const f =
Math.min(
8,
Math.max(0.125, factor)
);
const ratio =
Math.min(
1,
Math.max(0, yRatio)
);

if(
mode === PRICE_SCALE_LOG &&
scale.min > 0 &&
scale.max > 0 &&
price > 0
){

const span =
(
Math.log(scale.max) -
Math.log(scale.min)
) / f;
const logPrice =
Math.log(price);
const hi =
logPrice + ratio * span;

return {
min: Math.exp(hi - span),
max: Math.exp(hi)
};

}

const span =
(scale.max - scale.min) / f;
const hi =
price + ratio * span;

return {
min: hi - span,
max: hi
};

}

/** Сдвиг окна цены. dy > 0 (мышь вниз) уводит свечи вниз. */
export function shiftPriceScale(
scale,
dy,
plotH,
mode
){

const ratio =
dy / (plotH || 1);

if(
mode === PRICE_SCALE_LOG &&
scale.min > 0 &&
scale.max > 0
){

const lo =
Math.log(scale.min);
const hi =
Math.log(scale.max);
const shift =
ratio * (hi - lo);

return {
min: Math.exp(lo + shift),
max: Math.exp(hi + shift)
};

}

const shift =
ratio * (scale.max - scale.min);

return {
min: scale.min + shift,
max: scale.max + shift
};

}

function cleanTick(price){

return Number(price.toPrecision(12));

}

function tickPixel(price, min, max, height, mode){

if(
mode === PRICE_SCALE_LOG &&
min > 0 &&
max > 0 &&
price > 0
){

const lo = Math.log(min);
const hi = Math.log(max);

return (hi - Math.log(price)) / (hi - lo || 1) * height;

}

return (max - price) / (max - min || 1) * height;

}

/*
 * Метки как в Lightweight Charts 4.1.3 (metka-221):
 * PriceTickSpanCalculator + PriceTickMarkBuilder.rebuildTickMarks.
 * Шаг из ряда 1-2-5, три порядка делителей, берётся меньший.
 * Обычная шкала: один шаг на весь диапазон.
 * Логарифм: после каждой принятой цены шаг считается заново
 * от неё до низа. Слишком близкая к предыдущей метка пропускается.
 */
const TICK_EPS = 1e-14;
const TICK_DENSITY = 2.5;
const AXIS_FONT_PX = 11;
const TICK_DIVIDERS = [
[2, 2.5, 2],
[2, 2, 2.5],
[2.5, 2, 2]
];
const FRACTIONAL_DIVIDERS = [2, 2.5, 2];

function atLeast(value, limit){

return value > limit - TICK_EPS;

}

function tickSpanWith(high, low, maxTickSpan, dividers){

const minMovement = 1e-12;
const span = high - low;

if(!(span > 0) || !Number.isFinite(span)){
return span;
}

let result =
10 ** Math.max(
0,
Math.ceil(Math.log10(span))
);
let index = 0;
let divider = dividers[0];

while(
atLeast(result, minMovement) &&
result > minMovement + TICK_EPS &&
atLeast(result, maxTickSpan * divider) &&
atLeast(result, 1)
){
result /= divider;
divider = dividers[++index % dividers.length];
}

if(result <= minMovement + TICK_EPS){
result = minMovement;
}

result = Math.max(1, result);

if(Math.abs(result - 1) < TICK_EPS){
index = 0;
divider = FRACTIONAL_DIVIDERS[0];

while(
atLeast(result, maxTickSpan * divider) &&
result > minMovement + TICK_EPS
){
result /= divider;
divider =
FRACTIONAL_DIVIDERS[++index % FRACTIONAL_DIVIDERS.length];
}

}

return result;

}

function priceTickSpan(high, low, height){

const markHeight =
Math.ceil(AXIS_FONT_PX * TICK_DENSITY);
const maxTickSpan =
(high - low) * markHeight / Math.max(1, height);
let best =
Infinity;

for(const dividers of TICK_DIVIDERS){

best = Math.min(
best,
tickSpanWith(high, low, maxTickSpan, dividers)
);

}

return best;

}

export function nicePriceTicks(min, max, plotH, mode){

if(!(max > min) || !Number.isFinite(min) || !Number.isFinite(max)){
return [];
}

const height =
Math.max(1, plotH || 1);
const log =
mode === PRICE_SCALE_LOG &&
min > 0 &&
max > 0;
const markHeight =
Math.ceil(AXIS_FONT_PX * TICK_DENSITY);
let span =
priceTickSpan(max, min, height);

if(!(span > 0) || !Number.isFinite(span)){
return [];
}

let mod =
max % span;

if(mod < 0){
mod += span;
}

const ticks =
[];
let prevY =
null;
let price =
max - mod;

for(let guard = 0; price > min && guard < 80; guard++){

const y =
tickPixel(price, min, max, height, mode);
const crowded =
prevY != null &&
Math.abs(y - prevY) < markHeight;

if(
!crowded &&
price > min &&
price < max
){
ticks.push(cleanTick(price));
prevY = y;

if(log){
span = priceTickSpan(price, min, height);

if(!(span > 0) || !Number.isFinite(span)){
break;
}

}

}

price -= span;

}

return ticks;

}
