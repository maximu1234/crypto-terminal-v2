/**
 * Web-only Bybit trading client → Railway /trade/rpc.
 * Does not run in desktop (preload IPC stays as-is).
 */
import {
  ALERT_WORKER_URL
} from "../supabase-env.js?v=5";
import {
  normalizeAlertWorkerBaseUrl
} from "../alert-worker-url.js?v=2";

const TOKEN_KEY = "mc_trade_token_v2";
const TOKEN_KEY_LEGACY = "mc_trade_token_v1";

function workerOrigin() {
  return normalizeAlertWorkerBaseUrl(ALERT_WORKER_URL || "");
}

function decodeTokenPayload(token) {
  try {
    const parts = String(token || "").split(".");
    if (parts.length !== 3 || parts[0] !== "v1") {
      return null;
    }
    const pad = parts[1].length % 4 === 0 ? "" : "=".repeat(4 - (parts[1].length % 4));
    const json = atob(parts[1].replace(/-/g, "+").replace(/_/g, "/") + pad);
    const payload = JSON.parse(json);
    if (!payload || typeof payload !== "object") {
      return null;
    }
    return payload;
  } catch {
    return null;
  }
}

function storedTokenUsable() {
  const token = readToken();
  if (!token) {
    return "";
  }
  const payload = decodeTokenPayload(token);
  if (!payload || payload.typ !== "trade") {
    writeToken("");
    return "";
  }
  if (!Number.isFinite(payload.exp) || payload.exp * 1000 < Date.now() + 60_000) {
    writeToken("");
    return "";
  }
  return token;
}

function readToken() {
  try {
    sessionStorage.removeItem(TOKEN_KEY_LEGACY);
    return String(sessionStorage.getItem(TOKEN_KEY) || "").trim();
  } catch {
    return "";
  }
}

function writeToken(token) {
  try {
    sessionStorage.removeItem(TOKEN_KEY_LEGACY);
    if (token) {
      sessionStorage.setItem(TOKEN_KEY, token);
    } else {
      sessionStorage.removeItem(TOKEN_KEY);
    }
  } catch {
    /* ignore */
  }
}

let tokenPromise = null;

export async function ensureTradeToken(forceRefresh = false) {
  if (!forceRefresh) {
    const existing = storedTokenUsable();
    if (existing) {
      return existing;
    }
  }
  if (!tokenPromise) {
    tokenPromise = fetch("/api/site-gate/session", {
      credentials: "same-origin"
    })
      .then((res) => res.json())
      .then((data) => {
        if (data?.ok && data.tradeToken) {
          writeToken(data.tradeToken);
          return data.tradeToken;
        }
        writeToken("");
        return "";
      })
      .catch(() => "")
      .finally(() => {
        tokenPromise = null;
      });
  }
  return tokenPromise;
}

