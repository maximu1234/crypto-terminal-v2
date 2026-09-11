import { WebSocket } from "ws";
import crypto from "node:crypto";
import { loadTradeKeys } from "./keys-store.js";

function signPayload(secret, payload) {
  return crypto.createHmac("sha256", secret).update(payload).digest("hex");
}

function wsUrl(testnet) {
  return testnet
    ? "wss://stream-testnet.bybit.com/v5/private"
    : "wss://stream.bybit.com/v5/private";
}

/**
 * @param {{
 *   onMessage: (msg: object) => void,
 *   onDisconnect?: (reason: string) => void
 * }} handlers
 */
export function connectBybitPrivateWs(handlers) {
  const creds = loadTradeKeys("bybit");
  if (!creds) {
    return { close() {} };
  }

  let closed = false;
  let socket = null;
  let pingTimer = null;

  function connect() {
    if (closed) {
      return;
    }
    socket = new WebSocket(wsUrl(creds.testnet));
    socket.on("open", () => {
      const expires = Date.now() + 60000;
      const signature = signPayload(
        creds.apiSecret,
        `GET/realtime${expires}`
      );
      socket.send(
        JSON.stringify({
          op: "auth",
          args: [creds.apiKey, String(expires), signature]
        })
      );
    });
    socket.on("message", (data) => {
      let msg;
      try {
        msg = JSON.parse(String(data));
      } catch {
        return;
      }
      if (msg?.op === "auth" && msg?.success) {
        socket.send(
          JSON.stringify({
            op: "subscribe",
            args: ["position", "order", "wallet", "execution"]
          })
        );
        clearInterval(pingTimer);
        pingTimer = setInterval(() => {
          try {
            socket?.send(JSON.stringify({ op: "ping" }));
          } catch {
            /* ignore */
          }
        }, 20000);
        return;
      }
      handlers.onMessage?.(msg);
    });
    socket.on("close", () => {
      clearInterval(pingTimer);
      pingTimer = null;
      if (!closed) {
        setTimeout(connect, 3000);
      }
      handlers.onDisconnect?.("closed");
    });
    socket.on("error", () => {
      try {
        socket?.close();
      } catch {
        /* ignore */
      }
    });
  }

  connect();
  return {
    close() {
      closed = true;
      clearInterval(pingTimer);
      try {
        socket?.close();
      } catch {
        /* ignore */
      }
    }
  };
}
