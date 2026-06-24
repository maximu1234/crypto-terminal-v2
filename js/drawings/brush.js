/**
 * Freehand brush stroke — path between anchor p1 (start) and p2 (end).
 */
import {
distToSegment
} from "./math.js?v=1";

const MIN_PATH_POINTS =
2;

export function normalizeBrushPath(
path
){

if(
!Array.isArray(
path
)
){
return [];
}

return path
.filter(
pt=>
pt &&
pt.time !=
null &&
Number.isFinite(
pt.price
)
);

}

export function ensureBrushShape(
shape
){

const path =
normalizeBrushPath(
shape.path
);

if(
path.length <
MIN_PATH_POINTS
){
return shape;
}

shape.path =
path;
shape.p1 = {
...path[
0
]
};
shape.p2 = {
...path[
path.length -
1
]
};

return shape;

}

export function brushPathScreenPoints(
shape,
toXY
){

const path =
normalizeBrushPath(
shape?.path
);

if(
path.length <
MIN_PATH_POINTS
){
return [];
}

const out =
[];

for(
const pt of
path
){

const xy =
toXY(
pt
);

if(
xy
){
out.push(
xy
);
}

}

return out;

}

export function brushBodyDist(
px,
py,
shape,
toXY
){

if(
shape?.type !==
"brush"
){
return Infinity;
}

const pts =
brushPathScreenPoints(
shape,
toXY
);

if(
pts.length <
2
){
return Infinity;
}

let dist =
Infinity;

for(
let i =
1;
i <
pts.length;
i++
){

const a =
pts[
i -
1
];
const b =
pts[
i
];

dist =
Math.min(
dist,
distToSegment(
px,
py,
a.x,
a.y,
b.x,
b.y
)
);

}

return dist;

}

export function drawBrushPath(
ctx,
shape,
toXY,
color,
width,
dash
){

const pts =
brushPathScreenPoints(
shape,
toXY
);

if(
pts.length <
2
){
return;
}

ctx.save();
ctx.strokeStyle =
color;
ctx.lineWidth =
width;
ctx.lineCap =
"round";
ctx.lineJoin =
"round";

if(
dash?.length
){
ctx.setLineDash(
dash
);
}else{
ctx.setLineDash(
[]
);
}

ctx.beginPath();
ctx.moveTo(
pts[
0
].x,
pts[
0
].y
);

for(
let i =
1;
i <
pts.length;
i++
){

ctx.lineTo(
pts[
i
].x,
pts[
i
].y
);

}

ctx.stroke();
ctx.restore();

}

export function brushChartPointsForMove(
shape
){

return normalizeBrushPath(
shape.path
).map(
pt=>({
...pt
})
);

}

export function applyBrushScreenMove(
shape,
offsets,
grabX,
grabY,
pointFromXY
){

const path =
brushChartPointsForMove(
shape
);

if(
!path.length
){
return false;
}

const next =
[];

for(
let i =
0;
i <
path.length;
i++
){

const off =
offsets[
i
];

if(
!off
){
return false;
}

const np =
pointFromXY(
grabX +
off.x,
grabY +
off.y
);

if(
!np
){
return false;
}

next.push(
np
);

}

shape.path =
next;
ensureBrushShape(
shape
);

return true;

}

export function moveBrushHandle(
shape,
handleId,
point
){

const path =
normalizeBrushPath(
shape.path
);

if(
path.length <
MIN_PATH_POINTS
){
return;
}

if(
handleId ===
"p1"
){

path[
0
] = {
...point
};

}

if(
handleId ===
"p2"
){

path[
path.length -
1
] = {
...point
};

}

shape.path =
path;
ensureBrushShape(
shape
);

}
