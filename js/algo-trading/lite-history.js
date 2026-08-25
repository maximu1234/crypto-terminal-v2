/**
 * История свечей для Algo Bot lite (без графика).
 * Renderer fetchBybit часто идёт через SOCKS; на VPS тот же путь,
 * что и список тикеров: Node IPC public kline.
 */
import {
  loadMarketHistory,
  getActiveExchangeId
} from "../market-api.js?v=6";

/**
 * @param {unknown} symbol
 * @param {unknown} tf
 * @param {number} [requests]
 * @param {{ parallel?: boolean, batchGapMs?: number, endMs?: number }} [options]
 * @returns {Promise<Array>}
 */
export async function loadAlgoBotLiteHistory(
  symbol,
  tf,
  requests,
  options = {}
) {
  const api = globalThis.window?.cryptoTerminalDesktop?.algoTrading;
  const exchangeId = String(getActiveExchangeId() || "bybit").toLowerCase();
  const skipIpc = Number.isFinite(options.endMs);
  if (
    !skipIpc &&
    exchangeId === "bybit" &&
    typeof api?.fetchKlineHistoryDeep === "function"
  ) {
    try {
      const result = await api.fetchKlineHistoryDeep({
        symbol,
        tf,
        requests,
        batchGapMs: options.batchGapMs ?? 0
      });
      if (result?.ok && Array.isArray(result.candles) && result.candles.length) {
        return result.candles;
      }
      console.warn(
        "[algo-trading] lite kline ipc:",
        result?.message || "empty"
      );
    } catch (err) {
      console.warn("[algo-trading] lite kline ipc:", err?.message || err);
    }
  }
  return loadMarketHistory(symbol, tf, requests, options);
}