async function rpc(method, payload) {
  const origin = workerOrigin();
  if (!origin) {
    return { ok: false, message: "ALERT_WORKER_URL не задан" };
  }
  let token = await ensureTradeToken();
  if (!token) {
    return { ok: false, message: "Нет сессии входа" };
  }
  const send = (access) =>
    fetch(`${origin}/trade/rpc`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${access}`
      },
      body: JSON.stringify({ method, payload: payload || {} })
    });
  let res = await send(token);
  if (res.status === 401) {
    writeToken("");
    tokenPromise = null;
    token = await ensureTradeToken(true);
    if (!token) {
      return { ok: false, message: "Нет сессии входа" };
    }
    res = await send(token);
  }
  const data = await res.json().catch(() => ({}));
  if (!res.ok && data && typeof data === "object") {
    return {
      ok: false,
      message: data.message || data.error || `HTTP ${res.status}`
    };
  }
  return data;
}

export function createWebTradingApi() {
  const streamListeners = new Set();
  let ws = null;
  let reconnectTimer = null;

  function emit(payload) {
    for (const fn of streamListeners) {
      try {
        fn(payload);
      } catch (err) {
        console.warn("web trading stream", err);
      }
    }
  }

  async function connectStream() {
    const origin = workerOrigin();
    const token = await ensureTradeToken();
    if (!origin || !token || typeof WebSocket === "undefined") {
      return;
    }
    try {
      ws?.close();
    } catch {
      /* ignore */
    }
    const url = `${origin.replace(/^http/, "ws")}/trade/stream`;
    ws = new WebSocket(url);
    ws.onopen = () => {
      try {
        ws.send(JSON.stringify({ type: "auth", token }));
      } catch {
        /* ignore */
      }
    };
    ws.onmessage = (event) => {
      try {
        emit(JSON.parse(String(event.data || "{}")));
      } catch {
        /* ignore */
      }
    };
    ws.onclose = () => {
      ws = null;
      clearTimeout(reconnectTimer);
      reconnectTimer = setTimeout(() => {
        void connectStream();
      }, 3000);
    };
  }

  void connectStream();

  return {
    getStatus: (payload) => rpc("getStatus", payload),
    getRateLimitBackoffMs: () => rpc("getRateLimitBackoffMs"),
    setActiveExchange: () => rpc("setActiveExchange", { exchangeId: "bybit" }),
    saveKeys: (payload) => rpc("saveKeys", payload),
    clearKeys: (payload) => rpc("clearKeys", payload),
    getWalletBalance: (payload) => rpc("getWalletBalance", payload),
    getPositions: (options) => rpc("getPositions", options),
    getOpenOrders: (options) => rpc("getOpenOrders", options),
    getPosition: (symbol, options = {}) =>
      rpc("getPosition", { symbol, ...options }),
    closePosition: (symbol, options = {}) =>
      rpc("closePosition", { symbol, ...options }),
    cancelPositionStop: (symbol, target, options = {}) =>
      rpc("cancelPositionStop", { symbol, target, ...options }),
    setPositionStop: (symbol, target, price, options = {}) =>
      rpc("setPositionStop", { symbol, target, price, ...options }),
    placeOrder: (payload) => rpc("placeOrder", payload),
    cancelOrder: (symbol, orderId) =>
      rpc("cancelOrder", { symbol, orderId }),
    amendOrder: (payload) => rpc("amendOrder", payload),
    reconcileOrdersOnPositionOpen: (symbol, positionSide) =>
      rpc("reconcileOrdersOnPositionOpen", { symbol, positionSide }),
    reconcileOrdersOnPositionClose: (symbol) =>
      rpc("reconcileOrdersOnPositionClose", { symbol }),
    openPosition: (symbol, side, volumeUsdt, options = {}) =>
      rpc("openPosition", { symbol, side, volumeUsdt, ...options }),
    getSymbolPositionSettings: (symbol) =>
      rpc("getSymbolPositionSettings", { symbol }),
    applySymbolPositionSettings: (symbol, settings) =>
      rpc("applySymbolPositionSettings", { symbol, ...settings }),
    pingBybit: (payload) => rpc("pingBybit", payload),
    getClosedPnl: (payload) => rpc("getClosedPnl", payload),
    enrichClosedPnlTrades: () =>
      Promise.resolve({ ok: false, message: "Только в приложении" }),
    getTradeDiaryDetail: (payload) => rpc("getTradeDiaryDetail", payload),
    replayStream: () => rpc("replayStream"),
    getStreamSnapshot: () => rpc("getStreamSnapshot"),
    requestStreamSeed: () => rpc("requestStreamSeed"),
    generatePnlShareCard: () =>
      Promise.resolve({ ok: false, message: "Только в приложении" }),
    savePnlShareCard: () =>
      Promise.resolve({ ok: false, message: "Только в приложении" }),
    discardPnlShareCard: () =>
      Promise.resolve({ ok: false, message: "Только в приложении" }),
    onStream: (callback) => {
      if (typeof callback !== "function") {
        return () => {};
      }
      streamListeners.add(callback);
      return () => {
        streamListeners.delete(callback);
      };
    }
  };
}

export function installWebTradingShell() {
  if (window.cryptoTerminalDesktop?.isDesktop) {
    return;
  }
  const trading = createWebTradingApi();
  window.cryptoTerminalDesktop = {
    isDesktop: false,
    webTrading: true,
    trading
  };
}
