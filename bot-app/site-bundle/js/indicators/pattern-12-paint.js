/**
 * Отрисовка сцены паттерна 1-2 1-2 на canvas (терминал и скринер).
 */
const LINE_PAT_COLOR =
"rgba(250, 204, 21, 0.6)";

/** Pixel offset: dot hangs near Long/Short text, not on the wick tip. */
const PT4_DOT_Y_OFFSET =
12;

export function barTimeSpanMs(
candles,
barLen
){

if(
candles.length <
2
){
return 60_000;
}

const dt =
candles[
candles.length -
1
].time -
candles[
candles.length -
2
].time;

return Math.max(
1,
barLen
) *
Math.max(
1,
dt
);

}

function segmentX(
ts,
t0,
t1
){

const x0 =
ts.timeToCoordinate(
t0
);
const x1 =
ts.timeToCoordinate(
t1
);

if(
x0 ==
null ||
x1 ==
null
){
return null;
}

return {
x0,
x1,
dt:
t1 -
t0
};

}

export function timeToX(
ts,
time,
candles
){

const direct =
ts.timeToCoordinate(
time
);

if(
direct !=
null &&
Number.isFinite(
direct
)
){
return direct;
}

if(
!Array.isArray(
candles
) ||
candles.length <
2
){
return null;
}

const first =
candles[
0
];
const second =
candles[
1
];
const prev =
candles[
candles.length -
2
];
const last =
candles[
candles.length -
1
];

if(
time <=
first.time
){

const seg =
segmentX(
ts,
first.time,
second.time
);

if(
!seg ||
seg.dt <=
0
){
return seg?.x0 ??
null;
}

return seg.x0 +
(
seg.x1 -
seg.x0
) *
((
time -
first.time
) /
seg.dt);

}

if(
time >=
last.time
){

const seg =
segmentX(
ts,
prev.time,
last.time
);

if(
!seg ||
seg.dt <=
0
){
return seg?.x1 ??
null;
}

return seg.x1 +
(
seg.x1 -
seg.x0
) *
((
time -
last.time
) /
seg.dt);

}

let lo =
0;
let hi =
candles.length -
1;

while(
lo +
1 <
hi
){

const mid =
(
lo +
hi
) >>
1;

if(
candles[
mid
].time <=
time
){
lo =
mid;
}else{
hi =
mid;
}

}

const seg =
segmentX(
ts,
candles[
lo
].time,
candles[
lo +
1
].time
);

if(
!seg ||
seg.dt <=
0
){
return seg?.x0 ??
null;
}

return seg.x0 +
(
seg.x1 -
seg.x0
) *
((
time -
candles[
lo
].time
) /
seg.dt);

}

function logicalBarToX(
ts,
bar
){

try{
const x =
ts.logicalToCoordinate?.(
bar
);

return x !=
null &&
Number.isFinite(
x
)
? x
: null;
}catch{
return null;
}

}

function pt4LineEndX(
ts,
mark,
t1,
candles,
plotW
){

let x1 =
timeToX(
ts,
t1,
candles
);

if(
x1 ==
null
){
x1 =
logicalBarToX(
ts,
mark.bar +
mark.lineBars
);
}

if(
x1 ==
null &&
Number.isFinite(
plotW
) &&
plotW >
0
){
x1 =
plotW;
}

return x1;

}

export function barToX(
ts,
bar,
candles
){

const candle =
candles[
bar
];

if(
!candle
){
return null;
}

return timeToX(
ts,
candle.time,
candles
);

}

function pt4AnchorPrice(
candles,
bar,
side,
fallbackPrice
){

const candle =
candles[
bar
];

if(
!candle
){
return fallbackPrice;
}

return side ===
"long"
? candle.high
: candle.low;

}

