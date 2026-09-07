/** @module drawings/math */
export function uid(){

return `d_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;

}

export function distToSegment(px, py, x1, y1, x2, y2){

const dx = x2 - x1;
const dy = y2 - y1;
const lenSq = dx * dx + dy * dy;

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
export function distToRect(px, py, x1, y1, x2, y2){

const left =
Math.min(x1, x2);
const right =
Math.max(x1, x2);
const top =
Math.min(y1, y2);
const bottom =
Math.max(y1, y2);

if(
px >= left &&
px <= right &&
py >= top &&
py <= bottom
){
return 0;
}

const dx =
px < left
? left - px
: px > right
? px - right
: 0;

const dy =
py < top
? top - py
: py > bottom
? py - bottom
: 0;

return Math.hypot(dx, dy);

}

export function normalizeScreenRect(
x1,
y1,
x2,
y2
){

return {
left: Math.min(x1, x2),
right: Math.max(x1, x2),
top: Math.min(y1, y2),
bottom: Math.max(y1, y2)
};

}

export function pointInScreenRect(
px,
py,
rect
){

return (
px >= rect.left &&
px <= rect.right &&
py >= rect.top &&
py <= rect.bottom
);

}

export function screenRectsIntersect(
a,
b
){

return (
a.left <= b.right &&
a.right >= b.left &&
a.top <= b.bottom &&
a.bottom >= b.top
);

}

/**
 * Liang–Barsky: отрезок касается или пересекает axis-aligned rect.
 */
export function segmentIntersectsScreenRect(
x1,
y1,
x2,
y2,
rect
){

const dx =
x2 - x1;
const dy =
y2 - y1;

if(
dx === 0 &&
dy === 0
){
return pointInScreenRect(
x1,
y1,
rect
);
}

let t0 =
0;
let t1 =
1;

function clip(
p,
q
){

if(
p === 0
){
return q >= 0;
}

const r =
q / p;

if(
p < 0
){

if(
r > t1
){
return false;
}

if(
r > t0
){
t0 = r;
}

}else{

if(
r < t0
){
return false;
}

if(
r < t1
){
t1 = r;
}

}

return true;

}

return (
clip(-dx, x1 - rect.left) &&
clip(dx, rect.right - x1) &&
clip(-dy, y1 - rect.top) &&
clip(dy, rect.bottom - y1) &&
t0 <= t1
);

}
