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
