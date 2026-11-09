/**
 * Фигуры пробного холста: время и цена, как у рисунков Терминала.
 * Слой рисуется отдельно от тика.
 */

export function fractionalIndexAtTime(
candles,
time
){

if(!candles?.length){
return 0;
}

const first =
candles[0];

if(time <= first.time){

const step =
candles.length > 1
? candles[1].time - first.time
: 60;

return (time - first.time) / (step || 60);

}

const last =
candles.length - 1;

if(time >= candles[last].time){

const step =
last > 0
? candles[last].time - candles[last - 1].time
: 60;

return (
last +
(time - candles[last].time) / (step || 60)
);

}

let lo = 0;
let hi = last;

while(lo < hi - 1){

const mid =
(lo + hi) >> 1;

if(candles[mid].time <= time){
lo = mid;
}else{
hi = mid;
}

}

const span =
candles[hi].time - candles[lo].time || 1;

return (
lo +
(time - candles[lo].time) / span
);

}

export function timeAtFractionalIndex(
candles,
index
){

if(!candles?.length){
return 0;
}

if(index <= 0){

const step =
candles.length > 1
? candles[1].time - candles[0].time
: 60;

return candles[0].time + index * step;

}

const last =
candles.length - 1;

if(index >= last){

const step =
last > 0
? candles[last].time - candles[last - 1].time
: 60;

return (
candles[last].time +
(index - last) * step
);

}

const i0 =
Math.floor(index);
const t0 =
candles[i0].time;
const t1 =
candles[i0 + 1].time;

return t0 + (index - i0) * (t1 - t0);

}

export function sampleDrawings(
candles
){

const count =
candles?.length || 0;

if(count < 30){
return [];
}

const at =
offset=>
candles[Math.max(0, count - 1 - offset)];
const older =
at(80);
const newer =
at(20);
const left =
at(60);
const right =
at(35);
const last =
candles[count - 1];

return [
{
type: "hline",
points: [
{
time: last.time,
price: last.close
}
]
},
{
type: "hray",
points: [
{
time: left.time,
price: left.close
}
]
},
{
type: "trendline",
points: [
{
time: older.time,
price: older.low
},
{
time: newer.time,
price: newer.high
}
]
},
{
type: "rectangle",
points: [
{
time: left.time,
price: Math.max(left.high, right.high)
},
{
time: right.time,
price: Math.min(left.low, right.low)
}
]
},
{
type: "fib",
points: [
{
time: older.time,
price: older.low
},
{
time: newer.time,
price: newer.high
}
]
},
{
type: "channel",
points: [
{
time: at(90).time,
price: at(90).low
},
{
time: at(40).time,
price: at(40).low
},
{
time: at(70).time,
price: at(70).high
}
]
},
{
type: "arrow",
points: [
{
time: at(50).time,
price: at(50).close
},
{
time: at(25).time,
price: at(25).high
}
]
},
{
type: "long",
points: [
{
time: at(30).time,
price: at(30).close
},
{
time: at(15).time,
price: at(15).low
}
]
}
];

}

export const FIB_LEVELS = [
0,
0.236,
0.382,
0.5,
0.618,
0.786,
1
];

export function fibPrices(drawing){

const from = drawing?.points?.[0]?.price;
const to = drawing?.points?.[1]?.price;

if(!Number.isFinite(from) || !Number.isFinite(to)){
return [];
}

return FIB_LEVELS.map(level=>from + (to - from) * level);

}

function distToSegment(
px,
py,
x1,
y1,
x2,
y2
){

const dx = x2 - x1;
const dy = y2 - y1;
const lenSq =
dx * dx + dy * dy;

if(lenSq === 0){
return Math.hypot(px - x1, py - y1);
}

let t =
((px - x1) * dx + (py - y1) * dy) / lenSq;

t = Math.max(0, Math.min(1, t));

return Math.hypot(
px - (x1 + t * dx),
py - (y1 + t * dy)
);

}

export function drawingScreenPoints(
drawing,
xOfTime,
yOf,
plotLeft,
plotRight
){

const points =
drawing?.points || [];

if(drawing?.type === "hline" && points[0]){

const y = yOf(points[0].price);

return [
{ x: plotLeft, y },
{ x: plotRight, y }
];

}

if(drawing?.type === "long" && points.length >= 2){

const entry = points[0].price;
const stop = points[1].price;
const target = entry + (entry - stop);
const top = Math.max(target, stop);
const bottom = Math.min(target, stop);

return [
{
x: xOfTime(points[0].time),
y: yOf(top)
},
{
x: xOfTime(points[1].time),
y: yOf(bottom)
}
];

}

if(drawing?.type === "hray" && points[0]){

const x = xOfTime(points[0].time);
const y = yOf(points[0].price);

return [
{ x, y },
{ x: Math.max(x, plotRight), y }
];

}

return points.map(point=>({
x: xOfTime(point.time),
y: yOf(point.price)
}));

}

export function hitDrawing(
drawing,
xOfTime,
yOf,
px,
py,
plotLeft,
plotRight,
threshold
){

const screen =
drawingScreenPoints(
drawing,
xOfTime,
yOf,
plotLeft,
plotRight
);

if(screen.length < 2){
return false;
}

const points = drawing.points || [];

if(drawing.type === "fib" && points.length >= 2){

const x0 = xOfTime(points[0].time);
const x1 = xOfTime(points[1].time);
const left = Math.min(x0, x1);
const right = Math.max(x0, x1);

return fibPrices(drawing).some(price=>{

const y = yOf(price);

return (
distToSegment(px, py, left, y, right, y) <= threshold
);

});

}

if(drawing.type === "channel" && screen.length >= 2){

const a = screen[0];
const b = screen[1];

if(
distToSegment(px, py, a.x, a.y, b.x, b.y) <= threshold
){
return true;
}

const c = screen[2];

if(!c){
return false;
}

return (
distToSegment(
px,
py,
c.x,
c.y,
c.x + (b.x - a.x),
c.y + (b.y - a.y)
) <= threshold
);

}

if(drawing.type === "rectangle" || drawing.type === "long"){

const left = Math.min(screen[0].x, screen[1].x);
const right = Math.max(screen[0].x, screen[1].x);
const top = Math.min(screen[0].y, screen[1].y);
const bottom = Math.max(screen[0].y, screen[1].y);
const inside =
px >= left &&
px <= right &&
py >= top &&
py <= bottom;

if(inside){
return true;
}

const edges = [
[left, top, right, top],
[right, top, right, bottom],
[right, bottom, left, bottom],
[left, bottom, left, top]
];

return edges.some(edge=>
distToSegment(px, py, ...edge) <= threshold
);

}

return (
distToSegment(
px,
py,
screen[0].x,
screen[0].y,
screen[1].x,
screen[1].y
) <= threshold
);

}
