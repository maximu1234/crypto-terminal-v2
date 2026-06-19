import test from "node:test";
import assert from "node:assert/strict";

test(
"fibPriceAtRatio linear midpoint",
async()=>{

const {
fibPriceAtRatio
} =
await import(
"../js/drawings/fib-spec.js"
);

assert.equal(
fibPriceAtRatio(
100,
200,
0.5,
false
),
150
);

assert.equal(
fibPriceAtRatio(
100,
200,
0,
false
),
100
);

assert.equal(
fibPriceAtRatio(
100,
200,
1,
false
),
200
);

}
);

test(
"ensureFibLevelsVisible restores defaults when all disabled",
async()=>{

const {
ensureFibLevelsVisible,
cloneDefaultFibRows
} =
await import(
"../js/drawings/fib-spec.js"
);

const disabled =
cloneDefaultFibRows().map(
r=>({
...r,
enabled: false
})
);

const rows =
ensureFibLevelsVisible(
disabled
);

assert.ok(
rows.some(
r=>
r.enabled
)
);

}
);

test(
"normalizeFibLevelWidth",
async()=>{

const {
normalizeFibLevelWidth
} =
await import(
"../js/drawings/fib-spec.js"
);

assert.equal(
normalizeFibLevelWidth(
2
),
2
);
assert.equal(
normalizeFibLevelWidth(
0
),
null
);
assert.equal(
normalizeFibLevelWidth(
9
),
null
);

}
);

test(
"ensureFibAnchorMinSpan expands collapsed anchors",
async()=>{

const {
ensureFibAnchorMinSpan,
FIB_MIN_ANCHOR_SPAN_PX
} =
await import(
"../js/drawings/fib-spec.js"
);

const shape = {
type: "fib",
p1: {
time: 100,
price: 50
},
p2: {
time: 100,
price: 200
}
};

const changed =
ensureFibAnchorMinSpan(
shape,
"p2",
{
toXY(
pt
){
return {
x: pt.time,
y: pt.price
};
},
pointFromXY(
x,
y
){
return {
time: x,
price: y
};
},
minSpanPx: FIB_MIN_ANCHOR_SPAN_PX
}
);

assert.equal(
changed,
true
);
assert.notEqual(
shape.p2.time,
100
);
assert.equal(
Math.abs(
shape.p2.time -
100
),
FIB_MIN_ANCHOR_SPAN_PX
);

}
);

test(
"fibLevelXSpan keeps wide anchor span",
async()=>{

const {
fibLevelXSpan
} =
await import(
"../js/drawings/fib-spec.js"
);

const span =
fibLevelXSpan(
{ x: 100, y: 0 },
{ x: 200, y: 0 },
800
);

assert.equal(
span.x1,
100
);
assert.equal(
span.x2,
200
);
assert.equal(
span.labelX,
204
);

}
);

test(
"fibLevelXSpan vertical anchors expand span",
async()=>{

const {
fibLevelXSpan,
FIB_MIN_ANCHOR_SPAN_PX
} =
await import(
"../js/drawings/fib-spec.js"
);

const span =
fibLevelXSpan(
{ x: 320, y: 10 },
{ x: 320, y: 200 },
800
);

assert.equal(
span.x2 - span.x1,
FIB_MIN_ANCHOR_SPAN_PX
);
assert.equal(
span.x1,
320 - FIB_MIN_ANCHOR_SPAN_PX / 2
);
assert.equal(
span.x2,
320 + FIB_MIN_ANCHOR_SPAN_PX / 2
);

}
);

test(
"fibLevelXSpan narrow span expands not full plot",
async()=>{

const {
fibLevelXSpan,
FIB_MIN_ANCHOR_SPAN_PX
} =
await import(
"../js/drawings/fib-spec.js"
);

const span =
fibLevelXSpan(
{ x: 100, y: 0 },
{ x: 105, y: 0 },
800
);

assert.equal(
span.x2 - span.x1,
FIB_MIN_ANCHOR_SPAN_PX
);
assert.equal(
span.x1,
96.5
);
assert.equal(
span.x2,
108.5
);
assert.notEqual(
span.x2,
800
);

}
);