export function paintPattern12Scene(
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
const line of scene.swingLines
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
line.color;
ctx.lineWidth =
1;
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

for(
const frac of scene.fractals
){

const x =
barToX(
ts,
frac.bar,
candles
);

if(
x ==
null
){
continue;
}

ctx.fillStyle =
frac.color;
ctx.beginPath();

if(
frac.up
){
ctx.moveTo(
x,
plotH *
0.02
);
ctx.lineTo(
x -
4,
plotH *
0.02 +
8
);
ctx.lineTo(
x +
4,
plotH *
0.02 +
8
);
}else{
ctx.moveTo(
x,
plotH -
plotH *
0.02
);
ctx.lineTo(
x -
4,
plotH -
plotH *
0.02 -
8
);
ctx.lineTo(
x +
4,
plotH -
plotH *
0.02 -
8
);
}

ctx.closePath();
ctx.fill();

}

for(
const line of scene.patternLines
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
LINE_PAT_COLOR;
ctx.lineWidth =
1;
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

for(
const mark of scene.pt4Marks
){

const x0 =
barToX(
ts,
mark.bar,
candles
);
const y =
series.priceToCoordinate(
pt4AnchorPrice(
candles,
mark.bar,
mark.side,
mark.price
)
);

if(
x0 ==
null ||
y ==
null
){
continue;
}

const span =
barTimeSpanMs(
candles,
mark.lineBars
);
const t0 =
candles[
mark.bar
]?.time;
const t1 =
t0 +
span;
const x1 =
pt4LineEndX(
ts,
mark,
t1,
candles,
plotW
);

if(
x1 ==
null
){
continue;
}

ctx.strokeStyle =
mark.color;
ctx.lineWidth =
1;
ctx.beginPath();
ctx.moveTo(
x0,
y
);
ctx.lineTo(
x1,
y
);
ctx.stroke();

const xMid =
(
x0 +
x1
) /
2;
ctx.fillStyle =
mark.color;
ctx.font =
"600 11px system-ui,-apple-system,sans-serif";
ctx.textAlign =
"center";
ctx.textBaseline =
mark.side ===
"long"
? "bottom"
: "top";
ctx.fillText(
mark.label,
xMid,
mark.side ===
"long"
? y -
4
: y +
4
);

}

for(
const dot of scene.pt4Dots
){

const x =
barToX(
ts,
dot.bar,
candles
);
const y =
series.priceToCoordinate(
pt4AnchorPrice(
candles,
dot.bar,
dot.side,
dot.price
)
);

if(
x ==
null ||
y ==
null
){
continue;
}

const yDot =
dot.side ===
"long"
? y -
PT4_DOT_Y_OFFSET
: y +
PT4_DOT_Y_OFFSET;

ctx.fillStyle =
dot.side ===
"long"
? "#84cc16"
: "#ef4444";
ctx.beginPath();
ctx.arc(
x,
yDot,
4,
0,
Math.PI *
2
);
ctx.fill();

}

for(
const badge of scene.badges
){

const x =
barToX(
ts,
badge.bar,
candles
);
const y =
series.priceToCoordinate(
badge.price
);

if(
x ==
null ||
y ==
null
){
continue;
}

const pad =
badge.price *
0.008;
const lines =
String(
badge.text
).split(
"\n"
);
const boxW =
Math.max(
...lines.map(
line=>
line.length *
7
),
48
);
const boxH =
lines.length *
14 +
8;
const top =
badge.above
? y +
pad
: y -
pad -
boxH;
const left =
x -
boxW /
2;

ctx.fillStyle =
badge.color;
ctx.globalAlpha =
0.92;
ctx.fillRect(
left,
top,
boxW,
boxH
);
ctx.globalAlpha =
1;
ctx.fillStyle =
"#fff";
ctx.font =
"600 11px system-ui,-apple-system,sans-serif";
ctx.textAlign =
"center";
ctx.textBaseline =
"middle";

lines.forEach(
(
line,
index
)=>{
ctx.fillText(
line,
x,
top +
8 +
index *
14
);
}
);

}

ctx.restore();

}
