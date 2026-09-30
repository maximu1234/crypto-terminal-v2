/**
 * Настройки бота MACD Flip Touch (как inputs в pine).
 * Не смешивать с Паттерн 1-2 / Early T3.
 */

export const MACD_FLIP_TOUCH_PREFS_KEY =
"algo_trading_macd_flip_touch_v1";

/** Параметры панели «Данные» по тикеру (анализ; не книга бота). */
export const MACD_FLIP_TOUCH_TICKER_PREFS_KEY =
"algo_trading_macd_flip_touch_by_ticker_v1";

export const MACD_FLIP_TOUCH_SIZE_EQUAL =
"equal";

export const MACD_FLIP_TOUCH_SIZE_AVERAGE =
"average";

export const MACD_FLIP_TOUCH_MARGIN_CROSS =
"cross";

export const MACD_FLIP_TOUCH_MARGIN_ISOLATED =
"isolated";

export const MACD_FLIP_TOUCH_SIDE_BOTH =
"BOTH";

export const MACD_FLIP_TOUCH_SIDE_LONG =
"LONG";

export const MACD_FLIP_TOUCH_SIDE_SHORT =
"SHORT";

export const MACD_FLIP_TOUCH_TF_OPTIONS =
[
{
value:
"",
label:
"график"
},
{
value:
"1",
label:
"1m"
},
{
value:
"5",
label:
"5m"
},
{
value:
"15",
label:
"15m"
},
{
value:
"60",
label:
"1h"
},
{
value:
"240",
label:
"4h"
},
{
value:
"D",
label:
"1D"
}
];

const TF_VALUES =
new Set(
MACD_FLIP_TOUCH_TF_OPTIONS.map(
opt=>
opt.value
)
);

