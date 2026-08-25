/**
 * Активный бот аналитики на АлгоТрейдинг (меню «Боты»).
 * В один момент включён не больше одного; «none» — страница без бота.
 * Запуск live/manual (launchStrategyId) — отдельно, но только при включённом боте.
 */
export const ALGO_ANALYSIS_BOT_NONE =
"none";

export const ALGO_ANALYSIS_BOT_PATTERN_12 =
"pattern-12";

export const ALGO_ANALYSIS_BOT_EARLY_T3 =
"pattern-12-early-t3";

export const ALGO_ANALYSIS_BOT_RSI_TOUCH_FLIP =
"rsi-touch-flip";

export const ALGO_ANALYSIS_BOT_KEY =
"algo_trading_analysis_bot_v2";

export const ALGO_ANALYSIS_BOT_CHANGE_EVENT =
"algo-analysis-bot-change";

/** Известные боты аналитики (новые — сюда). */
export const ALGO_ANALYSIS_BOT_IDS =
[
ALGO_ANALYSIS_BOT_PATTERN_12,
ALGO_ANALYSIS_BOT_EARLY_T3,
ALGO_ANALYSIS_BOT_RSI_TOUCH_FLIP
];

/**
 * @param {unknown} raw
 * @returns {string}
 */
export function normalizeAnalysisBotId(
raw
){

const id =
String(
raw ||
""
).trim();

if(
!id ||
id ===
ALGO_ANALYSIS_BOT_NONE
){
return ALGO_ANALYSIS_BOT_NONE;
}

if(
ALGO_ANALYSIS_BOT_IDS.includes(
id
)
){
return id;
}

return ALGO_ANALYSIS_BOT_NONE;

}

function applyAnalysisBotAttr(
botId
){

if(
typeof document ===
"undefined"
){
return;
}

document.body?.setAttribute(
"data-algo-analysis-bot",
botId ||
ALGO_ANALYSIS_BOT_NONE
);

}

/**
 * @returns {string}
 */
export function getActiveAnalysisBotId(){

try{
return normalizeAnalysisBotId(
localStorage.getItem(
ALGO_ANALYSIS_BOT_KEY
)
);
}catch{
return ALGO_ANALYSIS_BOT_NONE;
}

}

/**
 * @param {unknown} nextRaw
 * @param {{ silent?: boolean }} [opts]
 * @returns {string}
 */
export function setActiveAnalysisBotId(
nextRaw,
opts =
{}
){

const prev =
getActiveAnalysisBotId();
const next =
normalizeAnalysisBotId(
nextRaw
);

try{
if(
next ===
ALGO_ANALYSIS_BOT_NONE
){
localStorage.removeItem(
ALGO_ANALYSIS_BOT_KEY
);
}else{
localStorage.setItem(
ALGO_ANALYSIS_BOT_KEY,
next
);
}
}catch{
/* ignore quota */
}

applyAnalysisBotAttr(
next
);

if(
!opts.silent &&
prev !==
next &&
typeof window !==
"undefined"
){
window.dispatchEvent(
new CustomEvent(
ALGO_ANALYSIS_BOT_CHANGE_EVENT,
{
detail:{
botId:
next,
prevBotId:
prev
}
}
)
);
}

return next;

}

/**
 * @param {string} botId
 * @returns {boolean}
 */
export function isActiveAnalysisBot(
botId
){

const id =
String(
botId ||
""
).trim();

if(
!id ||
id ===
ALGO_ANALYSIS_BOT_NONE
){
return false;
}

return getActiveAnalysisBotId() ===
id;

}

/**
 * @returns {boolean}
 */
export function isAnyAnalysisBotActive(){

return getActiveAnalysisBotId() !==
ALGO_ANALYSIS_BOT_NONE;

}
