/**
 * Thin facade for Terminal «История сделок».
 * Exchange-specific fetch/matching lives in js/trade/{exchange}/history.
 */
import {
  SANDBOX_SYMBOL
} from "./marker-math.js?v=10";

import {
  getLoadedTradeExchangeModules,
  loadTradeExchangeModules
} from "../trade/module-router.js?v=16";

export async function fetchTradesForSymbol(symbol, chartStartSec) {
  await loadTradeExchangeModules();

  const fetchHistory =
    getLoadedTradeExchangeModules()?.fetchTradeHistoryForSymbol;

  if (typeof fetchHistory !== "function") {
    return {
      ok: false,
      trades: [],
      executions: [],
      message: "Модуль истории сделок недоступен"
    };
  }

  return fetchHistory(symbol, chartStartSec);
}

export async function fetchSandboxTrades(chartStartSec) {
  return fetchTradesForSymbol(SANDBOX_SYMBOL, chartStartSec);
}
