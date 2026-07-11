import { readFileSync } from "fs";
import { dirname, join } from "path";
import { fileURLToPath } from "url";
import { normalizeBybitSymbol } from "./bybit-symbol.js";

const BASES = JSON.parse(
  readFileSync(
    join(
      dirname(fileURLToPath(import.meta.url)),
      "../bybit-api-bases.json"
    ),
    "utf8"
  )
);

function intervalFor(tf) {

  if (tf === "D") {
    return "D";
  }

  if (tf === "W") {
    return "W";
  }

  return String(tf || "60");

}

/**
 * Последние N свечей — для baseline при первой подписке worker.
 * @returns {Promise<Array<{ time:number, open:number, high:number, low:number, close:number }>>}
 */
export async function fetchRecentKlines(
  symbol,
  tf,
  limit = 2
) {

  const sym =
    normalizeBybitSymbol(symbol);

  if (!sym) {
    return [];
  }

  const interval =
    intervalFor(tf);
  const path =
    `/v5/market/kline?category=linear&symbol=${encodeURIComponent(sym)}` +
    `&interval=${encodeURIComponent(interval)}` +
    `&limit=${Math.max(1, Math.min(limit, 10))}`;

  let lastErr = null;

  for (const base of BASES) {

    try {
      const res = await fetch(
        `${base}${path}`,
        {
          headers: {
            Accept: "application/json"
          }
        }
      );

      const json = await res.json();
      const rows =
        json?.result?.list;

      if (
        !Array.isArray(rows) ||
        !rows.length
      ) {
        return [];
      }

      const candles = rows.map(raw => ({
        time: Number(raw[0]) / 1000,
        open: Number(raw[1]),
        high: Number(raw[2]),
        low: Number(raw[3]),
        close: Number(raw[4])
      })).filter(c =>
        Number.isFinite(c.close)
      );

      candles.sort(
        (a, b) => a.time - b.time
      );

      return candles;

    } catch (err) {
      lastErr = err;
    }

  }

  if (lastErr) {
    console.warn(
      "fetchRecentKlines:",
      sym,
      interval,
      lastErr.message
    );
  }

  return [];

}
