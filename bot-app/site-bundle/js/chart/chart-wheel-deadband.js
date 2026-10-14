/**
 * Trackpad wheel noise is ignored until the gesture is clearly intentional.
 * A mouse-wheel notch (deltaMode !== 0) and pinch (ctrl/meta/alt) pass through.
 */

export const WHEEL_PIXEL_DEADBAND = 8;
export const WHEEL_GESTURE_GAP_MS = 140;

const attached = new WeakSet();

export function createWheelDeadband(){

let acc = 0;
let lastAt = -Infinity;
let armedUntil = -Infinity;

return {
ignore(event, now = performance.now()){

if(
event?.ctrlKey ||
event?.metaKey ||
event?.altKey ||
event?.deltaMode
){
return false;
}

const mag =
Math.hypot(
Number(event?.deltaX) || 0,
Number(event?.deltaY) || 0
);

if(
!(mag > 0)
){
return true;
}

if(
now - lastAt >
WHEEL_GESTURE_GAP_MS
){
acc = 0;
armedUntil = -Infinity;
}

lastAt = now;
acc += mag;

if(
now <=
armedUntil
){
return false;
}

if(
acc <
WHEEL_PIXEL_DEADBAND
){
return true;
}

armedUntil =
now +
WHEEL_GESTURE_GAP_MS;
return false;

}
};

}

export function attachChartWheelDeadband(
container
){

if(
!container ||
attached.has(
container
)
){
return;
}

attached.add(
container
);

const gate =
createWheelDeadband();

container.addEventListener(
"wheel",
event=>{

if(
!gate.ignore(
event
)
){
return;
}

event.preventDefault();
event.stopImmediatePropagation();

},
{
capture: true,
passive: false
}
);

}
