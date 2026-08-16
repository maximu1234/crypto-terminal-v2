/**
 * Глобальный скан всех тикеров: агрегаты по трём стратегиям.
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
resolveAlgoScanSymbols
} from "./scan-universe.js?v=3";

/**
 * @typedef {{
 *   longWins: number,
 *   longLosses: number,
 *   shortWins: number,
 *   shortLosses: number,
 *   longWinUsd: number,
 *   longLossUsd: number,
 *   shortWinUsd: number,
 *   shortLossUsd: number,
 *   longNetUsd: number,
 *   shortNetUsd: number,
 *   netUsd: number,
 *   profitUsd: number,
 *   lossUsd: number,
 *   open: number,
 *   bes: number,
 *   sumR: number,
 *   wins: number,
 *   losses: number
 * }} AlgoGlobalStrategyAgg
 */

/**
 * @returns {AlgoGlobalStrategyAgg}
 */
export function createEmptyAlgoGlobalAgg(){

return {
longWins:
0,
longLosses:
0,
shortWins:
0,
shortLosses:
0,
longWinUsd:
0,
longLossUsd:
0,
shortWinUsd:
0,
shortLossUsd:
0,
longNetUsd:
0,
shortNetUsd:
0,
netUsd:
0,
profitUsd:
0,
lossUsd:
0,
open:
0,
bes:
0,
sumR:
0,
wins:
0,
losses:
0
};

}

/**
 * @param {AlgoGlobalStrategyAgg} acc
 * @param {object|null|undefined} stats
 */
export function addAlgoTradeStatsToAgg(
acc,
stats
){

if(
!stats ||
!acc
){
return;
}

acc.longWins +=
Number(
stats.longWins
) ||
0;
acc.longLosses +=
Number(
stats.longLosses
) ||
0;
acc.shortWins +=
Number(
stats.shortWins
) ||
0;
acc.shortLosses +=
Number(
stats.shortLosses
) ||
0;
acc.longWinUsd +=
Number(
stats.longWinUsd
) ||
0;
acc.longLossUsd +=
Number(
stats.longLossUsd
) ||
0;
acc.shortWinUsd +=
Number(
stats.shortWinUsd
) ||
0;
acc.shortLossUsd +=
Number(
stats.shortLossUsd
) ||
0;
acc.longNetUsd +=
Number(
stats.longNetUsd
) ||
0;
acc.shortNetUsd +=
Number(
stats.shortNetUsd
) ||
0;
acc.netUsd +=
Number(
stats.netUsd
) ||
0;
acc.profitUsd +=
Number(
stats.profitUsd
) ||
0;
acc.lossUsd +=
Number(
stats.lossUsd
) ||
0;
acc.open +=
Number(
stats.open
) ||
0;
acc.bes +=
Number(
stats.bes
) ||
0;
acc.sumR +=
Number(
stats.sumR
) ||
0;
acc.wins +=
Number(
stats.wins
) ||
0;
acc.losses +=
Number(
stats.losses
) ||
0;

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
 * @param {string} [opts.tf]
 * @param {"all"|"top100"} [opts.universe]
 * @param {object} opts.tradeOpts
 * @param {"direct"|"real"} [opts.statsMode]
 * @param {(done: number, total: number) => void} [opts.onProgress]
 * @param {{ cancelled: boolean }} [opts.signal]
 */
export async function scanAlgoTickersAllStrategyStats(
opts
){

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
universe,
symbols
} =
await resolveAlgoScanSymbols(
{
universe:
opts.universe
}
);

/** @type {{ st1: AlgoGlobalStrategyAgg, st2: AlgoGlobalStrategyAgg, st3: AlgoGlobalStrategyAgg }} */
const byStrategy =
{
st1:
createEmptyAlgoGlobalAgg(),
st2:
createEmptyAlgoGlobalAgg(),
st3:
createEmptyAlgoGlobalAgg()
};

const total =
symbols.length;
let done =
0;
let cursor =
0;

async function worker(){

while(
cursor <
symbols.length
){

if(
signal.cancelled
){
return;
}

const index =
cursor++;
const symbol =
symbols[
index
];

try{
const candles =
await loadMarketHistory(
symbol,
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

const analysis =
analyzeAlgoPatterns(
candles,
tradeOpts
);

addAlgoTradeStatsToAgg(
byStrategy.st1,
pickStrategyStats(
"st1",
analysis
)
);
addAlgoTradeStatsToAgg(
byStrategy.st2,
pickStrategyStats(
"st2",
analysis
)
);
addAlgoTradeStatsToAgg(
byStrategy.st3,
pickStrategyStats(
"st3",
analysis
)
);
}catch(
err
){
console.warn(
"[algo-trading] global ticker scan",
symbol,
err
);
}

done +=
1;
opts.onProgress?.(
done,
total
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

return {
ok:
!signal.cancelled,
cancelled:
signal.cancelled ===
true,
tf,
universe,
total,
done,
byStrategy
};

}
