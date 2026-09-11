import { WebSocketServer, WebSocket } from "ws";
import { verifySiteGateToken } from "./gate-token.js";
import { readEnv } from "../config.js";
import { isAllowedTradeOrigin } from "../client-http.js";
import { loadTradeKeys } from "./keys-store.js";
import {
  connectBybitPrivateWs
} from "./bybit-private-ws.js";
import {
  getOpenOrders,
  getPositions
} from "./bybit-ops.js";

/** @type {Set<import("ws").WebSocket>} */
const clients = new Set();
let bybitCtl = null;
let seedTimer = null;
const AUTH_WAIT_MS = 3000;

function parseAuthMessage(raw) {
  try {
    const parsed = JSON.parse(String(raw || ""));
    if (parsed?.type !== "auth") {
      return "";
    }
    return String(parsed.token || "").trim();
  } catch {
    return "";
  }
}

function scheduleSeed() {
  clearTimeout(seedTimer);
  seedTimer = setTimeout(() => {
    void seed();
  }, 250);
}

function sendAll(payload) {
  const json = JSON.stringify(payload);
  for (const ws of clients) {
    if (ws.readyState === WebSocket.OPEN) {
      try {
        ws.send(json);
      } catch {
        /* ignore */
      }
    }
  }
}

async function seed() {
  if (!loadTradeKeys("bybit")) {
    return;
  }
  const [pos, orders] = await Promise.all([
    getPositions(),
    getOpenOrders()
  ]);
  if (pos.ok) {
    sendAll({ type: "positions", positions: pos.positions || [] });
  }
  if (orders.ok) {
    sendAll({ type: "orders", orders: orders.orders || [] });
  }
}

function ensureBybit() {
  if (bybitCtl || !loadTradeKeys("bybit") || clients.size === 0) {
    return;
  }
  bybitCtl = connectBybitPrivateWs({
    onMessage(msg) {
      const topic = String(msg?.topic || "");
      if (topic.startsWith("position") || topic.startsWith("order")) {
        scheduleSeed();
        return;
      }
    },
    onDisconnect() {
      /* reconnect is inside connectBybitPrivateWs */
    }
  });
}

function maybeStopBybit() {
  if (clients.size > 0) {
    return;
  }
  try {
    bybitCtl?.close?.();
  } catch {
    /* ignore */
  }
  bybitCtl = null;
}

export function restartTradePrivateStream() {
  try {
    bybitCtl?.close?.();
  } catch {
    /* ignore */
  }
  bybitCtl = null;
  if (clients.size) {
    ensureBybit();
    void seed();
  }
}

function admit(ws) {
  clients.add(ws);
  ensureBybit();
  void seed();
}

export function attachTradeStreamWs(server) {
  const wss = new WebSocketServer({ noServer: true });
  const secret = () => readEnv("SITE_GATE_SECRET");

  server.on("upgrade", (req, socket, head) => {
    const pathOnly = (req.url || "").split("?")[0];
    if (pathOnly !== "/trade/stream") {
      return;
    }
    const origin = req.headers.origin;
    if (origin && !isAllowedTradeOrigin(origin)) {
      socket.write("HTTP/1.1 403 Forbidden\r\n\r\n");
      socket.destroy();
      return;
    }
    wss.handleUpgrade(req, socket, head, (ws) => {
      wss.emit("connection", ws);
    });
  });

  wss.on("connection", (ws) => {
    let authed = false;
    const timer = setTimeout(() => {
      if (!authed) {
        try {
          ws.close();
        } catch {
          /* ignore */
        }
      }
    }, AUTH_WAIT_MS);

    ws.on("message", (data) => {
      if (authed) {
        return;
      }
      const token = parseAuthMessage(data);
      const session = verifySiteGateToken(secret(), token);
      if (!session || session.typ !== "trade") {
        try {
          ws.close();
        } catch {
          /* ignore */
        }
        return;
      }
      authed = true;
      clearTimeout(timer);
      admit(ws);
    });

    ws.on("close", () => {
      clearTimeout(timer);
      clients.delete(ws);
      maybeStopBybit();
    });
    ws.on("error", () => {
      clearTimeout(timer);
      clients.delete(ws);
      maybeStopBybit();
    });
  });
}
