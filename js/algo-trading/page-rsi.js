/**
 * RSI HUD / pane helpers on АлгоТрейдинг.
 * Split from js/algo-trading.js — поведение 1:1.
 */
import {
calculateRSI,
alignRsiWithCandleTimes
} from "../indicators.js?v=3";

import {
updateRsiBandLayout,
updateRsiLevelLinesLayout
} from "../chart-import.js?v=49";

export function syncRsiHudPeriod(
el,
period
){

if(
el
){
el.textContent =
String(
period
);
}

}

export function syncRsiLevelDom(
wrapEl,
settings
){

if(
!wrapEl
){
return;
}

const ob =
wrapEl.querySelector(
'[data-rsi-role="ob"]'
);
const os =
wrapEl.querySelector(
'[data-rsi-role="os"]'
);

if(
ob
){
ob.setAttribute(
"data-rsi-level",
String(
settings.overbought
)
);
}

if(
os
){
os.setAttribute(
"data-rsi-level",
String(
settings.oversold
)
);
}

}

export function setRsiHud(
el,
value
){

if(
!el
){
return;
}

if(
!Number.isFinite(
value
)
){
el.textContent =
"—";
return;
}

el.textContent =
value.toFixed(
2
);

}

export function lastRsiValue(
candles,
period
){

if(
!candles?.length
){
return null;
}

const points =
alignRsiWithCandleTimes(
candles,
calculateRSI(
candles,
period
),
period
);
const last =
points[
points.length -
1
];

return Number.isFinite(
last?.value
)
? last.value
: null;

}

export function layoutRsiPane(
rsiSeries,
rsiWrapEl,
settings
){

if(
!rsiSeries ||
!rsiWrapEl
){
return;
}

updateRsiBandLayout(
rsiSeries,
rsiWrapEl.querySelector(
"#rsi-band"
),
{
overbought:
settings.overbought,
oversold:
settings.oversold
}
);
updateRsiLevelLinesLayout(
rsiSeries,
rsiWrapEl
);

}
