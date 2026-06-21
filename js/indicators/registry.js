/**
 * Реестр индикаторов (страница Монеты).
 * Не более MAX_ACTIVE_INDICATORS overlay/pane одновременно; exempt — вне лимита (RSI).
 */
export const MAX_ACTIVE_INDICATORS =
3;

export function countsTowardLimit(
indicator
){

return !indicator?.exemptFromLimit;

}

export function countLimitedActive(
indicators
){

return indicators.filter(
ind=>
ind.isEnabled?.() &&
countsTowardLimit(
ind
)
).length;

}

export function canEnableIndicator(
indicators,
target
){

if(
!target ||
target.exemptFromLimit
){
return true;
}

if(
target.isEnabled?.()
){
return true;
}

return countLimitedActive(
indicators
) <
MAX_ACTIVE_INDICATORS;

}
