import test from "node:test";
import assert from "node:assert/strict";

import "./helpers/stub-browser.mjs";

const store =
new Map();

globalThis.localStorage =
{
getItem(
key
){
return store.has(
key
)
? store.get(
key
)
: null;
},
setItem(
key,
value
){
store.set(
key,
String(
value
)
);
},
removeItem(
key
){
store.delete(
key
);
}
};

import {
createAlgoStrategyMemory,
algoGate,
chartStrategyId,
buildTradeOpts,
strategyPrefKeys,
strategyPatchFromState,
applyStrategyPatchToMemory,
buildAlgoPrefsSnapshot
} from "../js/algo-trading/page-strategy-state.js";

test("createAlgoStrategyMemory has strategy fields and st1 default", ()=>{

const mem =
createAlgoStrategyMemory();

assert.equal(
typeof mem.tpRr,
"number"
);
assert.equal(
typeof mem.riskUsd,
"number"
);
assert.ok(
mem.strategyGates.st1
);
assert.equal(
mem.chartPositionsStrategy,
"fixed-tp"
);
assert.equal(
algoGate(
mem,
"st9"
),
mem.strategyGates.st1
);
assert.equal(
chartStrategyId(
mem
),
"st1"
);

});

test("strategyPrefKeys and patch round-trip through memory", ()=>{

const mem =
createAlgoStrategyMemory();
const keys =
strategyPrefKeys(
"st1"
);

assert.ok(
keys.includes(
"tpRr"
)
);
assert.ok(
keys.includes(
"slPctOfXSt1"
) ||
keys.some(
key=>
key.startsWith(
"slPctOfX"
)
)
);

mem.tpRr =
2.5;
const patch =
strategyPatchFromState(
mem,
"st1"
);
assert.equal(
patch.tpRr,
2.5
);

applyStrategyPatchToMemory(
mem,
"st1",
{
tpRr:
3.25,
slPctOfX:
12
}
);
assert.equal(
mem.tpRr,
3.25
);
assert.equal(
mem.strategyGates.st1.slPctOfX,
12
);

});

test("buildTradeOpts and snapshot keep chartTf/symbol from extras", ()=>{

const mem =
createAlgoStrategyMemory();
const opts =
buildTradeOpts(
mem,
"st1",
{
chartTf:
"15",
patternSettings:{
reverseLogic:
true
}
}
);

assert.equal(
opts.chartTf,
"15"
);
assert.equal(
opts.tpRr,
mem.tpRr
);
assert.equal(
opts.patternSettings.reverseLogic,
true
);

const snap =
buildAlgoPrefsSnapshot(
mem,
{
symbol:
"ETHUSDT",
tf:
"15"
}
);
assert.equal(
snap.symbol,
"ETHUSDT"
);
assert.equal(
snap.tf,
"15"
);
assert.equal(
snap.chartTf,
"15"
);
assert.equal(
snap.tpRr,
mem.tpRr
);

});
