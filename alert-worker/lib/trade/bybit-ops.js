import crypto from "node:crypto";
import { loadTradeKeys } from "./keys-store.js";

const RECV_WINDOW = "20000";
const TIMEOUT_MS = 12000;

function signPayload(secret, payload) {
  return crypto.createHmac("sha256", secret).update(payload).digest("hex");
}

function stripSymbol(symbol) {
  return String(symbol || "")
    .replace(/\.P$/i, "")
    .trim()
    .toUpperCase();
}

function displayTicker(symbol) {
  const base = stripSymbol(symbol);
  if (/USDT$/i.test(base)) {
    return `${base}.P`;
  }
  return base;
}

function apiBases(testnet) {
  return testnet
    ? ["https://api-testnet.bybit.com"]
    : ["https://api.bybit.com", "https://api.bytick.com"];
}

async function fetchJson(url, options) {
  const ac = new AbortController();
  const t = setTimeout(() => ac.abort(), TIMEOUT_MS);
  try {
    const res = await fetch(url, {
      ...options,
      signal: ac.signal
    });
    const text = await res.text();
    let data = null;
    try {
      data = text ? JSON.parse(text) : null;
    } catch {
      data = null;
    }
    return { httpStatus: res.status, data, text };
  } finally {
    clearTimeout(t);
  }
}

function fail(message) {
  return { ok: false, message: String(message || "error") };
}

export async function signedGet(path, query) {
  const creds = loadTradeKeys("bybit");
  if (!creds) {
    return fail("API keys not configured");
  }
  const params = new URLSearchParams(query || {});
  const queryString = params.toString();
  const timestamp = String(Date.now());
  const signBase = `${timestamp}${creds.apiKey}${RECV_WINDOW}${queryString}`;
  const headers = {
    "X-BAPI-API-KEY": creds.apiKey,
    "X-BAPI-SIGN": signPayload(creds.apiSecret, signBase),
    "X-BAPI-TIMESTAMP": timestamp,
    "X-BAPI-RECV-WINDOW": RECV_WINDOW
  };
  let last = "Bybit API error";
  for (const base of apiBases(creds.testnet)) {
    const url = queryString ? `${base}${path}?${queryString}` : `${base}${path}`;
    try {
      const { data, httpStatus } = await fetchJson(url, { method: "GET", headers });
      if (data?.retCode === 0) {
        return { ok: true, data };
      }
      last = data?.retMsg || `Bybit HTTP ${httpStatus}`;
    } catch (err) {
      last = err?.message || "fetch failed";
    }
  }
  return fail(last);
}

export async function signedPost(path, body) {
  const creds = loadTradeKeys("bybit");
  if (!creds) {
    return fail("API keys not configured");
  }
  const json = JSON.stringify(body || {});
  const timestamp = String(Date.now());
  const signBase = `${timestamp}${creds.apiKey}${RECV_WINDOW}${json}`;
  const headers = {
    "Content-Type": "application/json",
    "X-BAPI-API-KEY": creds.apiKey,
    "X-BAPI-SIGN": signPayload(creds.apiSecret, signBase),
    "X-BAPI-TIMESTAMP": timestamp,
    "X-BAPI-RECV-WINDOW": RECV_WINDOW
  };
  let last = "Bybit API error";
  for (const base of apiBases(creds.testnet)) {
    try {
      const { data, httpStatus } = await fetchJson(`${base}${path}`, {
        method: "POST",
        headers,
        body: json
      });
      if (data?.retCode === 0) {
        return { ok: true, data };
      }
      last = data?.retMsg || `Bybit HTTP ${httpStatus}`;
    } catch (err) {
      last = err?.message || "fetch failed";
    }
  }
  return fail(last);
}

async function publicGet(path, query) {
  const creds = loadTradeKeys("bybit");
  const testnet = !!creds?.testnet;
  const params = new URLSearchParams(query || {});
  const qs = params.toString();
  let last = "Bybit API error";
  for (const base of apiBases(testnet)) {
    const url = qs ? `${base}${path}?${qs}` : `${base}${path}`;
    try {
      const { data, httpStatus } = await fetchJson(url, { method: "GET" });
      if (data?.retCode === 0) {
        return { ok: true, data };
      }
      last = data?.retMsg || `Bybit HTTP ${httpStatus}`;
    } catch (err) {
      last = err?.message || "fetch failed";
    }
  }
  return fail(last);
}

