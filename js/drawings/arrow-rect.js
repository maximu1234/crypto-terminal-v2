import {
distToRect,
distToSegment
} from "./math.js?v=2";

import {
fibLevelDash,
normalizeFibLineStyle
} from "./fib-spec.js?v=18";

/** @param {CanvasRenderingContext2D} ctx */
export function drawFilledArrow(
ctx,
x1,
y1,
x2,
y2,
color
){

const len =
Math.hypot(
x2 - x1,
y2 - y1
);

if(
len <
2
){
return;
}

const ux =
(
x2 - x1
) /
len;
const uy =
(
y2 - y1
) /
len;
const px =
-uy;
const py =
ux;

const headLen =
Math.min(
Math.max(
len *
0.28,
8
),
Math.max(
28,
len *
0.4
)
);
const headW =
headLen *
0.9;
const tailW =
Math.max(
len *
0.055,
1.5
);
const neckW =
Math.max(
len *
0.11,
2.5
);

const neckX =
x2 -
ux *
headLen;
const neckY =
y2 -
uy *
headLen;

ctx.fillStyle =
color;
ctx.beginPath();
ctx.moveTo(
x1 +
px *
tailW /
2,
y1 +
py *
tailW /
2
);
ctx.lineTo(
neckX +
px *
neckW /
2,
neckY +
py *
neckW /
2
);
ctx.lineTo(
neckX +
px *
headW /
2,
neckY +
py *
headW /
2
);
ctx.lineTo(
x2,
y2
);
ctx.lineTo(
neckX -
px *
headW /
2,
neckY -
py *
headW /
2
);
ctx.lineTo(
neckX -
px *
neckW /
2,
neckY -
py *
neckW /
2
);
ctx.lineTo(
x1 -
px *
tailW /
2,
y1 -
py *
tailW /
2
);
ctx.closePath();
ctx.fill();

}

export function rectangleScreenBox(
shape,
toXY
){

if(
shape?.type !==
"rectangle"
){
return null;
}

const a =
toXY(
shape.p1
);
const b =
toXY(
shape.p2
);

if(
!a ||
!b
){
return null;
}

const left =
Math.min(
a.x,
b.x
);
const right =
Math.max(
a.x,
b.x
);
const top =
Math.min(
a.y,
b.y
);
const bottom =
Math.max(
a.y,
b.y
);

return {
left,
right,
top,
bottom,
cx:
(
left +
right
) /
2,
cy:
(
top +
bottom
) /
2,
width:
Math.max(
0,
right - left
),
height:
Math.max(
0,
bottom - top
)
};

}

export function syncRectanglePointsFromBox(
shape,
box,
pointFromXY
){

const p1 =
pointFromXY(
box.left,
box.top
);
const p2 =
pointFromXY(
box.right,
box.bottom
);

if(
p1 &&
p2
){
shape.p1 =
p1;
shape.p2 =
p2;
}

}

export function getRectangleHandleScreens(
shape,
toXY
){

const box =
rectangleScreenBox(
shape,
toXY
);

if(
!box
){
return [];
}

const {
left,
right,
top,
bottom,
cx,
cy
} =
box;

return [
{
id: "nw",
x: left,
y: top,
square: false
},
{
id: "ne",
x: right,
y: top,
square: false
},
{
id: "se",
x: right,
y: bottom,
square: false
},
{
id: "sw",
x: left,
y: bottom,
square: false
},
{
id: "n",
x: cx,
y: top,
square: true
},
{
id: "e",
x: right,
y: cy,
square: true
},
{
id: "s",
x: cx,
y: bottom,
square: true
},
{
id: "w",
x: left,
y: cy,
square: true
}
];

}

const RECT_MIN_SIZE =
6;

