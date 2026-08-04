/**
 * userData mirror for algo bot strategies + ticker flag lists.
 * Renderer syncs localStorage snapshots here for main-process bot.
 */
const fs =
require(
"fs"
);
const path =
require(
"path"
);
const {
app
} =
require(
"electron"
);

const STRATEGIES_FILE =
"algo-bot-strategies.json";
const TICKER_FLAGS_FILE =
"algo-ticker-flags.json";
const PATTERN12_SETTINGS_FILE =
"algo-pattern12-settings.json";
const PENDING_ORDERS_FILE =
"algo-bot-pending-orders.json";

// Legacy id names (*5m); lists are TF-agnostic.
const FLAG_LONG_5M =
"algoLong5m";
const FLAG_SHORT_5M =
"algoShort5m";
const FLAG_BOTH_5M =
"algoBoth5m";
const FLAG_FAVORITES =
"algoFavorites";

const DEFAULT_ST1 =
{
running:
false,
timeoutBars:
200,
maxPt1Pt4Bars:
1000,
/* TEMP_PULLBACK_BEFORE_ARM */
pullbackBeforeArm:
false,
pullbackBeforeArmPct:
38.2,
tf:
"5",
slPct:
50,
riskUsd:
1,
tpRr:
2,
alertLeadPct:
5,
minTurnover24hUsdt:
20_000_000,
side:
"long",
sides:{
long:
true,
short:
false,
both:
false
},
useFavorites:
false,
refreshHours:
24,
refreshMinutes:
0,
minWinRate:
70,
refreshStatsMode:
"direct",
manualRefreshStrategies:{
st1:
true,
st2:
false,
st3:
false
}
};

const DEFAULT_PARTIAL =
{
...DEFAULT_ST1,
tp1:
1,
tp2:
1.25,
tp3:
1.44,
trailSl:
true,
trailSlX1:
-0.25,
trailSlX2:
0,
share1:
25,
share2:
25,
share3:
50
};

function normalizeRefreshStatsMode(
raw
){

return raw ===
"real"
? "real"
: "direct";

}

/**
 * Какая стратегия участвует в автоскане списка (только ручной режим).
 * Ровно одна: Ст1 | Ст2 | Ст3.
 * @param {unknown} raw
 * @returns {{ st1: boolean, st2: boolean, st3: boolean }}
 */
function normalizeManualRefreshStrategies(
raw
){

const src =
raw &&
typeof raw ===
"object"
? raw
: {};
const order =
[
"st1",
"st2",
"st3"
];
let chosen =
null;

for(
const id of order
){

if(
src[
id
]
){
chosen =
id;
break;
}

}

if(
!chosen
){
chosen =
"st1";
}

return {
st1:
chosen ===
"st1",
st2:
chosen ===
"st2",
st3:
chosen ===
"st3"
};

}

/**
 * @param {unknown} raw
 * @returns {Array<"st1"|"st2"|"st3">}
 */
function listManualRefreshStrategyIds(
raw
){

const flags =
normalizeManualRefreshStrategies(
raw
);
const ids =
[
"st1",
"st2",
"st3"
].filter(
id=>
flags[
id
]
);

return ids.length
? ids
: [
"st1"
];

}

function userDataPath(
filename
){

return path.join(
app.getPath(
"userData"
),
filename
);

}

function readJsonFile(
filename,
fallback
){

try{
const raw =
fs.readFileSync(
userDataPath(
filename
),
"utf8"
);
const parsed =
JSON.parse(
raw
);

return parsed &&
typeof parsed ===
"object"
? parsed
: fallback;
}catch{
return fallback;
}

}

function writeJsonFile(
filename,
data
){

const filePath =
userDataPath(
filename
);

try{
fs.mkdirSync(
path.dirname(
filePath
),
{
recursive:
true
}
);
fs.writeFileSync(
filePath,
`${JSON.stringify(
data,
null,
2
)}\n`,
"utf8"
);
return {
ok:
true
};
}catch(
err
){
return {
ok:
false,
message:
err?.message ||
String(
err
)
};
}

}

function clampInt(
raw,
min,
max,
fallback
){

const n =
Math.round(
Number(
raw
)
);

if(
!Number.isFinite(
n
)
){
return fallback;
}

return Math.min(
max,
Math.max(
min,
n
)
);

}

function clampFloat(
raw,
min,
max,
fallback
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
return fallback;
}

return Math.min(
max,
Math.max(
min,
n
)
);

}

/** Трейлинг СЛ в X от pt4; старую настройку в % от X переводим: 15 → -0.15. */
function clampTrailSlX1(
rawX,
legacyPct,
fallback
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

if(
!Number.isFinite(
n
)
){
return fallback;
}

return Math.min(
1,
Math.max(
-1,
Math.round(
n *
100
) /
100
)
);

}

