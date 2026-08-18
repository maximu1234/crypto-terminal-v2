import test from "node:test";
import assert from "node:assert/strict";

import "./helpers/stub-browser.mjs";

import {
mergeLiveCandle
} from "../js/algo-trading/live-candle.js";

import {
formatTurnover24Label
} from "../js/algo-trading/page-format.js";

import {
shouldIgnoreAlgoHotkey
} from "../js/algo-trading/page-hotkeys.js";

test("mergeLiveCandle updates the last bar in place", ()=>{

const candles =
[
{
time:
1,
close:
10
}
];
const changed =
mergeLiveCandle(
candles,
{
time:
1,
close:
11
}
);
assert.equal(
changed,
true
);
assert.equal(
candles.length,
1
);
assert.equal(
candles[0].close,
11
);

});

test("mergeLiveCandle appends a newer bar and respects maxLen", ()=>{

const candles =
[
{
time:
1,
close:
10
},
{
time:
2,
close:
12
}
];
assert.equal(
mergeLiveCandle(
candles,
{
time:
3,
close:
13
},
2
),
true
);
assert.equal(
candles.length,
2
);
assert.equal(
candles[0].time,
2
);
assert.equal(
candles[1].time,
3
);

});

test("mergeLiveCandle ignores an older bar", ()=>{

const candles =
[
{
time:
5,
close:
10
}
];
assert.equal(
mergeLiveCandle(
candles,
{
time:
4,
close:
9
}
),
false
);
assert.equal(
candles.length,
1
);

});

test("formatTurnover24Label uses K/M compact units", ()=>{

assert.equal(
formatTurnover24Label(
0
),
""
);
assert.equal(
formatTurnover24Label(
500
),
"Объем 24ч: 500"
);
assert.equal(
formatTurnover24Label(
12500
),
"Объем 24ч: 12.5K"
);
assert.equal(
formatTurnover24Label(
2300000
),
"Объем 24ч: 2.3M"
);

});

test("shouldIgnoreAlgoHotkey skips typing and modifiers", ()=>{

assert.equal(
shouldIgnoreAlgoHotkey(
{
defaultPrevented:
false,
metaKey:
false,
ctrlKey:
false,
altKey:
false,
shiftKey:
false,
target:{
tagName:
"DIV"
}
}
),
false
);
assert.equal(
shouldIgnoreAlgoHotkey(
{
defaultPrevented:
false,
metaKey:
false,
ctrlKey:
false,
altKey:
false,
shiftKey:
false,
target:{
tagName:
"INPUT"
}
}
),
true
);
assert.equal(
shouldIgnoreAlgoHotkey(
{
defaultPrevented:
false,
metaKey:
true,
ctrlKey:
false,
altKey:
false,
shiftKey:
false,
target:{
tagName:
"DIV"
}
}
),
true
);

});
