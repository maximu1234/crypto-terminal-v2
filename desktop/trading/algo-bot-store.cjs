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
tf:
"5",
slPct:
50,
riskUsd:
1,
tpRr:
2,
side:
"long",
useFavorites:
false,
refreshHours:
24,
refreshMinutes:
0,
minWinRate:
70,
refreshStatsMode:
"direct"
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
trailSlPct:
15
};

function normalizeRefreshStatsMode(
raw
){

return raw ===
"real"
? "real"
: "direct";

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
side:
normalizeSide(
src.side
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

delete common.tpRr;

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
trailSlPct:
clampInt(
src.trailSlPct,
0,
100,
DEFAULT_PARTIAL.trailSlPct
)
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
pendingEntries:
pending?.pendingEntries ||
{}
}
);

}

function getWatchlistForSide(
exchangeId,
side,
opts =
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
const flagId =
opts?.useFavorites
? FLAG_FAVORITES
: sideToFlagId(
side
);

return flags[
flagId
] ||
[];

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
getWatchlistForSide,
normalizeSt1,
normalizeSt2,
normalizeSt3,
readPendingBotOrders,
writePendingBotOrders
};
