/**
 * Long/short position tool — placement, clamp, canvas draw.
 * Extracted from drawings/init.js.
 */
import {
POSITION_ENTRY_COLOR,
POSITION_TP_FILL,
POSITION_SL_FILL,
POSITION_SCALE_TP_BG,
POSITION_SCALE_SL_BG,
POSITION_SCALE_ENTRY_BG,
POSITION_DEFAULT_TP_PCT,
POSITION_DEFAULT_SL_PCT,
POSITION_DEFAULT_TP_ZONE_PX,
POSITION_DEFAULT_SL_ZONE_PX,
POSITION_DEFAULT_WIDTH_BARS,
POSITION_RR_LABEL_SAMPLE
} from "./constants.js?v=10";

import {
formatMoneyUsd,
formatVolumeUsd
} from "../position-sizing.js?v=3";

import {
positionEntryPrice,
positionXBounds as resolvePositionXBounds,
positionMetrics,
positionSizingFromShape,
initialPositionTpSlPercent,
clampPositionPrices as clampPositionPricesPure,
formatPositionPrice
} from "./position.js?v=9";

/**
 * @param {{
 *   canvas: HTMLCanvasElement,
 *   series: { priceToCoordinate: Function, coordinateToPrice: Function },
 *   toXY: Function,
 *   plotPriceToCoordinate: Function,
 *   candleSeries: () => Array,
 *   normalizeTime: Function,
 *   chartSize: () => { w: number, h: number }
 * }} deps
 */
