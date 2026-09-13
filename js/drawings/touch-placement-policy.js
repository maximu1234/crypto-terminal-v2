/**
 * iPad / coarse-touch: finger vs mouse/trackpad drawing placement.
 * Viewport alone is not enough — a Bluetooth mouse keeps (pointer: coarse)
 * as the primary pointer, so the session follows the event pointerType.
 */

export function isFineChartPointerType(
pointerType
){

const type =
String(
pointerType ||
""
);

return (
type ===
"mouse" ||
type ===
"pen"
);

}

export function isTouchChartPointerType(
pointerType
){

return String(
pointerType ||
""
) ===
"touch";

}

/**
 * @param {string} [pointerType] pointerType of the tool-select / chart event
 * @param {{
 *   coarseTouch?: boolean,
 *   tabletChart?: boolean,
 *   anyFinePointer?: boolean
 * }} [caps]
 * @returns {boolean} true → center-crosshair finger flow
 */
export function shouldUseTouchDrawPlacement(
pointerType,
caps =
{}
){

const coarseTouch =
!!caps.coarseTouch;
const tabletChart =
!!caps.tabletChart;
const anyFinePointer =
!!caps.anyFinePointer;

if(
!coarseTouch &&
!tabletChart
){
return false;
}

if(
isFineChartPointerType(
pointerType
)
){
return false;
}

if(
isTouchChartPointerType(
pointerType
)
){
return true;
}

if(
anyFinePointer
){
return false;
}

return true;

}
