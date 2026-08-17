/**
 * Скан всех тикеров по винрейту выбранной стратегии (АлгоТрейдинг).
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
resolveAlgoScanSymbols,
normalizeAlgoScanUniverse
} from "./scan-universe.js?v=3";

/** Дефолтный ТФ скана (если не передан opts.tf). */
export const ALGO_TICKER_SCAN_TF =
"5";

export const ALGO_TICKER_SCAN_TF_OPTIONS =
[
"1",
"5",
"15",
"60",
"240",
"D",
"W"
];

/**
 * Глубина истории Алго: 10×~1000 ≈ 10 000 свечей.
 * Одна константа для графика, «Подобрать параметры», «Подобрать для всех» и сканов.
 */
export const ALGO_TICKER_SCAN_HISTORY_REQUESTS =
10;

/**
 * @param {unknown} raw
 */
export function normalizeAlgoScanTf(
raw
){

const tf =
String(
raw ||
""
).trim();

return ALGO_TICKER_SCAN_TF_OPTIONS.includes(
tf
)
? tf
: ALGO_TICKER_SCAN_TF;

}

export const ALGO_TICKER_SCAN_CONCURRENCY =
3;

export const ALGO_TICKER_SCAN_DELAY_MS =
40;

/**
 * @typedef {"st1"|"st2"|"st3"} AlgoScanStrategyId
 */

/**
 * @param {AlgoScanStrategyId} strategyId
 * @param {ReturnType<typeof analyzeAlgoPatterns>} analysis
 */
export function pickStrategyStats(
strategyId,
analysis
){

if(
strategyId ===
"st2"
){
return analysis?.partialStats ||
null;
}

if(
strategyId ===
"st3"
){
return analysis?.partialYStats ||
null;
}

return analysis?.tradeStats ||
null;

}

/**
 * @param {"long"|"short"} side
 * @param {object|null} stats
 */
export function strategySideWinRate(
side,
stats
){

if(
!stats
){
return null;
}

const rate =
side ===
"short"
? stats.shortWinRate
: stats.longWinRate;

return Number.isFinite(
rate
)
? rate
: null;

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
 * @param {"long"|"short"|"both"} opts.side
 * @param {number} opts.minWinRate
 * @param {string} [opts.tf]
 * @param {"all"|"top100"} [opts.universe]
 * @param {object} opts.tradeOpts
 * @param {"direct"|"real"} [opts.statsMode] прямой (дефолт) или реальный подсчёт
 * @param {(done: number, total: number, hitCount: number) => void} [opts.onProgress]
 * @param {{ cancelled: boolean }} [opts.signal]
 */
export async function scanAlgoTickersByWinRate(
opts
){

const strategyId =
opts.strategyId ===
"st2" ||
opts.strategyId ===
"st3"
? opts.strategyId
: "st1";
const side =
opts.side ===
"short" ||
opts.side ===
"both"
? opts.side
: "long";
const tf =
normalizeAlgoScanTf(
opts.tf
);
const universe =
normalizeAlgoScanUniverse(
opts.universe
);
const minWinRate =
Math.min(
100,
Math.max(
10,
Number(
opts.minWinRate
) ||
50
)
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
symbols
} =
await resolveAlgoScanSymbols(
{
universe
}
);

const hits =
[];
const total =
symbols.length;
let done =
0;
let cursor =
0;

function passesWinRate(
stats
){

if(
side ===
"both"
){
const longRate =
strategySideWinRate(
"long",
stats
);
const shortRate =
strategySideWinRate(
"short",
stats
);

return Number.isFinite(
longRate
) &&
longRate >
minWinRate &&
Number.isFinite(
shortRate
) &&
shortRate >
minWinRate;
}

const winRate =
strategySideWinRate(
side,
stats
);

return Number.isFinite(
winRate
) &&
winRate >
minWinRate;

}

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
const stats =
pickStrategyStats(
strategyId,
analysis
);

if(
passesWinRate(
stats
)
){
const longRate =
strategySideWinRate(
"long",
stats
);
const shortRate =
strategySideWinRate(
"short",
stats
);
const winRate =
side ===
"both"
? Math.min(
longRate,
shortRate
)
: strategySideWinRate(
side,
stats
);

hits.push(
{
symbol,
winRate,
longWinRate:
longRate,
shortWinRate:
shortRate,
stats
}
);
}
}catch(
err
){
console.warn(
"[algo-trading] ticker scan",
symbol,
err
);
}

done +=
1;
opts.onProgress?.(
done,
total,
hits.length
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

hits.sort(
(
a,
b
)=>
b.winRate -
a.winRate ||
a.symbol.localeCompare(
b.symbol
)
);

return {
ok:
!signal.cancelled,
cancelled:
signal.cancelled ===
true,
side,
universe,
strategyId,
minWinRate,
tf,
total,
hits,
symbols:
hits.map(
h=>
h.symbol
)
};

}
