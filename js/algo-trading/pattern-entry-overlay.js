/**
 * Синхронизация точек входа паттерна → объекты «Позиция» на графике.
 */
import {
detectPatternEntryEvents
} from "./pattern-entry-logic.js?v=5";

import {
clearAlgoEntryPositions,
DEFAULT_RISK_USD,
DEFAULT_SL_PCT_OF_X,
DEFAULT_TP_RR,
syncAlgoEntryPositions
} from "./pattern-entry-positions.js?v=11";

import {
DEFAULT_PARTIAL_TP1_X,
DEFAULT_PARTIAL_TP2_X,
DEFAULT_PARTIAL_TP3_X
} from "./pattern-trade-stats-partial.js?v=10";

/**
 * @param {{
 *   getCandles: () => Array,
 *   getDrawingTools: () => object|null,
 *   getSlPctOfX?: () => number,
 *   getTpRr?: () => number,
 *   getRiskUsd?: () => number,
 *   getTimeoutBars?: () => number,
 *   getChartPositionsStrategy?: () => "fixed-tp"|"partial-tp"|"partial-tp-y",
 *   getTp1X?: () => number,
 *   getTp2X?: () => number,
 *   getTp3X?: () => number,
 *   getTp1Y?: () => number,
 *   getTp2Y?: () => number,
 *   getTp3Y?: () => number
 * }} host
 */
export function mountAlgoPatternEntryOverlay(
host
){

let events =
[];
let disposed =
false;

function getTools(){

return host?.getDrawingTools?.() ||
null;
}

function pickTp(
getter,
fallback
){

const raw =
getter?.();

return Number.isFinite(
raw
) &&
raw >
0
? raw
: fallback;

}

function positionOpts(){

const slRaw =
host?.getSlPctOfX?.();
const tpRaw =
host?.getTpRr?.();
const riskRaw =
host?.getRiskUsd?.();
const strategyRaw =
host?.getChartPositionsStrategy?.();
const strategy =
strategyRaw ===
"partial-tp" ||
strategyRaw ===
"partial-tp-y"
? strategyRaw
: "fixed-tp";

return {
strategy,
slPctOfX:
Number.isFinite(
slRaw
)
? slRaw
: DEFAULT_SL_PCT_OF_X,
tpRr:
Number.isFinite(
tpRaw
)
? tpRaw
: DEFAULT_TP_RR,
riskUsd:
Number.isFinite(
riskRaw
)
? riskRaw
: DEFAULT_RISK_USD,
tp1X:
pickTp(
host?.getTp1X,
DEFAULT_PARTIAL_TP1_X
),
tp2X:
pickTp(
host?.getTp2X,
DEFAULT_PARTIAL_TP2_X
),
tp3X:
pickTp(
host?.getTp3X,
DEFAULT_PARTIAL_TP3_X
),
tp1Y:
pickTp(
host?.getTp1Y,
DEFAULT_PARTIAL_TP1_X
),
tp2Y:
pickTp(
host?.getTp2Y,
DEFAULT_PARTIAL_TP2_X
),
tp3Y:
pickTp(
host?.getTp3Y,
DEFAULT_PARTIAL_TP3_X
)
};

}

function detectOpts(){

const timeoutRaw =
host?.getTimeoutBars?.();

return {
timeoutBars:
Number.isFinite(
timeoutRaw
)
? timeoutRaw
: undefined
};

}

function applyPositions(){

if(
disposed
){
return;
}

syncAlgoEntryPositions(
getTools(),
events,
host?.getCandles?.() ||
[],
positionOpts()
);

}

function recompute(){

if(
disposed
){
return;
}

try{
events =
detectPatternEntryEvents(
host?.getCandles?.() ||
[],
undefined,
detectOpts()
);
}catch(
err
){
console.warn(
"[algo-trading] entry detect:",
err
);
events =
[];
}

applyPositions();

}

function setEvents(
next
){

events =
Array.isArray(
next
)
? next
: [];
applyPositions();

}

function refreshPositions(){

applyPositions();

}

function bind(){

return !!getTools();

}

function destroy(){

disposed =
true;
clearAlgoEntryPositions(
getTools()
);
events =
[];

}

return {
recompute,
setEvents,
refreshPositions,
bind,
destroy,
getEvents:()=>
events.slice()
};

}
