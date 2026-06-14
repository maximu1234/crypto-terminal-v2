function trimTrailingZeros(value){

if(!value.includes(".")){
return value;
}

return value
.replace(/(\.\d*?)0+$/, "$1")
.replace(/\.$/, "");

}

function addThousandsSeparators(value){

const parts =
value.split(".");

parts[0] =
parts[0].replace(
/\B(?=(\d{3})+(?!\d))/g,
","
);

return parts.length > 1
? parts.join(".")
: parts[0];

}

export function formatPrice(price){

if(!Number.isFinite(price)){
return "";
}

const negative =
price < 0;

const abs =
Math.abs(price);

let formatted;

if(abs >= 1000){
formatted = abs.toFixed(2);
}else if(abs >= 1){
formatted = trimTrailingZeros(abs.toFixed(4));
}else if(abs >= 0.01){
formatted = trimTrailingZeros(abs.toFixed(6));
}else{
formatted = trimTrailingZeros(abs.toFixed(8));
}

const withCommas =
addThousandsSeparators(formatted);

return negative
? `-${withCommas}`
: withCommas;

}

export function priceFormatForValue(referencePrice){

const abs =
Math.abs(referencePrice) || 1;

let minMove;

if(abs >= 1000){
minMove = 0.01;
}else if(abs >= 1){
minMove = 0.0001;
}else if(abs >= 0.01){
minMove = 0.000001;
}else{
minMove = 0.00000001;
}

return {

type:"custom",
formatter:formatPrice,
minMove

};

}

export function applyChartPriceFormat(series, referencePrice){

series.applyOptions({

priceFormat:
priceFormatForValue(referencePrice)

});

}

export const CHART_PRICE_SCALE_WIDTH = 48;

/** iPad / touch — чуть шире для пальца */
export const CHART_PRICE_SCALE_WIDTH_TOUCH = 56;

/** Высота полосы шкалы времени LW (px) — overlay/strip не перекрывают */
export const CHART_TIME_SCALE_HEIGHT = 28;

export const CHART_SCALE_TEXT_COLOR = "#d1d5db";

/** Текст на светлой плашке ценовой шкалы (линии, алерты, светлые цвета). */
export const CHART_SCALE_TEXT_ON_LIGHT_BG =
"#1e293b";

export const CHART_SCALE_FONT_SIZE = 11;

export const CHART_SCALE_FONT_SIZE_TOUCH = 12;

export const CHART_SCALE_FONT_FAMILY =
"-apple-system, BlinkMacSystemFont, 'Trebuchet MS', Roboto, Ubuntu, sans-serif";

const CHART_SCALE_TICK_LENGTH = 5;

const CHART_SCALE_PADDING_INNER =
CHART_SCALE_FONT_SIZE / 12 * CHART_SCALE_TICK_LENGTH;

export const CHART_SCALE_LABEL_PAD_LEFT =
CHART_SCALE_TICK_LENGTH + CHART_SCALE_PADDING_INNER;

export const CHART_SCALE_LABEL_LINE_HEIGHT =
CHART_SCALE_FONT_SIZE + 4;

export function chartScaleFont(){

return `${effectiveChartScaleFontSize()}px ${CHART_SCALE_FONT_FAMILY}`;

}

