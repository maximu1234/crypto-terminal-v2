import WebSocket from "ws";

const WS_URL =
  "wss://stream.bybit.com/v5/public/linear";

function topicFor(symbol, tf) {

  const interval =
    tf === "D" ? "D" : String(tf || "60");

  return `kline.${interval}.${symbol}`;

}

function parseCandle(raw) {

  return {
    time: Number(raw.start) / 1000,
    open: Number(raw.open),
    high: Number(raw.high),
    low: Number(raw.low),
    close: Number(raw.close),
    confirm: raw.confirm === true
  };

}

export function createBybitKlineHub() {

  let socket = null;
  let reconnectTimer = null;
  const wanted = new Set();
  const listeners = new Set();

  function emit(symbol, tf, candle) {

    for (const fn of listeners) {
      try {
        fn(symbol, tf, candle);
      } catch (err) {
        console.warn("kline listener:", err);
      }
    }

  }

  function subscribeOnWire() {

    if (!socket || socket.readyState !== WebSocket.OPEN || !wanted.size) {
      return;
    }

    socket.send(JSON.stringify({
      op: "subscribe",
      args: [...wanted]
    }));

  }

  function connect() {

    if (
      socket &&
      (
        socket.readyState === WebSocket.OPEN ||
        socket.readyState === WebSocket.CONNECTING
      )
    ) {
      return;
    }

    socket = new WebSocket(WS_URL);

    socket.on("open", () => {
      console.log("bybit kline ws connected");
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

      if (!topic.startsWith("kline.")) {
        return;
      }

      const parts = topic.split(".");
      const tf = parts[1];
      const symbol = parts[2];
      const row = Array.isArray(msg.data) ? msg.data[0] : msg.data;

      if (!symbol || !row) {
        return;
      }

      emit(symbol, tf, parseCandle(row));

    });

    socket.on("close", () => {
      console.warn("bybit kline ws closed, reconnect in 3s");
      socket = null;
      if (reconnectTimer) {
        clearTimeout(reconnectTimer);
      }
      reconnectTimer = setTimeout(connect, 3000);
    });

    socket.on("error", err => {
      console.warn("bybit kline ws error:", err.message);
    });

  }

  return {

    onKline(fn) {
      listeners.add(fn);
      return () => listeners.delete(fn);
    },

    ensureKline(symbol, tf) {

      if (!symbol) {
        return;
      }

      const topic = topicFor(symbol, tf);

      if (wanted.has(topic)) {
        return;
      }

      wanted.add(topic);
      connect();
      subscribeOnWire();

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
