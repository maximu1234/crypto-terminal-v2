/**
 * Phase D: auto-refresh algo watchlist by St1 winrate (main process).
 * Uses the same pattern math copy as the bot/indicator pipeline.
 */
const log =
require(
"electron-log"
);
const algoRest =
require(
"./algo-bybit-rest.cjs"
);
const {
loadPatternModules
} =
require(
"./algo-bot-pattern-loader.cjs"
);
const {
readBotStrategies,
readTickerFlagsRoot,
writeTickerFlagsRoot,
readPattern12Settings,
sideToFlagId
} =
require(
"./algo-bot-store.cjs"
);

const SCAN_CONCURRENCY =
3;
const SCAN_HISTORY_REQUESTS =
10;
const SCAN_DELAY_MS =
40;

let refreshInflight =
false;

function clampMinWinRate(
raw
){

const n =
Number(
raw
);

if(
!Number.isFinite(
n
)
){
return 70;
}

return Math.min(
100,
Math.max(
10,
n
)
);

}

function refreshIntervalMs(
st1
){

const hours =
Math.max(
0,
Number(
st1?.refreshHours
) ||
0
);
const minutes =
Math.max(
0,
Number(
st1?.refreshMinutes
) ||
0
);
const ms =
(
hours *
60 +
minutes
) *
60 *
1000;

return Math.max(
ms,
5 *
60 *
1000
);

}

/** Трейлинг СЛ в X от pt4; старую настройку в % от X переводим: 15 → -0.15. */
function resolveTrailSlX1(
rawX,
legacyPct
){

const raw =
rawX ===
undefined ||
rawX ===
null ||
rawX ===
""
? -Number(
legacyPct
) /
100
: rawX;
const n =
Number(
raw
);

return Number.isFinite(
n
)
? Math.min(
1,
Math.max(
-1,
n
)
)
: -0.25;

}

/** Трейлинг СЛ после ТП2: не ниже трейлинга после ТП1 и не выше максимального ТП. */
function resolveTrailSlX2(
raw,
trailX1,
tpMults
){

const tps =
(Array.isArray(
tpMults
)
? tpMults
: []).map(
Number
).filter(
n=>
Number.isFinite(
n
)
);
const lo =
Number(
trailX1
);
const hi =
Math.max(
lo,
tps.length
? Math.max(
...tps
)
: 1.44
);
const n =
Number(
raw
);

return Math.min(
hi,
Math.max(
lo,
Number.isFinite(
n
)
? n
: 0
)
);

}

/** Доли ТП в % от позиции; сумма всегда 100 (нет настройки → 25/25/50). */
function normalizeTpShares(
raw1,
raw2,
raw3
){

const defaults =
[
25,
25,
50
];
const clamp =
(
raw,
fallback
)=>{
const n =
Math.round(
Number(
raw
)
);

return Number.isFinite(
n
)
? Math.min(
98,
Math.max(
1,
n
)
)
: fallback;
};
const shares =
[
raw1,
raw2,
raw3
].map(
(
raw,
i
)=>
clamp(
raw,
defaults[
i
]
)
);
const sum =
shares[
0
] +
shares[
1
] +
shares[
2
];

if(
sum ===
100
){
return shares;
}

const scaled =
shares.map(
(
value,
i
)=>
clamp(
(
value *
100
) /
sum,
defaults[
i
]
)
);
let residual =
100 -
(
scaled[
0
] +
scaled[
1
] +
scaled[
2
]
);

for(
const i of [
2,
1,
0
]
){

if(
!residual
){
break;
}

const next =
Math.min(
98,
Math.max(
1,
scaled[
i
] +
residual
)
);

residual -=
next -
scaled[
i
];
scaled[
i
] =
next;

}

return scaled;

}

function interpolateLogPrice(
from,
to,
t01
){

const a =
Number(
from
);
const b =
Number(
to
);
const t =
Math.min(
1,
Math.max(
0,
Number(
t01
)
)
);

if(
!(
a >
0
) ||
!(
b >
0
) ||
!Number.isFinite(
t
)
){
return NaN;
}

if(
a ===
b
){
return a;
}

return Math.exp(
Math.log(
a
) *
(
1 -
t
) +
Math.log(
b
) *
t
);

}

