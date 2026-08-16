/**
 * Bybit diary policy — metka-69 contracts.
 * Closed-PnL rows are complete at list time; no BingX sparse/resolved rules.
 */

export function diarySanitizeTrade(trade) {
  return trade;
}

/** null = never cached; [] = empty day is a valid hit (pre-BingX). */
export function diaryAcceptDayCache(hit) {
  return hit !== null;
}
