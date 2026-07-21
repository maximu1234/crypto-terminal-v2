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

function computeStopLoss(
side,
pt3,
pt4,
slPct
){

const p3 =
Number(
pt3
);
const p4 =
Number(
pt4
);
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

if(
!Number.isFinite(
p3
) ||
!Number.isFinite(
p4
)
){
return NaN;
}

const x =
Math.abs(
p4 -
p3
);

if(
!(
x >
0
)
){
return NaN;
}

const offset =
x *
(
pct /
100
);

return side ===
"short"
? p4 +
offset
: p4 -
offset;

}

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
!Number.isFinite(
entryN
) ||
!Number.isFinite(
sl
)
){
return NaN;
}

const risk =
Math.abs(
entryN -
sl
);

if(
!(
risk >
0
)
){
return NaN;
}

return side ===
"short"
? entryN -
risk *
rr
: entryN +
risk *
rr;

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
const span =
exitProfile?.kind ===
"partial-y"
? Math.abs(
Number(
event?.pt2
) -
Number(
event?.pt1
)
)
: Math.abs(
p4 -
p3
);
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
side ===
"short"
? entry -
span *
mult
: entry +
span *
mult
);

if(
!Number.isFinite(
entry
) ||
!(
risk >
0
) ||
!(
span >
0
)
){
return null;
}

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
? 1 /
3
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
1
){
const trail =
Math.abs(
p4 -
p3
) *
(
Math.max(
0,
Number(
exitProfile?.trailSlPct
) ||
15
) /
100
);
sl =
side ===
"short"
? p4 +
trail
: p4 -
trail;
}else if(
nextTp ===
2
){
sl =
p4;
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
netUsd -=
remaining *
(
Math.abs(
entry -
sl
) /
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
const timeoutBars =
Number(
opts.timeoutBars ??
st1.timeoutBars
);
const slPct =
Number(
opts.slPct ??
st1.slPct
);
const tpRr =
Number(
opts.tpRr ??
st1.tpRr
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
trailSlPct:
strategy.trailSlPct
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
timeoutBars
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
isWatchlistRefreshBusy:()=>
refreshInflight
};
