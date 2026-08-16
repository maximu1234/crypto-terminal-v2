import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

import {
buildRsiSwingLogForTest,
defaultPattern12Settings,
normalizePattern12Settings
} from "../js/indicators/pattern-12-math.js";

/** Рывок вверх, затем медленный дрейф вниз без ухода RSI в перепроданность. */
function rallyThenDrift(){

const rows =
[];
let price =
100;

for(
let i =
0;
i <
25;
i++
){

const open =
price;
price +=
1.5;

rows.push(
{
time:
i +
1,
open,
high:
price +
0.2,
low:
open -
0.2,
close:
price
}
);

}

for(
let i =
0;
i <
25;
i++
){

const open =
price;
price -=
0.35;

rows.push(
{
time:
26 +
i,
open,
high:
open +
0.05,
low:
price -
0.05,
close:
price
}
);

}

return rows;

}

test(
"original math: tempFastPt4 defaults keep original behaviour",
()=>{

const s =
normalizePattern12Settings(
{}
);

assert.equal(
s.tempFastPt4,
false
);
assert.equal(
s.tempFastPt4Bars,
2
);
assert.equal(
defaultPattern12Settings().tempFastPt4,
false
);

}
);

test(
"original math: tempFastPt4Bars is clamped to 1..5",
()=>{

assert.equal(
normalizePattern12Settings(
{
tempFastPt4Bars:
0
}
).tempFastPt4Bars,
1
);
assert.equal(
normalizePattern12Settings(
{
tempFastPt4Bars:
9
}
).tempFastPt4Bars,
5
);

}
);

test(
"original math: fast confirm keeps the same extreme but confirms it earlier",
()=>{

const candles =
rallyThenDrift();
const opts =
{
overbought:
70,
oversold:
30
};

const slow =
buildRsiSwingLogForTest(
candles,
6,
opts
).log;
const fast =
buildRsiSwingLogForTest(
candles,
6,
{
...opts,
fastConfirmBars:
1
}
).log;

assert.equal(
slow.bars[
0
],
fast.bars[
0
]
);
assert.ok(
fast.confirmBars[
0
] <
slow.confirmBars[
0
]
);

}
);

test(
"original math: fast confirm emits each extreme once",
()=>{

const fast =
buildRsiSwingLogForTest(
rallyThenDrift(),
6,
{
overbought:
70,
oversold:
30,
fastConfirmBars:
1
}
).log;

assert.equal(
new Set(
fast.bars
).size,
fast.bars.length
);

}
);

test(
"original Pattern 1-2 UI keeps only tempFastPt4 extras",
()=>{

const ui =
fs.readFileSync(
new URL("../js/indicators/pattern-12.js", import.meta.url),
"utf8"
);
const paint =
fs.readFileSync(
new URL("../js/indicators/pattern-12-paint.js", import.meta.url),
"utf8"
);

assert.match(
ui,
/tempFastPt4/
);
assert.doesNotMatch(
ui,
/requirePt3ConfirmBeforePt4|showMacroConfirmMarks/
);
assert.doesNotMatch(
paint,
/confirmMarks/
);

}
);