function clampNumber(
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

function clampInt(
raw,
min,
max,
fallback
){

return Math.round(
clampNumber(
raw,
min,
max,
fallback
)
);

}

/**
 * @param {unknown} raw
 * @returns {string}
 */
export function normalizeMacdFlipTouchTf(
raw
){

const tf =
String(
raw ??
""
).trim();

return TF_VALUES.has(
tf
)
? tf
: "";

}

/**
 * @param {unknown} raw
 * @returns {"BOTH"|"LONG"|"SHORT"}
 */
export function normalizeMacdFlipTouchSide(
raw
){

const side =
String(
raw ||
""
).trim().toUpperCase();

if(
side ===
MACD_FLIP_TOUCH_SIDE_LONG ||
side ===
MACD_FLIP_TOUCH_SIDE_SHORT
){
return side;
}

return MACD_FLIP_TOUCH_SIDE_BOTH;

}

/**
 * @param {unknown} raw
 * @returns {"equal"|"average"}
 */
export function normalizeMacdFlipTouchSizeMode(
raw
){

const mode =
String(
raw ||
""
).trim().toLowerCase();

if(
mode ===
MACD_FLIP_TOUCH_SIZE_AVERAGE ||
mode ===
"усреднение" ||
mode ===
"avg"
){
return MACD_FLIP_TOUCH_SIZE_AVERAGE;
}

return MACD_FLIP_TOUCH_SIZE_EQUAL;

}

/**
 * @param {unknown} raw
 * @returns {"cross"|"isolated"}
 */
export function normalizeMacdFlipTouchMarginMode(
raw
){

return String(
raw ||
""
).trim().toLowerCase() ===
MACD_FLIP_TOUCH_MARGIN_ISOLATED
? MACD_FLIP_TOUCH_MARGIN_ISOLATED
: MACD_FLIP_TOUCH_MARGIN_CROSS;

}

/**
 * @returns {object}
 */
export function defaultMacdFlipTouchPrefs(){

return {
fastLength: 12,
slowLength: 26,
signalLength: 9,
source: "close",
oscillatorMa: "ema",
signalMa: "ema",
macdTf: "",
tradeSide: MACD_FLIP_TOUCH_SIDE_BOTH,
maxStack: 3,
budget: 100,
sizeMode: MACD_FLIP_TOUCH_SIZE_EQUAL,
sizeMult: 1.5,
showMarks: true,
commissionPct: 0.04,
slippageTicks: 0,
cycleSlEnabled: false,
cycleSlPct: 30,
compoundEnabled: false,
marginMode: MACD_FLIP_TOUCH_MARGIN_CROSS
};

}

/**
 * @param {unknown} raw
 * @returns {object}
 */
export function normalizeMacdFlipTouchPrefs(
raw
){

const base =
defaultMacdFlipTouchPrefs();
const src =
raw &&
typeof raw ===
"object"
? raw
: {};


let slowLength = clampInt(src.slowLength, 2, 999, base.slowLength);
let fastLength = clampInt(src.fastLength, 2, 999, base.fastLength);
if (slowLength <= fastLength) {
slowLength = Math.min(999, fastLength + 1);
}
return {
fastLength,
slowLength,
signalLength: clampInt(src.signalLength, 1, 999, base.signalLength),
source: String(src.source || base.source).toLowerCase() === "open" ? "open" : String(src.source || "").toLowerCase() === "high" ? "high" : String(src.source || "").toLowerCase() === "low" ? "low" : base.source,
oscillatorMa: String(src.oscillatorMa || "").toLowerCase() === "sma" ? "sma" : "ema",
signalMa: String(src.signalMa || "").toLowerCase() === "sma" ? "sma" : "ema",
macdTf: normalizeMacdFlipTouchTf(src.macdTf),
tradeSide: normalizeMacdFlipTouchSide(src.tradeSide),
maxStack: clampInt(src.maxStack, 1, 20, base.maxStack),
budget: clampNumber(src.budget, 1, 1_000_000, base.budget),
sizeMode: normalizeMacdFlipTouchSizeMode(src.sizeMode),
sizeMult: clampNumber(src.sizeMult, 1, 20, base.sizeMult),
showMarks: src.showMarks !== false,
commissionPct: clampNumber(src.commissionPct, 0, 10, base.commissionPct),
slippageTicks: clampInt(src.slippageTicks, 0, 1000, base.slippageTicks),
cycleSlEnabled: src.cycleSlEnabled === true,
cycleSlPct: clampNumber(src.cycleSlPct, 1, 90, base.cycleSlPct),
compoundEnabled: src.compoundEnabled === true,
marginMode: normalizeMacdFlipTouchMarginMode(src.marginMode)
};

}

/**
 * @returns {object}
 */
export function loadMacdFlipTouchPrefs(){

try{
const raw =
localStorage.getItem(
MACD_FLIP_TOUCH_PREFS_KEY
);

if(
!raw
){
return defaultMacdFlipTouchPrefs();
}

return normalizeMacdFlipTouchPrefs(
JSON.parse(
raw
)
);
}catch{
return defaultMacdFlipTouchPrefs();
}

}

/**
 * @param {object} [patch]
 * @returns {object}
 */
export function saveMacdFlipTouchPrefs(
patch =
{}
){

const next =
normalizeMacdFlipTouchPrefs(
{
...loadMacdFlipTouchPrefs(),
...patch
}
);

try{
localStorage.setItem(
MACD_FLIP_TOUCH_PREFS_KEY,
JSON.stringify(
next
)
);
}catch{
/* ignore quota */
}

return next;

}

/**
 * @param {unknown} symbol
 * @returns {string}
 */
export function normalizeMacdFlipTouchTickerSymbol(
symbol
){

return String(
symbol ||
""
).replace(
/\.P$/i,
""
).trim().toUpperCase();

}

/**
 * Повторная загрузка того же тикера не должна сбрасывать поля Данные на дефолт.
 * @param {unknown} prevSymbol
 * @param {unknown} nextSymbol
 * @param {{ force?: boolean, preferBook?: boolean }} [opts]
 * @returns {boolean}
 */
export function shouldReloadMacdFlipTouchColumn(
prevSymbol,
nextSymbol,
opts =
{}
){

if(
opts.force ===
true ||
opts.preferBook ===
true
){
return true;
}

const next =
normalizeMacdFlipTouchTickerSymbol(
nextSymbol
);

if(
!next
){
return false;
}

return next !==
normalizeMacdFlipTouchTickerSymbol(
prevSymbol
);

}

function readMacdFlipTouchTickerRoot(){

try{
const raw =
localStorage.getItem(
MACD_FLIP_TOUCH_TICKER_PREFS_KEY
);

if(
!raw
){
return {};
}

const parsed =
JSON.parse(
raw
);

return parsed &&
typeof parsed ===
"object" &&
!Array.isArray(
parsed
)
? parsed
: {};
}catch{
return {};
}

}

function writeMacdFlipTouchTickerRoot(
root
){

try{
localStorage.setItem(
MACD_FLIP_TOUCH_TICKER_PREFS_KEY,
JSON.stringify(
root
)
);
}catch(
err
){
console.warn(
"[algo-trading] rsi touch flip ticker prefs persist",
err
);
}

}

/**
 * @param {string} symbol
 * @returns {object|null}
 */
export function loadMacdFlipTouchTickerPrefs(
symbol
){

const key =
normalizeMacdFlipTouchTickerSymbol(
symbol
);

if(
!key
){
return null;
}

const raw =
readMacdFlipTouchTickerRoot()[key];

if(
!raw
){
return null;
}

return normalizeMacdFlipTouchPrefs(
raw
);

}

/**
 * @param {string} symbol
 * @returns {boolean}
 */
export function hasMacdFlipTouchTickerPrefs(
symbol
){

const key =
normalizeMacdFlipTouchTickerSymbol(
symbol
);

return !!(
key &&
readMacdFlipTouchTickerRoot()[key]
);

}

/**
 * @param {string} symbol
 * @param {object} [patch]
 * @returns {object|null}
 */
export function saveMacdFlipTouchTickerPrefs(
symbol,
patch =
{}
){

const key =
normalizeMacdFlipTouchTickerSymbol(
symbol
);

if(
!key
){
return null;
}

const root =
readMacdFlipTouchTickerRoot();
const prev =
root[key]
? normalizeMacdFlipTouchPrefs(
root[key]
)
: defaultMacdFlipTouchPrefs();
const next =
normalizeMacdFlipTouchPrefs(
{
...prev,
...patch
}
);
root[key] =
next;
writeMacdFlipTouchTickerRoot(
root
);

try{
localStorage.setItem(
MACD_FLIP_TOUCH_PREFS_KEY,
JSON.stringify(
next
)
);
}catch{
/* ignore quota */
}

return next;

}

/**
 * Подставить сохранённые параметры тикера в общий буфер панели.
 * @param {string} symbol
 * @returns {object}
 */
export function hydrateMacdFlipTouchPrefsForSymbol(
symbol
){

const stored =
loadMacdFlipTouchTickerPrefs(
symbol
);
const next =
stored ||
defaultMacdFlipTouchPrefs();

try{
localStorage.setItem(
MACD_FLIP_TOUCH_PREFS_KEY,
JSON.stringify(
next
)
);
}catch{
/* ignore quota */
}

return next;

}

export const MACD_FLIP_TOUCH_BOT_PREFS_KEY =
"algo_trading_macd_flip_touch_bot_v1";

export const MACD_FLIP_TOUCH_BOT_PREFS_CHANGE_EVENT =
"algo-macd-flip-touch-bot-prefs";

/**
 * Поля запуска (без комиссии/меток аналитики).
 * @param {unknown} raw
 * @returns {object}
 */
export function pickMacdFlipTouchLaunchPrefs(
raw
){

const p =
normalizeMacdFlipTouchPrefs(
raw
);

return {
fastLength: p.fastLength,
slowLength: p.slowLength,
signalLength: p.signalLength,
source: p.source,
oscillatorMa: p.oscillatorMa,
signalMa: p.signalMa,
macdTf: p.macdTf,
tradeSide: p.tradeSide,
maxStack: p.maxStack,
budget: p.budget,
sizeMode: p.sizeMode,
sizeMult: p.sizeMult,
cycleSlEnabled: p.cycleSlEnabled,
cycleSlPct: p.cycleSlPct
};

}

/**
 * @returns {object}
 */
export function loadMacdFlipTouchBotPrefs(){

try{
const raw =
localStorage.getItem(
MACD_FLIP_TOUCH_BOT_PREFS_KEY
);

if(
!raw
){
return pickMacdFlipTouchLaunchPrefs(
loadMacdFlipTouchPrefs()
);
}

return pickMacdFlipTouchLaunchPrefs(
JSON.parse(
raw
)
);
}catch{
return pickMacdFlipTouchLaunchPrefs(
loadMacdFlipTouchPrefs()
);
}

}

/**
 * @param {object} [patch]
 * @returns {object}
 */
export function saveMacdFlipTouchBotPrefs(
patch =
{}
){

const next =
pickMacdFlipTouchLaunchPrefs(
{
...loadMacdFlipTouchBotPrefs(),
...patch
}
);

try{
localStorage.setItem(
MACD_FLIP_TOUCH_BOT_PREFS_KEY,
JSON.stringify(
next
)
);
}catch{
/* ignore quota */
}

return next;

}

/**
 * Копия текущих полей панели Данные → настройки бота.
 * @returns {object}
 */
export function copyMacdFlipTouchAnalysisToBot(){

return saveMacdFlipTouchBotPrefs(
pickMacdFlipTouchLaunchPrefs(
loadMacdFlipTouchPrefs()
)
);

}

export const MACD_FLIP_TOUCH_BALANCE_PCT_KEY =
"algo_trading_macd_flip_touch_balance_pct_v1";

export const MACD_FLIP_TOUCH_BALANCE_PCT_DEFAULT =
100;

/**
 * @param {unknown} raw
 * @returns {number}
 */
export function normalizeMacdFlipTouchBalancePct(
raw
){

return clampNumber(
raw,
1,
100,
MACD_FLIP_TOUCH_BALANCE_PCT_DEFAULT
);

}

/**
 * @returns {number}
 */
export function loadMacdFlipTouchBalancePct(){

try{
const raw =
localStorage.getItem(
MACD_FLIP_TOUCH_BALANCE_PCT_KEY
);

if(
raw ==
null ||
raw ===
""
){
return MACD_FLIP_TOUCH_BALANCE_PCT_DEFAULT;
}

return normalizeMacdFlipTouchBalancePct(
JSON.parse(
raw
)
);
}catch{
return MACD_FLIP_TOUCH_BALANCE_PCT_DEFAULT;
}

}

/**
 * @param {unknown} raw
 * @returns {number}
 */
export function saveMacdFlipTouchBalancePct(
raw
){

const next =
normalizeMacdFlipTouchBalancePct(
raw
);

try{
localStorage.setItem(
MACD_FLIP_TOUCH_BALANCE_PCT_KEY,
JSON.stringify(
next
)
);
}catch{
/* ignore quota */
}

return next;

}

export const MACD_FLIP_TOUCH_MARGIN_MODE_KEY =
"algo_trading_macd_flip_touch_margin_mode_v1";

/**
 * @param {unknown} raw
 * @returns {"cross"|"isolated"}
 */
export function loadMacdFlipTouchMarginMode(){

try{
const raw =
localStorage.getItem(
MACD_FLIP_TOUCH_MARGIN_MODE_KEY
);

if(
raw ==
null ||
raw ===
""
){
return MACD_FLIP_TOUCH_MARGIN_CROSS;
}

return normalizeMacdFlipTouchMarginMode(
JSON.parse(
raw
)
);
}catch{
return MACD_FLIP_TOUCH_MARGIN_CROSS;
}

}

/**
 * @param {unknown} raw
 * @returns {"cross"|"isolated"}
 */
export function saveMacdFlipTouchMarginMode(
raw
){

const next =
normalizeMacdFlipTouchMarginMode(
raw
);

try{
localStorage.setItem(
MACD_FLIP_TOUCH_MARGIN_MODE_KEY,
JSON.stringify(
next
)
);
}catch{
/* ignore quota */
}

return next;

}
