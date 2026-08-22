/**
 * Pure Early T3 alert rules (no Electron). Used by the alerts-only engine.
 */
"use strict";

function setupBrokenTowardPt3(
side,
candle,
p3
){

if(
!(
p3 >
0
) ||
!candle
){
return false;
}

if(
side ===
"short"
){
return Number.isFinite(
candle.high
) &&
candle.high >
p3;
}

return Number.isFinite(
candle.low
) &&
candle.low <
p3;

}

module.exports =
{
setupBrokenTowardPt3
};