function pickUsdtBalance(payload) {
  const list = payload?.result?.list;
  if (!Array.isArray(list) || !list.length) {
    return null;
  }
  const coins = list[0]?.coin;
  if (!Array.isArray(coins)) {
    return null;
  }
  const usdt = coins.find((row) => row.coin === "USDT");
  if (!usdt) {
    return null;
  }
  return String(
    usdt.equity ?? usdt.walletBalance ?? usdt.availableToWithdraw ?? "0"
  );
}

export function mapPositionRow(row) {
  const size = Number(row?.size);
  if (!Number.isFinite(size) || size === 0) {
    return null;
  }
  const pnl = Number(row?.unrealisedPnl);
  const volume = Number(row?.positionValue);
  const volumeUsdt =
    Number.isFinite(volume) && volume > 0
      ? volume
      : Math.abs(size * Number(row?.markPrice || row?.avgPrice || 0));
  return {
    symbol: row.symbol,
    ticker: displayTicker(row.symbol),
    pnl: Number.isFinite(pnl) ? pnl : 0,
    volumeUsdt: Number.isFinite(volumeUsdt) ? volumeUsdt : 0,
    side: row.side || "",
    size: String(row.size),
    avgPrice: Number(row?.avgPrice || row?.entryPrice) || 0,
    markPrice: Number(row?.markPrice) || 0,
    liqPrice: Number(row?.liqPrice) || 0,
    leverage: String(row?.leverage || "").trim(),
    tradeMode: Number(row?.tradeMode ?? 0),
    marginMode: Number(row?.tradeMode ?? 0) === 1 ? "isolated" : "cross",
    stopLoss: Number(row?.stopLoss) || 0,
    takeProfit: Number(row?.takeProfit) || 0,
    positionIdx: row.positionIdx ?? 0
  };
}

export function mapOrderRow(row) {
  const status = String(row?.orderStatus || "");
  if (!["New", "PartiallyFilled", "Untriggered", "Triggered"].includes(status)) {
    return null;
  }
  const side = String(row?.side || "");
  if (side !== "Buy" && side !== "Sell") {
    return null;
  }
  const orderType = String(row?.orderType || "");
  const triggerPrice = Number(row?.triggerPrice);
  const hasTrigger = Number.isFinite(triggerPrice) && triggerPrice > 0;
  const limitPrice = Number(row?.price);
  const isReduceOnly = row?.reduceOnly === true || row?.reduceOnly === "true";
  const orderFilter = String(row?.orderFilter || "").trim();
  const stopOrderType = String(row?.stopOrderType || "").trim();
  if (
    isReduceOnly &&
    (orderFilter === "tpslOrder" ||
      stopOrderType === "TakeProfit" ||
      stopOrderType === "StopLoss" ||
      stopOrderType === "TrailingStop")
  ) {
    return null;
  }
  let label = "";
  let orderKind = "";
  if (hasTrigger && orderType === "Market") {
    label = side === "Buy" ? "Buy Stop" : "Sell Stop";
    orderKind = "stop";
  } else if (orderType === "Limit" && Number.isFinite(limitPrice) && limitPrice > 0) {
    label = side === "Buy" ? "Buy Limit" : "Sell Limit";
    orderKind = "limit";
  } else {
    return null;
  }
  const shortLabel =
    orderKind === "stop"
      ? side === "Buy"
        ? "BST"
        : "SST"
      : side === "Buy"
        ? "BLT"
        : "SLT";
  const displayPrice = orderKind === "stop" ? triggerPrice : limitPrice;
  const qty = Number(row?.qty);
  const created = Number(row?.createdTime);
  const volumeUsdt =
    Number.isFinite(qty) && Number.isFinite(displayPrice)
      ? qty * displayPrice
      : 0;
  return {
    orderId: row.orderId,
    symbol: row.symbol,
    ticker: displayTicker(row.symbol),
    price: displayPrice,
    side,
    label,
    shortLabel,
    orderKind,
    badgeSide: side === "Buy" ? "long" : "short",
    reduceOnly: isReduceOnly,
    qty: Number.isFinite(qty) ? qty : 0,
    volumeUsdt,
    orderType,
    createdAt: Number.isFinite(created) ? created : null
  };
}

