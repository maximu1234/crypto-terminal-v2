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

const TOKEN_KEY = "mc_trade_token_v1";

function workerOrigin() {
  return normalizeAlertWorkerBaseUrl(ALERT_WORKER_URL || "");
}

function readToken() {
  try {
    return String(sessionStorage.getItem(TOKEN_KEY) || "").trim();
  } catch {
    return "";
  }
}

function writeToken(token) {
  try {
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

export async function ensureTradeToken() {
  if (readToken()) {
    return readToken();
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
  const token = await ensureTradeToken();
  if (!token) {
    return { ok: false, message: "Нет сессии входа" };
  }
  const res = await fetch(`${origin}/trade/rpc`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`
    },
    body: JSON.stringify({ method, payload: payload || {} })
  });
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
    const url = `${origin.replace(/^http/, "ws")}/trade/stream?access_token=${encodeURIComponent(token)}`;
    ws = new WebSocket(url);
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
