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
800,
true
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
span.collapsed,
false
);
assert.equal(
span.labelX,
204
);

}
);

test(
"fibLevelXSpan vertical anchors collapse",
async()=>{

const {
fibLevelXSpan
} =
await import(
"../js/drawings/fib-spec.js"
);

const span =
fibLevelXSpan(
{ x: 320, y: 10 },
{ x: 320, y: 200 },
800,
true
);

assert.equal(
span.collapsed,
true
);
assert.equal(
span.x1,
320
);
assert.equal(
span.x2,
320
);

}
);

test(
"fibLevelXSpan expands narrow non-zero span to plot",
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
{ x: 105, y: 0 },
800,
true
);

assert.equal(
span.collapsed,
false
);
assert.equal(
span.x1,
0
);
assert.equal(
span.x2,
800
);

}
);

test(
"fibLevelXSpan preview keeps narrow span",
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
{ x: 105, y: 0 },
800,
false
);

assert.equal(
span.x1,
100
);
assert.equal(
span.x2,
105
);
assert.equal(
span.collapsed,
false
);

}
);
