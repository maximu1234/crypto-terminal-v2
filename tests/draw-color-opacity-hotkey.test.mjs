import test from "node:test";
import assert from "node:assert/strict";

import {
parseOpacityPercentInput
} from "../js/draw-color-palette.js";

import {
shouldIgnoreTypingHotkey
} from "../js/qwerty-key-input.js";

test("parseOpacityPercentInput accepts percents and clamps", ()=>{

assert.equal(
parseOpacityPercentInput(
"50"
),
50
);
assert.equal(
parseOpacityPercentInput(
"50%"
),
50
);
assert.equal(
parseOpacityPercentInput(
" 100 % "
),
100
);
assert.equal(
parseOpacityPercentInput(
"0"
),
0
);
assert.equal(
parseOpacityPercentInput(
"150"
),
100
);
assert.equal(
parseOpacityPercentInput(
"-3"
),
0
);
assert.equal(
parseOpacityPercentInput(
"5,4"
),
5
);
assert.equal(
parseOpacityPercentInput(
""
),
null
);
assert.equal(
parseOpacityPercentInput(
"%"
),
null
);
assert.equal(
parseOpacityPercentInput(
"ab"
),
null
);

});

test("shouldIgnoreTypingHotkey skips INPUT and TEXTAREA", ()=>{

const inputEvent =
{
defaultPrevented: false,
target: {
tagName: "INPUT",
isContentEditable: false
}
};

assert.equal(
shouldIgnoreTypingHotkey(
inputEvent
),
true
);

assert.equal(
shouldIgnoreTypingHotkey(
{
defaultPrevented: false,
target: {
tagName: "TEXTAREA",
isContentEditable: false
}
}
),
true
);

assert.equal(
shouldIgnoreTypingHotkey(
{
defaultPrevented: false,
target: {
tagName: "DIV",
isContentEditable: false
}
}
),
false
);

assert.equal(
shouldIgnoreTypingHotkey(
{
defaultPrevented: true,
target: {
tagName: "DIV"
}
}
),
true
);

});
