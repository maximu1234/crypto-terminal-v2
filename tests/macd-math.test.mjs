import {
test
} from "node:test";

import assert from "node:assert/strict";

import {
calculateMacd,
macdHistColor,
MACD_HIST_GROW_ABOVE,
MACD_HIST_FALL_ABOVE,
MACD_HIST_GROW_BELOW,
MACD_HIST_FALL_BELOW,
defaultMacdSettings
} from "../js/indicators/macd-math.js";

function rampCandles(
count
){

const candles =
[];

for(
let i =
0;
i <
count;
i++
){

const close =
10 +
i *
0.1;

candles.push({
time:
1700000000 +
i *
3600,
open:
close,
high:
close +
0.05,
low:
close -
0.05,
close
});

}

return candles;

}

test(
"calculateMacd: first full bar after slow+signal-1 (26+9 EMA)",
()=>{

const candles =
rampCandles(
50
);
const rows =
calculateMacd(
candles
);

assert.equal(
rows.length,
50
);

const firstMacd =
rows.findIndex(
row=>
row.macd !=
null
);
const firstFull =
rows.findIndex(
row=>
row.macd !=
null &&
row.signal !=
null &&
row.hist !=
null
);

assert.equal(
firstMacd,
25
);
assert.equal(
firstFull,
33
);

const full =
rows[
firstFull
];

assert.ok(
Number.isFinite(
full.macd
)
);
assert.ok(
Number.isFinite(
full.signal
)
);
assert.equal(
full.hist,
full.macd -
full.signal
);

}
);

test(
"calculateMacd: hist is macd minus signal on later bars",
()=>{

const rows =
calculateMacd(
rampCandles(
60
)
);

for(
const row of rows
){

if(
row.macd ==
null ||
row.signal ==
null
){
continue;
}

assert.ok(
Math.abs(
row.hist -
(
row.macd -
row.signal
)
) <
1e-12
);

}

}
);

test(
"macdHistColor: TV grow/fall above and below zero",
()=>{

assert.equal(
macdHistColor(
1,
0.5
),
MACD_HIST_GROW_ABOVE
);

assert.equal(
macdHistColor(
0.5,
1
),
MACD_HIST_FALL_ABOVE
);

assert.equal(
macdHistColor(
-0.5,
-1
),
MACD_HIST_GROW_BELOW
);

assert.equal(
macdHistColor(
-1,
-0.5
),
MACD_HIST_FALL_BELOW
);

}
);

test(
"defaultMacdSettings match TradingView",
()=>{

assert.deepEqual(
defaultMacdSettings(),
{
fastLength:
12,
slowLength:
26,
signalLength:
9,
source:
"close",
oscillatorMa:
"ema",
signalMa:
"ema"
}
);

}
);
