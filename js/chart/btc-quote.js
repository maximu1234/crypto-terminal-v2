/**
 * Terminal chart quoted in BTC: ETHUSDT / BTCUSDT on each bar.
 * Stored candles stay in USDT. Only the painted series uses the ratio.
 */
import {
  getActiveExchangeId
} from "../market-api.js?v=509a465f";
import {
  subscribeKline
} from "../market-ws.js?v=fe5ab981";

let active = false;
let cacheKey = "";
/** @type {Array<{time:number,open:number,high:number,low:number,close:number}>} */
let btcCandles = [];
/** @type {Map<number, {time:number,open:number,high:number,low:number,close:number}>} */
let btcByTime = new Map();
let liveUnsub = null;
let liveTf = "";

export function isBtcQuoteActive() {
  return active;
}

export function setBtcQuoteActive(on) {
  active = !!on;
  if (!active) {
    stopBtcQuoteLive();
  }
}

/** "ETH/BTC", or "" when the symbol is not a non-BTC USDT pair. */
export function btcQuoteButtonLabel(symbol) {
  const base = usdtBase(symbol);
  return base ? `${base}/BTC` : "";
}

export function usdtBase(symbol) {
  const s = String(symbol || "").replace(/\.P$/i, "").trim().toUpperCase();
  if (!s.endsWith("USDT")) {
    return "";
  }
  const base = s.slice(0, -4);
  if (!base || base === "BTC") {
    return "";
  }
  return base;
}

function isOhlc(bar) {
  return !!(
    bar &&
    Number.isFinite(bar.time) &&
    Number.isFinite(bar.open) &&
    Number.isFinite(bar.high) &&
    Number.isFinite(bar.low) &&
    Number.isFinite(bar.close) &&
    bar.open > 0 &&
    bar.high > 0 &&
    bar.low > 0 &&
    bar.close > 0
  );
}

function ratioBar(coin, btc) {
  const o = coin.open / btc.open;
  const c = coin.close / btc.close;
  const samples = [
    o,
    c,
    coin.high / btc.low,
    coin.high / btc.high,
    coin.low / btc.low,
    coin.low / btc.high
  ].filter((n) => Number.isFinite(n) && n > 0);
  if (!samples.length) {
    return null;
  }
  return {
    ...coin,
    open: o,
    close: c,
    high: Math.max(...samples),
    low: Math.min(...samples)
  };
}

function indexBtc(rows) {
  const sorted = (Array.isArray(rows) ? rows : [])
    .filter(isOhlc)
    .slice()
    .sort((a, b) => a.time - b.time);
  btcCandles = sorted;
  btcByTime = new Map();
  for (const bar of sorted) {
    btcByTime.set(bar.time, bar);
  }
}

function upsertBtcBar(bar) {
  if (!isOhlc(bar)) {
    return;
  }
  const prev = btcByTime.get(bar.time);
  if (prev) {
    prev.open = bar.open;
    prev.high = bar.high;
    prev.low = bar.low;
    prev.close = bar.close;
    return;
  }
  const row = {
    time: bar.time,
    open: bar.open,
    high: bar.high,
    low: bar.low,
    close: bar.close
  };
  btcByTime.set(row.time, row);
  btcCandles.push(row);
  if (btcCandles.length > 1 && btcCandles[btcCandles.length - 2].time > row.time) {
    btcCandles.sort((a, b) => a.time - b.time);
  }
}

/** Last BTC bar at or before `time`. */
export function btcBarAt(time) {
  const exact = btcByTime.get(time);
  if (exact) {
    return exact;
  }
  let best = null;
  for (const bar of btcCandles) {
    if (bar.time <= time) {
      best = bar;
    } else {
      break;
    }
  }
  return best;
}

export function lastBtcClose() {
  const last = btcCandles[btcCandles.length - 1];
  return last && last.close > 0 ? last.close : 0;
}

/** Chart price → USDT (orders and position math). */
export function seriesPriceToUsdt(price) {
  const n = Number(price);
  if (!active || !(n > 0)) {
    return n;
  }
  const btc = lastBtcClose();
  return btc > 0 ? n * btc : n;
}

/** USDT price → chart price (lines drawn on the BTC scale). */
export function usdtPriceToSeries(price) {
  const n = Number(price);
  if (!active || !(n > 0)) {
    return n;
  }
  const btc = lastBtcClose();
  return btc > 0 ? n / btc : n;
}

export function quoteCandlesToBtc(candles) {
  if (!active || !btcCandles.length || !Array.isArray(candles)) {
    return candles || [];
  }
  let changed = false;
  const out = candles.map((bar) => {
    if (!isOhlc(bar)) {
      return bar;
    }
    const btc = btcBarAt(bar.time);
    if (!btc) {
      return bar;
    }
    const next = ratioBar(bar, btc);
    if (!next) {
      return bar;
    }
    changed = true;
    return next;
  });
  return changed ? out : candles;
}

export function quoteLiveBar(bar) {
  if (!active || !isOhlc(bar)) {
    return bar;
  }
  const btc = btcBarAt(bar.time);
  if (!btc) {
    return bar;
  }
  return ratioBar(bar, btc) || bar;
}

export function lastOhlcClose(candles) {
  if (!Array.isArray(candles)) {
    return null;
  }
  for (let i = candles.length - 1; i >= 0; i--) {
    const close = Number(candles[i]?.close);
    const open = Number(candles[i]?.open);
    if (Number.isFinite(close) && close > 0 && Number.isFinite(open) && open > 0) {
      return close;
    }
  }
  return null;
}

export async function ensureBtcQuoteCandles(host) {
  const tf = String(host?.currentTF || "60");
  const ex = String(
    host?.getActiveExchangeId?.() || getActiveExchangeId() || "bybit"
  ).toLowerCase();
  const key = `${ex}|${tf}`;
  if (cacheKey === key && btcCandles.length) {
    return true;
  }
  const requests = Math.max(
    1,
    Number(host?.terminalHistoryInitialRequests?.()) || 5
  );
  let rows = [];
  try {
    rows = await host.loadMarketHistory("BTCUSDT", tf, requests, {
      parallel: true,
      batchGapMs: 0
    });
  } catch {
    rows = [];
  }
  if (!Array.isArray(rows) || !rows.some(isOhlc)) {
    return false;
  }
  cacheKey = key;
  indexBtc(rows);
  return true;
}

export function syncBtcQuoteLive(tf) {
  const nextTf = String(tf || "");
  if (!active || !nextTf) {
    stopBtcQuoteLive();
    return;
  }
  if (liveUnsub && liveTf === nextTf) {
    return;
  }
  stopBtcQuoteLive();
  liveTf = nextTf;
  try {
    liveUnsub = subscribeKline("BTCUSDT", nextTf, (candle) => {
      upsertBtcBar(candle);
    });
  } catch {
    liveUnsub = null;
    liveTf = "";
  }
}

function stopBtcQuoteLive() {
  try {
    liveUnsub?.();
  } catch {
    /* ignore */
  }
  liveUnsub = null;
  liveTf = "";
}
