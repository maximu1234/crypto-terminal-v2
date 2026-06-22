import {
test
} from "node:test";

import assert from "node:assert/strict";

import {
calculateAwesomeOscillator,
aoBarColor,
AO_UP,
AO_DOWN
} from "../js/indicators/ao-math.js";

test(
"calculateAwesomeOscillator: SMA(5) - SMA(34) on hl2",
()=>{

const candles =
[];

for(
let i =
0;
i <
40;
i++
){

candles.push({
time:
1700000000 +
i *
3600,
high:
10 +
i *
0.1,
low:
9 +
i *
0.1
});

}

const ao =
calculateAwesomeOscillator(
candles
);

assert.equal(
ao.length,
7
);

assert.equal(
ao[
0
].time,
candles[
33
].time
);

assert.ok(
Number.isFinite(
ao[
0
].value
)
);

}
);

test(
"aoBarColor: green when rising, red when falling",
()=>{

assert.equal(
aoBarColor(
1,
0.5
),
AO_UP
);

assert.equal(
aoBarColor(
0.5,
1
),
AO_DOWN
);

}
);