export function moveRectangleHandle(
shape,
handleId,
px,
py,
pointFromXY,
toXY
){

const box =
rectangleScreenBox(
shape,
toXY
);

if(
!box
){
return;
}

let {
left,
right,
top,
bottom
} =
box;

switch(
handleId
){

case "nw":
left =
px;
top =
py;
break;

case "ne":
right =
px;
top =
py;
break;

case "se":
right =
px;
bottom =
py;
break;

case "sw":
left =
px;
bottom =
py;
break;

case "n":
top =
py;
break;

case "s":
bottom =
py;
break;

case "e":
right =
px;
break;

case "w":
left =
px;
break;

default:
return;

}

if(
right - left <
RECT_MIN_SIZE
){
return;
}

if(
bottom - top <
RECT_MIN_SIZE
){
return;
}

syncRectanglePointsFromBox(
shape,
{
left,
right,
top,
bottom
},
pointFromXY
);

}

export function rectangleBodyDist(
px,
py,
shape,
toXY
){

if(
shape?.type !==
"rectangle"
){
return Infinity;
}

const box =
rectangleScreenBox(
shape,
toXY
);

if(
!box
){
return Infinity;
}

const edgeDist =
Math.min(
distToSegment(
px,
py,
box.left,
box.top,
box.right,
box.top
),
distToSegment(
px,
py,
box.right,
box.top,
box.right,
box.bottom
),
distToSegment(
px,
py,
box.right,
box.bottom,
box.left,
box.bottom
),
distToSegment(
px,
py,
box.left,
box.bottom,
box.left,
box.top
)
);

const inside =
distToRect(
px,
py,
box.left,
box.top,
box.right,
box.bottom
);

return Math.min(
edgeDist,
inside
);

}

export function drawRectangleShape(
ctx,
shape,
deps
){

const {
toXY,
shapeStyle,
parseDrawColor,
formatDrawColor
} =
deps;

const box =
rectangleScreenBox(
shape,
toXY
);

if(
!box ||
box.width <
1 ||
box.height <
1
){
return;
}

const {
left,
right,
top,
bottom
} =
box;
const w =
right - left;
const h =
bottom - top;

const border =
shapeStyle(
shape
);

if(
shape.showFill !==
false
){

const fillParsed =
parseDrawColor(
shape.fillColor ||
shape.color ||
border.color
);
const fillAlpha =
Number.isFinite(
Number(
shape.fillOpacity
)
)
? Math.max(
0,
Math.min(
1,
Number(
shape.fillOpacity
)
)
)
: (
fillParsed?.opacity !=
null
? Math.max(
0,
Math.min(
1,
fillParsed.opacity /
100
)
)
: 0.2
);

ctx.save();
ctx.globalAlpha =
fillAlpha;
ctx.fillStyle =
formatDrawColor(
fillParsed?.hex ||
shape.fillColor ||
border.color,
100
);
ctx.fillRect(
left,
top,
w,
h
);
ctx.restore();

}

ctx.save();
ctx.lineWidth =
border.width;

const strokeEdge = (
x1,
y1,
x2,
y2,
colorRaw,
lineStyle
)=>{

const parsed =
parseDrawColor(
colorRaw ||
border.color
);

ctx.strokeStyle =
formatDrawColor(
parsed?.hex ||
colorRaw ||
border.color,
parsed?.opacity ??
100
);
ctx.setLineDash(
fibLevelDash(
lineStyle
) ||
[]
);
ctx.beginPath();
ctx.moveTo(
x1,
y1
);
ctx.lineTo(
x2,
y2
);
ctx.stroke();

};

if(
shape.showHorizLines !==
false
){

const horizColor =
shape.horizColor ||
border.color;
const horizStyle =
shape.horizLineStyle ||
shape.lineStyle;

strokeEdge(
left +
0.5,
top +
0.5,
right +
0.5,
top +
0.5,
horizColor,
horizStyle
);
strokeEdge(
left +
0.5,
bottom +
0.5,
right +
0.5,
bottom +
0.5,
horizColor,
horizStyle
);

}

if(
shape.showVertLines !==
false
){

const vertColor =
shape.vertColor ||
border.color;
const vertStyle =
shape.vertLineStyle ||
shape.lineStyle;

strokeEdge(
left +
0.5,
top +
0.5,
left +
0.5,
bottom +
0.5,
vertColor,
vertStyle
);
strokeEdge(
right +
0.5,
top +
0.5,
right +
0.5,
bottom +
0.5,
vertColor,
vertStyle
);

}

ctx.setLineDash(
[]
);

if(
shape.showMedian
){

const medianParsed =
parseDrawColor(
shape.medianColor ||
border.color
);
const medianWidth =
Math.max(
1,
Number(
shape.medianLineWidth
) ||
1
);
const medianDash =
fibLevelDash(
shape.medianLineStyle ||
"dashed"
);

ctx.strokeStyle =
formatDrawColor(
medianParsed?.hex ||
shape.medianColor ||
border.color,
medianParsed?.opacity ??
100
);
ctx.lineWidth =
medianWidth;
ctx.setLineDash(
medianDash ||
[
5,
4
]
);
ctx.beginPath();
ctx.moveTo(
left,
box.cy
);
ctx.lineTo(
right,
box.cy
);
ctx.stroke();

}

ctx.restore();

}

