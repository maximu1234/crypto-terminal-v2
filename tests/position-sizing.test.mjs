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
