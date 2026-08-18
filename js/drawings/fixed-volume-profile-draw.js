/** @module drawings/fixed-volume-profile-draw */

import {
fibLevelDash
} from "./fib-spec.js?v=13";

import {
buildFvpScene,
formatFvpVolume,
isFvpType
} from "./fixed-volume-profile.js?v=3";

function yForPrice(
toXY,
time,
price
){

const pt =
toXY(
{
time,
price
}
);

return pt?.y ??
null;
}

function drawHLine(
ctx,
x1,
x2,
y,
color,
width,
dash
){

if(
!Number.isFinite(
y
)
){
return;
}

ctx.save();
ctx.strokeStyle =
color;
ctx.lineWidth =
width ||
1;
ctx.setLineDash(
dash ||
[]
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
ctx.restore();

}

function drawStepLine(
ctx,
points,
toXY,
color,
width,
dash
){

if(
!points?.length
){
return;
}

ctx.save();
ctx.strokeStyle =
color;
ctx.lineWidth =
width ||
1;
ctx.setLineDash(
dash ||
[]
);
ctx.beginPath();

let started =
false;

for(
const pt of
points
){

const xy =
toXY(
pt
);

if(
!xy
){
continue;
}

if(
!started
){
ctx.moveTo(
xy.x,
xy.y
);
started =
true;
}else{
ctx.lineTo(
xy.x,
xy.y
);
}

}

if(
started
){
ctx.stroke();
}

ctx.restore();

}

function rowValue(
row,
mode
){

if(
mode ===
"delta"
){
return row.up -
row.down;
}

return row.total;
}

function formatRowLabel(
row,
mode
){

if(
mode ===
"upDown"
){
return `${formatFvpVolume(row.up)}  ${formatFvpVolume(row.down)}`;
}

if(
mode ===
"delta"
){

const delta =
row.up -
row.down;
const formatted =
formatFvpVolume(
Math.abs(
delta
)
);

return delta >
0
? `+${formatted}`
: delta <
0
? `-${formatted}`
: formatted;

}

return formatFvpVolume(
row.total
);

}

export function drawFvpShape(
ctx,
shape,
{
toXY,
candles
}
){

if(
!isFvpType(
shape?.type
)
){
return;
}

const scene =
buildFvpScene(
shape,
{
toXY,
candles
}
);

if(
!scene ||
scene.x1 ==
null
){
return;
}

const {
x1,
x2,
y1,
y2,
rows,
tLeft
} =
scene;
const boxW =
Math.max(
1,
x2 -
x1
);
const boxH =
Math.max(
1,
y2 -
y1
);
const widthPct =
Math.max(
1,
Math.min(
100,
Number(
shape.widthPercent
) ||
100
)
) /
100;
const maxBarW =
boxW *
widthPct;
const fromRight =
shape.placement ===
"right";
const mode =
shape.volumeMode ||
"upDown";

let maxAbs =
0;

for(
const row of
rows
){

const value =
mode ===
"delta"
? Math.abs(
row.up -
row.down
)
: row.total;

if(
value >
maxAbs
){
maxAbs =
value;
}

}

if(
shape.showHistogramBox
){

ctx.save();
ctx.fillStyle =
shape.histogramBoxColor ||
"rgba(120,123,134,0.2)";
ctx.strokeStyle =
"rgba(120,123,134,0.55)";
ctx.lineWidth =
1;
ctx.fillRect(
x1,
y1,
boxW,
boxH
);
ctx.strokeRect(
x1 +
0.5,
y1 +
0.5,
boxW,
boxH
);
ctx.restore();

}

if(
shape.showProfile !==
false &&
maxAbs >
0
){

ctx.save();

for(
const row of
rows
){

const topY =
yForPrice(
toXY,
tLeft,
row.high
);
const botY =
yForPrice(
toXY,
tLeft,
row.low
);

if(
topY ==
null ||
botY ==
null
){
continue;
}

const rowTop =
Math.min(
topY,
botY
);
const rowH =
Math.max(
1,
Math.abs(
botY -
topY
)
);
const value =
rowValue(
row,
mode
);
const absVal =
Math.abs(
value
);
const barW =
maxAbs >
0
? absVal /
maxAbs *
maxBarW
: 0;

if(
barW <
0.5
){
continue;
}

const x0 =
fromRight
? x2 -
barW
: x1;
const upColor =
row.inVA
? (
shape.vaUpColor ||
"rgba(38,166,154,0.5)"
)
: (
shape.upColor ||
"rgba(38,166,154,0.2)"
);
const downColor =
row.inVA
? (
shape.vaDownColor ||
"rgba(239,83,80,0.5)"
)
: (
shape.downColor ||
"rgba(239,83,80,0.2)"
);

if(
mode ===
"upDown" &&
row.total >
0
){

const upW =
row.up /
row.total *
barW;
const downW =
barW -
upW;

if(
fromRight
){

ctx.fillStyle =
upColor;
ctx.fillRect(
x2 -
upW,
rowTop,
upW,
rowH
);
ctx.fillStyle =
downColor;
ctx.fillRect(
x2 -
barW,
rowTop,
downW,
rowH
);

}else{

ctx.fillStyle =
downColor;
ctx.fillRect(
x1,
rowTop,
downW,
rowH
);
ctx.fillStyle =
upColor;
ctx.fillRect(
x1 +
downW,
rowTop,
upW,
rowH
);

}

}else{

ctx.fillStyle =
mode ===
"delta" &&
value <
0
? downColor
: upColor;
ctx.fillRect(
x0,
rowTop,
barW,
rowH
);

}

if(
shape.showValues !==
false &&
rowH >=
8
){

ctx.fillStyle =
shape.valuesColor ||
"#b2b5be";
ctx.font =
"10px Arial, sans-serif";
ctx.textBaseline =
"middle";
const label =
formatRowLabel(
row,
mode
);
const pad =
4;

if(
fromRight
){
ctx.textAlign =
"right";
ctx.fillText(
label,
x2 -
pad,
rowTop +
rowH /
2
);
}else{
ctx.textAlign =
"left";
ctx.fillText(
label,
x1 +
pad,
rowTop +
rowH /
2
);
}

}

}

ctx.restore();

}

if(
shape.showPoc !==
false &&
scene.pocPrice !=
null
){

drawHLine(
ctx,
x1,
x2,
yForPrice(
toXY,
tLeft,
scene.pocPrice
),
shape.pocColor ||
"#ffffff",
shape.pocLineWidth ||
1,
fibLevelDash(
shape.pocLineStyle
)
);

}

if(
shape.showVah &&
scene.vahPrice !=
null
){

drawHLine(
ctx,
x1,
x2,
yForPrice(
toXY,
tLeft,
scene.vahPrice
),
shape.vahColor ||
"#787b86",
shape.vahLineWidth ||
1,
fibLevelDash(
shape.vahLineStyle
)
);

}

if(
shape.showVal &&
scene.valPrice !=
null
){

drawHLine(
ctx,
x1,
x2,
yForPrice(
toXY,
tLeft,
scene.valPrice
),
shape.valColor ||
"#787b86",
shape.valLineWidth ||
1,
fibLevelDash(
shape.valLineStyle
)
);

}

if(
shape.showDevelopingPoc
){

drawStepLine(
ctx,
scene.developingPoc,
toXY,
shape.developingPocColor ||
"#2962ff",
shape.developingPocLineWidth ||
1,
fibLevelDash(
shape.developingPocLineStyle
)
);

}

if(
shape.showDevelopingVa
){

drawStepLine(
ctx,
scene.developingVaHigh,
toXY,
shape.developingVaColor ||
"rgba(41,98,255,0.35)",
shape.developingVaLineWidth ||
1,
fibLevelDash(
shape.developingVaLineStyle
)
);
drawStepLine(
ctx,
scene.developingVaLow,
toXY,
shape.developingVaColor ||
"rgba(41,98,255,0.35)",
shape.developingVaLineWidth ||
1,
fibLevelDash(
shape.developingVaLineStyle
)
);

}

}
