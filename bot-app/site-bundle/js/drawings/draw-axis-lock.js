/**
 * Shift axis lock: horizontal or vertical pointer constraint.
 * Same math for moving a finished shape and placing the next point.
 */

export function eventHasShiftKey(
optEvent
){

return !!(
optEvent?.shiftKey ===
true ||
optEvent?.sourceEvent?.shiftKey ===
true
);

}

export function lastPlacementPointPlotXY(
point,
xFromTime,
priceToPlotY
){

if(
!point ||
typeof xFromTime !==
"function" ||
typeof priceToPlotY !==
"function"
){
return null;
}

const x =
xFromTime(
point.time
);
const y =
priceToPlotY(
point.price
);

if(
x ==
null ||
y ==
null ||
!Number.isFinite(
x
) ||
!Number.isFinite(
y
)
){
return null;
}

return {
x,
y
};

}

export function constrainPointerToAxis(
state,
x,
y,
shiftKey
){

const startX =
state?.startX;
const startY =
state?.startY;

if(
!state ||
startX ==
null ||
startY ==
null ||
!shiftKey
){

if(
state
){
state.shiftAxisLock = null;
}

return {
x,
y
};

}

if(
!state.shiftAxisLock
){

const adx =
Math.abs(
x - startX
);
const ady =
Math.abs(
y - startY
);

state.shiftAxisLock =
adx >=
ady
? "x"
: "y";

}

if(
state.shiftAxisLock ===
"x"
){
return {
x,
y: startY
};
}

return {
x: startX,
y
};

}