export function normalizeRectangleShape(
shape,
defaults = {}
){

const explicitLineStyle = (
raw
)=>
raw == null ||
raw === ""
? ""
: normalizeFibLineStyle(
raw
);

const ownLineStyle =
explicitLineStyle(
shape.lineStyle
);
const ownHorizStyle =
explicitLineStyle(
shape.horizLineStyle
);
const ownVertStyle =
explicitLineStyle(
shape.vertLineStyle
);
const legacyBorder =
!!ownLineStyle &&
!ownHorizStyle &&
!ownVertStyle &&
typeof shape.showHorizLines !==
"boolean" &&
typeof shape.showVertLines !==
"boolean";

shape.lineStyle =
ownLineStyle ||
explicitLineStyle(
defaults.lineStyle
) ||
"solid";

if(
typeof shape.showHorizLines !==
"boolean"
){
shape.showHorizLines =
typeof defaults.showHorizLines ===
"boolean"
? defaults.showHorizLines
: true;
}

if(
typeof shape.showVertLines !==
"boolean"
){
shape.showVertLines =
typeof defaults.showVertLines ===
"boolean"
? defaults.showVertLines
: true;
}

shape.horizLineStyle =
ownHorizStyle ||
(
legacyBorder
? ownLineStyle
: ""
) ||
explicitLineStyle(
defaults.horizLineStyle
) ||
shape.lineStyle;

shape.vertLineStyle =
ownVertStyle ||
(
legacyBorder
? ownLineStyle
: ""
) ||
explicitLineStyle(
defaults.vertLineStyle
) ||
shape.lineStyle;

shape.horizColor =
shape.horizColor ||
defaults.horizColor ||
shape.color;

shape.vertColor =
shape.vertColor ||
defaults.vertColor ||
shape.color;

if(
typeof shape.showFill !==
"boolean"
){
shape.showFill =
defaults.showFill !==
false;
}

shape.fillColor =
shape.fillColor ||
defaults.fillColor ||
shape.color;

shape.fillOpacity =
Number.isFinite(
Number(
shape.fillOpacity
)
)
? Math.max(
0,
Math.min(
1,
Number(
shape.fillOpacity
)
)
)
: (
defaults.fillOpacity ??
0.2
);

if(
typeof shape.showMedian !==
"boolean"
){
shape.showMedian =
!!defaults.showMedian;
}

shape.medianColor =
shape.medianColor ||
defaults.medianColor ||
shape.color;

shape.medianLineWidth =
Math.max(
1,
Number(
shape.medianLineWidth
) ||
defaults.medianLineWidth ||
1
);

shape.medianLineStyle =
explicitLineStyle(
shape.medianLineStyle
) ||
explicitLineStyle(
defaults.medianLineStyle
) ||
"dashed";

return shape;

}
