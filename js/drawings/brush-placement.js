/**
 * Brush tool: pointer-drag freehand stroke (desktop / fine pointer).
 */
const BRUSH_SAMPLE_PX =
2.5;

export function createBrushPlacement(
deps
){

const {
getAlive,
isActive,
getTool,
wrapEl,
toXY,
pointerFromEvent,
pointFromXY,
desktopEdit,
setBlockChartClick,
makeShape,
getDrawings,
setSelectedId,
saveDrawings,
updateStyleBar,
redraw,
isTouchDrawPlacement
} =
deps;

/** @type {{ pointerId: number, points: object[] } | null} */
let brushStroke =
null;

function getBrushStroke(){

return brushStroke;

}

function plotPointFromEvent(
e
){

const {
x,
y
} =
pointerFromEvent(
e
);

return pointFromXY(
x,
y
);

}

function onPointerDown(
e
){

if(
!getAlive() ||
!isActive() ||
getTool() !==
"brush" ||
isTouchDrawPlacement()
){
return;
}

if(
desktopEdit.isDrawChromePointerEvent(
e
)
){
return;
}

if(
!e.isPrimary ||
e.button !==
0
){
return;
}

const pt =
plotPointFromEvent(
e
);

if(
!pt
){
return;
}

brushStroke = {
pointerId: e.pointerId,
points: [
pt
]
};

setBlockChartClick(
true
);
e.preventDefault();
e.stopPropagation();

try{
wrapEl.setPointerCapture(
e.pointerId
);
}catch{
/* ignore */
}

redraw();

}

function onPointerMove(
e
){

if(
!brushStroke ||
e.pointerId !==
brushStroke.pointerId
){
return;
}

const pt =
plotPointFromEvent(
e
);

if(
!pt
){
return;
}

const path =
brushStroke.points;
const last =
path[
path.length -
1
];
const lx =
toXY(
last
);
const nx =
toXY(
pt
);

if(
lx &&
nx &&
Math.hypot(
nx.x -
lx.x,
nx.y -
lx.y
) <
BRUSH_SAMPLE_PX
){
return;
}

path.push(
pt
);
e.preventDefault();
redraw();

}

function onPointerUp(
e
){

if(
!brushStroke ||
e.pointerId !==
brushStroke.pointerId
){
return;
}

const pts =
brushStroke.points;
brushStroke =
null;

if(
pts.length <
2
){
redraw();
return;
}

const created =
makeShape(
"brush",
{
path: pts,
p1: pts[
0
],
p2: pts[
pts.length -
1
]
}
);

getDrawings().push(
created
);
setSelectedId(
created.id
);
saveDrawings();
updateStyleBar();
setBlockChartClick(
true
);
e.preventDefault();
redraw();

}

wrapEl.addEventListener(
"pointerdown",
onPointerDown,
true
);
wrapEl.addEventListener(
"pointermove",
onPointerMove,
true
);
window.addEventListener(
"pointerup",
onPointerUp
);
window.addEventListener(
"pointercancel",
onPointerUp
);

function dispose(){

wrapEl.removeEventListener(
"pointerdown",
onPointerDown,
true
);
wrapEl.removeEventListener(
"pointermove",
onPointerMove,
true
);
window.removeEventListener(
"pointerup",
onPointerUp
);
window.removeEventListener(
"pointercancel",
onPointerUp
);
brushStroke =
null;

}

return {
dispose,
getBrushStroke
};

}
