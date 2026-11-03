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