function decimalsFromStep(stepStr) {
  const s = String(stepStr || "");
  const dot = s.indexOf(".");
  return dot === -1 ? 0 : s.length - dot - 1;
}

function formatQtyValue(qty, decimals) {
  return Number(qty).toFixed(Math.max(0, decimals));
}

function qtyFromVolumeUsdt(volumeUsdt, price, rules) {
  const vol = Number(volumeUsdt);
  const p = Number(price);
  if (!Number.isFinite(vol) || vol <= 0 || !Number.isFinite(p) || p <= 0) {
    return null;
  }
  const raw = vol / p;
  const step = Number(rules?.qtyStep);
  const minQty = Number(rules?.minOrderQty);
  if (Number.isFinite(step) && step > 0) {
    const min = Number.isFinite(minQty) && minQty > 0 ? minQty : step;
    const q = Math.floor(raw / step) * step;
    if (q + 1e-12 < min) {
      return null;
    }
    return formatQtyValue(q, decimalsFromStep(String(rules.qtyStep)));
  }
  return String(raw);
}

function formatPrice(price, refPrice) {
  const n = Number(price);
  if (!Number.isFinite(n) || n <= 0) {
    return null;
  }
  const ref = Number(refPrice);
  let decimals = 4;
  if (Number.isFinite(ref) && ref > 0) {
    const parts = String(ref).split(".");
    decimals = Math.min(8, Math.max(2, (parts[1] || "").length));
  }
  return n.toFixed(decimals);
}

const instrumentCache = new Map();

async function getInstrumentRules(symbol) {
  const sym = stripSymbol(symbol);
  const hit = instrumentCache.get(sym);
  if (hit && Date.now() - hit.at < 3600000) {
    return hit.rules;
  }
  const result = await publicGet("/v5/market/instruments-info", {
    category: "linear",
    symbol: sym
  });
  const row = result.ok ? result.data?.result?.list?.[0] : null;
  const lot = row?.lotSizeFilter || {};
  const rules = {
    qtyStep: lot.qtyStep,
    minOrderQty: lot.minOrderQty,
    maxLeverage: Number(row?.leverageFilter?.maxLeverage) || 100
  };
  instrumentCache.set(sym, { at: Date.now(), rules });
  return rules;
}

export async function getWalletBalance() {
  const result = await signedGet("/v5/account/wallet-balance", {
    accountType: "UNIFIED"
  });
  if (!result.ok) {
    return result;
  }
  return { ok: true, usdt: pickUsdtBalance(result.data) ?? "0" };
}

export async function fetchPositionListRaw() {
  return signedGet("/v5/position/list", {
    category: "linear",
    settleCoin: "USDT"
  });
}

export async function getPositions() {
  const result = await fetchPositionListRaw();
  if (!result.ok) {
    return result;
  }
  const list = result.data?.result?.list;
  const positions = Array.isArray(list)
    ? list.map(mapPositionRow).filter(Boolean)
    : [];
  return { ok: true, positions };
}

export async function getOpenOrders() {
  const result = await signedGet("/v5/order/realtime", {
    category: "linear",
    settleCoin: "USDT",
    openOnly: "0",
    limit: "50"
  });
  if (!result.ok) {
    return result;
  }
  const list = result.data?.result?.list;
  const orders = Array.isArray(list)
    ? list.map(mapOrderRow).filter(Boolean)
    : [];
  orders.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
  return { ok: true, orders };
}

export async function getPosition(symbol) {
  const sym = stripSymbol(symbol);
  const result = await signedGet("/v5/position/list", {
    category: "linear",
    symbol: sym
  });
  if (!result.ok) {
    return result;
  }
  const list = result.data?.result?.list;
  const row = Array.isArray(list)
    ? list.find((item) => Number(item?.size) > 0)
    : null;
  return { ok: true, position: row ? mapPositionRow(row) : null };
}

