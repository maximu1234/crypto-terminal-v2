import test from "node:test";
import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { Module } from "node:module";

const require = createRequire(import.meta.url);

const {
  inferOpenTimeMs,
  matchTradeExecutions,
  mapClosedPnlRow,
  EXEC_HISTORY_MAX_LOOKBACK_MS
} = (() => {
  const originalLoad = Module._load;
  Module._load = function (request, parent, isMain) {
    if (request === "electron") {
      return {
        net: {
          fetch: async () => {
            throw new Error("net unused in unit test");
          }
        }
      };
    }
    return originalLoad(request, parent, isMain);
  };
  try {
    return require("../desktop/trading/bybit-rest.cjs");
  } finally {
    Module._load = originalLoad;
  }
})();

const MAR3 = Date.parse("2026-03-03T15:57:29+07:00");
const JUL15_OPEN_WRONG = Date.parse("2026-07-15T15:00:00+07:00");
const JUL15_CLOSE = Date.parse("2026-07-15T20:02:19+07:00");

function exec({
  side,
  price,
  qty = 0.05,
  timeMs,
  orderId = "x"
}) {
  return {
    symbol: "ETHUSDT",
    side,
    execPrice: price,
    execQty: qty,
    execTimeMs: timeMs,
    orderId,
    execId: `${orderId}-${timeMs}`
  };
}

test("EXEC_HISTORY_MAX_LOOKBACK_MS covers 134-day holds", () => {
  assert.ok(EXEC_HISTORY_MAX_LOOKBACK_MS >= 134 * 24 * 60 * 60 * 1000);
});

test("inferOpenTimeMs prefers avgEntryPrice over recent wrong Sell", () => {
  const closedRow = {
    symbol: "ETHUSDT",
    side: "Buy",
    closedSize: 0.05,
    avgEntryPrice: 1948.21,
    avgExitPrice: 1937.75,
    updatedTime: String(JUL15_CLOSE),
    createdTime: String(JUL15_CLOSE),
    closedPnl: "0.8308",
    orderId: "close-1"
  };

  const executions = [
    exec({
      side: "Sell",
      price: 1948.21,
      timeMs: MAR3,
      orderId: "open-real"
    }),
    exec({
      side: "Sell",
      price: 1869.08,
      timeMs: JUL15_OPEN_WRONG,
      orderId: "open-wrong"
    }),
    exec({
      side: "Buy",
      price: 1937.75,
      timeMs: JUL15_CLOSE,
      orderId: "close-1"
    })
  ];

  const openMs = inferOpenTimeMs(closedRow, executions);
  assert.equal(openMs, MAR3);

  const mapped = mapClosedPnlRow(closedRow, executions);
  assert.equal(mapped.openTimeMs, MAR3);
  assert.ok(mapped.durationMs > 130 * 24 * 60 * 60 * 1000);
  assert.equal(mapped.avgEntryPrice, 1948.21);
});

test("matchTradeExecutions returns Mar 3 entry not Jul 15 wrong Sell", () => {
  const trade = {
    symbol: "ETHUSDT",
    side: "short",
    qty: 0.05,
    openTimeMs: JUL15_OPEN_WRONG,
    closeTimeMs: JUL15_CLOSE,
    orderId: "close-1",
    avgEntryPrice: 1948.21,
    avgExitPrice: 1937.75
  };

  const executions = [
    exec({
      side: "Sell",
      price: 1948.21,
      timeMs: MAR3,
      orderId: "open-real"
    }),
    exec({
      side: "Sell",
      price: 1869.08,
      timeMs: JUL15_OPEN_WRONG,
      orderId: "open-wrong"
    }),
    exec({
      side: "Buy",
      price: 1937.75,
      timeMs: JUL15_CLOSE,
      orderId: "close-1"
    })
  ];

  const matched = matchTradeExecutions(trade, executions);
  assert.equal(matched.entries.length, 1);
  assert.equal(matched.entries[0].execTimeMs, MAR3);
  assert.ok(Math.abs(matched.avgEntryPrice - 1948.21) < 0.01);
  assert.equal(matched.exits[0].execTimeMs, JUL15_CLOSE);
});

test("short intraday trade still matches recent open fill", () => {
  const openMs = JUL15_CLOSE - 2 * 60 * 60 * 1000;
  const closedRow = {
    symbol: "ETHUSDT",
    side: "Buy",
    closedSize: 0.05,
    avgEntryPrice: 1900,
    avgExitPrice: 1890,
    updatedTime: String(JUL15_CLOSE),
    closedPnl: "0.5"
  };
  const executions = [
    exec({
      side: "Sell",
      price: 1900,
      timeMs: openMs,
      orderId: "intraday-open"
    }),
    exec({
      side: "Buy",
      price: 1890,
      timeMs: JUL15_CLOSE,
      orderId: "intraday-close"
    })
  ];
  assert.equal(inferOpenTimeMs(closedRow, executions), openMs);
});
