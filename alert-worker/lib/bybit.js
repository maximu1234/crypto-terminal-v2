import WebSocket from "ws";
import { normalizeBybitSymbol } from "./bybit-symbol.js";

const WS_URL =
  "wss://stream.bybit.com/v5/public/linear";

export function createBybitTickerHub() {

  /** @type {WebSocket | null} */
  let socket = null;

  /** @type {ReturnType<typeof setTimeout> | null} */
  let reconnectTimer = null;

  const wanted = new Set();
  const lastPrice = new Map();
  const listeners = new Set();

  function emit(symbol, price) {

    const prev = lastPrice.get(symbol);

    if (prev === price) {
      return;
    }

    lastPrice.set(symbol, price);

    for (const fn of listeners) {
      try {
        fn(symbol, price, prev);
      } catch (err) {
        console.warn("ticker listener:", err);
      }
    }

  }

  function subscribeOnWire() {

    if (!socket || socket.readyState !== WebSocket.OPEN || !wanted.size) {
      return;
    }

    const args = [...wanted].map(s => `tickers.${s}`);

    socket.send(JSON.stringify({ op: "subscribe", args }));

  }

  function connect() {

    if (socket && (
      socket.readyState === WebSocket.OPEN ||
      socket.readyState === WebSocket.CONNECTING
    )) {
      return;
    }

    socket = new WebSocket(WS_URL);

    socket.on("open", () => {
      console.log("bybit ws connected");
      subscribeOnWire();
    });

    socket.on("message", raw => {

      let msg;

      try {
        msg = JSON.parse(String(raw));
      } catch {
        return;
      }

      const topic = msg.topic || "";

      if (!topic.startsWith("tickers.")) {
        return;
      }

      const data = msg.data;

      if (!data) {
        return;
      }

      const row = Array.isArray(data) ? data[0] : data;
      const symbol = row.symbol;
      const price = Number(row.lastPrice);

      if (symbol && Number.isFinite(price)) {
        emit(symbol, price);
      }

    });

    socket.on("close", () => {
      console.warn("bybit ws closed, reconnect in 3s");
      socket = null;
      reconnectTimer = setTimeout(connect, 3000);
    });

    socket.on("error", err => {
      console.warn("bybit ws error:", err.message);
    });

  }

  return {

    onTick(fn) {
      listeners.add(fn);
      return () => listeners.delete(fn);
    },

    ensureSymbol(symbol) {

      const sym =
        normalizeBybitSymbol(symbol);

      if (!sym || wanted.has(sym)) {
        return;
      }

      wanted.add(sym);
      connect();
      subscribeOnWire();

    },

    getLastPrice(symbol) {
      return lastPrice.get(symbol);
    },

    close() {

      if (reconnectTimer) {
        clearTimeout(reconnectTimer);
      }

      socket?.close();
      socket = null;

    }

  };

}
