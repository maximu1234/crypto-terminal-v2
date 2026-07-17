/** @module drawings/position */
import {
POSITION_SCALE_ENTRY_BG,
POSITION_SCALE_SL_BG,
POSITION_SCALE_TP_BG,
POSITION_DEFAULT_TP_PCT,
POSITION_DEFAULT_SL_PCT
} from "./constants.js?v=10";

import {
distToRect,
distToSegment
} from "./math.js?v=1";

import {
calcPositionSizing
} from "../position-sizing.js?v=1";

export function isPositionType(type){

return type === "long" || type === "short";

}

export function positionEntryPrice(shape){

return Number(shape.p1?.price);

}

export function positionScaleLabelColor(
handleId
){

if(
handleId ===
"tp"
){
return POSITION_SCALE_TP_BG;
}

if(
handleId ===
"sl"
){
return POSITION_SCALE_SL_BG;
}

return POSITION_SCALE_ENTRY_BG;

}

export function positionXBounds(
shape,
toXY
){

const a =
toXY(shape.p1);
const b =
toXY(shape.p2);

if(!a || !b){
return null;
}

return {
x1: Math.min(a.x, b.x),
x2: Math.max(a.x, b.x),
yEntry: a.y
};

}

export function positionBodyDist(
px,
py,
shape,
toXY,
plotPriceToCoordinate
){

if(!isPositionType(shape.type)){
return Infinity;
}

const box =
positionXBounds(
shape,
toXY
);

if(!box){
return Infinity;
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
return Infinity;
}

const { x1, x2, yEntry } = box;
const isLong =
shape.type === "long";

let dist = Infinity;

if(isLong){

dist = Math.min(
dist,
distToRect(px, py, x1, yTp, x2, yEntry),
distToRect(px, py, x1, yEntry, x2, ySl)
);

}else{

dist = Math.min(
dist,
distToRect(px, py, x1, yEntry, x2, ySl),
distToRect(px, py, x1, yTp, x2, yEntry)
);

}

dist = Math.min(
dist,
distToSegment(px, py, x1, yEntry, x2, yEntry)
);

return dist;

}

export function getPositionHandleScreens(
shape,
toXY,
plotPriceToCoordinate
){

const box =
positionXBounds(
shape,
toXY
);

if(!box){
return [];
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
return [];
}

const leftX =
box.x1;

return [
{ id: "entryL", x: leftX, y: box.yEntry },
{ id: "entryR", x: box.x2, y: box.yEntry },
{ id: "tp", x: leftX, y: yTp },
{ id: "sl", x: leftX, y: ySl }
];

}

export function positionMetrics(shape){

const entry =
positionEntryPrice(shape);

if(!Number.isFinite(entry) || entry === 0){
return {
tpPct: 0,
slPct: 0,
rr: "—"
};
}

const tpPct =
Math.abs(shape.tpPrice - entry) / entry * 100;
const slPct =
Math.abs(shape.slPrice - entry) / entry * 100;
const rr =
slPct > 0
? (tpPct / slPct).toFixed(2)
: "—";

return { tpPct, slPct, rr };

}

export function positionSizingFromShape(shape){

const metrics =
positionMetrics(shape);

return calcPositionSizing(
shape.riskUsd,
metrics.tpPct,
metrics.slPct
);

}

export function initialPositionTpSlPercent(type, entryN){

if(type === "long"){
return {
tpPrice: entryN * (1 + POSITION_DEFAULT_TP_PCT),
slPrice: entryN * (1 - POSITION_DEFAULT_SL_PCT)
};
}

return {
tpPrice: entryN * (1 - POSITION_DEFAULT_TP_PCT),
slPrice: entryN * (1 + POSITION_DEFAULT_SL_PCT)
};

}

export function clampPositionPrices(
shape,
opts = {}
){

const handleId =
opts.handleId ||
null;

const preserveTpSl =
!!opts.preserveTpSl ||
handleId ===
"entryL" ||
handleId ===
"entryR";

const entry =
positionEntryPrice(
shape
);

if(
!Number.isFinite(
entry
)
){
return;
}

shape.p1.price = entry;
shape.p2.price = entry;

if(
preserveTpSl
){
return;
}

const tp =
Number(
shape.tpPrice
);
const sl =
Number(
shape.slPrice
);
const eps =
Math.max(
Math.abs(
entry
) *
1e-9,
1e-12
);

if(
shape.type ===
"long"
){

if(
handleId ===
"tp"
){

shape.tpPrice =
Number.isFinite(
tp
)
? (
tp >
entry +
eps
? tp
: entry +
eps
)
: entry *
(
1 +
POSITION_DEFAULT_TP_PCT
);

}else if(
handleId ===
"sl"
){

shape.slPrice =
Number.isFinite(
sl
)
? (
sl <
entry -
eps
? sl
: entry -
eps
)
: entry *
(
1 -
POSITION_DEFAULT_SL_PCT
);

}else{

shape.tpPrice =
Number.isFinite(
tp
) &&
tp >
entry
? tp
: entry *
(
1 +
POSITION_DEFAULT_TP_PCT
);

shape.slPrice =
Number.isFinite(
sl
) &&
sl <
entry
? sl
: entry *
(
1 -
POSITION_DEFAULT_SL_PCT
);

}

return;

}

if(
handleId ===
"tp"
){

shape.tpPrice =
Number.isFinite(
tp
)
? (
tp <
entry -
eps
? tp
: entry -
eps
)
: entry *
(
1 -
POSITION_DEFAULT_TP_PCT
);

}else if(
handleId ===
"sl"
){

shape.slPrice =
Number.isFinite(
sl
)
? (
sl >
entry +
eps
? sl
: entry +
eps
)
: entry *
(
1 +
POSITION_DEFAULT_SL_PCT
);

}else{

shape.tpPrice =
Number.isFinite(
tp
) &&
tp <
entry
? tp
: entry *
(
1 -
POSITION_DEFAULT_TP_PCT
);

shape.slPrice =
Number.isFinite(
sl
) &&
sl >
entry
? sl
: entry *
(
1 +
POSITION_DEFAULT_SL_PCT
);

}

}

export function formatPositionPrice(price){

const n =
Number(price);

if(!Number.isFinite(n)){
return "—";
}

const abs =
Math.abs(n);

if(abs >= 1000){
return n.toFixed(1);
}

if(abs >= 1){
return n.toFixed(4);
}

return n.toFixed(6);

}
