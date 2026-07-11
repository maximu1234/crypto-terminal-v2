import WebSocket from "ws";
import { normalizeBybitSymbol } from "./bybit-symbol.js";

const WS_URL =
  "wss://stream.bybit.com/v5/public/linear";

function pickTickerPrice(row) {

  const last =
    Number(row?.lastPrice);
  const mark =
    Number(row?.markPrice);
  const index =
    Number(row?.indexPrice);

  if (Number.isFinite(last)) {
    return last;
  }

  if (Number.isFinite(mark)) {
    return mark;
  }

  if (Number.isFinite(index)) {
    return index;
  }

  return NaN;

}

export function createBybitTickerHub() {

  /** @type {WebSocket | null} */
  let socket = null;

  /** @type {ReturnType<typeof setTimeout> | null} */
  let reconnectTimer = null;

  const wanted = new Set();
  const lastPrice = new Map();
  /** symbol → merged snapshot (delta updates часто без lastPrice) */
  const rowBySymbol = new Map();
  const listeners = new Set();
  let lastTickAt = 0;
  let tickCount = 0;

  function emit(symbol, price) {

    const prev = lastPrice.get(symbol);

    if (prev === price) {
      return;
    }

    lastPrice.set(symbol, price);
    lastTickAt = Date.now();
    tickCount += 1;

    for (const fn of listeners) {
      try {
        fn(symbol, price, prev);
      } catch (err) {
        console.warn("ticker listener:", err);
      }
    }

  }

  function mergeRow(row) {

    const symbol =
      normalizeBybitSymbol(row?.symbol);

    if (!symbol) {
      return null;
    }

    const prev =
      rowBySymbol.get(symbol) || {};
    const merged = {
      ...prev,
      ...row,
      symbol
    };

    rowBySymbol.set(symbol, merged);

    const price =
      pickTickerPrice(merged);

    if (!Number.isFinite(price)) {
      return null;
    }

    return {
      symbol,
      price
    };

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
      console.log("bybit ticker ws connected");
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

      const rows =
        Array.isArray(data)
          ? data
          : [data];

      for (const row of rows) {
        const merged =
          mergeRow(row);

        if (merged) {
          emit(
            merged.symbol,
            merged.price
          );
        }
      }

    });

    socket.on("close", () => {
      console.warn("bybit ticker ws closed, reconnect in 3s");
      socket = null;
      if (reconnectTimer) {
        clearTimeout(reconnectTimer);
      }
      reconnectTimer = setTimeout(connect, 3000);
    });

    socket.on("error", err => {
      console.warn("bybit ticker ws error:", err.message);
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
      return lastPrice.get(
        normalizeBybitSymbol(symbol)
      );
    },

    getStats() {
      return {
        symbols: wanted.size,
        lastTickAt: lastTickAt || null,
        tickCount
      };
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
