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
"0,50$"
);
assert.equal(
formatMoneyUsd(
2.3
),
"2,30$"
);
assert.equal(
formatMoneyUsd(
1
),
"1,00$"
);
assert.equal(
formatMoneyUsd(
1.55
),
"1,55$"
);
assert.equal(
formatMoneyUsd(
null
),
"—"
);

}
);
