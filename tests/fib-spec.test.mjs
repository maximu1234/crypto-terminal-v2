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
