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
 * @typedef {{ long: boolean, short: boolean, both: boolean }} AlgoBotSides
 */

/**
 * @typedef {{
 *   running: boolean,
 *   timeoutBars: number,
 *   tf: string,
 *   slPct: number,
 *   riskUsd: number,
 *   tpRr: number,
 *   alertLeadPct: number,
 *   side: AlgoBotSide,
 *   sides: AlgoBotSides,
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
alertLeadPct:
5,
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
 * @param {AlgoBotSides} sides
 * @returns {AlgoBotSide}
 */
export function primaryBotSide(
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

/**
 * @param {unknown} raw
 * @param {unknown} [legacySide]
 * @returns {AlgoBotSides}
 */
export function normalizeBotSides(
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
normalizeBotSide(
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

/**
 * @param {AlgoBotSides} sides
 * @returns {AlgoBotSide[]}
 */
export function enabledBotSides(
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

/**
 * @param {AlgoBotSide|AlgoBotSides} sideOrSides
 * @param {boolean} [useFavorites]
 */
export function botSideListLabel(
sideOrSides,
useFavorites =
false
){

if(
useFavorites
){
return "Список: Избранные";
}

const sides =
sideOrSides &&
typeof sideOrSides ===
"object" &&
(
"long" in sideOrSides ||
"short" in sideOrSides ||
"both" in sideOrSides
)
? normalizeBotSides(
sideOrSides
)
: normalizeBotSides(
null,
sideOrSides
);
const labels =
[];

if(
sides.long
){
labels.push(
"Алго Лонг"
);
}

if(
sides.short
){
labels.push(
"Алго Шорт"
);
}

if(
sides.both
){
labels.push(
"Алго Лонг/Шорт"
);
}

if(
!labels.length
){
return "Список: Алго Лонг";
}

return labels.length ===
1
? `Список: ${labels[0]}`
: `Списки: ${labels.join(
" + "
)}`;

}

/**
 * Краткая подпись направления для окна Статус.
 * @param {AlgoBotSide|AlgoBotSides} sideOrSides
 * @param {boolean} [useFavorites]
 */
export function botSidesDirectionLabel(
sideOrSides,
useFavorites =
false
){

const sides =
sideOrSides &&
typeof sideOrSides ===
"object" &&
(
"long" in sideOrSides ||
"short" in sideOrSides ||
"both" in sideOrSides
)
? normalizeBotSides(
sideOrSides
)
: normalizeBotSides(
null,
sideOrSides
);
const parts =
[];

if(
sides.long
){
parts.push(
"Лонг"
);
}

if(
sides.short
){
parts.push(
"Шорт"
);
}

if(
sides.both
){
parts.push(
"Лонг и Шорт"
);
}

const dir =
parts.length
? parts.join(
" + "
)
: "Лонг";

return useFavorites
? `${dir} · Избранные`
: dir;

}

/**
 * Краткая строка настроек для окна Статус.
 * St1: «СЛ:50% (1$), ТП: 1к3»
 * St2/St3: «СЛ:50% (1$), ТП: 1/1.25/1.44»
 * @param {object|null|undefined} prefs
 * @param {"st1"|"st2"|"st3"|string|null|undefined} strategyId
 * @returns {string}
 */
export function botSettingsStatusLabel(
prefs,
strategyId =
"st1"
){

if(
!prefs
){
return "—";
}

const slPct =
Math.round(
Number(
prefs.slPct
)
);
const riskRaw =
Number(
prefs.riskUsd
);
const slOk =
Number.isFinite(
slPct
);
const riskOk =
Number.isFinite(
riskRaw
) &&
riskRaw >
0;

const riskLabel =
riskOk
?(
Number.isInteger(
riskRaw
)
? String(
riskRaw
)
: String(
Math.round(
riskRaw *
100
) /
100
)
)
: "—";

const slPart =
slOk
? `СЛ:${slPct}% (${riskLabel}$)`
: `СЛ:— (${riskLabel}$)`;

const id =
strategyId ===
"st2" ||
strategyId ===
"st3"
? strategyId
: "st1";

if(
id ===
"st2" ||
id ===
"st3"
){

const fmt =
v=>{
const n =
Number(
v
);

if(
!Number.isFinite(
n
)
){
return "—";
}

return Number.isInteger(
n
)
? String(
n
)
: String(
Math.round(
n *
100
) /
100
);
};

return `${slPart}, ТП: ${fmt(
prefs.tp1
)}/${fmt(
prefs.tp2
)}/${fmt(
prefs.tp3
)}`;

}

const rr =
Number(
prefs.tpRr
);

if(
!Number.isFinite(
rr
) ||
rr <=
0
){
return `${slPart}, ТП: —`;
}

const rrLabel =
Number.isInteger(
rr
)
? String(
rr
)
: String(
Math.round(
rr *
100
) /
100
);

return `${slPart}, ТП: 1к${rrLabel}`;

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
alertLeadPct:
Math.min(
10,
clampFloat(
src.alertLeadPct,
0,
base.alertLeadPct
)
),
sides:
normalizeBotSides(
src.sides,
src.side
),
side:
primaryBotSide(
normalizeBotSides(
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
