import { WebSocketServer, WebSocket } from "ws";
import { verifySiteGateToken } from "./gate-token.js";
import { readEnv } from "../config.js";
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

function extractToken(req) {
  const auth = req.headers.authorization || "";
  if (auth.startsWith("Bearer ")) {
    return auth.slice(7).trim();
  }
  try {
    const u = new URL(req.url || "", "http://localhost");
    return String(u.searchParams.get("access_token") || "").trim();
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

export function attachTradeStreamWs(server) {
  const wss = new WebSocketServer({ noServer: true });
  const secret = () => readEnv("SITE_GATE_SECRET");

  server.on("upgrade", (req, socket, head) => {
    const pathOnly = (req.url || "").split("?")[0];
    if (pathOnly !== "/trade/stream") {
      return;
    }
    const session = verifySiteGateToken(secret(), extractToken(req));
    if (!session) {
      socket.write("HTTP/1.1 401 Unauthorized\r\n\r\n");
      socket.destroy();
      return;
    }
    wss.handleUpgrade(req, socket, head, (ws) => {
      wss.emit("connection", ws);
    });
  });

  wss.on("connection", (ws) => {
    clients.add(ws);
    ensureBybit();
    void seed();
    ws.on("close", () => {
      clients.delete(ws);
      maybeStopBybit();
    });
    ws.on("error", () => {
      clients.delete(ws);
      maybeStopBybit();
    });
  });
}
