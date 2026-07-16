/**
 * BingX private WebSocket — listenKey account stream (main process only).
 *
 * ACCOUNT_UPDATE / ORDER_TRADE_UPDATE use compact field names (s/pa/ps, X/i/o).
 * Cross margin often pushes balance-only ACCOUNT_UPDATE (no a.P) — callers must
 * REST-reconcile on "account" topic when position rows are empty.
 */
const { getCredentials } = require("./exchange-credentials.cjs");
const {
  signedRequest,
  decodeWsMessage,
  normalizeBingxWsPositionRow,
  normalizeBingxWsOrderRow,
  toCanonicalSymbol
} = require("./bingx-rest.cjs");

let WsConstructor = null;
try {
  WsConstructor = require("ws");
} catch {
  /* global WebSocket in Electron main */
}

const LISTEN_KEY_PATH = "/openApi/user/auth/userDataStream";
/* Live and VST share this WS endpoint; account is selected by listenKey. */
const WS_BASE_LIVE = "wss://open-api-swap.bingx.com/swap-market";
const WS_BASE_VST = "wss://open-api-swap.bingx.com/swap-market";
const KEEPALIVE_MS = 30 * 60 * 1000;

function resolveWsBase(creds) {
  return creds?.testnet ? WS_BASE_VST : WS_BASE_LIVE;
}

function getWsConstructor() {
  if (WsConstructor) {
    return WsConstructor;
  }
  if (typeof WebSocket !== "undefined") {
    return WebSocket;
  }
  return null;
}

function attachSocket(ws, handlers) {
  const onOpen = handlers.onOpen;
  const onMessage = handlers.onMessage;
  const onClose = handlers.onClose;
  const onError = handlers.onError;

  if (WsConstructor) {
    ws.on("open", () => onOpen?.());
    ws.on("message", (data) => onMessage?.(data));
    ws.on("close", () => onClose?.());
    ws.on("error", (err) => onError?.(err));
    return;
  }

  ws.addEventListener?.("open", () => onOpen?.());
  ws.addEventListener?.("message", (ev) => onMessage?.(ev.data));
  ws.addEventListener?.("close", () => onClose?.());
  ws.addEventListener?.("error", (err) => onError?.(err));
}

async function createListenKey() {
  const result = await signedRequest("POST", LISTEN_KEY_PATH, {});
  if (!result.ok) {
    return result;
  }
  const listenKey =
    result.data?.listenKey ||
    result.data?.data?.listenKey ||
    result.data?.data;
  if (!listenKey || typeof listenKey !== "string") {
    return { ok: false, message: "No listenKey in response" };
  }
  return { ok: true, listenKey };
}

async function extendListenKey(listenKey) {
  if (!listenKey) {
    return { ok: false, message: "listenKey required" };
  }
  return signedRequest("PUT", LISTEN_KEY_PATH, { listenKey });
}

function normalizeMappedPositionSide(row) {
  const raw = String(row?.positionSide || row?.side || row?.ps || "")
    .trim()
    .toUpperCase();
  if (raw === "LONG" || raw === "BUY") {
    return "LONG";
  }
  if (raw === "SHORT" || raw === "SELL") {
    return "SHORT";
  }
  return "BOTH";
}

function positionStreamKey(row) {
  const sym = toCanonicalSymbol(row?.symbol ?? row?.s);
  if (!sym) {
    return "";
  }
  return `${sym}:${normalizeMappedPositionSide(row)}`;
}

function mapAccountPositions(positions) {
  if (!Array.isArray(positions)) {
    return [];
  }
  return positions.map(normalizeBingxWsPositionRow).filter(Boolean);
}

function mapAccountOrder(order) {
  return normalizeBingxWsOrderRow(order);
}

/**
 * @param {{ onTopic?: Function, onReady?: Function, onDisconnect?: Function }} handlers
 */
function connectBingxPrivateWs(handlers = {}) {
  const creds = getCredentials("bingx");
  if (!creds) {
    handlers.onDisconnect?.(
      "API keys not configured"
    );
    return {
      close() {}
    };
  }

  const Ws = getWsConstructor();
  if (!Ws) {
    handlers.onDisconnect?.("WebSocket unavailable");
    return {
      close() {}
    };
  }

  let closed = false;
  let socket = null;
  let listenKey = "";
  let keepaliveTimer = null;

  function clearKeepalive() {
    if (keepaliveTimer) {
      clearInterval(keepaliveTimer);
      keepaliveTimer = null;
    }
  }

  /**
   * BingX ACCOUNT_UPDATE is a delta (often a single position, or Cross balance-only).
   * Never invent size=0 tombstones for keys absent from the payload — that wiped
   * unrelated open positions.
   */
  function emitPositionDelta(mapped) {
    if (!mapped.length) {
      return;
    }
    handlers.onTopic?.("position", mapped);
  }

  async function connect() {
    if (closed) {
      return;
    }

    const keyResult = await createListenKey();
    if (keyResult?.ok === false) {
      handlers.onDisconnect?.(
        keyResult.message || "listen key failed"
      );
      return;
    }

    listenKey = keyResult.listenKey;
    const wsBase = resolveWsBase(creds);
    const url = `${wsBase}?listenKey=${encodeURIComponent(listenKey)}`;

    socket = new Ws(url);

    attachSocket(socket, {
      onOpen() {
        clearKeepalive();
        keepaliveTimer = setInterval(() => {
          void extendListenKey(listenKey);
        }, KEEPALIVE_MS);
        handlers.onReady?.();
      },

      onMessage(data) {
        const raw = decodeWsMessage(data);
        let msg;
        try {
          msg = JSON.parse(raw);
        } catch {
          return;
        }

        if (msg.ping || msg === "Ping" || raw === "Ping") {
          socket?.send?.(
            typeof msg === "object" && msg.ping
              ? JSON.stringify({ pong: msg.ping })
              : "Pong"
          );
          return;
        }

        const event = String(msg?.e || msg?.dataType || "");

        if (event === "ACCOUNT_UPDATE") {
          const mapped = mapAccountPositions(msg?.a?.P);
          if (mapped.length) {
            emitPositionDelta(mapped);
          }
          /* Cross margin often omits a.P — still signal for REST reconcile. */
          handlers.onTopic?.("account", {
            hasPositions: mapped.length > 0,
            reason: msg?.a?.m || ""
          });
          return;
        }

        if (event === "ORDER_TRADE_UPDATE") {
          const order = mapAccountOrder(msg?.o);
          if (order) {
            handlers.onTopic?.("order", [order]);
          }
          /* Any order change may open/close a position — request fast REST. */
          handlers.onTopic?.("account", {
            hasPositions: false,
            reason: "ORDER_TRADE_UPDATE"
          });
          return;
        }

        if (event === "listenKeyExpired") {
          handlers.onDisconnect?.("listenKeyExpired");
        }
      },

      onClose() {
        clearKeepalive();
        if (!closed) {
          handlers.onDisconnect?.("socket closed");
          setTimeout(() => {
            void connect();
          }, 2000);
        }
      },

      onError(err) {
        handlers.onDisconnect?.(
          err?.message || "socket error"
        );
      }
    });
  }

  void connect();

  return {
    close() {
      closed = true;
      clearKeepalive();
      try {
        socket?.close?.();
      } catch {
        /* ignore */
      }
      socket = null;
    }
  };
}

module.exports = {
  connectBingxPrivateWs,
  positionStreamKey,
  resolveWsBase,
  mapAccountPositions,
  mapAccountOrder
};
