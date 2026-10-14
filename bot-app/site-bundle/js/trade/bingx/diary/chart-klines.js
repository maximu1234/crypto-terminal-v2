/**
 * BingX diary public klines only.
 */
import {
  toBingxSymbol
} from "../../../exchanges/symbol.js?v=b2916b67";

import {
  fetchBingx
} from "../../../exchanges/bingx/fetch.js?v=a76bddd0";

import {
  tfToBingxInterval
} from "../../../exchanges/bingx/intervals.js?v=ce5c9eb7";

export async function diaryFetchKlineBatch(symbol, tf, end) {
  try {
    const params = new URLSearchParams({
      symbol: toBingxSymbol(symbol),
      interval: tfToBingxInterval(tf),
      limit: "1000"
    });

    if (Number.isFinite(end) && end > 0) {
      params.set("endTime", String(end));
    }

    const json = await fetchBingx(
      `/openApi/swap/v3/quote/klines?${params}`
    );

    const rows = Array.isArray(json?.data) ? json.data : [];

    return rows
      .map((row) => {
        const ts = Number(row.time || row.openTime || row.t || 0);
        return {
          timeMs: ts > 1e12 ? ts : ts * 1000,
          open: Number(row.open),
          high: Number(row.high),
          low: Number(row.low),
          close: Number(row.close),
          volume: Number(row.volume || row.vol || 0) || 0
        };
      })
      .filter((row) => row.timeMs > 0);
  } catch {
    return null;
  }
}
