import test from "node:test";
import assert from "node:assert/strict";

test(
"calcPositionSizing risk to volume",
async()=>{

const {
calcPositionSizing
} =
await import(
"../js/position-sizing.js"
);

const r =
calcPositionSizing(
100,
5,
2.5
);

assert.ok(
r
);
assert.ok(
r.volume >
0
);
assert.ok(
Number.isFinite(
r.riskUsd
)
);

}
);

test(
"formatMoneyUsd keeps fractional dollars",
async()=>{

const {
formatMoneyUsd
} =
await import(
"../js/position-sizing.js"
);

assert.equal(
formatMoneyUsd(
0.5
),
"0,5$"
);
assert.equal(
formatMoneyUsd(
2.3
),
"2,3$"
);
assert.equal(
formatMoneyUsd(
1
),
"1$"
);
assert.equal(
formatMoneyUsd(
null
),
"—"
);

}
);