/** Трейлинг СЛ после ТП2: не ниже трейлинга после ТП1 и не выше максимального ТП. */
function clampTrailSlX2(
raw,
trailX1,
tpMults,
fallback
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
const value =
Number.isFinite(
n
)
? Math.round(
n *
100
) /
100
: Math.max(
lo,
Number(
fallback
) ||
0
);

return Math.min(
hi,
Math.max(
lo,
value
)
);

}

/** Доли ТП в % от позиции; сумма всегда 100 (старые prefs без долей → 25/25/50). */
function normalizeTpShares(
raw1,
raw2,
raw3
){

const defaults =
[
DEFAULT_PARTIAL.share1,
DEFAULT_PARTIAL.share2,
DEFAULT_PARTIAL.share3
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
const clamped =
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
clamped[
0
] +
clamped[
1
] +
clamped[
2
];

if(
sum ===
100
){
return clamped;
}

const scaled =
clamped.map(
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

function normalizeSide(
raw
){

const side =
String(
raw ||
""
).trim().toLowerCase();

if(
side ===
"short" ||
side ===
"both"
){
return side;
}

return "long";

}

function primarySide(
sides
){

if(
sides?.long
){
return "long";
}

if(
sides?.short
){
return "short";
}

if(
sides?.both
){
return "both";
}

return "long";

}

function normalizeSides(
raw,
legacySide
){

if(
raw &&
typeof raw ===
"object"
){
const sides =
{
long:
!!raw.long,
short:
!!raw.short,
both:
!!raw.both
};

if(
sides.long ||
sides.short ||
sides.both
){
return sides;
}
}

const side =
normalizeSide(
legacySide
);

return {
long:
side ===
"long",
short:
side ===
"short",
both:
side ===
"both"
};

}

function enabledSides(
sides
){

const out =
[];

if(
sides?.long
){
out.push(
"long"
);
}

if(
sides?.short
){
out.push(
"short"
);
}

if(
sides?.both
){
out.push(
"both"
);
}

return out.length
? out
: [
"long"
];

}

function normalizeTf(
raw
){

const tf =
String(
raw ||
""
).trim();
const allowed =
[
"1",
"5",
"15",
"60",
"240",
"D",
"W"
];

return allowed.includes(
tf
)
? tf
: "5";

}

function normalizeSt1(
raw
){

const src =
raw &&
typeof raw ===
"object"
? raw
: {};

return {
running:
!!src.running,
timeoutBars:
clampInt(
src.timeoutBars,
1,
10000,
DEFAULT_ST1.timeoutBars
),
maxPt1Pt4Bars:
Object.prototype.hasOwnProperty.call(
src,
"maxPt1Pt4Bars"
)
? (
()=>{
const raw =
src.maxPt1Pt4Bars;

if(
raw ==
null ||
(
typeof raw ===
"string" &&
!String(
raw
).trim()
)
){
return null;
}

const n =
Math.round(
Number(
raw
)
);

if(
!Number.isFinite(
n
) ||
n <
1
){
return null;
}

return Math.min(
10000,
n
);
}
)()
: DEFAULT_ST1.maxPt1Pt4Bars,
/* TEMP_PULLBACK_BEFORE_ARM */
pullbackBeforeArm:
src.pullbackBeforeArm ===
true ||
src.pullbackBeforeArm ===
1 ||
src.pullbackBeforeArm ===
"1" ||
src.pullbackBeforeArm ===
"true",
pullbackBeforeArmPct:
(()=>{
const n =
Number(
src.pullbackBeforeArmPct
);
if(
!Number.isFinite(
n
)
){
return DEFAULT_ST1.pullbackBeforeArmPct;
}
return Math.min(
100,
Math.max(
1,
Math.round(
n *
10
) /
10
)
);
})(),
tf:
normalizeTf(
src.tf
),
slPct:
clampFloat(
src.slPct,
0.01,
1000,
DEFAULT_ST1.slPct
),
riskUsd:
clampFloat(
src.riskUsd,
0.01,
1_000_000,
DEFAULT_ST1.riskUsd
),
tpRr:
clampFloat(
src.tpRr,
0.01,
100,
DEFAULT_ST1.tpRr
),
alertLeadPct:
clampFloat(
src.alertLeadPct,
0,
10,
DEFAULT_ST1.alertLeadPct
),
minTurnover24hUsdt:
clampFloat(
src.minTurnover24hUsdt,
0,
1_000_000_000_000,
DEFAULT_ST1.minTurnover24hUsdt
),
sides:
normalizeSides(
src.sides,
src.side
),
side:
primarySide(
normalizeSides(
src.sides,
src.side
)
),
useFavorites:
!!src.useFavorites,
refreshHours:
clampInt(
src.refreshHours,
0,
168,
DEFAULT_ST1.refreshHours
),
refreshMinutes:
clampInt(
src.refreshMinutes,
0,
59,
DEFAULT_ST1.refreshMinutes
),
minWinRate:
clampInt(
src.minWinRate,
10,
100,
DEFAULT_ST1.minWinRate
),
refreshStatsMode:
normalizeRefreshStatsMode(
src.refreshStatsMode
),
manualRefreshStrategies:
normalizeManualRefreshStrategies(
src.manualRefreshStrategies
)
};

}

function normalizePartial(
raw
){

const src =
raw &&
typeof raw ===
"object"
? raw
: {};
const common =
normalizeSt1(
{
...DEFAULT_PARTIAL,
...src
}
);
const shares =
normalizeTpShares(
src.share1,
src.share2,
src.share3
);

delete common.tpRr;
delete common.manualRefreshStrategies;

return {
...common,
tp1:
clampFloat(
src.tp1,
0.01,
50,
DEFAULT_PARTIAL.tp1
),
tp2:
clampFloat(
src.tp2,
0.01,
50,
DEFAULT_PARTIAL.tp2
),
tp3:
clampFloat(
src.tp3,
0.01,
50,
DEFAULT_PARTIAL.tp3
),
trailSl:
src.trailSl ===
undefined
? DEFAULT_PARTIAL.trailSl
: !!src.trailSl,
trailSlX1:
clampTrailSlX1(
src.trailSlX1,
src.trailSlPct,
DEFAULT_PARTIAL.trailSlX1
),
trailSlX2:
clampTrailSlX2(
src.trailSlX2,
clampTrailSlX1(
src.trailSlX1,
src.trailSlPct,
DEFAULT_PARTIAL.trailSlX1
),
[
src.tp1,
src.tp2,
src.tp3
],
DEFAULT_PARTIAL.trailSlX2
),
share1:
shares[
0
],
share2:
shares[
1
],
share3:
shares[
2
]
};

}

function normalizeSt2(
raw
){

return normalizePartial(
raw
);

}

function normalizeSt3(
raw
){

return normalizePartial(
raw
);

}

function normalizeSymbols(
list
){

const out =
[];
const seen =
new Set();

for(
const raw of Array.isArray(
list
)
? list
: []
){

const symbol =
String(
raw ||
""
).trim().toUpperCase().replace(
/\.P$/i,
""
);

if(
!symbol ||
seen.has(
symbol
)
){
continue;
}

seen.add(
symbol
);
out.push(
symbol
);

}

return out;

}

function emptyExchangeFlags(){

return {
[
FLAG_LONG_5M
]:
[],
[
FLAG_SHORT_5M
]:
[],
[
FLAG_BOTH_5M
]:
[],
[
FLAG_FAVORITES
]:
[]
};

}

function normalizeExchangeFlags(
raw
){

const src =
raw &&
typeof raw ===
"object"
? raw
: {};

return {
[
FLAG_LONG_5M
]:
normalizeSymbols(
src[
FLAG_LONG_5M
]
),
[
FLAG_SHORT_5M
]:
normalizeSymbols(
src[
FLAG_SHORT_5M
]
),
[
FLAG_BOTH_5M
]:
normalizeSymbols(
src[
FLAG_BOTH_5M
]
),
[
FLAG_FAVORITES
]:
normalizeSymbols(
src[
FLAG_FAVORITES
]
)
};

}

function readBotStrategies(){

const parsed =
readJsonFile(
STRATEGIES_FILE,
{}
);

return {
st1:
normalizeSt1(
parsed?.st1
),
st2:
normalizeSt2(
parsed?.st2
),
st3:
normalizeSt3(
parsed?.st3
)
};

}

function writeBotStrategies(
next
){

const merged =
{
st1:
normalizeSt1(
next?.st1
),
st2:
normalizeSt2(
next?.st2
),
st3:
normalizeSt3(
next?.st3
)
};

return writeJsonFile(
STRATEGIES_FILE,
merged
);

}

function readTickerFlagsRoot(){

const parsed =
readJsonFile(
TICKER_FLAGS_FILE,
{}
);

if(
!parsed ||
typeof parsed !==
"object"
){
return {};
}

const out =
{};

for(
const [
exchangeId,
raw
] of Object.entries(
parsed
)
){

out[
String(
exchangeId
).trim().toLowerCase()
] =
normalizeExchangeFlags(
raw
);

}

return out;

}

function writeTickerFlagsRoot(
root
){

const next =
{};

for(
const [
exchangeId,
raw
] of Object.entries(
root &&
typeof root ===
"object"
? root
: {}
)
){

next[
String(
exchangeId
).trim().toLowerCase()
] =
normalizeExchangeFlags(
raw
);

}

return writeJsonFile(
TICKER_FLAGS_FILE,
next
);

}

function sideToFlagId(
side
){

if(
side ===
"short"
){
return FLAG_SHORT_5M;
}

if(
side ===
"both"
){
return FLAG_BOTH_5M;
}

return FLAG_LONG_5M;

}

function readPattern12Settings(){

const raw =
readJsonFile(
PATTERN12_SETTINGS_FILE,
null
);

return raw &&
typeof raw ===
"object"
? raw
: null;

}

function writePattern12Settings(
settings
){

if(
!settings ||
typeof settings !==
"object"
){
return {
ok:
false,
message:
"invalid pattern settings"
};
}

return writeJsonFile(
PATTERN12_SETTINGS_FILE,
settings
);

}

function readPendingBotOrders(){

const raw =
readJsonFile(
PENDING_ORDERS_FILE,
{}
);

return {
pendingTriggers:
raw?.pendingTriggers &&
typeof raw.pendingTriggers ===
"object"
? raw.pendingTriggers
: {},
pendingMirrorTriggers:
raw?.pendingMirrorTriggers &&
typeof raw.pendingMirrorTriggers ===
"object"
? raw.pendingMirrorTriggers
: {},
pendingEntries:
raw?.pendingEntries &&
typeof raw.pendingEntries ===
"object"
? raw.pendingEntries
: {}
};

}

function writePendingBotOrders(
pending
){

return writeJsonFile(
PENDING_ORDERS_FILE,
{
pendingTriggers:
pending?.pendingTriggers ||
{},
pendingMirrorTriggers:
pending?.pendingMirrorTriggers ||
{},
pendingEntries:
pending?.pendingEntries ||
{}
}
);

}

/**
 * Watchlist + per-symbol allowed setup sides.
 * Лонг → long из списка Лонг; Шорт → short из Шорт;
 * Лонг и Шорт → оба из Both; Избранные → один список по галочкам сторон.
 * @param {string} [exchangeId]
 * @param {object} prefs
 */
function getWatchlistPlan(
exchangeId,
prefs =
{}
){

const root =
readTickerFlagsRoot();
const id =
String(
exchangeId ||
"bybit"
).trim().toLowerCase() ||
"bybit";
const flags =
root[
id
] ||
emptyExchangeFlags();
const sides =
normalizeSides(
prefs.sides,
prefs.side
);
const useFavorites =
!!prefs.useFavorites;
/** @type {Record<string, Array<"long"|"short">>} */
const symbolAllowedSides =
{};

function allow(
symbol,
setupSide
){

const sym =
String(
symbol ||
""
).trim().toUpperCase().replace(
/\.P$/i,
""
);

if(
!sym
){
return;
}

const cur =
symbolAllowedSides[
sym
] ||
[];

if(
!cur.includes(
setupSide
)
){
symbolAllowedSides[
sym
] =
[
...cur,
setupSide
];
}

}

if(
useFavorites
){
const favs =
flags[
FLAG_FAVORITES
] ||
[];
const allowLong =
sides.long ||
sides.both;
const allowShort =
sides.short ||
sides.both;

for(
const symbol of favs
){
if(
allowLong
){
allow(
symbol,
"long"
);
}

if(
allowShort
){
allow(
symbol,
"short"
);
}
}
}else{
if(
sides.long
){
for(
const symbol of (
flags[
FLAG_LONG_5M
] ||
[]
)
){
allow(
symbol,
"long"
);
}
}

if(
sides.short
){
for(
const symbol of (
flags[
FLAG_SHORT_5M
] ||
[]
)
){
allow(
symbol,
"short"
);
}
}

if(
sides.both
){
for(
const symbol of (
flags[
FLAG_BOTH_5M
] ||
[]
)
){
allow(
symbol,
"long"
);
allow(
symbol,
"short"
);
}
}
}

const symbols =
Object.keys(
symbolAllowedSides
).sort(
(
a,
b
)=>
a.localeCompare(
b
)
);

return {
symbols,
symbolAllowedSides,
sides,
useFavorites,
side:
primarySide(
sides
)
};

}

function getWatchlistForSide(
exchangeId,
side,
opts =
{}
){

return getWatchlistPlan(
exchangeId,
{
side,
sides:
normalizeSides(
null,
side
),
useFavorites:
!!opts?.useFavorites
}
).symbols;

}

module.exports =
{
FLAG_LONG_5M,
FLAG_SHORT_5M,
FLAG_BOTH_5M,
FLAG_FAVORITES,
readBotStrategies,
writeBotStrategies,
readTickerFlagsRoot,
writeTickerFlagsRoot,
readPattern12Settings,
writePattern12Settings,
sideToFlagId,
enabledSides,
normalizeSides,
primarySide,
getWatchlistPlan,
getWatchlistForSide,
normalizeSt1,
normalizeSt2,
normalizeSt3,
normalizeManualRefreshStrategies,
listManualRefreshStrategyIds,
readPendingBotOrders,
writePendingBotOrders
};
