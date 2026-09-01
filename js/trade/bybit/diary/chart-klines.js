/**
 * Bybit diary public klines only.
 */
import {
  fetchBybit
} from "../../../bybit-fetch.js?v=18";

export async function diaryFetchKlineBatch(symbol, tf, end) {
  const path =
    `/v5/market/kline?category=linear&symbol=${encodeURIComponent(
      symbol
    )}&interval=${encodeURIComponent(
      tf
    )}&limit=1000&end=${end}`;

  try {
    const { json } = await fetchBybit(path, {
      sequential: true,
      retries: 2,
      timeoutMs: 10000
    });

    if (json.retCode === 0 && Array.isArray(json.result?.list)) {
      return json.result.list.map((row) => ({
        timeMs: Number(row[0]),
        open: Number(row[1]),
        high: Number(row[2]),
        low: Number(row[3]),
        close: Number(row[4]),
        volume: Number(row[5]) || 0
      })).filter((row) => row.timeMs > 0);
    }
  } catch {
    return null;
  }

  return null;
}
