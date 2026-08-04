/**
 * Исходы сделок АлгоТрейдинг: ТП раньше СЛ = win, СЛ раньше ТП = loss.
 */
import {
clampSlPctOfX,
clampTpRr,
clampRiskUsd,
computeAlgoStopLoss,
computeAlgoTakeProfit,
linearUsdFromRisk,
DEFAULT_SL_PCT_OF_X,
DEFAULT_TP_RR,
DEFAULT_RISK_USD
} from "./pattern-entry-positions.js?v=14";

import {
normalizeAlgoTpEmaTrail,
computeAlgoCloseEmaSeries,
isAlgoTpEmaFavorable,
isAlgoTpEmaAgainst
} from "./pattern-tp-ema.js?v=1";

/**
 * @typedef {"win"|"loss"|"open"} TradeOutcome
 *
 * @typedef {{
 *   longWins: number,
 *   longLosses: number,
 *   longOpen: number,
 *   longWinRate: number|null,
 *   longWinUsd: number,
 *   longLossRate: number|null,
 *   longLossUsd: number,
 *   shortWins: number,
 *   shortLosses: number,
 *   shortOpen: number,
 *   shortWinRate: number|null,
 *   shortWinUsd: number,
 *   shortLossRate: number|null,
 *   shortLossUsd: number,
 *   wins: number,
 *   losses: number,
 *   open: number,
 *   closed: number,
 *   winRate: number|null,
 *   lossRate: number|null,
 *   profitUsd: number,
 *   lossUsd: number,
 *   netUsd: number,
 *   longNetUsd: number,
 *   shortNetUsd: number,
 *   bes: number,
 *   sumR: number,
 *   expectancyR: number|null
 * }} AlgoTradeStats
 */

/**
 * @param {Array} candles
 * @param {{
 *   type: string,
 *   side: "long"|"short",
 *   bar: number,
 *   price: number,
 *   pt3?: number,
 *   pt4?: number
 * }} event
 * @param {{ slPctOfX?: number, tpRr?: number }} [opts]
 * @returns {{ outcome: TradeOutcome, exitBar: number|null }|null}
 */
export function resolveAlgoTradeDetail(
candles,
event,
opts =
{}
){

if(
event?.type !==
"entry"
){
return null;
}

const side =
event.side ===
"short"
? "short"
: "long";
const entryBar =
Number(
event.bar
);
const entry =
Number(
event.price
);
const slPctOfX =
clampSlPctOfX(
opts.slPctOfX ??
DEFAULT_SL_PCT_OF_X
);
const tpRr =
clampTpRr(
opts.tpRr ??
DEFAULT_TP_RR
);
const useEmaTrail =
normalizeAlgoTpEmaTrail(
opts.tpEmaTrail
);
const ema =
useEmaTrail
? computeAlgoCloseEmaSeries(
candles,
opts.tpEmaLength
)
: null;

if(
!Array.isArray(
candles
) ||
!Number.isFinite(
entryBar
) ||
entryBar <
0 ||
entryBar >=
candles.length ||
!Number.isFinite(
entry
)
){
return null;
}

const slPrice =
computeAlgoStopLoss(
side,
event.pt3,
event.pt4 ??
entry,
slPctOfX
);
const tpPrice =
computeAlgoTakeProfit(
side,
entry,
slPrice,
tpRr
);

if(
!Number.isFinite(
slPrice
) ||
!Number.isFinite(
tpPrice
)
){
return null;
}

let emaTrail =
false;

for(
let i =
entryBar;
i <
candles.length;
i++
){

const candle =
candles[
i
];

if(
!candle
){
continue;
}

const close =
Number(
candle.close
);
const emaVal =
ema
? ema[
i
]
: NaN;

if(
emaTrail
){

const slHit =
side ===
"long"
? Number.isFinite(
candle.low
) &&
candle.low <=
slPrice
: Number.isFinite(
candle.high
) &&
candle.high >=
slPrice;

if(
slHit
){
return {
outcome:
"loss",
exitBar:
i,
exitPrice:
slPrice,
exitReason:
"sl"
};
}

if(
isAlgoTpEmaAgainst(
side,
close,
emaVal
)
){
return {
outcome:
"win",
exitBar:
i,
exitPrice:
close,
exitReason:
"ema"
};
}

continue;

}

const hit =
side ===
"long"
? hitLongLevels(
candle,
slPrice,
tpPrice
)
: hitShortLevels(
candle,
slPrice,
tpPrice
);

if(
hit ===
"both"
){
/* Один бар коснулся обоих — считаем стоп (консервативно). */
return {
outcome:
"loss",
exitBar:
i,
exitPrice:
slPrice,
exitReason:
"sl"
};
}

if(
hit ===
"tp"
){

if(
useEmaTrail &&
isAlgoTpEmaFavorable(
side,
close,
emaVal
)
){
emaTrail =
true;
continue;
}

return {
outcome:
"win",
exitBar:
i,
exitPrice:
tpPrice,
exitReason:
"tp"
};

}

if(
hit ===
"sl"
){
return {
outcome:
"loss",
exitBar:
i,
exitPrice:
slPrice,
exitReason:
"sl"
};
}

}

return {
outcome:
"open",
exitBar:
null,
exitPrice:
null,
exitReason:
emaTrail
? "ema-open"
: "open"
};

}

