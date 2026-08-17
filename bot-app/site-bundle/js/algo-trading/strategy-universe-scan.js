/**
 * Бэктест одной стратегии по universe (Топ-100 / все тикеры).
 * Логика как в Pattern 1-2 Top-100 modal, параметры — АлгоТрейдинг.
 */
import {
loadMarketHistory
} from "../market-api.js?v=6";

import {
analyzeAlgoPatterns
} from "./pattern-analysis.js?v=37";

import {
normalizeAlgoStatsMode
} from "./pattern-trade-stats.js?v=14";

import {
readAlgoPattern12Settings
} from "./pattern-12-settings.js?v=3";

import {
normalizeAlgoScanTf,
pickStrategyStats,
ALGO_TICKER_SCAN_HISTORY_REQUESTS,
ALGO_TICKER_SCAN_CONCURRENCY,
ALGO_TICKER_SCAN_DELAY_MS
} from "./ticker-scanner.js?v=10";

import {
createEmptyAlgoGlobalAgg,
addAlgoTradeStatsToAgg
} from "./ticker-scan-all-stats.js?v=8";

import {
resolveAlgoScanUniverseItems,
normalizeAlgoScanUniverse
} from "./scan-universe.js?v=3";

/**
 * @typedef {"st1"|"st2"|"st3"} AlgoScanStrategyId
 */

/**
 * @param {unknown} raw
 * @returns {AlgoScanStrategyId}
 */
export function normalizeAlgoScanStrategyId(
raw
){

const id =
String(
raw ||
""
).toLowerCase();

if(
id ===
"st2" ||
id ===
"st3"
){
return id;
}

return "st1";

}

function sleep(
ms
){

return new Promise(
resolve=>
setTimeout(
resolve,
ms
)
);

}

/**
 * @param {object} opts
 * @param {AlgoScanStrategyId} opts.strategyId
 * @param {"all"|"top100"} [opts.universe]
 * @param {string} [opts.tf]
 * @param {object} opts.tradeOpts
 * @param {"direct"|"real"} [opts.statsMode]
 * @param {(done: number, total: number, partial: { agg: object, rows: object[] }) => void} [opts.onProgress]
 * @param {{ cancelled: boolean }} [opts.signal]
 */
export async function scanAlgoStrategyUniverse(
opts
){

const strategyId =
normalizeAlgoScanStrategyId(
opts.strategyId
);
const universe =
normalizeAlgoScanUniverse(
opts.universe
);
const tf =
normalizeAlgoScanTf(
opts.tf
);
const statsMode =
normalizeAlgoStatsMode(
opts.statsMode
);
const signal =
opts.signal ||
{
cancelled:
false
};
const tradeOpts =
{
...(
opts.tradeOpts ||
{}
),
patternSettings:
opts.tradeOpts?.patternSettings ||
readAlgoPattern12Settings(),
statsMode,
statsModeSt2:
statsMode,
statsModeSt3:
statsMode
};

const {
items
} =
await resolveAlgoScanUniverseItems(
{
universe
}
);

const agg =
createEmptyAlgoGlobalAgg();
agg.historySpanSec =
0;
/** @type {object[]} */
const rows =
new Array(
items.length
);
const total =
items.length;
let done =
0;
let cursor =
0;
let historySpanSec =
0;

async function worker(){

while(
cursor <
items.length
){

if(
signal.cancelled
){
return;
}

const index =
cursor++;
const item =
items[
index
];

try{
const candles =
await loadMarketHistory(
item.symbol,
tf,
ALGO_TICKER_SCAN_HISTORY_REQUESTS,
{
parallel:
true,
batchGapMs:
0
}
);

if(
signal.cancelled
){
return;
}

if(
!candles ||
!candles.length
){
rows[
index
] =
{
rank:
item.rank,
symbol:
item.symbol,
turnover24h:
item.turnover24h,
skipped:
true,
error:
"bars=0"
};
}else{
const t0 =
Number(
candles[0]?.time
);
const t1 =
Number(
candles[
candles.length -
1
]?.time
);

if(
Number.isFinite(
t0
) &&
Number.isFinite(
t1
) &&
t1 >
t0
){
const span =
t1 -
t0;

if(
span >
historySpanSec
){
historySpanSec =
span;
agg.historySpanSec =
historySpanSec;
}
}

const analysis =
analyzeAlgoPatterns(
candles,
tradeOpts
);
const stats =
pickStrategyStats(
strategyId,
analysis
);

if(
!stats
){
rows[
index
] =
{
rank:
item.rank,
symbol:
item.symbol,
turnover24h:
item.turnover24h,
skipped:
true,
error:
"no stats"
};
}else{
addAlgoTradeStatsToAgg(
agg,
stats
);
rows[
index
] =
{
rank:
item.rank,
symbol:
item.symbol,
turnover24h:
item.turnover24h,
skipped:
false,
longWins:
Number(
stats.longWins
) ||
0,
longLosses:
Number(
stats.longLosses
) ||
0,
longOpen:
Number(
stats.longOpen
) ||
0,
shortWins:
Number(
stats.shortWins
) ||
0,
shortLosses:
Number(
stats.shortLosses
) ||
0,
shortOpen:
Number(
stats.shortOpen
) ||
0,
closed:
Number(
stats.closed
) ||
0,
wins:
Number(
stats.wins
) ||
0,
losses:
Number(
stats.losses
) ||
0,
open:
Number(
stats.open
) ||
0,
winRate:
Number.isFinite(
stats.winRate
)
? stats.winRate
: null,
netUsd:
Number(
stats.netUsd
) ||
0,
profitUsd:
Number(
stats.profitUsd
) ||
0,
lossUsd:
Number(
stats.lossUsd
) ||
0,
bes:
Number(
stats.bes
) ||
0,
sumR:
Number(
stats.sumR
) ||
0,
expectancyR:
Number.isFinite(
stats.expectancyR
)
? stats.expectancyR
: null
};
}
}
}catch(
err
){
console.warn(
"[algo-trading] strategy universe scan",
item.symbol,
err
);
rows[
index
] =
{
rank:
item.rank,
symbol:
item.symbol,
turnover24h:
item.turnover24h,
skipped:
true,
error:
String(
err?.message ||
err ||
"error"
)
};
}

done +=
1;
opts.onProgress?.(
done,
total,
{
agg,
rows:
rows
.filter(
Boolean
)
.sort(
(
a,
b
)=>
a.rank -
b.rank
)
}
);

if(
ALGO_TICKER_SCAN_DELAY_MS >
0
){
await sleep(
ALGO_TICKER_SCAN_DELAY_MS
);
}

}

}

const workers =
Array.from(
{
length:
ALGO_TICKER_SCAN_CONCURRENCY
},
()=>
worker()
);

await Promise.all(
workers
);

agg.historySpanSec =
historySpanSec;

return {
ok:
!signal.cancelled,
cancelled:
signal.cancelled ===
true,
tf,
universe,
strategyId,
total,
done,
historySpanSec,
agg,
rows:
rows
.filter(
Boolean
)
.sort(
(
a,
b
)=>
a.rank -
b.rank
)
};

}
