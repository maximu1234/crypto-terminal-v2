import test from "node:test";
import assert from "node:assert/strict";

import {
ELLIOTT_DEFAULT_COLOR,
ELLIOTT_DEFAULT_DEGREE,
ELLIOTT_CORRECTION,
ELLIOTT_DOUBLE,
ELLIOTT_IMPULSE,
ELLIOTT_TOOL_TYPES,
ELLIOTT_TRIANGLE,
ELLIOTT_TRIPLE,
createElliottToolDefaults,
elliottDisplayLabels,
elliottLabelForVertex,
elliottPointCount,
elliottUsesCircleWrap,
elliottSelectionHandlePoints,
getElliottPoints,
isElliottType,
migrateElliottToolDefaults,
normalizeElliottDegree,
normalizeElliottShape,
setElliottPoints
} from "../js/drawings/elliott-spec.js";

test("elliott subtypes and click counts", ()=>{

assert.deepEqual(
ELLIOTT_TOOL_TYPES,
[
ELLIOTT_IMPULSE,
ELLIOTT_CORRECTION,
ELLIOTT_TRIANGLE,
ELLIOTT_DOUBLE,
ELLIOTT_TRIPLE
]
);

assert.equal(
elliottPointCount(
ELLIOTT_IMPULSE
),
6
);
assert.equal(
elliottPointCount(
ELLIOTT_CORRECTION
),
4
);
assert.equal(
elliottPointCount(
ELLIOTT_TRIANGLE
),
6
);
assert.equal(
elliottPointCount(
ELLIOTT_DOUBLE
),
4
);
assert.equal(
elliottPointCount(
ELLIOTT_TRIPLE
),
6
);

});

test("elliott defaults are blue and Submicro", ()=>{

const defaults =
createElliottToolDefaults();

assert.equal(
defaults.color,
ELLIOTT_DEFAULT_COLOR
);
assert.equal(
defaults.degree,
ELLIOTT_DEFAULT_DEGREE
);
assert.equal(
defaults.degree,
"submicro"
);
assert.equal(
defaults.showWave,
true
);
assert.equal(
defaults.lineWidth,
1
);

ELLIOTT_TOOL_TYPES.forEach(
type=>{
assert.equal(
isElliottType(
type
),
true
);
}
);

assert.equal(
isElliottType(
"trendline"
),
false
);

});

test("submicro impulse labels are parentheses like TradingView", ()=>{

assert.equal(
normalizeElliottDegree(
"nope"
),
"submicro"
);

assert.equal(
elliottUsesCircleWrap(
"submicro"
),
false
);

assert.deepEqual(
elliottDisplayLabels(
ELLIOTT_IMPULSE,
"submicro"
),
[
"(1)",
"(2)",
"(3)",
"(4)",
"(5)"
]
);

assert.deepEqual(
elliottDisplayLabels(
ELLIOTT_CORRECTION,
"submicro"
),
[
"(A)",
"(B)",
"(C)"
]
);

assert.deepEqual(
elliottDisplayLabels(
ELLIOTT_IMPULSE,
"micro"
),
[
"1",
"2",
"3",
"4",
"5"
]
);
assert.equal(
elliottUsesCircleWrap(
"micro"
),
true
);

assert.deepEqual(
elliottDisplayLabels(
ELLIOTT_IMPULSE,
"minuette"
),
[
"(i)",
"(ii)",
"(iii)",
"(iv)",
"(v)"
]
);

assert.deepEqual(
elliottDisplayLabels(
ELLIOTT_CORRECTION,
"minuette"
),
[
"(a)",
"(b)",
"(c)"
]
);

assert.deepEqual(
elliottDisplayLabels(
ELLIOTT_TRIPLE,
"minor"
),
[
"W",
"X",
"Y",
"X",
"Z"
]
);

assert.deepEqual(
elliottDisplayLabels(
ELLIOTT_IMPULSE,
"grand-supercycle"
),
[
"I",
"II",
"III",
"IV",
"V"
]
);
assert.equal(
elliottUsesCircleWrap(
"grand-supercycle"
),
true
);

assert.equal(
elliottLabelForVertex(
ELLIOTT_IMPULSE,
"submicro",
0
),
""
);
assert.equal(
elliottLabelForVertex(
ELLIOTT_IMPULSE,
"submicro",
1
),
"(1)"
);
assert.equal(
elliottLabelForVertex(
ELLIOTT_IMPULSE,
"submicro",
5
),
"(5)"
);
assert.equal(
elliottLabelForVertex(
ELLIOTT_CORRECTION,
"submicro",
1
),
"(A)"
);

});

test("normalize elliott shape fills missing style", ()=>{

const shape =
normalizeElliottShape({
type: ELLIOTT_IMPULSE,
points: [
{ time: 1, price: 10 },
{ time: 2, price: 12 },
{ time: 3, price: 11 },
{ time: 4, price: 14 },
{ time: 5, price: 16 },
{ time: 6, price: 18 }
]
});

assert.equal(
shape.color,
ELLIOTT_DEFAULT_COLOR
);
assert.equal(
shape.degree,
"submicro"
);
assert.equal(
shape.showWave,
true
);
assert.equal(
getElliottPoints(
shape
).length,
6
);

});

test("migrate elliott defaults rejects bad width", ()=>{

const migrated =
migrateElliottToolDefaults({
color: "#fff",
lineWidth: 99,
degree: "minute",
showWave: false
});

assert.equal(
migrated.color,
"#fff"
);
assert.equal(
migrated.lineWidth,
4
);
assert.equal(
migrated.degree,
"minute"
);
assert.equal(
migrated.showWave,
false
);

});

test("setElliottPoints mirrors p1/p2", ()=>{

const shape =
{
type: ELLIOTT_CORRECTION
};

setElliottPoints(
shape,
[
{ time: 1, price: 1 },
{ time: 2, price: 2 },
{ time: 3, price: 3 }
]
);

assert.equal(
shape.p1.time,
1
);
assert.equal(
shape.p2.time,
3
);

});

test("selection handles include every vertex", ()=>{

const shape =
{
type: ELLIOTT_IMPULSE
};

setElliottPoints(
shape,
[
{ time: 1, price: 10 },
{ time: 2, price: 12 },
{ time: 3, price: 11 },
{ time: 4, price: 14 },
{ time: 5, price: 13 },
{ time: 6, price: 16 }
]
);

const handles =
elliottSelectionHandlePoints(
shape
);

assert.equal(
handles.length,
6
);
assert.equal(
handles[0].time,
1
);
assert.equal(
handles[2].time,
3
);
assert.equal(
handles[5].time,
6
);

});
