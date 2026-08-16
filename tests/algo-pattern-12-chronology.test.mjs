import assert from "node:assert/strict";
import test from "node:test";

import {
resolvePatternSetupKnownBar
} from "../js/algo-trading/pattern-entry-logic.js?v=13";

test(
"resolvePatternSetupKnownBar uses max of b3Confirm and b4Confirm",
()=>{

assert.equal(
resolvePatternSetupKnownBar(
{
b4:
10,
b3Confirm:
12,
b4Confirm:
15
}
),
15
);

assert.equal(
resolvePatternSetupKnownBar(
{
b4:
20,
b3Confirm:
25,
b4Confirm:
18
}
),
25
);

}
);

test(
"resolvePatternSetupKnownBar falls back to b4 when b4Confirm missing",
()=>{

assert.equal(
resolvePatternSetupKnownBar(
{
b4:
10,
b3Confirm:
8
}
),
10
);

}
);