/**
 * @param {Array} candles
 * @param {{
 *   type: string,
 *   side: "long"|"short",
 *   bar: number,
 *   price: number,
 *   pt3?: number,
 *   pt4?: number
 * }} event
 * @param {{ slPctOfX?: number, tpRr?: number }} [opts]
 * @returns {TradeOutcome|null}
 */
export function resolveAlgoTradeOutcome(
candles,
event,
opts =
{}
){

return resolveAlgoTradeDetail(
candles,
event,
opts
)?.outcome ??
null;

}

/**
 * @param {unknown} raw
 * @returns {"direct"|"real"}
 */
export function normalizeAlgoStatsMode(
raw
){

return raw ===
"real"
? "real"
: "direct";

}

/**
 * Оставляет только те entry, которые бот реально мог бы взять:
 * пока позиция открыта (до СЛ/ТП), следующие входы пропускаются.
 * @param {Array} candles
 * @param {Array} events
 * @param {{ slPctOfX?: number, tpRr?: number }} [opts]
 * @returns {Array}
 */
export function filterSequentialEntryEvents(
candles,
events,
opts =
{}
){

const list =
(
Array.isArray(
events
)
? events
: []
).filter(
event=>
event?.type ===
"entry"
).slice().sort(
(
a,
b
)=>
Number(
a.bar
) -
Number(
b.bar
) ||
String(
a.side
).localeCompare(
String(
b.side
)
)
);

const kept =
[];
let busyUntil =
-1;

for(
const event of list
){

const entryBar =
Number(
event.bar
);

if(
Number.isFinite(
entryBar
) &&
entryBar <=
busyUntil
){
continue;
}

const detail =
resolveAlgoTradeDetail(
candles,
event,
opts
);

if(
!detail
){
continue;
}

kept.push(
event
);

if(
detail.outcome ===
"open"
){
busyUntil =
Array.isArray(
candles
)
? candles.length
: Number.POSITIVE_INFINITY;
}else if(
Number.isFinite(
detail.exitBar
)
){
busyUntil =
detail.exitBar;
}

}

return kept;

}

/**
 * @param {Array} candles
 * @param {Array} events
 * @param {{ slPctOfX?: number, tpRr?: number, riskUsd?: number, statsMode?: "direct"|"real" }} [opts]
 * @returns {AlgoTradeStats}
 */
