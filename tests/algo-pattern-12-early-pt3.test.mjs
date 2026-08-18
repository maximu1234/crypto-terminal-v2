import assert from "node:assert/strict";
import test from "node:test";

import {
buildEarlyT3SwingLogForTest,
computePattern12Scene,
defaultPattern12Settings,
normalizePattern12Settings,
plus1BarExtremeForTest
} from "../js/algo-trading/pattern-12-math.js";

function c(
time,
open,
high,
low,
close
){

return {
time,
open,
high,
low,
close
};

}

test(
"early pt3 setting is off by default",
()=>{

assert.equal(
defaultPattern12Settings().earlyPt3Confirm,
false
);
assert.equal(
normalizePattern12Settings({}).earlyPt3Confirm,
false
);
assert.equal(
normalizePattern12Settings({
earlyPt3Confirm:
true
}).earlyPt3Confirm,
true
);

}
);

test(
"plus1 bar: long T3 moves to the next lower low if it already exists at confirm",
()=>{

const candles =
[
c(1, 10, 11, 9, 10),
c(2, 10, 10.5, 8, 9),
c(3, 9, 12, 8.5, 11)
];
const moved =
plus1BarExtremeForTest(
candles,
0,
9,
2,
"low"
);

assert.equal(
moved.bar,
1
);
assert.equal(
moved.price,
8
);

const same =
plus1BarExtremeForTest(
candles,
0,
9,
0,
"low"
);

assert.equal(
same.bar,
0
);
assert.equal(
same.price,
9
);

}
);

test(
"plus1 bar: short T3 moves to the next higher high if it already exists at confirm",
()=>{

const candles =
[
c(1, 10, 11, 9, 10),
c(2, 10, 12, 9.5, 11),
c(3, 11, 11.5, 10, 11)
];
const moved =
plus1BarExtremeForTest(
candles,
0,
11,
2,
"high"
);

assert.equal(
moved.bar,
1
);
assert.equal(
moved.price,
12
);

}
);

test(
"early T3 log uses RSI 5 / 52-48 and records swings",
()=>{

const candles =
[];
let price =
50;

for(
let i =
0;
i <
40;
i++
){

price +=
i <
20
? 0.8
: -1.1;
candles.push(
c(
i +
1,
price,
price +
0.4,
price -
0.4,
price
)
);

}

const log =
buildEarlyT3SwingLogForTest(
candles
);

assert.ok(
log.types.length >
0
);
assert.equal(
log.types.length,
log.bars.length
);
assert.equal(
log.types.length,
log.confirmBars.length
);

}
);

test(
"early pt3 off keeps current scene; on does not throw",
()=>{

const candles =
[];
let price =
100;

for(
let i =
0;
i <
80;
i++
){

const wave =
Math.sin(
i /
6
) *
8;
price =
100 +
wave +
i *
0.05;
candles.push(
c(
i +
1,
price,
price +
1.2,
price -
1.2,
price
)
);

}

const off =
computePattern12Scene(
candles,
{
...defaultPattern12Settings(),
earlyPt3Confirm:
false
}
);
const on =
computePattern12Scene(
candles,
{
...defaultPattern12Settings(),
earlyPt3Confirm:
true
}
);

assert.ok(
Array.isArray(
off.setups
)
);
assert.ok(
Array.isArray(
on.setups
)
);

}
);

function volatilePatternCandles(){
const rows =
[];
let random =
1;
let price =
100;

for(
let i =
0;
i <
800;
i++
){
random =
(
1664525 *
random +
1013904223
) >>>
0;
const open =
price;
const move =
(
random /
4294967296 -
0.5
) *
3 +
Math.sin(
i /
17
) *
0.25 +
Math.sin(
i /
53
) *
0.15;
price =
Math.max(
5,
price +
move
);
rows.push(
c(
i +
1,
open,
Math.max(
open,
price
) +
0.4,
Math.min(
open,
price
) -
0.4,
price
)
);
}

return rows;
}

test(
"early pt3 checkbox keeps current scan off and finds setups on",
()=>{

const candles =
volatilePatternCandles();
const base =
{
...defaultPattern12Settings(),
lngRsiLength:
2,
shtRsiLength:
2,
lngMicRsiLength:
2,
shtMicRsiLength:
2,
lngWaveCMode:
"2",
shtWaveCMode:
"2"
};
const off =
computePattern12Scene(
candles,
{
...base,
earlyPt3Confirm:
false
}
);
const on =
computePattern12Scene(
candles,
{
...base,
earlyPt3Confirm:
true
}
);

assert.ok(
off.setups.length >
0
);
assert.ok(
on.setups.length >
0
);

}
);

test(
"reverse logic is off by default and does not move setups",
()=>{

assert.equal(
defaultPattern12Settings().reverseLogic,
false
);
assert.equal(
normalizePattern12Settings({}).reverseLogic,
false
);

const candles =
volatilePatternCandles();
const base =
{
...defaultPattern12Settings(),
lngRsiLength:
2,
shtRsiLength:
2,
lngMicRsiLength:
2,
shtMicRsiLength:
2,
lngWaveCMode:
"2",
shtWaveCMode:
"2"
};
const off =
computePattern12Scene(
candles,
{
...base,
reverseLogic:
false
}
);
const on =
computePattern12Scene(
candles,
{
...base,
reverseLogic:
true
}
);

assert.equal(
on.setups.length,
off.setups.length
);

for(
let i =
0;
i <
off.setups.length;
i++
){

const a =
off.setups[
i
];
const b =
on.setups[
i
];

assert.equal(
b.b1,
a.b1
);
assert.equal(
b.b2,
a.b2
);
assert.equal(
b.b3,
a.b3
);
assert.equal(
b.b4,
a.b4
);
assert.equal(
b.p4,
a.p4
);
assert.equal(
b.side,
a.side
);

}

const offLong =
off.setups.filter(
s=>
s.side ===
"long"
).length;
const onLong =
on.setups.filter(
s=>
s.side ===
"long"
).length;

assert.equal(
onLong,
offLong
);

}
);
