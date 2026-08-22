/**
 * Prefs бота 1-2 Early T3 (алерты). Не смешивать с Паттерн 1-2 / st1–st3.
 */
import {
ALGO_BOT_TF_OPTIONS,
normalizeBotTf
} from "./bot-strategy-prefs.js?v=28";

export const EARLY_T3_BOT_PREFS_KEY =
"algo_trading_early_t3_bot_v1";

export const EARLY_T3_BOT_DEFAULT_MIN_TURNOVER =
100_000;

export const EARLY_T3_BOT_TF_OPTIONS =
ALGO_BOT_TF_OPTIONS;

/**
 * @returns {{ tf: string, alertLeadPct: number, minTurnover24hUsdt: number }}
 */
export function defaultEarlyT3BotPrefs(){

return {
tf:
"5",
alertLeadPct:
5,
minTurnover24hUsdt:
EARLY_T3_BOT_DEFAULT_MIN_TURNOVER
};

}

function clampAlertLeadPct(
raw
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
0
){
return 5;
}

return Math.min(
10,
n
);

}

function clampMinTurnover(
raw
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
0
){
return EARLY_T3_BOT_DEFAULT_MIN_TURNOVER;
}

return n;

}

/**
 * @param {unknown} raw
 */
export function normalizeEarlyT3BotPrefs(
raw
){

const src =
raw &&
typeof raw ===
"object"
? raw
: {};
const base =
defaultEarlyT3BotPrefs();

return {
tf:
normalizeBotTf(
src.tf ??
base.tf
),
alertLeadPct:
clampAlertLeadPct(
src.alertLeadPct
),
minTurnover24hUsdt:
clampMinTurnover(
src.minTurnover24hUsdt
)
};

}

/**
 * @returns {ReturnType<typeof defaultEarlyT3BotPrefs>}
 */
export function loadEarlyT3BotPrefs(){

try{
const raw =
localStorage.getItem(
EARLY_T3_BOT_PREFS_KEY
);

if(
!raw
){
return defaultEarlyT3BotPrefs();
}

return normalizeEarlyT3BotPrefs(
JSON.parse(
raw
)
);
}catch{
return defaultEarlyT3BotPrefs();
}

}

/**
 * @param {unknown} patch
 */
export function saveEarlyT3BotPrefs(
patch =
{}
){

const next =
normalizeEarlyT3BotPrefs(
{
...loadEarlyT3BotPrefs(),
...(
patch &&
typeof patch ===
"object"
? patch
: {}
)
}
);

try{
localStorage.setItem(
EARLY_T3_BOT_PREFS_KEY,
JSON.stringify(
next
)
);
}catch{
/* quota */
}

return next;

}
