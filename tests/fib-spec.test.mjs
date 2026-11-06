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

test(
"fibLevelXSpan keeps levels on the plot after zoom leaves both anchors",
async()=>{

const {
fibLevelXSpan
} =
await import(
"../js/drawings/fib-spec.js"
);

const left =
fibLevelXSpan(
{ x: -800, y: 40 },
{ x: -200, y: 80 },
600
);

assert.equal(
left.x1,
0
);
assert.equal(
left.x2,
600
);

const partial =
fibLevelXSpan(
{ x: -100, y: 40 },
{ x: 250, y: 80 },
600
);

assert.equal(
partial.x1,
0
);
assert.equal(
partial.x2,
250
);

}
);

test(
"fibShapeLevelXSpan fills the plot when toXY cannot map anchors",
async()=>{

const {
fibShapeLevelXSpan
} =
await import(
"../js/drawings/fib-spec.js"
);

const span =
fibShapeLevelXSpan(
{
type: "fib",
p1: { time: 1, price: 10 },
p2: { time: 2, price: 20 }
},
()=>
null,
500
);

assert.equal(
span.x1,
0
);
assert.equal(
span.x2,
500
);

}
);

test(
"isSeriesLogarithmic reads LW mode 0 and 1",
async()=>{

const {
isSeriesLogarithmic
} =
await import(
"../js/drawings/fib-spec.js"
);

function seriesWithMode(
mode
){
return {
priceScale(){
return {
options(){
return {
mode
};
}
};
}
};
}

assert.equal(
isSeriesLogarithmic(
seriesWithMode(
0
)
),
false
);
assert.equal(
isSeriesLogarithmic(
seriesWithMode(
1
)
),
true
);
assert.equal(
isSeriesLogarithmic(
{}
),
true
);

}
);
