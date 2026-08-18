import test from "node:test";
import assert from "node:assert/strict";

import {
isAlgoBotWorking,
isScriptScanWorking
} from "../js/desktop-feature-nav-shutdown.js";

test("idle algo bot is not stopped when hiding the module", ()=>{

assert.equal(
isAlgoBotWorking(
null
),
false
);
assert.equal(
isAlgoBotWorking(
{
running:
false,
tradingMode:
"live"
}
),
false
);

});

test("running algo bot (live or manual) is working", ()=>{

assert.equal(
isAlgoBotWorking(
{
running:
true,
strategyId:
"st1",
tradingMode:
"live"
}
),
true
);
assert.equal(
isAlgoBotWorking(
{
running:
true,
strategyId:
"st2",
tradingMode:
"manual"
}
),
true
);

});

test("script scan is working only while a job or scanner is active", ()=>{

assert.equal(
isScriptScanWorking(),
false
);
assert.equal(
isScriptScanWorking(
{
scannerRunning:
false,
jobActive:
false
}
),
false
);
assert.equal(
isScriptScanWorking(
{
scannerRunning:
true
}
),
true
);
assert.equal(
isScriptScanWorking(
{
jobActive:
true
}
),
true
);

});
