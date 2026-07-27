/**
 * Терминал: глубина истории свечей (настройки → Системные).
 * Старт всегда ~5000; догрузка при панорамировании влево до этого лимита.
 */
export const TERMINAL_HISTORY_DEPTH_KEY =
"terminal_chart_history_depth_v1";

export const TERMINAL_HISTORY_DEPTH_MIN =
5000;

export const TERMINAL_HISTORY_DEPTH_MAX =
15000;

export const TERMINAL_HISTORY_DEPTH_DEFAULT =
5000;

/** Первичная загрузка графика (как раньше: 5×1000). */
export const TERMINAL_HISTORY_INITIAL_BARS =
5000;

/** Видимая область на всех ТФ Терминала. */
export const TERMINAL_VISIBLE_BARS =
2500;

/** Порция догрузки при сдвиге влево (1 запрос × 1000). */
export const TERMINAL_HISTORY_LAZY_BATCH_BARS =
1000;

export const TERMINAL_HISTORY_DEPTH_EVENT =
"terminal-chart-history-depth-changed";

function clampDepth(
value
){

const n =
Math.round(
Number(
value
)
);

if(
!Number.isFinite(
n
)
){
return TERMINAL_HISTORY_DEPTH_DEFAULT;
}

return Math.min(
TERMINAL_HISTORY_DEPTH_MAX,
Math.max(
TERMINAL_HISTORY_DEPTH_MIN,
n
)
);

}

export function getTerminalHistoryDepth(){

try{
const raw =
localStorage.getItem(
TERMINAL_HISTORY_DEPTH_KEY
);

if(
raw ==
null ||
raw ===
""
){
return TERMINAL_HISTORY_DEPTH_DEFAULT;
}

return clampDepth(
raw
);
}catch{
return TERMINAL_HISTORY_DEPTH_DEFAULT;
}

}

export function setTerminalHistoryDepth(
value
){

const next =
clampDepth(
value
);

try{
localStorage.setItem(
TERMINAL_HISTORY_DEPTH_KEY,
String(
next
)
);
}catch{
/* ignore */
}

window.dispatchEvent(
new CustomEvent(
TERMINAL_HISTORY_DEPTH_EVENT,
{
detail:{
depth:
next
}
}
)
);

return next;

}

export function terminalVisibleBars(
candleCount
){

return Math.min(
TERMINAL_VISIBLE_BARS,
Math.max(
1,
Number(
candleCount
) ||
1
)
);

}

export function terminalHistoryInitialRequests(){

return Math.ceil(
TERMINAL_HISTORY_INITIAL_BARS /
TERMINAL_HISTORY_LAZY_BATCH_BARS
);

}

export function terminalHistoryLazyRequests(){

return Math.ceil(
TERMINAL_HISTORY_LAZY_BATCH_BARS /
TERMINAL_HISTORY_LAZY_BATCH_BARS
);

}
