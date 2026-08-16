import test from "node:test";
import assert from "node:assert/strict";

import {
scanLngChainsAfterPt12ForTest as scanAlgo
} from "../js/algo-trading/pattern-12-math.js";
import {
scanLngChainsAfterPt12ForTest as scanOriginal
} from "../js/indicators/pattern-12-math.js";
import {
scanLngChainsAfterPt12ForTest as scanPack
} from "../Pattern-12-1-2/pattern-12-math.js";

function flatCandles(
n,
p1 =
100,
p2 =
120
){

const mid =
(p1 + p2) /
2;
const rows =
[];

for(
let i =
0;
i <
n;
i++
){
rows.push(
{
time:
i +
1,
open:
mid,
high:
p2 -
0.5,
low:
p1 +
0.5,
close:
mid
}
);
}

return rows;
}

function micUp(
bars,
prices
){

return {
types:
bars.map(
()=>
1
),
bars,
prices,
confirmBars:
[
...bars
]
};

}

/**
 * Геометрия цепочки заморожена во всех копиях; confirm-поля (b3Confirm /
 * b4Confirm) — метаданные, они есть не в каждой копии и здесь не сравниваются.
 */
function chainGeometry(
chain
){

return {
b3:
chain.b3,
p3:
chain.p3,
b4:
chain.b4,
p4:
chain.p4
};

}

function runFreezeCases(
scanLngChainsAfterPt12ForTest,
label
){

test(
`${label}: completed 3-4 stays when a later lower swing appears after b4`,
()=>{

const candles =
flatCandles(
60
);
const i2 =
0;
const b2 =
10;
const pr1 =
100;
const pr2 =
120;
const senLog =
{
types: [
1,
-1,
-1
],
bars: [
10,
20,
35
],
prices: [
118,
110,
105
],
confirmBars: [
10,
20,
35
]
};
const micLog =
micUp(
[
25,
45
],
[
115,
112
]
);

const chains =
scanLngChainsAfterPt12ForTest(
senLog,
micLog,
candles,
i2,
b2,
pr1,
pr2,
1
);

assert.equal(
chains.length,
2
);
assert.deepEqual(
chainGeometry(
chains[
0
]
),
{
b3:
20,
p3:
110,
b4:
25,
p4:
115
}
);
assert.deepEqual(
chainGeometry(
chains[
1
]
),
{
b3:
35,
p3:
105,
b4:
45,
p4:
112
}
);

}
);

test(
`${label}: deeper swing before pt4 still wins (not first shallow alone)`,
()=>{

const candles =
flatCandles(
60
);
const senLog =
{
types: [
1,
-1,
-1
],
bars: [
10,
20,
28
],
prices: [
118,
110,
105
],
confirmBars: [
10,
20,
28
]
};
const micLog =
micUp(
[
40
],
[
115
]
);

const chains =
scanLngChainsAfterPt12ForTest(
senLog,
micLog,
candles,
0,
10,
100,
120,
1
);

assert.equal(
chains.length,
1
);
assert.deepEqual(
chainGeometry(
chains[
0
]
),
{
b3:
28,
p3:
105,
b4:
40,
p4:
115
}
);

}
);

}

runFreezeCases(
scanAlgo,
"algo"
);
runFreezeCases(
scanOriginal,
"original indicator"
);
runFreezeCases(
scanPack,
"Pattern-12-1-2 pack"
);