export function createPositionDraw(deps){

const {
canvas,
series,
toXY,
plotPriceToCoordinate,
candleSeries,
normalizeTime,
chartSize
} = deps;

const positionXBounds =
shape =>
resolvePositionXBounds(
shape,
toXY
);

function positionBadgeFont(){

return '600 11px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Arial, sans-serif';

}

function positionBadgeFontEntry(){

return '600 10px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Arial, sans-serif';

}

function positionBadgeFontVolume(){

return '800 14px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Arial, sans-serif';

}

const POSITION_VOLUME_COLOR = "#FEF08C";

function resolvePositionBadgeFont(kind, variant){

if(kind === "volume"){
return positionBadgeFontVolume();
}

if(kind === "badge"){
return positionBadgeFont();
}

if(
kind === "tp" ||
kind === "sl" ||
kind === "long-center" ||
kind === "short-center"
){
return positionBadgeFont();
}

if(kind === "entry"){
return positionBadgeFontEntry();
}

if(variant === "entry"){
return positionBadgeFontEntry();
}

return positionBadgeFont();

}

function positionMinWidthPx(){

const ctx =
canvas.getContext("2d");

if(!ctx){
return 220;
}

ctx.save();
ctx.font = positionBadgeFont();

const w =
ctx.measureText(POSITION_RR_LABEL_SAMPLE).width + 28;

ctx.restore();
return Math.ceil(w);

}

function candleBarStepSec(){

const candles =
candleSeries();

if(
candles.length <
2
){
return 3600;
}

const last =
candles[
candles.length - 1
];
const prev =
candles[
candles.length - 2
];

return Math.max(
60,
last.time - prev.time
);

}

function ensurePositionP2MinWidth(p1, p2){

const entry =
p1.price;
const minW =
positionMinWidthPx();
const a =
toXY(p1);

if(!a){
return p2;
}

let t1 =
normalizeTime(p1.time);
let t2 =
normalizeTime(p2?.time ?? p1.time);

if(
t1 == null ||
t2 == null
){
return p2;
}

if(t2 < t1){
t2 = t1;
}

const candles =
candleSeries();

if(
candles.length >=
2
){

const last =
candles[
candles.length - 1
];
const dt =
candleBarStepSec();

if(
t1 >=
last.time
){

let b =
toXY({
time: t2,
price: entry
});

for(
let step =
0;
step <
320;
step++
){

if(
b &&
Math.abs(
b.x - a.x
) >=
minW
){
break;
}

t2 =
t1 +
dt *
Math.max(
step + 1,
POSITION_DEFAULT_WIDTH_BARS
);

b =
toXY({
time: t2,
price: entry
});

}

return {
time: t2,
price: entry
};

}

}

let b =
toXY({ time: t2, price: entry });

for(let step = 0; step < 320; step++){

if(
b &&
Math.abs(b.x - a.x) >= minW
){
break;
}

if(candles.length >= 2){

const idx =
candles.findIndex(c=>c.time >= t2);
let nextIdx =
idx < 0
? candles.length - 1
: Math.min(candles.length - 1, idx + 1);

if(
nextIdx <= idx ||
candles[nextIdx].time <= t2
){

const last =
candles[candles.length - 1];
const prev =
candles[candles.length - 2] || last;
const dt =
Math.max(60, last.time - prev.time);

t2 = last.time + dt * (step + 1);

}else{

t2 = candles[nextIdx].time;

}

}else{

t2 = t1 + 3600 * (step + POSITION_DEFAULT_WIDTH_BARS);

}

b = toXY({ time: t2, price: entry });

}

return {
time: t2,
price: entry
};

}

function defaultPositionP2(p1){

const candles =
candleSeries();

if(!candles.length){
return ensurePositionP2MinWidth(
p1,
{
time: p1.time,
price: p1.price
}
);
}

const t0 =
normalizeTime(p1.time);

let idx =
candles.findIndex(c=>c.time >= t0);

if(
idx <
0
){

const last =
candles[
candles.length - 1
];
const dt =
candleBarStepSec();
const barsFromLast =
Math.max(
1,
Math.ceil(
(t0 - last.time) /
dt
)
);

return ensurePositionP2MinWidth(
p1,
{
time:
last.time +
dt *
(
barsFromLast +
POSITION_DEFAULT_WIDTH_BARS
),
price: p1.price
}
);

}

const targetIdx =
Math.min(
candles.length - 1,
idx + POSITION_DEFAULT_WIDTH_BARS
);

return ensurePositionP2MinWidth(
p1,
{
time: candles[targetIdx].time,
price: p1.price
}
);

}


function initialPositionTpSl(type, entry){

const entryN =
Number(entry);

if(!Number.isFinite(entryN) || entryN <= 0){
return {
tpPrice: entryN,
slPrice: entryN
};
}

const yEntry =
series.priceToCoordinate(entryN);

if(yEntry == null){
return initialPositionTpSlPercent(
type,
entryN
);
}

const tpPx =
POSITION_DEFAULT_TP_ZONE_PX;
const slPx =
POSITION_DEFAULT_SL_ZONE_PX;

if(type === "long"){

const tpPrice =
series.coordinateToPrice(yEntry - tpPx);
const slPrice =
series.coordinateToPrice(yEntry + slPx);

return {
tpPrice:
Number.isFinite(tpPrice) && tpPrice > entryN
? tpPrice
: entryN * (1 + POSITION_DEFAULT_TP_PCT),
slPrice:
Number.isFinite(slPrice) && slPrice < entryN
? slPrice
: entryN * (1 - POSITION_DEFAULT_SL_PCT)
};

}

const slPrice =
series.coordinateToPrice(yEntry - slPx);
const tpPrice =
series.coordinateToPrice(yEntry + tpPx);

return {
tpPrice:
Number.isFinite(tpPrice) && tpPrice < entryN
? tpPrice
: entryN * (1 - POSITION_DEFAULT_TP_PCT),
slPrice:
Number.isFinite(slPrice) && slPrice > entryN
? slPrice
: entryN * (1 + POSITION_DEFAULT_SL_PCT)
};

}


const clampPositionPrices =
clampPositionPricesPure;

/** TP/SL/центр — прямоугольные плашки (не pill). */
const POSITION_EDGE_BADGE_GAP =
4;

const POSITION_EDGE_BADGE_H =
18;

function fillPositionBadgeRect(
ctx,
left,
top,
bw,
bh,
fill,
stroke
){

ctx.fillStyle = fill;
ctx.fillRect(
left,
top,
bw,
bh
);

if(
stroke
){
ctx.strokeStyle = stroke;
ctx.lineWidth = 1;
ctx.strokeRect(
left + 0.5,
top + 0.5,
bw - 1,
bh - 1
);
}

}

function positionBadgeCyOutside(
edgeY,
side
){

const half =
POSITION_EDGE_BADGE_H /
2;

if(
side ===
"above"
){
return edgeY -
POSITION_EDGE_BADGE_GAP -
half;
}

return edgeY +
POSITION_EDGE_BADGE_GAP +
half;

}


function drawPositionBadge(
ctx,
text,
cx,
cy,
variant
){

ctx.save();
ctx.textBaseline = "middle";

const padX = 8;
const padY = 6;
const lineGap = 2;
let fill =
"rgba(15, 23, 42, 0.92)";
let stroke =
"rgba(148, 163, 184, 0.35)";

if(variant === "tp"){
fill = "rgba(22, 101, 52, 0.95)";
stroke = "rgba(74, 222, 128, 0.45)";
}else if(variant === "sl"){
fill = "rgba(127, 29, 29, 0.95)";
stroke = "rgba(248, 113, 113, 0.45)";
}else if(variant === "long-center"){
fill = "rgba(22, 101, 52, 0.95)";
stroke = "rgba(74, 222, 128, 0.55)";
}else if(variant === "short-center"){
fill = "rgba(127, 29, 29, 0.95)";
stroke = "rgba(248, 113, 113, 0.55)";
}else if(variant === "rr"){
fill = "rgba(30, 41, 59, 0.95)";
stroke = "rgba(250, 204, 21, 0.4)";
}else if(variant === "entry"){
fill = "rgba(113, 63, 18, 0.95)";
stroke = "rgba(250, 204, 21, 0.45)";
}

function measureSegments(
segments
){

return segments.map(seg=>{

const font =
resolvePositionBadgeFont(
seg.font,
variant
);

ctx.font = font;

return {
text: seg.text,
font,
color: seg.color,
highlight: seg.highlight === true,
width: ctx.measureText(
seg.text
).width
};

});

}

function lineTextWidth(
measured
){

return measured.reduce(
(sum, seg)=>sum + seg.width,
0
);

}

function drawMeasuredLine(
measured,
lineCy
){

const textWidth =
lineTextWidth(
measured
);

let x =
cx - textWidth / 2;

measured.forEach(
seg=>{

ctx.font = seg.font;

if(
seg.highlight
){

const pad = 4;
const pillH = 18;
const pillTop =
lineCy - pillH / 2;

ctx.fillStyle = "rgba(0, 0, 0, 0.55)";
ctx.fillRect(
x - pad,
pillTop,
seg.width + pad * 2,
pillH
);

}

ctx.fillStyle =
seg.color ||
(
variant === "long-center" ||
variant === "short-center"
? "#ffffff"
: "#f8fafc"
);
ctx.fillText(
seg.text,
x,
lineCy
);
x += seg.width;

}
);

}

const multiline =
text &&
typeof text ===
"object" &&
!Array.isArray(
text
) &&
Array.isArray(
text.lines
);

if(
multiline
){

const measuredLines =
text.lines.map(
line=>
measureSegments(
line
)
);

const lineHeights =
text.lines.map(
line=>{

if(
line.some(
seg=>seg.font ===
"volume"
)
){
return 20;
}

if(
line.some(
seg=>seg.font ===
"badge" ||
seg.font ===
"tp" ||
seg.font ===
"sl"
)
){
return 18;
}

return 14;

}
);

const textWidth =
Math.max(
...measuredLines.map(
lineTextWidth
)
);

const bw =
textWidth + padX * 2;
const bh =
lineHeights.reduce(
(sum, h)=>sum + h,
0
) +
lineGap *
(
measuredLines.length -
1
) +
padY * 2;

const left =
cx - bw / 2;
const top =
cy - bh / 2;

fillPositionBadgeRect(
ctx,
left,
top,
bw,
bh,
fill,
stroke
);

ctx.textAlign = "left";

let y =
top + padY;

measuredLines.forEach(
(measured, idx)=>{

const lineH =
lineHeights[
idx
];
const lineCy =
y + lineH / 2;

drawMeasuredLine(
measured,
lineCy
);

y +=
lineH + lineGap;

}
);

ctx.restore();

return;

}

const segments =
Array.isArray(
text
)
? text
:[
{
text,
font: variant
}
];

const hasVolumeHighlight =
segments.some(
seg=>seg.font ===
"volume"
);

const measured =
measureSegments(
segments
);

const textWidth =
lineTextWidth(
measured
);
const bw =
textWidth + padX * 2;
const bh =
hasVolumeHighlight
? 22
: 18;
const left =
cx - bw / 2;
const top =
cy - bh / 2;

fillPositionBadgeRect(
ctx,
left,
top,
bw,
bh,
fill,
stroke
);

ctx.textAlign = "left";

drawMeasuredLine(
measured,
cy
);

ctx.restore();

}

function drawPositionPriceTags(
ctx,
shape,
chartW
){

const entry =
positionEntryPrice(shape);
const yEntry =
series.priceToCoordinate(entry);
const yTp =
plotPriceToCoordinate(
shape.tpPrice
);
const ySl =
plotPriceToCoordinate(
shape.slPrice
);

if(
yEntry == null ||
yTp == null ||
ySl == null
){
return;
}

const tagX =
chartW - 6;
const items = [
{ y: yTp, text: formatPositionPrice(shape.tpPrice), variant: "tp" },
{ y: yEntry, text: formatPositionPrice(entry), variant: "rr" },
{ y: ySl, text: formatPositionPrice(shape.slPrice), variant: "sl" }
];

items.forEach(item=>{

ctx.save();
ctx.font =
'600 10px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Arial, sans-serif';
ctx.textAlign = "right";
ctx.textBaseline = "middle";

const padX = 6;
const padY = 3;
const tw =
ctx.measureText(item.text).width + padX * 2;
const th = 16;
const left =
tagX - tw;
const top =
item.y - th / 2;

let fill =
"rgba(30, 41, 59, 0.95)";

if(item.variant === "tp"){
fill = POSITION_SCALE_TP_BG;
}else if(item.variant === "sl"){
fill = POSITION_SCALE_SL_BG;
}else{
fill = POSITION_SCALE_ENTRY_BG;
}

fillPositionBadgeRect(
ctx,
left,
top,
tw,
th,
fill,
null
);
ctx.fillStyle = "#f8fafc";
ctx.fillText(item.text, tagX - padX, item.y);
ctx.restore();

});

}

/**
 * Ст2/Ст3: горизонтальные уровни ТП1…ТПN внутри бокса позиции.
 * Только если на shape есть partialExitPrices (алго), ручная позиция без изменений.
 */
function drawPartialTakeProfitTicks(
ctx,
shape,
x1,
x2,
yEntry
){

const exits =
Array.isArray(
shape.partialExitPrices
)
? shape.partialExitPrices.map(
Number
).filter(
p=>
Number.isFinite(
p
) &&
p >
0
)
: [];

if(
exits.length <
2
){
return;
}

ctx.save();
ctx.strokeStyle =
"rgba(134, 239, 172, 0.92)";
ctx.fillStyle =
"rgba(187, 247, 208, 0.95)";
ctx.lineWidth =
1;
ctx.font =
'600 9px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Arial, sans-serif';
ctx.textAlign =
"left";
ctx.textBaseline =
"middle";

exits.forEach(
(
price,
i
)=>{

const y =
plotPriceToCoordinate(
price
);

if(
y ==
null ||
Math.abs(
y -
yEntry
) <
0.5
){
return;
}

ctx.setLineDash(
[
4,
3
]
);
ctx.beginPath();
ctx.moveTo(
x1,
y
);
ctx.lineTo(
x2,
y
);
ctx.stroke();

ctx.setLineDash(
[]
);
ctx.fillText(
String(
i +
1
),
x1 +
3,
y
);

}
);

ctx.restore();

}

function drawPosition(ctx, shape, showLabels){

const box =
positionXBounds(shape);

if(!box){
return;
}

const yTp =
plotPriceToCoordinate(
shape.tpPrice
);
const ySl =
plotPriceToCoordinate(
shape.slPrice
);

if(
yTp == null ||
ySl == null
){
return;
}

const { x1, x2, yEntry } = box;
const w =
x2 - x1;
const isLong =
shape.type === "long";

ctx.save();

if(isLong){

ctx.fillStyle = POSITION_TP_FILL;
ctx.fillRect(
x1,
Math.min(yEntry, yTp),
w,
Math.abs(yEntry - yTp)
);

ctx.fillStyle = POSITION_SL_FILL;
ctx.fillRect(
x1,
Math.min(yEntry, ySl),
w,
Math.abs(yEntry - ySl)
);

}else{

ctx.fillStyle = POSITION_SL_FILL;
ctx.fillRect(
x1,
Math.min(yEntry, ySl),
w,
Math.abs(yEntry - ySl)
);

ctx.fillStyle = POSITION_TP_FILL;
ctx.fillRect(
x1,
Math.min(yEntry, yTp),
w,
Math.abs(yEntry - yTp)
);

}

ctx.strokeStyle = POSITION_ENTRY_COLOR;
ctx.lineWidth = 2;
ctx.setLineDash([]);
ctx.beginPath();
ctx.moveTo(x1, yEntry);
ctx.lineTo(x2, yEntry);
ctx.stroke();

drawPartialTakeProfitTicks(
ctx,
shape,
x1,
x2,
yEntry
);

ctx.restore();

if(!showLabels){
return;
}

const sizing =
positionSizingFromShape(shape);

const metrics =
positionMetrics(shape);
const cx =
(x1 + x2) / 2;
const topY =
Math.min(
yEntry,
yTp,
ySl
);
const botY =
Math.max(
yEntry,
yTp,
ySl
);

let tpText;
let slText;
let entryText;

if(
sizing
){

tpText =
`TP: ${sizing.tpPct.toFixed(2)}% (${formatMoneyUsd(sizing.profitUsd)})`;

slText =
`SL: ${sizing.slPct.toFixed(2)}% (${formatMoneyUsd(sizing.riskUsd)})`;

}else{

if(
isLong
){

tpText = `${metrics.tpPct.toFixed(3)}%`;
slText = `${metrics.slPct.toFixed(3)}%`;

}else{

slText = `${metrics.slPct.toFixed(3)}%`;
tpText = `${metrics.tpPct.toFixed(3)}%`;

}

entryText =
`RR: ${metrics.rr}`;

}

const centerVariant =
isLong
? "long-center"
: "short-center";

if(
isLong
){

drawPositionBadge(
ctx,
tpText,
cx,
positionBadgeCyOutside(
topY,
"above"
),
"tp"
);

drawPositionBadge(
ctx,
slText,
cx,
positionBadgeCyOutside(
botY,
"below"
),
"sl"
);

}else{

drawPositionBadge(
ctx,
slText,
cx,
positionBadgeCyOutside(
topY,
"above"
),
"sl"
);

drawPositionBadge(
ctx,
tpText,
cx,
positionBadgeCyOutside(
botY,
"below"
),
"tp"
);

}

if(
sizing
){

drawPositionBadge(
ctx,
{
lines: [
[
{ text:"Объем ", font:"entry" },
{
text: formatVolumeUsd(
sizing.volume
),
font: "volume",
color: POSITION_VOLUME_COLOR
},
{ text:" $", font:"entry" }
],
[
{
text:`RR: ${sizing.rrNum.toFixed(2)}`,
font:"tp"
}
]
]
},
cx,
yEntry,
centerVariant
);

}else{

drawPositionBadge(
ctx,
entryText,
cx,
yEntry,
centerVariant
);

}

drawPositionPriceTags(
ctx,
shape,
chartSize().w
);

}

function drawPositionAnchor(ctx, x, y){

ctx.save();
ctx.beginPath();
ctx.arc(x, y, 7, 0, Math.PI * 2);
ctx.strokeStyle = "#808080";
ctx.lineWidth = 2;
ctx.stroke();
ctx.restore();

}

return {
defaultPositionP2,
initialPositionTpSl,
clampPositionPrices,
drawPosition,
drawPositionAnchor
};

}
