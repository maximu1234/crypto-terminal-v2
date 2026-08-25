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

/**
 * Box t3–t4 invalidation (wicks). Long: low < p3 or high > p4.
 * Short: high > p3 or low < p4. Returns "t3" | "t4" | null.
 * @param {{ side?: string, p3?: number, p4?: number }|null|undefined} setup
 * @param {{ high?: number, low?: number }|null|undefined} candle
 * @returns {"t3"|"t4"|null}
 */
function setupBoxT3T4Broken(
setup,
candle
){

if(
setupBrokenTowardPt3(
setup?.side,
candle,
Number(
setup?.p3
)
)
){
return "t3";
}

const p4 =
Number(
setup?.p4
);

if(
!(
p4 >
0
) ||
!candle
){
return null;
}

if(
setup?.side ===
"short"
){
return Number.isFinite(
candle.low
) &&
candle.low <
p4
? "t4"
: null;
}

return Number.isFinite(
candle.high
) &&
candle.high >
p4
? "t4"
: null;

}

module.exports =
{
setupBrokenTowardPt3,
setupBoxT3T4Broken
};
