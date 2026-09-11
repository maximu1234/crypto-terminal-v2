import test from "node:test";
import assert from "node:assert/strict";

import {
constrainPointerToAxis,
eventHasShiftKey,
lastPlacementPointPlotXY
} from "../js/drawings/draw-axis-lock.js";

test("Shift locks to the dominant axis from the origin", ()=>{

const horizontal = {
startX: 100,
startY: 200,
shiftAxisLock: null
};

assert.deepEqual(
constrainPointerToAxis(
horizontal,
180,
210,
true
),
{
x: 180,
y: 200
}
);
assert.equal(
horizontal.shiftAxisLock,
"x"
);

const vertical = {
startX: 100,
startY: 200,
shiftAxisLock: null
};

assert.deepEqual(
constrainPointerToAxis(
vertical,
110,
280,
true
),
{
x: 100,
y: 280
}
);
assert.equal(
vertical.shiftAxisLock,
"y"
);

});

test("axis lock stays on the first chosen axis until Shift is released", ()=>{

const state = {
startX: 100,
startY: 200,
shiftAxisLock: null
};

constrainPointerToAxis(
state,
180,
210,
true
);

assert.deepEqual(
constrainPointerToAxis(
state,
110,
280,
true
),
{
x: 110,
y: 200
}
);

assert.deepEqual(
constrainPointerToAxis(
state,
110,
280,
false
),
{
x: 110,
y: 280
}
);
assert.equal(
state.shiftAxisLock,
null
);

});

test("placement origin is the previous point, not the current pointer", ()=>{

const origin = lastPlacementPointPlotXY(
{
time: 1_000,
price: 50
},
time =>
time ===
1_000
? 40
: null,
price =>
price ===
50
? 120
: null
);

assert.deepEqual(
origin,
{
x: 40,
y: 120
}
);

const state = {
startX: origin.x,
startY: origin.y,
shiftAxisLock: null
};

assert.deepEqual(
constrainPointerToAxis(
state,
200,
125,
true
),
{
x: 200,
y: 120
}
);

});

test("eventHasShiftKey reads both shiftKey and sourceEvent.shiftKey", ()=>{

assert.equal(
eventHasShiftKey({
shiftKey: true
}),
true
);

assert.equal(
eventHasShiftKey({
sourceEvent:{
shiftKey: true
}
}),
true
);

assert.equal(
eventHasShiftKey({
shiftKey: false
}),
false
);

});
