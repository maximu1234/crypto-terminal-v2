/**
 * Facade → period picker активной биржи + shared date math.
 */
export {
  DIARY_PERIOD_PRESETS,
  startOfDayMs,
  endOfDayMs,
  dayKeyFromMs,
  msFromDayKey,
  resolveDiaryPreset,
  getDefaultDiaryPeriod,
  formatDiaryInputDate,
  parseDiaryInputDate
} from "./trade-diary-time.js?v=1";

import {
  getLoadedTradeExchangeModules
} from "./trade/module-router.js?v=14";

function mod() {
  return getLoadedTradeExchangeModules();
}

export function mountTradeDiaryPeriodPicker(...args) {
  const fn = mod()?.mountTradeDiaryPeriodPicker;
  if (typeof fn !== "function") {
    return null;
  }
  return fn(...args);
}
