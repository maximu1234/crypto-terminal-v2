/**
 * Right price-scale mode: Regular (linear) vs Logarithmic.
 * Factory default stays logarithmic. Terminal can switch via the scale menu.
 */

export const CHART_PRICE_SCALE_MODE_LOGARITHMIC =
"logarithmic";

export const CHART_PRICE_SCALE_MODE_REGULAR =
"regular";

export function normalizeChartPriceScaleMode(
raw
){

return String(
raw ||
""
).trim().toLowerCase() ===
CHART_PRICE_SCALE_MODE_REGULAR
? CHART_PRICE_SCALE_MODE_REGULAR
: CHART_PRICE_SCALE_MODE_LOGARITHMIC;

}

export function lwPriceScaleModeId(
mode
){

const isRegular =
normalizeChartPriceScaleMode(
mode
) ===
CHART_PRICE_SCALE_MODE_REGULAR;

const lw =
globalThis.LightweightCharts?.PriceScaleMode;

if(
lw
){
return isRegular
? (
lw.Normal ??
0
)
: (
lw.Logarithmic ??
1
);
}

return isRegular
? 0
: 1;

}

export function isLwPriceScaleModeLogarithmic(
modeId
){

const lw =
globalThis.LightweightCharts?.PriceScaleMode;

if(
lw &&
lw.Logarithmic !==
undefined &&
modeId ===
lw.Logarithmic
){
return true;
}

if(
lw &&
lw.Normal !==
undefined &&
modeId ===
lw.Normal
){
return false;
}

return modeId ===
1;

}

export function isChartPriceScaleLogarithmic(
chart
){

try{
return isLwPriceScaleModeLogarithmic(
chart.priceScale(
"right"
).options().mode
);
}catch{
return true;
}

}

export function applyChartPriceScaleMode(
chart,
mode
){

if(
!chart
){
return false;
}

const modeId =
lwPriceScaleModeId(
mode
);
let wrote =
false;

try{
chart.applyOptions({
rightPriceScale:{
mode:
modeId
}
});
wrote =
true;
}catch(
err
){
console.warn(
"price scale chart.applyOptions:",
err
);
}

try{
chart.priceScale(
"right"
).applyOptions({
mode:
modeId
});
wrote =
true;
}catch(
err
){
console.warn(
"price scale right.applyOptions:",
err
);
}

return wrote;

}