export function computeAlgoTradeStats(
candles,
events,
opts =
{}
){

let longWins =
0;
let longLosses =
0;
let longOpen =
0;
let longWinUsd =
0;
let longLossUsd =
0;
let shortWins =
0;
let shortLosses =
0;
let shortOpen =
0;
let shortWinUsd =
0;
let shortLossUsd =
0;
let longNetUsd =
0;
let shortNetUsd =
0;
let bes =
0;
let sumR =
0;

const statsMode =
normalizeAlgoStatsMode(
opts.statsMode
);
const list =
statsMode ===
"real"
? filterSequentialEntryEvents(
candles,
events,
opts
)
: (
Array.isArray(
events
)
? events
: []
);
const riskUsd =
clampRiskUsd(
opts.riskUsd ??
DEFAULT_RISK_USD
);
const tpRr =
clampTpRr(
opts.tpRr ??
DEFAULT_TP_RR
);
let profitUsd =
0;
let lossUsd =
0;

for(
const event of list
){

const detail =
resolveAlgoTradeDetail(
candles,
event,
opts
);

if(
!detail
){
continue;
}

const outcome =
detail.outcome;
const side =
event.side ===
"short"
? "short"
: "long";
const entry =
Number(
event.price
);
const slPrice =
computeAlgoStopLoss(
side,
event.pt3,
event.pt4 ??
entry,
clampSlPctOfX(
opts.slPctOfX ??
DEFAULT_SL_PCT_OF_X
)
);
const tpPrice =
computeAlgoTakeProfit(
side,
entry,
slPrice,
tpRr
);
let delta =
0;

if(
outcome ===
"win"
){
const exitPx =
Number.isFinite(
detail.exitPrice
)
? detail.exitPrice
: tpPrice;
const winUsd =
linearUsdFromRisk(
entry,
exitPx,
slPrice,
riskUsd
);

if(
!Number.isFinite(
winUsd
)
){
continue;
}

delta =
winUsd;
profitUsd +=
winUsd;
sumR +=
riskUsd >
0
? winUsd /
riskUsd
: 0;

if(
side ===
"short"
){
shortWins +=
1;
shortWinUsd +=
winUsd;
}else{
longWins +=
1;
longWinUsd +=
winUsd;
}
}else if(
outcome ===
"loss"
){
delta =
-riskUsd;
lossUsd +=
riskUsd;
sumR +=
-1;

if(
side ===
"short"
){
shortLosses +=
1;
shortLossUsd +=
riskUsd;
}else{
longLosses +=
1;
longLossUsd +=
riskUsd;
}
}else if(
outcome ===
"open"
){
if(
side ===
"short"
){
shortOpen +=
1;
}else{
longOpen +=
1;
}
}

if(
side ===
"short"
){
shortNetUsd +=
delta;
}else{
longNetUsd +=
delta;
}

}

const wins =
longWins +
shortWins;
const losses =
longLosses +
shortLosses;
const open =
longOpen +
shortOpen;
const closed =
wins +
losses;
const longClosed =
longWins +
longLosses;
const shortClosed =
shortWins +
shortLosses;

return {
longWins,
longLosses,
longOpen,
longWinRate:
longClosed
? longWins /
longClosed *
100
: null,
longWinUsd,
longLossRate:
longClosed
? longLosses /
longClosed *
100
: null,
longLossUsd,
shortWins,
shortLosses,
shortOpen,
shortWinRate:
shortClosed
? shortWins /
shortClosed *
100
: null,
shortWinUsd,
shortLossRate:
shortClosed
? shortLosses /
shortClosed *
100
: null,
shortLossUsd,
wins,
losses,
open,
closed,
winRate:
closed
? wins /
closed *
100
: null,
lossRate:
closed
? losses /
closed *
100
: null,
profitUsd,
lossUsd,
netUsd:
profitUsd -
lossUsd,
longNetUsd,
shortNetUsd,
bes,
sumR,
expectancyR:
(
wins +
losses +
bes
)
? sumR /
(
wins +
losses +
bes
)
: null
};

}

export function renderAlgoTradeStats(
stats,
root =
document
){

setText(
root,
"[data-algo-stat-long-wins]",
"algo-stat-long-wins",
stats
? String(
stats.longWins
)
: "—"
);
setText(
root,
"[data-algo-stat-long-winrate]",
"algo-stat-long-winrate",
formatPct(
stats?.longWinRate
)
);
setText(
root,
"[data-algo-stat-long-win-usd]",
"algo-stat-long-win-usd",
formatUsd(
stats?.longWinUsd
)
);
setText(
root,
"[data-algo-stat-long-losses]",
"algo-stat-long-losses",
stats
? String(
stats.longLosses
)
: "—"
);
setText(
root,
"[data-algo-stat-long-lossrate]",
"algo-stat-long-lossrate",
formatPct(
stats?.longLossRate
)
);
setText(
root,
"[data-algo-stat-long-loss-usd]",
"algo-stat-long-loss-usd",
formatUsd(
stats?.longLossUsd
)
);
setText(
root,
"[data-algo-stat-long-open]",
"algo-stat-long-open",
stats
? String(
stats.longOpen
)
: "—"
);
setText(
root,
"[data-algo-stat-short-wins]",
"algo-stat-short-wins",
stats
? String(
stats.shortWins
)
: "—"
);
setText(
root,
"[data-algo-stat-short-winrate]",
"algo-stat-short-winrate",
formatPct(
stats?.shortWinRate
)
);
setText(
root,
"[data-algo-stat-short-win-usd]",
"algo-stat-short-win-usd",
formatUsd(
stats?.shortWinUsd
)
);
setText(
root,
"[data-algo-stat-short-losses]",
"algo-stat-short-losses",
stats
? String(
stats.shortLosses
)
: "—"
);
setText(
root,
"[data-algo-stat-short-lossrate]",
"algo-stat-short-lossrate",
formatPct(
stats?.shortLossRate
)
);
setText(
root,
"[data-algo-stat-short-loss-usd]",
"algo-stat-short-loss-usd",
formatUsd(
stats?.shortLossUsd
)
);
setText(
root,
"[data-algo-stat-short-open]",
"algo-stat-short-open",
stats
? String(
stats.shortOpen
)
: "—"
);
setText(
root,
"[data-algo-stat-profit-usd]",
"algo-stat-profit-usd",
formatUsd(
stats?.profitUsd
)
);
setText(
root,
"[data-algo-stat-loss-usd]",
"algo-stat-loss-usd",
formatUsd(
stats?.lossUsd
)
);
setText(
root,
"[data-algo-stat-net-usd]",
"algo-stat-net-usd",
formatUsd(
stats?.netUsd
)
);

paintOutcomeTone(
root,
"[data-algo-stat-long-wins]",
stats?.longWins,
stats?.longWinUsd,
"good"
);
paintOutcomeTone(
root,
"[data-algo-stat-long-losses]",
stats?.longLosses,
stats?.longLossUsd,
"bad"
);
paintOutcomeTone(
root,
"[data-algo-stat-short-wins]",
stats?.shortWins,
stats?.shortWinUsd,
"good"
);
paintOutcomeTone(
root,
"[data-algo-stat-short-losses]",
stats?.shortLosses,
stats?.shortLossUsd,
"bad"
);
paintMagnitudeTone(
root,
"[data-algo-stat-profit-usd]",
"algo-stat-profit-usd",
stats?.profitUsd,
"good"
);
paintMagnitudeTone(
root,
"[data-algo-stat-loss-usd]",
"algo-stat-loss-usd",
stats?.lossUsd,
"bad"
);
paintNetTone(
root,
"[data-algo-stat-net-usd]",
"algo-stat-net-usd",
stats?.netUsd
);

}


