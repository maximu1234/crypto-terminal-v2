import assert from "node:assert/strict";
import test from "node:test";

import {
PATTERN_12_EARLY_T3_ID,
computePattern12Scene,
defaultPattern12Settings,
normalizePattern12Settings,
scanCompletePatternsForTest
} from "../js/algo-trading/pattern-12-early-t3-math.js";

test(
"1-2 EARLY T3 defaults match the Pine sample",
()=>{

const s =
defaultPattern12Settings();

assert.equal(
PATTERN_12_EARLY_T3_ID,
"pattern-12-early-t3"
);
assert.equal(
s.patternMode,
"both"
);
assert.equal(
s.decLowsBeforePt1,
1
);
assert.equal(
s.ascHighsBeforePt1,
1
);
assert.equal(
s.lngRsiLength,
14
);
assert.equal(
s.lngMicRsiLength,
7
);
assert.equal(
s.shtRsiLength,
14
);
assert.equal(
s.shtMicRsiLength,
7
);
assert.equal(
s.earlyT3RsiLen,
5
);
assert.equal(
s.earlyT3OB,
52
);
assert.equal(
s.earlyT3OS,
48
);
assert.equal(
s.earlyPt3Confirm,
true
);
assert.equal(
s.onePt34Per12,
false
);

}
);

test(
"1-2 EARLY T3 always keeps early point 3 on",
()=>{

assert.equal(
normalizePattern12Settings({
earlyPt3Confirm:
false
}).earlyPt3Confirm,
true
);

}
);

test(
"1-2 EARLY T3 scene computes without throwing",
()=>{

const candles =
[];

for(
let i =
0;
i <
80;
i++
){
const base =
100 +
Math.sin(
i /
6
) *
8 +
(
i %
7
);
candles.push(
{
time:
i +
1,
open:
base,
high:
base +
2,
low:
base -
2,
close:
base +
(
i %
2
? 1
: -1
)
}
);
}

const scene =
computePattern12Scene(
candles,
defaultPattern12Settings()
);

assert.ok(
Array.isArray(
scene.pt4Dots
)
);
assert.ok(
Array.isArray(
scene.setups
)
);

}
);

test(
"onePt34Per12 checkbox keeps a single 3-4 per 1-2",
()=>{

const candles =
[];

for(
let i =
0;
i <
20;
i++
){
candles.push(
{
time:
i +
1,
open:
105,
high:
109,
low:
101,
close:
105
}
);
}

const senLog =
{
bars: [2, 5],
confirmBars: [3, 6],
types: [-1, 1],
prices: [100, 110]
};
const earlyLog =
{
bars: [7, 9, 11],
confirmBars: [8, 10, 12],
types: [-1, -1, -1],
prices: [104, 103, 102]
};
const micLog =
{
bars: [8, 10, 13],
confirmBars: [8, 10, 13],
types: [1, 1, 1],
prices: [106, 107, 108]
};
const base =
{
...defaultPattern12Settings(),
patternMode:
"long",
waveAMode:
"1",
decLowsBeforePt1:
0
};
const off =
scanCompletePatternsForTest(
"long",
candles,
senLog,
micLog,
null,
normalizePattern12Settings(
{
...base,
onePt34Per12:
false
}
),
earlyLog
);
const on =
scanCompletePatternsForTest(
"long",
candles,
senLog,
micLog,
null,
normalizePattern12Settings(
{
...base,
onePt34Per12:
true
}
),
earlyLog
);

assert.equal(
on.length,
1
);
assert.equal(
on[0].b3,
11
);
assert.equal(
on[0].b4,
13
);
assert.equal(
normalizePattern12Settings({}).onePt34Per12,
false
);
assert.ok(
off.length >=
on.length
);

}
);
