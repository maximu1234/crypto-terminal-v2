/**
 * Активный бот для аналитики на АлгоТрейдинг: панель «Данные» + рисунки на графике.
 * Запуск бота (launchStrategyId) — отдельно; здесь только что показываем/рисуем.
 */
export const ALGO_ANALYSIS_BOT_PATTERN_12 =
"pattern-12";

export const ALGO_ANALYSIS_BOT_KEY =
"algo_trading_analysis_bot_v1";

export const ALGO_ANALYSIS_BOT_CHANGE_EVENT =
"algo-analysis-bot-change";

/** Известные боты аналитики (новые — сюда). */
export const ALGO_ANALYSIS_BOT_IDS =
[
ALGO_ANALYSIS_BOT_PATTERN_12
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
ALGO_ANALYSIS_BOT_IDS.includes(
id
)
){
return id;
}

return ALGO_ANALYSIS_BOT_PATTERN_12;

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
return ALGO_ANALYSIS_BOT_PATTERN_12;
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
localStorage.setItem(
ALGO_ANALYSIS_BOT_KEY,
next
);
}catch{
/* ignore quota */
}

if(
typeof document !==
"undefined"
){
document.body?.setAttribute(
"data-algo-analysis-bot",
next
);
}

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

return getActiveAnalysisBotId() ===
normalizeAnalysisBotId(
botId
);

}