function isPositiveMetric(
count,
usd
){

const hasCount =
Number.isFinite(
count
) &&
count >
0;
const hasUsd =
Number.isFinite(
usd
) &&
Math.abs(
usd
) >
0;

return hasCount || hasUsd;

}


function paintOutcomeTone(
root,
selector,
count,
usd,
kind
){

const scope =
root &&
root.querySelector
? root
: document;
const el =
scope.querySelector(
selector
);

if(
!el
){
return;
}

const wrap =
el.closest(
".algo-stats-value"
);

if(
!wrap
){
return;
}

const active =
isPositiveMetric(
count,
usd
);

wrap.classList.toggle(
"algo-stats-value--long",
kind ===
"good" &&
active
);
wrap.classList.toggle(
"algo-stats-value--short",
kind ===
"bad" &&
active
);

}


function paintMagnitudeTone(
root,
selector,
id,
value,
kind
){

const scope =
root &&
root.querySelector
? root
: document;
const el =
scope.querySelector(
selector
) ||
(
scope ===
document
? document.getElementById(
id
)
: null
);

if(
!el
){
return;
}

const active =
Number.isFinite(
value
) &&
Math.abs(
value
) >
0;

el.classList.toggle(
"algo-stats-value--long",
kind ===
"good" &&
active
);
el.classList.toggle(
"algo-stats-value--short",
kind ===
"bad" &&
active
);

}


function paintNetTone(
root,
selector,
id,
value
){

const scope =
root &&
root.querySelector
? root
: document;
const el =
scope.querySelector(
selector
) ||
(
scope ===
document
? document.getElementById(
id
)
: null
);

if(
!el
){
return;
}

el.classList.toggle(
"algo-stats-value--long",
Number.isFinite(
value
) &&
value >
0
);
el.classList.toggle(
"algo-stats-value--short",
Number.isFinite(
value
) &&
value <
0
);

}

function formatUsd(
value
){

if(
!Number.isFinite(
value
)
){
return "—";
}

const abs =
Math.abs(
value
).toFixed(
2
);
const sign =
value <
0
? "-"
: "";

return `${sign}$${abs}`;

}

function hitLongLevels(
candle,
sl,
tp
){

const hitSl =
Number.isFinite(
candle.low
) &&
candle.low <=
sl;
const hitTp =
Number.isFinite(
candle.high
) &&
candle.high >=
tp;

if(
hitSl &&
hitTp
){
return "both";
}

if(
hitTp
){
return "tp";
}

if(
hitSl
){
return "sl";
}

return null;

}

function hitShortLevels(
candle,
sl,
tp
){

const hitSl =
Number.isFinite(
candle.high
) &&
candle.high >=
sl;
const hitTp =
Number.isFinite(
candle.low
) &&
candle.low <=
tp;

if(
hitSl &&
hitTp
){
return "both";
}

if(
hitTp
){
return "tp";
}

if(
hitSl
){
return "sl";
}

return null;

}

function formatPct(
value
){

if(
!Number.isFinite(
value
)
){
return "—";
}

return `${value.toFixed(
1
)}%`;

}

function setText(
root,
selector,
id,
text
){

const scope =
root &&
root.querySelector
? root
: document;
const el =
scope.querySelector(
selector
) ||
(
scope ===
document
? document.getElementById(
id
)
: null
);

if(
el
){
el.textContent =
text;
}

}
