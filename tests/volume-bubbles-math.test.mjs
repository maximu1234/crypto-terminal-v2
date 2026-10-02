import test from "node:test";
import assert from "node:assert/strict";

import {
buildVolumeBubbles,
bubbleRadiusPx,
volumeSmaAt
} from "../js/indicators/volume-bubbles-math.js";

function candle(
time,
o,
h,
l,
c,
volume
){

return {
time,
open:
o,
high:
h,
low:
l,
close:
c,
volume
};

}

test(
"volumeSmaAt averages the lookback window",
()=>{

const candles =
[
candle(1, 1, 1, 1, 1, 10),
candle(2, 1, 1, 1, 1, 20),
candle(3, 1, 1, 1, 1, 30)
];

assert.equal(
volumeSmaAt(
candles,
2,
3
),
20
);
assert.equal(
volumeSmaAt(
candles,
1,
3
),
null
);

}
);

test(
"buildVolumeBubbles filters by SMA multiplier and min volume",
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
candle(
i +
1,
100,
101,
99,
100.5,
100
)
);
}

/* Spike buy */
candles.push(
candle(
21,
100,
105,
99,
104,
400
)
);
/* Below mult */
candles.push(
candle(
22,
104,
105,
100,
101,
150
)
);
/* Spike sell but filtered by minVolume */
candles.push(
candle(
23,
101,
102,
90,
91,
500
)
);

const bubbles =
buildVolumeBubbles(
candles,
{
maLength:
20,
volumeMult:
2,
minVolume:
450,
sizeScale:
1
}
);

assert.equal(
bubbles.length,
1
);
assert.equal(
bubbles[0].side,
"sell"
);
assert.ok(
bubbles[0].radius >
0
);

const withLowerMin =
buildVolumeBubbles(
candles,
{
maLength:
20,
volumeMult:
2,
minVolume:
0,
sizeScale:
1
}
);

assert.equal(
withLowerMin.length,
2
);
assert.equal(
withLowerMin[0].side,
"buy"
);
assert.equal(
withLowerMin[1].side,
"sell"
);

}
);

test(
"bubbleRadiusPx grows with sizeScale",
()=>{

const small =
bubbleRadiusPx(
3,
{
sizeScale:
0.5,
minRadius:
4,
maxRadius:
28
}
);
const large =
bubbleRadiusPx(
3,
{
sizeScale:
2,
minRadius:
4,
maxRadius:
28
}
);

assert.ok(
large >
small
);

}
);