function computeLogExtensionPrice(
side,
base,
spanA,
spanB,
mult
){

const baseN =
Number(
base
);
const a =
Number(
spanA
);
const b =
Number(
spanB
);
const m =
Math.abs(
Number(
mult
)
);

if(
!(
baseN >
0
) ||
!(
a >
0
) ||
!(
b >
0
) ||
!Number.isFinite(
m
)
){
return NaN;
}

const lo =
Math.min(
a,
b
);
const hi =
Math.max(
a,
b
);

if(
!(
hi >
lo
)
){
return NaN;
}

const factor =
Math.pow(
hi /
lo,
m
);

return side ===
"short"
? baseN /
factor
: baseN *
factor;

}

function computeStopLoss(
side,
pt3,
pt4,
slPct
){

void side;

const pct =
Math.min(
100,
Math.max(
1,
Number(
slPct
) ||
50
)
);

return interpolateLogPrice(
pt4,
pt3,
pct /
100
);

}

/**
 * ТП Ст1 — линейный $ RR (как чарт / order-executor).
 */
function computeTakeProfit(
side,
entry,
slPrice,
tpRr
){

const entryN =
Number(
entry
);
const sl =
Number(
slPrice
);
const rr =
Math.min(
50,
Math.max(
0.1,
Number(
tpRr
) ||
2
)
);

if(
!(
entryN >
0
) ||
!Number.isFinite(
sl
) ||
!Number.isFinite(
rr
)
){
return NaN;
}

const riskDist =
Math.abs(
entryN -
sl
);

if(
!(
riskDist >
0
)
){
return NaN;
}

const move =
riskDist *
rr;
const tp =
side ===
"short"
? entryN -
move
: entryN +
move;

return tp >
0
? tp
: NaN;

}

