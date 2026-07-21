/**
 * Prefs для бот-стратегий АлгоТрейдинг (отдельно от панели анализа под графиком).
 */
export const ALGO_BOT_STRATEGIES_KEY =
"algo_trading_bot_strategies_v1";

export const ALGO_BOT_TF_OPTIONS =
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
 * @typedef {"long"|"short"|"both"} AlgoBotSide
 */

/**
 * @typedef {{
 *   running: boolean,
 *   timeoutBars: number,
 *   tf: string,
 *   slPct: number,
 *   riskUsd: number,
 *   tpRr: number,
 *   side: AlgoBotSide,
 *   useFavorites: boolean,
 *   refreshHours: number,
 *   refreshMinutes: number,
 *   minWinRate: number,
 *   refreshStatsMode: "direct"|"real"
 * }} AlgoBotStrategy1Prefs
 */

/**
 * @param {unknown} raw
 * @returns {"direct"|"real"}
 */
export function normalizeBotRefreshStatsMode(
raw
){

return raw ===
"real"
? "real"
: "direct";

}

/**
 * @returns {AlgoBotStrategy1Prefs}
 */
export function defaultStrategy1Prefs(){

return {
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

}

function defaultPartialStrategyPrefs(){

return {
...defaultStrategy1Prefs(),
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

}

export function defaultStrategy2Prefs(){

return defaultPartialStrategyPrefs();

}

export function defaultStrategy3Prefs(){

return defaultPartialStrategyPrefs();

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
fallback
){

const n =
Number(
raw
);

if(
!Number.isFinite(
n
) ||
n <
min
){
return fallback;
}

return n;

}

/**
 * @param {unknown} raw
 * @returns {AlgoBotSide}
 */
export function normalizeBotSide(
raw
){

if(
raw ===
"short" ||
raw ===
"both"
){
return raw;
}

return "long";

}

/**
 * @param {AlgoBotSide} side
 * @param {boolean} [useFavorites]
 */
export function botSideListLabel(
side,
useFavorites =
false
){

if(
useFavorites
){
return "Список: Избранные";
}

if(
side ===
"short"
){
return "Список: Алго Шорт";
}

if(
side ===
"both"
){
return "Список: Алго Лонг/Шорт";
}

return "Список: Алго Лонг";

}

/**
 * @param {AlgoBotSide} side
 */
export function botSideToFlagId(
side
){

if(
side ===
"short"
){
return "algoShort5m";
}

if(
side ===
"both"
){
return "algoBoth5m";
}

return "algoLong5m";

}

/**
 * @param {unknown} raw
 */
export function normalizeBotTf(
raw
){

const tf =
String(
raw ||
""
).trim();

return ALGO_BOT_TF_OPTIONS.includes(
tf
)
? tf
: "5";

}

/**
 * @param {unknown} raw
 * @returns {AlgoBotStrategy1Prefs}
 */
export function normalizeStrategy1Prefs(
raw
){

const base =
defaultStrategy1Prefs();
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
base.timeoutBars
),
tf:
normalizeBotTf(
src.tf
),
slPct:
clampFloat(
src.slPct,
0.01,
base.slPct
),
riskUsd:
clampFloat(
src.riskUsd,
0.01,
base.riskUsd
),
tpRr:
clampFloat(
src.tpRr,
0.01,
base.tpRr
),
side:
normalizeBotSide(
src.side
),
useFavorites:
!!src.useFavorites,
refreshHours:
clampInt(
src.refreshHours,
0,
168,
base.refreshHours
),
refreshMinutes:
clampInt(
src.refreshMinutes,
0,
59,
base.refreshMinutes
),
minWinRate:
clampInt(
src.minWinRate,
10,
100,
base.minWinRate
),
refreshStatsMode:
normalizeBotRefreshStatsMode(
src.refreshStatsMode
)
};

}

function normalizePartialStrategyPrefs(
raw,
defaults
){

const src =
raw &&
typeof raw ===
"object"
? raw
: {};
const common =
normalizeStrategy1Prefs(
{
...defaults,
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
defaults.tp1
),
tp2:
clampFloat(
src.tp2,
0.01,
defaults.tp2
),
tp3:
clampFloat(
src.tp3,
0.01,
defaults.tp3
),
trailSl:
src.trailSl ===
undefined
? defaults.trailSl
: !!src.trailSl,
trailSlPct:
clampInt(
src.trailSlPct,
0,
100,
defaults.trailSlPct
)
};

}

export function normalizeStrategy2Prefs(
raw
){

return normalizePartialStrategyPrefs(
raw,
defaultStrategy2Prefs()
);

}

export function normalizeStrategy3Prefs(
raw
){

return normalizePartialStrategyPrefs(
raw,
defaultStrategy3Prefs()
);

}

export function loadBotStrategiesPrefs(){

try{
const raw =
localStorage.getItem(
ALGO_BOT_STRATEGIES_KEY
);

if(
!raw
){
return {
st1:
defaultStrategy1Prefs(),
st2:
defaultStrategy2Prefs(),
st3:
defaultStrategy3Prefs()
};
}

const parsed =
JSON.parse(
raw
);

return {
st1:
normalizeStrategy1Prefs(
parsed?.st1
),
st2:
normalizeStrategy2Prefs(
parsed?.st2
),
st3:
normalizeStrategy3Prefs(
parsed?.st3
)
};
}catch{
return {
st1:
defaultStrategy1Prefs(),
st2:
defaultStrategy2Prefs(),
st3:
defaultStrategy3Prefs()
};
}

}

/**
 * @param {{ st1?: Partial<AlgoBotStrategy1Prefs>, st2?: object, st3?: object }} patch
 */
export function saveBotStrategiesPrefs(
patch
){

const cur =
loadBotStrategiesPrefs();
const next =
{
st1:
normalizeStrategy1Prefs(
{
...cur.st1,
...(
patch.st1 ||
{}
)
}
),
st2:
normalizeStrategy2Prefs(
{
...cur.st2,
...(
patch.st2 ||
{}
)
}
),
st3:
normalizeStrategy3Prefs(
{
...cur.st3,
...(
patch.st3 ||
{}
)
}
)
};

try{
localStorage.setItem(
ALGO_BOT_STRATEGIES_KEY,
JSON.stringify(
next
)
);
}catch{
/* ignore */
}

return next;

}
