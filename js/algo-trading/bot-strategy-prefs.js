/**
 * Prefs для бот-стратегий АлгоТрейдинг (отдельно от панели анализа под графиком).
 */
import {
normalizeTpShares
} from "./pattern-trade-stats-partial.js?v=22";

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
 *   maxPt1Pt4Bars: number|null,
 *   pullbackBeforeArm: boolean,
 *   pullbackBeforeArmPct: number,
 *   tf: string,
 *   slPct: number,
 *   riskUsd: number,
 *   tpRr: number,
 *   alertLeadPct: number,
 *   minTurnover24hUsdt: number,
 *   side: AlgoBotSide,
 *   sides: AlgoBotSides,
 *   useFavorites: boolean,
 *   refreshHours: number,
 *   refreshMinutes: number,
 *   minWinRate: number,
 *   refreshStatsMode: "direct"|"real",
 *   manualRefreshStrategies: { st1: boolean, st2: boolean, st3: boolean }
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
 * Какая стратегия участвует в автоскане списка (только ручной режим).
 * Ровно одна: Ст1 | Ст2 | Ст3.
 * @param {unknown} raw
 * @returns {{ st1: boolean, st2: boolean, st3: boolean }}
 */
export function normalizeManualRefreshStrategies(
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
export function listManualRefreshStrategyIds(
raw
){

const flags =
normalizeManualRefreshStrategies(
raw
);
const ids =
/** @type {Array<"st1"|"st2"|"st3">} */
(
[
"st1",
"st2",
"st3"
].filter(
id=>
flags[
id
]
)
);

return ids.length
? ids
: [
"st1"
];

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
maxPt1Pt4Bars:
null,
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
"both",
sides:{
long:
false,
short:
false,
both:
true
},
useFavorites:
false,
refreshHours:
0,
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
 * Трейлинг СЛ в X от pt4 (-1 = pt3, плюс = профит).
 * Старую настройку в % от X переводим один раз: 15 → -0.15.
 * @param {unknown} rawX
 * @param {unknown} legacyPct
 * @param {number} fallback
 * @returns {number}
 */
function clampTrailSlX1Pref(
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

/**
 * Трейлинг СЛ после ТП2: не ниже трейлинга после ТП1 и не выше максимального ТП.
 * @param {unknown} raw
 * @param {number} trailX1
 * @param {Array<unknown>} tpMults
 * @param {number} fallback
 * @returns {number}
 */
function clampTrailSlX2Pref(
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
 * Подпись списка стратегии для бота (не long/short — списки = Ст1/2/3).
 * @param {"st1"|"st2"|"st3"|string} strategyId
 * @param {boolean} [useFavorites]
 */
export function botStrategyListLabel(
strategyId,
_useFavorites =
false
){

const id =
String(
strategyId ||
"st1"
).trim().toLowerCase();

if(
id ===
"st2"
){
return "Список: Стратегия 2";
}

if(
id ===
"st3"
){
return "Список: Стратегия 3";
}

return "Список: Стратегия 1";

}

/**
 * @param {AlgoBotSide|AlgoBotSides} sideOrSides
 * @param {boolean} [useFavorites]
 * @deprecated списки больше не по стороне — см. botStrategyListLabel
 */
export function botSideListLabel(
sideOrSides,
_useFavorites =
false
){

return "Список: Стратегия 1";

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

return dir;

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

const BOT_TF_STATUS_LABELS =
Object.freeze({
"1":
"1m",
"5":
"5m",
"15":
"15m",
"60":
"1h",
"240":
"4h",
D:
"D",
W:
"W"
});

function formatStatusNumber(
value,
digits =
2
){

const n =
Number(
value
);

if(
!Number.isFinite(
n
)
){
return "—";
}

if(
Number.isInteger(
n
)
){
return String(
n
);
}

return String(
Number(
n.toFixed(
digits
)
)
);

}

function formatStatusTurnover(
value
){

const n =
Number(
value
);

if(
!Number.isFinite(
n
) ||
n <
0
){
return "—";
}

return Math.round(
n
).toLocaleString(
"ru-RU"
).replace(
/\u00a0/g,
"."
);

}

/**
 * Полный текстовый снимок настроек стратегии для окна Статус (только чтение).
 * @param {object|null|undefined} prefs
 * @param {"st1"|"st2"|"st3"|string|null|undefined} strategyId
 * @param {{ tradingMode?: string, tickerBookTf?: string }|null|undefined} [extra]
 * @returns {{ label: string, value: string }[]}
 */
export function formatBotStrategySettingsRows(
prefs,
strategyId =
"st1",
extra =
null
){

const p =
prefs &&
typeof prefs ===
"object"
? prefs
: {};

if(
strategyId ===
"early-t3"
){
const listMode =
String(
p.actionMode ||
""
).toLowerCase() ===
"list";
const tfRaw =
String(
p.tf ||
extra?.tickerBookTf ||
""
).trim();
const rows =
[
{
label:
"Стратегия",
value:
"1-2 Early T3"
},
{
label:
"Режим",
value:
listMode
? "Список"
: "Алерт"
},
{
label:
"Таймфрейм",
value:
BOT_TF_STATUS_LABELS[
tfRaw
] ||
tfRaw ||
"—"
}
];

if(
!listMode
){
rows.push(
{
label:
"Алерт до pt4",
value:
`${formatStatusNumber(
p.alertLeadPct
)}% X`
}
);
}

rows.push(
{
label:
"Объем за сутки от",
value:
`${formatStatusTurnover(
p.minTurnover24hUsdt
)} USDT`
},
{
label:
"Список",
value:
"1-2 Early T3"
}
);

return rows;
}

const id =
strategyId ===
"st2" ||
strategyId ===
"st3"
? strategyId
: "st1";
const sides =
normalizeBotSides(
p.sides,
p.side
);
const mode =
String(
extra?.tradingMode ||
""
).toLowerCase() ===
"manual"
? "Ручная торговля"
: "Реальная торговля";
const bookTf =
String(
extra?.tickerBookTf ||
""
).trim();
const tf =
bookTf
? BOT_TF_STATUS_LABELS[
bookTf
] ||
bookTf
: "—";
const stratLabel =
id ===
"st2"
? "Стратегия 2"
: id ===
"st3"
? "Стратегия 3"
: "Стратегия 1";
const pullbackOn =
p.pullbackBeforeArm ===
true ||
p.pullbackBeforeArm ===
1 ||
p.pullbackBeforeArm ===
"1" ||
p.pullbackBeforeArm ===
"true";
const rows =
[
{
label:
"Стратегия",
value:
stratLabel
},
{
label:
"Режим",
value:
mode
},
{
label:
"Количество баров до отмены паттерна",
value:
formatStatusNumber(
p.timeoutBars,
0
)
},
{
label:
"Баров между pt1 и pt4 не более",
value:
p.maxPt1Pt4Bars ==
null
? "без лимита"
: formatStatusNumber(
p.maxPt1Pt4Bars,
0
)
},
{
label:
"Откат перед arm",
value:
pullbackOn
? `вкл. · ${formatStatusNumber(
p.pullbackBeforeArmPct
)}%`
: "выкл."
},
{
label:
"Таймфрейм (книга)",
value:
tf
},
{
label:
"СЛ (%)",
value:
formatStatusNumber(
p.slPct
)
},
{
label:
"СЛ ($)",
value:
formatStatusNumber(
p.riskUsd
)
}
];

if(
id ===
"st1"
){
rows.push(
{
label:
"ТП 1 к",
value:
formatStatusNumber(
p.tpRr
)
}
);
}else{
rows.push(
{
label:
"ТП1 / ТП2 / ТП3",
value:
`${formatStatusNumber(
p.tp1
)} / ${formatStatusNumber(
p.tp2
)} / ${formatStatusNumber(
p.tp3
)}`
},
{
label:
"Трейлинг СЛ",
value:
p.trailSl
? `вкл. · после ТП1: ${formatStatusNumber(
p.trailSlX1
)} · после ТП2: ${formatStatusNumber(
p.trailSlX2
)}`
: "выкл."
},
{
label:
"Доли ТП (%)",
value:
`${formatStatusNumber(
p.share1,
0
)} / ${formatStatusNumber(
p.share2,
0
)} / ${formatStatusNumber(
p.share3,
0
)}`
}
);
}

rows.push(
{
label:
"Объем за сутки от",
value:
`${formatStatusTurnover(
p.minTurnover24hUsdt
)} USDT`
},
{
label:
"Алерт до pt4",
value:
`${formatStatusNumber(
p.alertLeadPct
)}% X`
},
{
label:
"Торговля",
value:
botSidesDirectionLabel(
sides
)
},
{
label:
"Список",
value:
id ===
"st2"
? "Стратегия 2"
: id ===
"st3"
? "Стратегия 3"
: "Стратегия 1"
}
);

return rows;

}

/**
 * @param {AlgoBotSide} side
 * @deprecated списки по стратегии — botStrategyToFlagId / strategyIdToFlagId
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
 * @param {"st1"|"st2"|"st3"|string} strategyId
 */
export function botStrategyToFlagId(
strategyId
){

const id =
String(
strategyId ||
"st1"
).trim().toLowerCase();

if(
id ===
"st2"
){
return "algoShort5m";
}

if(
id ===
"st3"
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
: base.maxPt1Pt4Bars,
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
return base.pullbackBeforeArmPct;
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
25,
clampFloat(
src.alertLeadPct,
0,
base.alertLeadPct
)
),
minTurnover24hUsdt:
clampFloat(
src.minTurnover24hUsdt,
0,
base.minTurnover24hUsdt
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
false,
refreshHours:
0,
refreshMinutes:
0,
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
),
manualRefreshStrategies:
normalizeManualRefreshStrategies(
src.manualRefreshStrategies
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
trailSlX1:
clampTrailSlX1Pref(
src.trailSlX1,
src.trailSlPct,
defaults.trailSlX1
),
trailSlX2:
clampTrailSlX2Pref(
src.trailSlX2,
clampTrailSlX1Pref(
src.trailSlX1,
src.trailSlPct,
defaults.trailSlX1
),
[
src.tp1,
src.tp2,
src.tp3
],
defaults.trailSlX2
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

/**
 * Какая стратегия отмечена для запуска бота (ровно одна).
 * @param {unknown} raw
 * @returns {"st1"|"st2"|"st3"}
 */
export function normalizeLaunchStrategyId(
raw
){

if(
raw ===
"st2" ||
raw ===
"st3"
){
return raw;
}

return "st1";

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
defaultStrategy3Prefs(),
launchStrategyId:
"st1"
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
),
launchStrategyId:
normalizeLaunchStrategyId(
parsed?.launchStrategyId
)
};
}catch{
return {
st1:
defaultStrategy1Prefs(),
st2:
defaultStrategy2Prefs(),
st3:
defaultStrategy3Prefs(),
launchStrategyId:
"st1"
};
}

}

/**
 * @param {{ st1?: Partial<AlgoBotStrategy1Prefs>, st2?: object, st3?: object, launchStrategyId?: "st1"|"st2"|"st3" }} patch
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
),
launchStrategyId:
normalizeLaunchStrategyId(
patch.launchStrategyId !==
undefined
? patch.launchStrategyId
: cur.launchStrategyId
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
