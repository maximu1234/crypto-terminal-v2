import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";

const root = path.join(
  path.dirname(fileURLToPath(import.meta.url)),
  ".."
);

test(
  "resetEngineSession does not wipe pendingEntries (Stop→Start keeps position meta)",
  () => {
    for (const rel of [
      "desktop/trading/algo-bot-pattern-engine.cjs",
      "bot-app/trading/algo-bot-pattern-engine.cjs"
    ]) {
      const text = fs.readFileSync(path.join(root, rel), "utf8");
      const start = text.indexOf("resetEngineSession(){");
      assert.ok(start >= 0, `${rel}: resetEngineSession missing`);
      const end = text.indexOf("\n}", start);
      const body = text.slice(start, end);
      assert.equal(
        body.includes("orderExecutor.clearPendingEntries()"),
        false,
        `${rel}: resetEngineSession must not call clearPendingEntries()`
      );
    }
  }
);

test(
  "reconcile without meta does not spam when exchange already has SL",
  async () => {
    const require = createRequire(import.meta.url);
    const Module = require("module");
    const originalLoad = Module._load;
    const store = {
      pendingTriggers: {},
      pendingMirrorTriggers: {},
      pendingEntries: {}
    };

    Module._load = function (request, parent, isMain) {
      if (request === "electron") {
        return {
          net: { fetch: async () => { throw new Error("offline"); } },
          app: { getPath: () => "/tmp" }
        };
      }
      if (request === "electron-log") {
        return { info() {}, warn() {}, error() {}, debug() {} };
      }
      if (request === "./algo-bot-store.cjs") {
        return {
          readPendingBotOrders: () => ({ ...store }),
          writePendingBotOrders: (data) => {
            Object.assign(store, data || {});
            return true;
          }
        };
      }
      if (request === "./algo-bybit-rest.cjs") {
        return {
          getOpenOrders: async () => ({
            ok: true,
            orders: [
              {
                symbol: "SQDUSDT",
                orderId: "tp1",
                orderLinkId: "AlgoTrading-tp1-SQDUSDT",
                reduceOnly: true,
                orderType: "Limit",
                side: "Sell"
              }
            ]
          }),
          setPositionStop: async () => ({ ok: true }),
          cancelPositionStop: async () => ({ ok: true }),
          cancelTradeOrder: async () => ({ ok: true })
        };
      }
      if (request === "./algo-bybit-kline-ws.cjs") {
        return { normalizeSymbol: (s) => String(s || "").toUpperCase() };
      }
      return originalLoad.apply(this, arguments);
    };

    let executor;
    try {
      delete require.cache[require.resolve("../desktop/trading/algo-bot-order-executor.cjs")];
      executor = require("../desktop/trading/algo-bot-order-executor.cjs");
    } finally {
      Module._load = originalLoad;
    }

    const positions = [
      {
        symbol: "SQDUSDT",
        size: "100",
        stopLoss: "0.05",
        takeProfit: "0"
      }
    ];

    const first = await executor.reconcileTriggersAndStops(positions);
    const second = await executor.reconcileTriggersAndStops(positions);

    const missing = (reports) =>
      (reports || []).filter(
        (r) => r.action === "missing-stops" && r.symbol === "SQDUSDT"
      );

    assert.equal(
      missing(first).length,
      0,
      `expected no missing-stops when SL is live, got ${JSON.stringify(first)}`
    );
    assert.equal(missing(second).length, 0);
  }
);