export async function closePosition(symbol) {
  const pos = await getPosition(symbol);
  if (!pos.ok) {
    return pos;
  }
  if (!pos.position) {
    return fail("Нет открытой позиции");
  }
  const side = pos.position.side === "Buy" ? "Sell" : "Buy";
  return signedPost("/v5/order/create", {
    category: "linear",
    symbol: stripSymbol(symbol),
    side,
    orderType: "Market",
    qty: String(pos.position.size),
    reduceOnly: true,
    timeInForce: "IOC",
    positionIdx: pos.position.positionIdx ?? 0
  });
}

export async function cancelOrder(symbol, orderId) {
  return signedPost("/v5/order/cancel", {
    category: "linear",
    symbol: stripSymbol(symbol),
    orderId
  });
}

export async function setPositionStop(symbol, target, price) {
  const pos = await getPosition(symbol);
  if (!pos.ok) {
    return pos;
  }
  if (!pos.position) {
    return fail("Нет открытой позиции");
  }
  const priceStr = formatPrice(price, pos.position.avgPrice);
  if (!priceStr) {
    return fail("Некорректная цена");
  }
  const body = {
    category: "linear",
    symbol: stripSymbol(symbol),
    positionIdx: pos.position.positionIdx ?? 0,
    tpslMode: "Full"
  };
  const t = String(target || "").toLowerCase();
  if (t === "sl" || t === "stoploss" || t === "stop-loss") {
    body.stopLoss = priceStr;
  } else {
    body.takeProfit = priceStr;
  }
  const result = await signedPost("/v5/position/trading-stop", body);
  if (!result.ok) {
    return result;
  }
  const next = await getPosition(symbol);
  return next.ok ? { ok: true, position: next.position } : result;
}

export async function cancelPositionStop(symbol, target) {
  const pos = await getPosition(symbol);
  if (!pos.ok) {
    return pos;
  }
  if (!pos.position) {
    return fail("Нет открытой позиции");
  }
  const body = {
    category: "linear",
    symbol: stripSymbol(symbol),
    positionIdx: pos.position.positionIdx ?? 0,
    tpslMode: "Full"
  };
  const t = String(target || "").toLowerCase();
  if (t === "sl" || t === "stoploss" || t === "stop-loss") {
    body.stopLoss = "0";
  } else {
    body.takeProfit = "0";
  }
  return signedPost("/v5/position/trading-stop", body);
}

export async function placeOrder(payload) {
  const sym = stripSymbol(payload?.symbol);
  const kind = String(payload?.kind || "").toLowerCase();
  const price = Number(payload?.price);
  const volumeUsdt = Number(payload?.volumeUsdt);
  const markPrice = Number(payload?.markPrice);
  if (!sym) {
    return fail("Symbol required");
  }
  if (!Number.isFinite(price) || price <= 0) {
    return fail("Invalid price");
  }
  if (!Number.isFinite(volumeUsdt) || volumeUsdt <= 0) {
    return fail("Invalid volume");
  }
  const qtyStr = qtyFromVolumeUsdt(
    volumeUsdt,
    price,
    await getInstrumentRules(sym)
  );
  if (!qtyStr || Number(qtyStr) <= 0) {
    return fail("Volume too small");
  }
  const priceStr = formatPrice(price, markPrice || price);
  const refMark = Number.isFinite(markPrice) && markPrice > 0 ? markPrice : price;
  const triggerDirection = price > refMark ? 1 : 2;
  const body = {
    category: "linear",
    symbol: sym,
    qty: qtyStr,
    timeInForce: "GTC"
  };
  if (kind === "sell-limit") {
    body.side = "Sell";
    body.orderType = "Limit";
    body.price = priceStr;
  } else if (kind === "buy-limit") {
    body.side = "Buy";
    body.orderType = "Limit";
    body.price = priceStr;
  } else if (kind === "buy-stop") {
    body.side = "Buy";
    body.orderType = "Market";
    body.triggerPrice = priceStr;
    body.triggerDirection = triggerDirection;
    body.triggerBy = "MarkPrice";
  } else if (kind === "sell-stop") {
    body.side = "Sell";
    body.orderType = "Market";
    body.triggerPrice = priceStr;
    body.triggerDirection = triggerDirection;
    body.triggerBy = "MarkPrice";
  } else {
    return fail("Unknown order kind");
  }
  return signedPost("/v5/order/create", body);
}

