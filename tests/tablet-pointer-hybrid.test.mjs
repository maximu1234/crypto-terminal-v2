import test from "node:test";
import assert from "node:assert/strict";

import {
isFineChartPointerType,
shouldUseTouchDrawPlacement
} from "../js/drawings/touch-placement-policy.js";

import {
wheelZoomFactor,
rangeZoomAroundAnchor,
applyPointerWheelOnChart
} from "../js/chart-tablet-gestures.js";

test("mouse and pen never use the finger center-crosshair placement", ()=>{

const ipadMouse = {
coarseTouch: true,
tabletChart: true,
anyFinePointer: true
};

assert.equal(
shouldUseTouchDrawPlacement(
"mouse",
ipadMouse
),
false
);
assert.equal(
shouldUseTouchDrawPlacement(
"pen",
ipadMouse
),
false
);
assert.equal(
isFineChartPointerType(
"mouse"
),
true
);

});

test("finger on iPad still uses center-crosshair placement with a mouse attached", ()=>{

assert.equal(
shouldUseTouchDrawPlacement(
"touch",
{
coarseTouch: true,
tabletChart: true,
anyFinePointer: true
}
),
true
);

});

test("finger-only iPad (no fine pointer) stays on touch placement", ()=>{

const ipadFinger = {
coarseTouch: true,
tabletChart: true,
anyFinePointer: false
};

assert.equal(
shouldUseTouchDrawPlacement(
"touch",
ipadFinger
),
true
);
assert.equal(
shouldUseTouchDrawPlacement(
"",
ipadFinger
),
true
);

});

test("keyboard shortcut on iPad with a mouse follows the cursor", ()=>{

assert.equal(
shouldUseTouchDrawPlacement(
"",
{
coarseTouch: true,
tabletChart: true,
anyFinePointer: true
}
),
false
);

});

test("desktop viewport never uses touch placement", ()=>{

assert.equal(
shouldUseTouchDrawPlacement(
"touch",
{
coarseTouch: false,
tabletChart: false,
anyFinePointer: true
}
),
false
);

});

test("wheel zoom out expands the range around the cursor", ()=>{

assert.ok(
wheelZoomFactor({
deltaY: 120,
deltaMode: 0
}) >
1
);
assert.ok(
wheelZoomFactor({
deltaY: -120,
deltaMode: 0
}) <
1
);

const zoomed =
rangeZoomAroundAnchor(
10,
20,
0.5,
2
);

assert.equal(
zoomed.from,
5
);
assert.equal(
zoomed.to,
25
);

});

test("overlay wheel zooms the time scale around the pointer", ()=>{

let nextRange =
null;
const chart = {
timeScale(){

return {
getVisibleLogicalRange: ()=>({
from: 0,
to: 100
}),
options: ()=>({
barSpacing: 6
}),
setVisibleLogicalRange(range){
nextRange =
range;
}
};

},
priceScale(){

return {
getVisibleRange: ()=>null
};

}
};

const handled =
applyPointerWheelOnChart(
chart,
{
getBoundingClientRect: ()=>({
left: 0,
top: 0,
width: 200,
height: 100
})
},
{
deltaY: 80,
deltaX: 0,
deltaMode: 0,
ctrlKey: false,
clientX: 50,
clientY: 50
}
);

assert.equal(
handled,
true
);
assert.ok(
nextRange
);
assert.ok(
nextRange.to -
nextRange.from >
100
);

});
