import assert from "node:assert/strict";
import test from "node:test";

import {
DRAW_TOOL_HOTKEYS
} from "../js/drawings/draw-tool-hotkeys.js";

import {
PATTERN_12
} from "../js/drawings/elliott-spec.js";

test("P selects Pattern 1-2-1-2-3 drawing, not another tool", ()=>{

assert.equal(
DRAW_TOOL_HOTKEYS.get(
"KeyP"
),
PATTERN_12
);

assert.equal(
DRAW_TOOL_HOTKEYS.get(
"KeyP"
),
"pattern-12"
);

});

test("existing drawing letters stay mapped", ()=>{

assert.equal(
DRAW_TOOL_HOTKEYS.get(
"KeyL"
),
"long"
);
assert.equal(
DRAW_TOOL_HOTKEYS.get(
"KeyA"
),
"trendline"
);
assert.equal(
DRAW_TOOL_HOTKEYS.get(
"KeyF"
),
"fib"
);

});