function hitLong(
candle,
sl,
tp
){

const low =
Number(
candle?.low
);
const high =
Number(
candle?.high
);
const hitSl =
Number.isFinite(
low
) &&
low <=
sl;
const hitTp =
Number.isFinite(
high
) &&
high >=
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

function hitShort(
candle,
sl,
tp
){

const low =
Number(
candle?.low
);
const high =
Number(
candle?.high
);
const hitSl =
Number.isFinite(
high
) &&
high >=
sl;
const hitTp =
Number.isFinite(
low
) &&
low <=
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

function resolvePartialTpTrade(
candles,
event,
slPct,
exitProfile
){

const side =
event?.side ===
"short"
? "short"
: "long";
const entry =
Number(
event?.price
);
const p3 =
Number(
event?.pt3
);
const p4 =
Number(
event?.pt4 ??
entry
);
const spanA =
exitProfile?.kind ===
"partial-y"
? Number(
event?.pt1
)
: p3;
const spanB =
exitProfile?.kind ===
"partial-y"
? Number(
event?.pt2
)
: p4;
const tpBase =
exitProfile?.kind ===
"partial-y"
? Number(
event?.pt2
)
: entry;
let sl =
computeStopLoss(
side,
p3,
p4,
slPct
);
const risk =
Math.abs(
entry -
sl
);
const spanOk =
Number.isFinite(
spanA
) &&
Number.isFinite(
spanB
) &&
Math.min(
spanA,
spanB
) >
0 &&
Math.max(
spanA,
spanB
) >
Math.min(
spanA,
spanB
);
const tps =
[
Number(
exitProfile?.tp1
) ||
1,
Number(
exitProfile?.tp2
) ||
1.25,
Number(
exitProfile?.tp3
) ||
1.44
].map(
mult=>
computeLogExtensionPrice(
side,
tpBase,
spanA,
spanB,
mult
)
);

if(
!Number.isFinite(
entry
) ||
!(
risk >
0
) ||
!spanOk ||
!tps.every(
Number.isFinite
)
){
return null;
}

const shares =
normalizeTpShares(
exitProfile?.share1,
exitProfile?.share2,
exitProfile?.share3
);
let remaining =
1;
let nextTp =
0;
let netUsd =
0;

for(
let i =
Number(
event?.bar
);
i <
candles.length;
i++
){
const candle =
candles[
i
];

while(
nextTp <
3 &&
(
side ===
"short"
? Number(
candle?.low
) <=
tps[
nextTp
]
: Number(
candle?.high
) >=
tps[
nextTp
]
)
){
const fraction =
nextTp <
2
? Math.min(
remaining,
shares[
nextTp
] /
100
)
: remaining;
netUsd +=
fraction *
(
Math.abs(
tps[
nextTp
] -
entry
) /
risk
);
remaining -=
fraction;
nextTp++;

if(
exitProfile?.trailSl
){
if(
nextTp ===
1 ||
nextTp ===
2
){
const trailX1 =
resolveTrailSlX1(
exitProfile?.trailSlX1,
exitProfile?.trailSlPct
);
const trail =
Math.abs(
p4 -
p3
) *
(
nextTp ===
2
? resolveTrailSlX2(
exitProfile?.trailSlX2,
trailX1,
[
exitProfile?.tp1,
exitProfile?.tp2,
exitProfile?.tp3
]
)
: trailX1
);
const next =
side ===
"short"
? p4 -
trail
: p4 +
trail;

sl =
side ===
"short"
? Math.min(
sl,
next
)
: Math.max(
sl,
next
);
}
}
}

if(
remaining <=
1e-9
){
return {
status:
"closed",
exitBar:
i,
netUsd
};
}

const stopped =
side ===
"short"
? Number(
candle?.high
) >=
sl
: Number(
candle?.low
) <=
sl;

if(
stopped
){
/* Плюсовой трейлинг уводит стоп в профит — знак берём по стороне сделки. */
const signed =
side ===
"short"
? entry -
sl
: sl -
entry;

netUsd +=
remaining *
(
signed /
risk
);
return {
status:
"closed",
exitBar:
i,
netUsd
};
}
}

return {
status:
"open",
exitBar:
null,
netUsd
};

}

function resolveOutcomeDetail(
candles,
event,
slPct,
tpRr,
exitProfile =
null
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
const isPartial =
exitProfile?.kind ===
"partial-x" ||
exitProfile?.kind ===
"partial-y";

if(
isPartial
){
const partial =
resolvePartialTpTrade(
candles,
event,
slPct,
exitProfile
);

return partial
? {
outcome:
partial.status ===
"closed"
? (
partial.netUsd >
0
? "win"
: "loss"
)
: "open",
exitBar:
partial.exitBar
}
: null;
}
const entryBar =
Number(
event.bar
);
const entry =
Number(
event.price
);
const slPrice =
computeStopLoss(
side,
event.pt3,
event.pt4 ??
entry,
slPct
);
const tpPrice =
computeTakeProfit(
side,
entry,
slPrice,
tpRr
);

if(
!Array.isArray(
candles
) ||
!Number.isFinite(
entryBar
) ||
entryBar <
0 ||
!Number.isFinite(
slPrice
) ||
!Number.isFinite(
tpPrice
)
){
return null;
}

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
const hit =
side ===
"short"
? hitShort(
candle,
slPrice,
tpPrice
)
: hitLong(
candle,
slPrice,
tpPrice
);

if(
hit ===
"tp"
){
return {
outcome:
"win",
exitBar:
i
};
}

if(
hit ===
"sl" ||
hit ===
"both"
){
return {
outcome:
"loss",
exitBar:
i
};
}

}

return {
outcome:
"open",
exitBar:
null
};

}

function resolveOutcome(
candles,
event,
slPct,
tpRr,
exitProfile
){

return resolveOutcomeDetail(
candles,
event,
slPct,
tpRr,
exitProfile
)?.outcome ||
null;

}

/**
 * Пока позиция открыта (до СЛ/ТП), следующие входы пропускаются.
 */
function filterSequentialEntryEvents(
candles,
events,
slPct,
tpRr,
exitProfile
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
resolveOutcomeDetail(
candles,
event,
slPct,
tpRr,
exitProfile
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

function sideWinRate(
side,
events,
candles,
slPct,
tpRr,
exitProfile,
statsMode =
"direct"
){

const list =
statsMode ===
"real"
? filterSequentialEntryEvents(
candles,
events,
slPct,
tpRr,
exitProfile
)
: (
Array.isArray(
events
)
? events
: []
);

let wins =
0;
let losses =
0;

for(
const event of list
){

if(
(
side ===
"long" &&
event.side !==
"long"
) ||
(
side ===
"short" &&
event.side !==
"short"
)
){
continue;
}

const outcome =
resolveOutcome(
candles,
event,
slPct,
tpRr,
exitProfile
);

if(
outcome ===
"win"
){
wins +=
1;
}else if(
outcome ===
"loss"
){
losses +=
1;
}

}

const closed =
wins +
losses;

if(
!closed
){
return null;
}

return (
wins /
closed
) *
100;

}

async function sleep(
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
 * @param {{
 *   side?: string,
 *   tf?: string,
 *   minWinRate?: number,
 *   timeoutBars?: number,
 *   slPct?: number,
 *   tpRr?: number,
 *   refreshStatsMode?: "direct"|"real",
 *   patternSettings?: object|null,
 *   onProgress?: Function
 * }} [opts]
 */
async function refreshWatchlistByWinRate(
opts =
{}
){

if(
refreshInflight
){
return {
ok:
false,
busy:
true,
message:
"Refresh already running"
};
}

refreshInflight =
true;

try{
const strategies =
readBotStrategies();
const st1 =
strategies.st1;
const side =
opts.side ||
st1.side ||
"long";
const tf =
opts.tf ||
st1.tf ||
"5";
const minWinRate =
clampMinWinRate(
opts.minWinRate ??
st1.minWinRate
);
const strategyId =
String(
opts.strategyId ||
"st1"
).toLowerCase();
const strategy =
strategies[
strategyId
] ||
st1;
const timeoutBars =
Number(
opts.timeoutBars ??
strategy.timeoutBars ??
st1.timeoutBars
);
/* TEMP_PULLBACK_BEFORE_ARM */
const pullbackBeforeArm =
opts.pullbackBeforeArm !=
null
? !!opts.pullbackBeforeArm
: !!strategy.pullbackBeforeArm;
const pullbackBeforeArmPct =
opts.pullbackBeforeArmPct ??
strategy.pullbackBeforeArmPct;
const slPct =
Number(
opts.slPct ??
strategy.slPct ??
st1.slPct
);
const tpRr =
Number(
opts.tpRr ??
strategy.tpRr ??
st1.tpRr
);
const exitProfile =
opts.exitProfile &&
typeof opts.exitProfile ===
"object"
? opts.exitProfile
: (
strategyId ===
"st2" ||
strategyId ===
"st3"
? {
kind:
strategyId ===
"st2"
? "partial-x"
: "partial-y",
tp1:
strategy.tp1,
tp2:
strategy.tp2,
tp3:
strategy.tp3,
trailSl:
strategy.trailSl,
trailSlX1:
strategy.trailSlX1,
trailSlX2:
strategy.trailSlX2,
share1:
strategy.share1,
share2:
strategy.share2,
share3:
strategy.share3
}
: null
);
const statsMode =
(
opts.refreshStatsMode ||
st1.refreshStatsMode
) ===
"real"
? "real"
: "direct";
const patternSettings =
opts.patternSettings ||
readPattern12Settings();

const {
patternEntry,
patternMath
} =
await loadPatternModules();

const instruments =
await algoRest.listLinearUsdtSymbols();

if(
instruments?.ok ===
false
){
return {
ok:
false,
message:
instruments?.message ||
"instruments failed"
};
}

const symbols =
instruments.symbols ||
[];
const hits =
[];
let done =
0;
let cursor =
0;

async function worker(){

while(
cursor <
symbols.length
){

const index =
cursor++;
const symbol =
symbols[
index
];

try{
const hist =
await algoRest.fetchKlineHistoryDeep(
symbol,
tf,
SCAN_HISTORY_REQUESTS,
SCAN_DELAY_MS
);

if(
hist?.ok ===
false ||
!Array.isArray(
hist.candles
) ||
hist.candles.length <
50
){
done +=
1;
opts.onProgress?.(
done,
symbols.length,
hits.length
);
continue;
}

const candles =
hist.candles;
const scene =
patternMath.computePattern12Scene(
candles,
patternSettings ||
patternMath.defaultPattern12Settings()
);
const events =
patternEntry.detectPatternEntryEventsFromSetups(
candles,
scene?.setups,
{
timeoutBars,
/* TEMP_PULLBACK_BEFORE_ARM */
pullbackBeforeArm,
pullbackBeforeArmPct
}
);

let pass =
false;
let winRate =
null;
let longRate =
null;
let shortRate =
null;

if(
side ===
"both"
){
longRate =
sideWinRate(
"long",
events,
candles,
slPct,
tpRr,
exitProfile,
statsMode
);
shortRate =
sideWinRate(
"short",
events,
candles,
slPct,
tpRr,
exitProfile,
statsMode
);
pass =
Number.isFinite(
longRate
) &&
longRate >
minWinRate &&
Number.isFinite(
shortRate
) &&
shortRate >
minWinRate;
winRate =
pass
? Math.min(
longRate,
shortRate
)
: null;
}else{
winRate =
sideWinRate(
side,
events,
candles,
slPct,
tpRr,
exitProfile,
statsMode
);
pass =
Number.isFinite(
winRate
) &&
winRate >
minWinRate;
}

if(
pass
){
hits.push(
{
symbol,
winRate,
longWinRate:
longRate,
shortWinRate:
shortRate
}
);
}
}catch(
err
){
log.warn(
"algo watchlist refresh",
symbol,
err?.message ||
err
);
}

done +=
1;
opts.onProgress?.(
done,
symbols.length,
hits.length
);

if(
SCAN_DELAY_MS >
0
){
await sleep(
SCAN_DELAY_MS
);
}

}

}

await Promise.all(
Array.from(
{
length:
SCAN_CONCURRENCY
},
()=>
worker()
)
);

hits.sort(
(
a,
b
)=>
(
b.winRate ||
0
) -
(
a.winRate ||
0
) ||
a.symbol.localeCompare(
b.symbol
)
);

const hitSymbols =
hits.map(
h=>
h.symbol
);
const flagId =
sideToFlagId(
side
);

if(
opts.skipWrite
){
return {
ok:
true,
side,
tf,
minWinRate,
total:
symbols.length,
hits:
hitSymbols.length,
symbols:
hitSymbols,
hitRows:
hits,
flagId,
root:
null
};
}

const root =
readTickerFlagsRoot();
const exchangeId =
"bybit";
const prev =
root[
exchangeId
] ||
{
algoLong5m:
[],
algoShort5m:
[],
algoBoth5m:
[],
algoFavorites:
[]
};

root[
exchangeId
] =
{
...prev,
[
flagId
]:
hitSymbols
};

writeTickerFlagsRoot(
root
);

log.info(
"algo Phase D watchlist refresh",
{
side,
tf,
minWinRate,
total:
symbols.length,
hits:
hitSymbols.length
}
);

return {
ok:
true,
side,
tf,
minWinRate,
total:
symbols.length,
hits:
hitSymbols.length,
symbols:
hitSymbols,
hitRows:
hits,
flagId,
root
};

}finally{
refreshInflight =
false;
}

}

module.exports =
{
refreshWatchlistByWinRate,
refreshIntervalMs,
writeWatchlistFlagSymbols,
isWatchlistRefreshBusy:()=>
refreshInflight
};

/**
 * @param {string} flagId
 * @param {string[]} symbols
 * @returns {object}
 */
function writeWatchlistFlagSymbols(
flagId,
symbols
){

const root =
readTickerFlagsRoot();
const exchangeId =
"bybit";
const prev =
root[
exchangeId
] ||
{
algoLong5m:
[],
algoShort5m:
[],
algoBoth5m:
[],
algoFavorites:
[]
};

root[
exchangeId
] =
{
...prev,
[
flagId
]:
Array.isArray(
symbols
)
? symbols
: []
};

writeTickerFlagsRoot(
root
);

return root;

}