export async function amendOrder(payload) {
  const body = {
    category: "linear",
    symbol: stripSymbol(payload?.symbol),
    orderId: payload?.orderId
  };
  if (payload?.price) {
    body.price = String(payload.price);
  }
  if (payload?.triggerPrice) {
    body.triggerPrice = String(payload.triggerPrice);
  }
  if (payload?.qty) {
    body.qty = String(payload.qty);
  }
  return signedPost("/v5/order/amend", body);
}

async function tickerLast(symbol) {
  const result = await publicGet("/v5/market/tickers", {
    category: "linear",
    symbol: stripSymbol(symbol)
  });
  const row = result.ok ? result.data?.result?.list?.[0] : null;
  return Number(row?.lastPrice || row?.markPrice) || 0;
}

export async function openPosition(symbol, side, volumeUsdt, options = {}) {
  const sym = stripSymbol(symbol);
  const sideNorm = String(side || "").trim() === "Sell" ? "Sell" : "Buy";
  const vol = Number(volumeUsdt);
  if (!sym) {
    return fail("Symbol required");
  }
  if (!Number.isFinite(vol) || vol <= 0) {
    return fail("Invalid volume");
  }
  const hinted = Number(options?.markPrice || options?.price);
  const last =
    Number.isFinite(hinted) && hinted > 0 ? hinted : await tickerLast(sym);
  const qtyStr = qtyFromVolumeUsdt(vol, last, await getInstrumentRules(sym));
  if (!qtyStr || Number(qtyStr) <= 0) {
    return fail("Volume too small");
  }
  return signedPost("/v5/order/create", {
    category: "linear",
    symbol: sym,
    side: sideNorm,
    orderType: "Market",
    qty: qtyStr,
    timeInForce: "IOC"
  });
}

export async function getSymbolPositionSettings(symbol) {
  const sym = stripSymbol(symbol);
  const [posResult, rules] = await Promise.all([
    signedGet("/v5/position/list", { category: "linear", symbol: sym }),
    getInstrumentRules(sym)
  ]);
  if (!posResult.ok) {
    return posResult;
  }
  const row = posResult.data?.result?.list?.[0];
  const leverage = Math.max(1, Math.round(Number(row?.leverage) || 10));
  return {
    ok: true,
    leverage,
    marginMode: Number(row?.tradeMode ?? 0) === 1 ? "isolated" : "cross",
    maxLeverage: rules.maxLeverage || 100
  };
}

export async function applySymbolPositionSettings(symbol, settings) {
  const current = await getSymbolPositionSettings(symbol);
  if (!current.ok) {
    return current;
  }
  const marginMode =
    String(settings?.marginMode || "").toLowerCase() === "isolated"
      ? "isolated"
      : "cross";
  const leverage = Math.max(
    1,
    Math.round(Number(settings?.leverage))
  );
  if (!Number.isFinite(leverage)) {
    return fail("Invalid leverage");
  }
  const levStr = String(Math.min(leverage, current.maxLeverage));
  const marginChanged = current.marginMode !== marginMode;
  const leverageChanged = String(current.leverage) !== levStr;
  if (!marginChanged && !leverageChanged) {
    return { ok: true };
  }
  if (marginChanged) {
    const sw = await signedPost("/v5/position/switch-isolated", {
      category: "linear",
      symbol: stripSymbol(symbol),
      tradeMode: marginMode === "isolated" ? 1 : 0,
      buyLeverage: levStr,
      sellLeverage: levStr
    });
    if (sw.ok || !leverageChanged) {
      return sw;
    }
  }
  return signedPost("/v5/position/set-leverage", {
    category: "linear",
    symbol: stripSymbol(symbol),
    buyLeverage: levStr,
    sellLeverage: levStr
  });
}

export async function pingBybit() {
  const started = Date.now();
  const result = await publicGet("/v5/market/time", {});
  if (!result.ok) {
    return result;
  }
  return { ok: true, pingMs: Date.now() - started };
}