function parseColorToRgb(
color
){

const raw =
String(color || "").trim();

if(!raw){
return null;
}

if(
raw.startsWith("#")
){

let hex =
raw.slice(1);

if(
hex.length === 3
){
hex =
hex
.split("")
.map(ch=>ch + ch)
.join("");
}

if(
hex.length < 6
){
return null;
}

const r =
parseInt(
hex.slice(0, 2),
16
);
const g =
parseInt(
hex.slice(2, 4),
16
);
const b =
parseInt(
hex.slice(4, 6),
16
);

if(
[r, g, b].some(n=>Number.isNaN(n))
){
return null;
}

return { r, g, b };

}

const rgbMatch =
raw.match(
/^rgba?\(\s*([\d.]+)\s*,\s*([\d.]+)\s*,\s*([\d.]+)/
);

if(rgbMatch){

return {
r: Number(rgbMatch[1]),
g: Number(rgbMatch[2]),
b: Number(rgbMatch[3])
};

}

return null;

}

function relativeLuminance(
rgb
){

const channel =
c=>{

const v =
c / 255;

return v <= 0.03928
? v / 12.92
: Math.pow(
(v + 0.055) / 1.055,
2.4
);

};

return (
0.2126 * channel(rgb.r) +
0.7152 * channel(rgb.g) +
0.0722 * channel(rgb.b)
);

}

/**
 * Светлый фон плашки → тёмные цифры; тёмный фон → светлые (как шкала).
 */
export function scaleLabelTextColorForBackground(
bgColor
){

const rgb =
parseColorToRgb(bgColor);

if(!rgb){
return CHART_SCALE_TEXT_COLOR;
}

return relativeLuminance(rgb) > 0.45
? CHART_SCALE_TEXT_ON_LIGHT_BG
: CHART_SCALE_TEXT_COLOR;

}

export function chartScaleTextLeftPx(){

return CHART_SCALE_LABEL_PAD_LEFT;

}

const TV_CROSSHAIR_COLOR =
"#758696";

const TV_CROSSHAIR_LABEL_BG =
"#363A45";

function crosshairLineOptions(
labelVisible = true
){

const Dashed =
LightweightCharts.LineStyle?.Dashed ?? 2;

return {
color:TV_CROSSHAIR_COLOR,
width:1,
style:Dashed,
labelVisible,
labelBackgroundColor:TV_CROSSHAIR_LABEL_BG
};

}

function rsiCrosshairOptions(){

const Hidden =
LightweightCharts.CrosshairMode?.Hidden ?? 2;

return {
mode:Hidden
};

}

export function hiddenCrosshairOptions(){

return rsiCrosshairOptions();

}

export function normalCrosshairOptions(){

const Normal =
LightweightCharts.CrosshairMode?.Normal ?? 0;

/* Вертикаль — только DOM #linked-crosshair-vert (иначе двойная линия при смене свечи). */
return {
mode:Normal,
vertLine:{
visible:false,
labelVisible:false
},
horzLine:crosshairLineOptions(true)
};

}

/**
 * /coins и виджеты: крест только DOM (вертикаль #linked-crosshair-vert или .chart-dom-crosshair-*).
 * LW-линии дают другой штрих (горизонталь часто выглядит dotted).
 */
export function mainChartCrosshairOptions(){

const Normal =
LightweightCharts.CrosshairMode?.Normal ?? 0;

return {
mode:Normal,
vertLine:{
visible:false,
labelVisible:false
},
horzLine:{
visible:false,
labelVisible:false
}
};

}

/** Виджеты / touch: обе линии LW (нет отдельного DOM-оверлея в #charts-stack). */
export function fullCrosshairOptions(){

const Normal =
LightweightCharts.CrosshairMode?.Normal ?? 0;

return {
mode:Normal,
vertLine:crosshairLineOptions(
true
),
horzLine:crosshairLineOptions(
true
)
};

}

export function tabletProbeCrosshairOptions(){

const Normal =
LightweightCharts.CrosshairMode?.Normal ?? 0;

/* iPad probe: обе линии только DOM (#linked-crosshair-vert + .chart-dom-crosshair-horz) */
return {
mode:Normal,
vertLine:{
visible:false,
labelVisible:false
},
horzLine:{
visible:false,
labelVisible:false
}
};

}

/** Bluetooth-мышь / трекпад на iPad — (any-pointer: fine). */
export function hasAnyFinePointer(){

try{
return window.matchMedia(
"(any-pointer: fine)"
).matches;
}catch{
return false;
}

}

let finePointerMediaBound =
false;

export function syncTabletFinePointerClass(){

if(
typeof document ===
"undefined"
){
return;
}

document.body.classList.toggle(
"tablet-fine-pointer",
isTabletChartViewport() &&
hasAnyFinePointer()
);

}

export function bindFinePointerMedia(){

if(
finePointerMediaBound ||
typeof window ===
"undefined" ||
!window.matchMedia
){
return;
}

finePointerMediaBound =
true;

const mq =
window.matchMedia(
"(any-pointer: fine)"
);

const sync =
()=>{
syncTabletFinePointerClass();
};

if(
typeof mq.addEventListener ===
"function"
){
mq.addEventListener(
"change",
sync
);
}else if(
typeof mq.addListener ===
"function"
){
mq.addListener(
sync
);
}

window.addEventListener(
"pointerdown",
sync,
true
);

}

/** Смартфон / планшет с touch — отдельно от isTabletChartViewport (≥768px). */
export function isCoarseTouchViewport(){

return (
window.matchMedia(
"(pointer: coarse)"
).matches &&
navigator.maxTouchPoints >=
1
);

}

export function effectiveChartPriceScaleWidth(){

return isCoarseTouchViewport()
? CHART_PRICE_SCALE_WIDTH_TOUCH
: CHART_PRICE_SCALE_WIDTH;

}

export function effectiveChartScaleFontSize(){

return isCoarseTouchViewport()
? CHART_SCALE_FONT_SIZE_TOUCH
: CHART_SCALE_FONT_SIZE;

}

export function isTabletChartViewport(){

if(
window.matchMedia(
"(pointer: coarse) and (min-width: 768px)"
).matches
){
return true;
}

if(
navigator.maxTouchPoints <
1
){
return false;
}

if(
!window.matchMedia(
"(min-width: 768px)"
).matches
){
return false;
}

const ua =
navigator.userAgent ||
"";

if(
/iPad/i.test(
ua
)
){
return true;
}

if(
navigator.platform ===
"MacIntel" &&
"ontouchend" in
document
){
return true;
}

return false;

}

export const CHART_LAYOUT_BG_FALLBACK =
"#141721";

/** Фон LW-графиков; совпадает с --app-chart-bg в critical-shell.css */
export function getChartLayoutBgColor(){

if(
typeof document !==
"undefined"
){

const css =
getComputedStyle(
document.documentElement
).getPropertyValue(
"--app-chart-bg"
).trim();

if(
css
){
return css;
}

}

return CHART_LAYOUT_BG_FALLBACK;

}