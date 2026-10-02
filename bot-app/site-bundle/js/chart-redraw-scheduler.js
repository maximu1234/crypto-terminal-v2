/**
 * Coalesced chart/drawings paint requests with reason gating.
 * Chrome-only reasons are ignored so opening panels does not thrash the canvas.
 *
 * Critical path (candles / drawings / trade overlay) always paints.
 * See docs/PERF_CHROME_CHART.md.
 */

export const CHART_REDRAW_REASON = Object.freeze({
  CANDLES: "candles",
  DRAWINGS: "drawings",
  INDICATORS: "indicators",
  TRADE_OVERLAY: "trade-overlay",
  LAYOUT: "layout",
  ALERTS: "alerts",
  /** UI chrome that must not paint the chart */
  CHROME: "chrome",
  CHROME_PANEL: "chrome-panel",
  CHROME_POPOVER: "chrome-popover"
});

const CHROME_REASONS = new Set([
  CHART_REDRAW_REASON.CHROME,
  CHART_REDRAW_REASON.CHROME_PANEL,
  CHART_REDRAW_REASON.CHROME_POPOVER
]);

export function isChromeRedrawReason(
reason
){

return CHROME_REASONS.has(
String(
reason ||
""
)
);

}

export function isPaintRedrawReason(
reason
){

const key =
String(
reason ||
CHART_REDRAW_REASON.DRAWINGS
);

return !isChromeRedrawReason(
key
);

}

/**
 * @param {{
 *   paint: ()=>void,
 *   isReady?: ()=>boolean,
 *   useDoubleRaf?: boolean
 * }} opts
 */
export function createChartRedrawScheduler(
opts
){

const paint =
opts.paint;
const isReady =
opts.isReady ||
(()=>
true);
const useDoubleRaf =
opts.useDoubleRaf !==
false;

let raf1 =
0;
let raf2 =
0;
let pendingReason =
"";

function cancel(){

if(
raf1
){
cancelAnimationFrame(
raf1
);
raf1 =
0;
}

if(
raf2
){
cancelAnimationFrame(
raf2
);
raf2 =
0;
}

pendingReason =
"";

}

function flush(){

raf1 =
0;
raf2 =
0;
pendingReason =
"";

if(
!isReady()
){
return;
}

try{
paint();
}catch(
err
){
console.warn(
"chart redraw",
err
);
}

}

/**
 * @param {string} [reason]
 */
function request(
reason =
CHART_REDRAW_REASON.DRAWINGS
){

if(
!isPaintRedrawReason(
reason
)
){
return false;
}

if(
!isReady()
){
return false;
}

pendingReason =
String(
reason
);

if(
raf1
){
cancelAnimationFrame(
raf1
);
}

if(
raf2
){
cancelAnimationFrame(
raf2
);
raf2 =
0;
}

raf1 =
requestAnimationFrame(
()=>{

if(
!useDoubleRaf
){
flush();
return;
}

raf2 =
requestAnimationFrame(
()=>{
flush();
}
);

}
);

return true;

}

return {
request,
cancel,
getPendingReason:()=>
pendingReason
};

}
