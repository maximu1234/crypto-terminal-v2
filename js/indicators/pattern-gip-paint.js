/**
 * Отрисовка сцены Паттерн ГиП на canvas (терминал).
 */
import {
barToX
} from "./pattern-12-paint.js?v=5";

function withAlpha(
hex,
alpha
){

const raw =
String(
hex ||
""
).replace(
"#",
""
);
const full =
raw.length ===
3
? raw.split(
""
).map(
c=>
c +
c
).join(
""
)
: raw;

if(
full.length !==
6
){
return `rgba(255,235,59,${Number.isFinite(alpha) ? alpha : 1})`;
}

const r =
parseInt(
full.slice(
0,
2
),
16
);
const g =
parseInt(
full.slice(
2,
4
),
16
);
const b =
parseInt(
full.slice(
4,
6
),
16
);
const a =
Number.isFinite(
alpha
)
? Math.max(
0,
Math.min(
1,
alpha
)
)
: 1;

return `rgba(${r},${g},${b},${a})`;

}

function setDash(
ctx,
dashed
){

if(
dashed
){
ctx.setLineDash(
[
6,
5
]
);
}else{
ctx.setLineDash(
[]
);
}

}

function drawBadge(
ctx,
x,
y,
text,
color,
alpha,
isTop
){

const label =
String(
text ||
""
);
const padX =
5;
const padY =
3;

ctx.font =
"600 10px system-ui,-apple-system,sans-serif";
const tw =
ctx.measureText(
label
).width;
const w =
tw +
padX *
2;
const h =
14 +
padY;
const left =
x -
w /
2;
const top =
isTop
? y -
h -
2
: y +
2;

ctx.fillStyle =
withAlpha(
color,
alpha
);
ctx.beginPath();
if(
typeof ctx.roundRect ===
"function"
){
ctx.roundRect(
left,
top,
w,
h,
3
);
}else{
ctx.rect(
left,
top,
w,
h
);
}
ctx.fill();

ctx.fillStyle =
withAlpha(
"#111111",
alpha
);
ctx.textAlign =
"center";
ctx.textBaseline =
"middle";
ctx.fillText(
label,
x,
top +
h /
2
);

}

export function paintPatternGipScene(
ctx,
plotW,
plotH,
{
chart,
series,
candles,
scene
}
){

if(
!ctx ||
!scene ||
!series ||
!chart ||
!Array.isArray(
candles
) ||
!candles.length
){
return;
}

const ts =
chart.timeScale();
const atrOff =
Number.isFinite(
scene.atrOff
)
? scene.atrOff
: 0.35;

ctx.save();
ctx.beginPath();
ctx.rect(
0,
0,
plotW,
plotH
);
ctx.clip();

for(
const line of scene.lines ||
[]
){

const x1 =
barToX(
ts,
line.barA,
candles
);
const x2 =
barToX(
ts,
line.barB,
candles
);
const y1 =
series.priceToCoordinate(
line.priceA
);
const y2 =
series.priceToCoordinate(
line.priceB
);

if(
x1 ==
null ||
x2 ==
null ||
y1 ==
null ||
y2 ==
null
){
continue;
}

ctx.strokeStyle =
withAlpha(
line.color,
line.alpha
);
ctx.lineWidth =
line.width ||
1;
setDash(
ctx,
!!line.dashed
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

}

setDash(
ctx,
false
);

for(
const mark of scene.markers ||
[]
){

const x =
barToX(
ts,
mark.bar,
candles
);
const y =
series.priceToCoordinate(
mark.price
);

if(
x ==
null ||
y ==
null
){
continue;
}

ctx.fillStyle =
withAlpha(
mark.color,
mark.alpha
);
ctx.font =
"700 14px system-ui,-apple-system,sans-serif";
ctx.textAlign =
"center";
ctx.textBaseline =
"middle";
ctx.fillText(
"*",
x,
y
);

}

for(
const badge of scene.badges ||
[]
){

const x =
barToX(
ts,
badge.bar,
candles
);
const atr =
Number.isFinite(
badge.atrAtBar
)
? badge.atrAtBar
: Number.isFinite(
scene.lastAtr
)
? scene.lastAtr
: 0;
const priceOff =
atr *
atrOff;
const price =
badge.isTop
? badge.price +
priceOff
: badge.price -
priceOff;
const y =
series.priceToCoordinate(
price
);

if(
x ==
null ||
y ==
null
){
continue;
}

drawBadge(
ctx,
x,
y,
badge.text,
badge.color,
badge.alpha,
badge.isTop
);

}

for(
const dbg of scene.debugLabels ||
[]
){

const x =
barToX(
ts,
dbg.bar,
candles
);
const atr =
Number.isFinite(
dbg.atrAtBar
)
? dbg.atrAtBar
: Number.isFinite(
scene.lastAtr
)
? scene.lastAtr
: 0;
const priceOff =
atr *
atrOff;
const price =
dbg.isTop
? dbg.price +
priceOff
: dbg.price -
priceOff;
const y =
series.priceToCoordinate(
price
);

if(
x ==
null ||
y ==
null
){
continue;
}

drawBadge(
ctx,
x,
y,
dbg.text,
dbg.color,
dbg.alpha ??
0.3,
dbg.isTop
);

}

ctx.restore();

}
