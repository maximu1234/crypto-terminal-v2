import assert from "node:assert/strict";
import test from "node:test";
import executor from "../desktop/trading/algo-bot-order-executor.cjs";

test(
"recognizes only AlgoTrading bot order links",
()=>{
assert.equal(
executor.isAlgoBotOrderLinkId(
"algo-tp-BTCUSDT-0"
),
true
);
assert.equal(
executor.isAlgoBotOrderLinkId(
"aSetup_1-2"
),
true
);
assert.equal(
executor.isAlgoBotOrderLinkId(
"manual-stop"
),
false
);
assert.equal(
executor.isAlgoBotOrderLinkId(
""
),
false
);
}
);

test(
"splits entry quantity into step-rounded thirds",
()=>{
assert.deepEqual(
executor.splitQtyIntoThirds(
1,
{
qtyStep:
"0.1"
}
),
[
0.3,
0.3,
0.4
]
);
assert.deepEqual(
executor.splitQtyIntoThirds(
0.007,
{
qtyStep:
"0.001"
}
),
[
0.002,
0.002,
0.003
]
);
assert.equal(
executor.splitQtyIntoThirds(
0.002,
{
qtyStep:
"0.001"
}
),
null
);
}
);
