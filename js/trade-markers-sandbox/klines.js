/**
 * Песочница: загрузка свечей ETHUSDT (до ~2500 баров, параллельно).
 */
import {
fetchBybit
} from "../bybit-fetch.js?v=17";

import {
SANDBOX_MAX_KLINE_BATCHES,
SANDBOX_SYMBOL,
SANDBOX_TARGET_CANDLES
} from "./marker-math.js?v=8";

const TF_PERIOD_MS =
Object.freeze({
"1":
60 *
1000,
"5":
5 *
60 *
1000,
"15":
15 *
60 *
1000,
"60":
60 *
60 *
1000,
"240":
4 *
60 *
60 *
1000,
"D":
24 *
60 *
60 *
1000,
"W":
7 *
24 *
60 *
60 *
1000
});

async function fetchKlineBatch(
symbol,
tf,
endMs
){

const path =
`/v5/market/kline?category=linear&symbol=${encodeURIComponent(
symbol
)}&interval=${encodeURIComponent(
tf
)}&limit=1000&end=${endMs}`;

try{

const {
json
} =
await fetchBybit(
path,
{
retries:
2,
timeoutMs:
12000
}
);

if(
json.retCode ===
0 &&
Array.isArray(
json.result?.list
)
){
return json.result.list;
}

}catch{
/* ignore */
}

return null;

}

function rowToCandle(
row
){

const time =
Math.floor(
Number(
row[
0
]
) /
1000
);

return {
time,
open:
Number(
row[
1
]
),
high:
Number(
row[
2
]
),
low:
Number(
row[
3
]
),
close:
Number(
row[
4
]
),
volume:
Number(
row[
5
]
) ||
0
};

}

export async function loadRecentCandles(
symbol =
SANDBOX_SYMBOL,
tf,
targetCount =
SANDBOX_TARGET_CANDLES
){

const want =
Math.max(
500,
Math.min(
3000,
Number(
targetCount
) ||
SANDBOX_TARGET_CANDLES
)
);

const tfMs =
TF_PERIOD_MS[
tf
] ||
TF_PERIOD_MS[
"240"
];
const now =
Date.now();
const batchEnds =
[];

for(
let i =
0;
i <
SANDBOX_MAX_KLINE_BATCHES;
i++
){

batchEnds.push(
now -
i *
1000 *
tfMs
);

}

const batches =
await Promise.all(
batchEnds.map(
endMs=>
fetchKlineBatch(
symbol,
tf,
endMs
)
)
);

const unique =
new Map();

for(
const batch of
batches
){

if(
!batch?.length
){
continue;
}

for(
const row of
batch
){

const candle =
rowToCandle(
row
);

if(
Number.isFinite(
candle.time
)
){
unique.set(
candle.time,
candle
);
}

}

}

let candles =
[
...unique.values()
].sort(
(
a,
b
)=>
a.time -
b.time
);

if(
candles.length >
want
){
candles =
candles.slice(
candles.length -
want
);
}

return candles;

}
