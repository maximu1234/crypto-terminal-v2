import test from "node:test";
import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { Module } from "node:module";

const require = createRequire(import.meta.url);

function loadRouterWithStubs({
  bybit = {},
  bingx = {},
  normalizeExchangeId = (id) => (id === "bingx" ? "bingx" : "bybit")
} = {}) {
  require.cache[
    require.resolve("../desktop/trading/bingx-private-ws.cjs")
  ] = {
    exports: { connectBingxPrivateWs: () => {} }
  };
  require.cache[
    require.resolve("../desktop/trading/bybit-private-ws.cjs")
  ] = {
    exports: { connectBybitPrivateWs: () => {} }
  };

  const originalLoad = Module._load;
  Module._load = function (request, parent, isMain) {
    if (request === "./exchange-credentials.cjs") {
      return {
        normalizeExchangeId,
        getStatus: () => ({ ok: true, exchangeId: "stub" }),
        saveCredentials: () => {},
        clearCredentials: () => {}
      };
    }
    if (request === "./bybit-rest.cjs") {
      return bybit;
    }
    if (request === "./bingx-rest.cjs") {
      return bingx;
    }
    return originalLoad(request, parent, isMain);
  };
  try {
    delete require.cache[require.resolve("../desktop/trading/trading-router.cjs")];
    return require("../desktop/trading/trading-router.cjs");
  } finally {
    Module._load = originalLoad;
  }
}

test("trading-router switches adapters and soft-fails missing methods", () => {
  const calls = [];
  const bybit = {
    getWalletBalance: async () => {
      calls.push("bybit-balance");
      return { ok: true, exchange: "bybit" };
    },
    getPositions: async () => {
      calls.push("bybit-positions");
      return { ok: true, list: ["bybit"] };
    },
    pingBybit: async () => ({ ok: true, via: "bybit-ping" })
  };
  const bingx = {
    getWalletBalance: async () => {
      calls.push("bingx-balance");
      return { ok: true, exchange: "bingx" };
    },
    getPositions: async () => {
      calls.push("bingx-positions");
      return { ok: true, list: ["bingx"] };
    },
    pingExchange: async () => ({ ok: true, via: "bingx-ping" }),
    getRateLimitBackoffMs: () => 42,
    enrichPositionsWithStopOrders: () => true,
    fetchOpenOrderRowsCached: () => true
  };

  const router = loadRouterWithStubs({ bybit, bingx });

  assert.equal(router.setActiveExchange("bingx"), "bingx");
  assert.equal(router.getActiveExchange(), "bingx");

  return Promise.resolve()
    .then(() => router.getWalletBalance())
    .then((bal) => {
      assert.equal(bal.exchange, "bingx");
      assert.deepEqual(calls, ["bingx-balance"]);
      return router.getPositions({ exchangeId: "bybit" });
    })
    .then((pos) => {
      assert.deepEqual(pos.list, ["bybit"]);
      assert.deepEqual(calls, ["bingx-balance", "bybit-positions"]);
      return router.pingExchange();
    })
    .then((ping) => {
      assert.equal(ping.via, "bingx-ping");
      assert.equal(router.getRateLimitBackoffMs(), 42);
      const stream = router.getStreamModules("bingx");
      assert.equal(stream.enrichPositionsWithStopOrders, bingx.enrichPositionsWithStopOrders);
      assert.equal(typeof router.getStreamModules("bybit").getRateLimitBackoffMs, "function");
      assert.equal(router.getStreamModules("bybit").getRateLimitBackoffMs(), 0);
      return router.enrichClosedPnlTrades({});
    })
    .then((missing) => {
      assert.equal(missing.ok, false);
      assert.match(String(missing.message || ""), /недоступно|биржи/i);
    });
});

test("trading-router unknown exchange id falls back to bybit", () => {
  const router = loadRouterWithStubs({
    bybit: { getWalletBalance: async () => ({ ok: true, exchange: "bybit" }) },
    bingx: { getWalletBalance: async () => ({ ok: true, exchange: "bingx" }) }
  });
  assert.equal(router.setActiveExchange("kraken"), "bybit");
  assert.equal(router.getActiveExchange(), "bybit");
});
