import assert from "node:assert/strict";
import test from "node:test";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const {
  mergePositionStops,
  mergePositionStopsWithRevisions,
  rebuildPositionsKeepingStops,
  shouldAcceptIncomingStop,
  stopAmendKey,
  stopPricesMatch,
  applyStopAmendOverlay,
  isStopAmendConfirmedByPosition
} = require("../desktop/trading/bingx-position-stops.cjs");

const {
  beginStopAmend,
  updateStopAmend,
  getStopAmend,
  clearStopAmend,
  clearAllStopAmends
} = require("../desktop/trading/bingx-stop-amend-state.cjs");

test("mergePositionStops keeps prior SL/TP when REST row has zeros", () => {
  const merged = mergePositionStops(
    {
      symbol: "BTCUSDT",
      stopLoss: 90,
      takeProfit: 110,
      slOrderId: "sl1",
      tpOrderId: "tp1"
    },
    {
      symbol: "BTCUSDT",
      size: 1,
      stopLoss: 0,
      takeProfit: 0
    }
  );
  assert.equal(merged.stopLoss, 90);
  assert.equal(merged.takeProfit, 110);
  assert.equal(merged.slOrderId, "sl1");
  assert.equal(merged.tpOrderId, "tp1");
  assert.equal(merged.size, 1);
});

test("mergePositionStops honors authoritative clear", () => {
  const merged = mergePositionStops(
    { stopLoss: 90, takeProfit: 110, slOrderId: "sl1" },
    { stopLoss: 0, takeProfit: 0, _stopsAuthoritative: true }
  );
  assert.equal(merged.stopLoss, 0);
  assert.equal(merged.takeProfit, 0);
  assert.equal(merged._stopsAuthoritative, true);
});

test("rebuildPositionsKeepingStops survives clear-then-replace pattern", () => {
  const prevByKey = new Map([
    [
      "BTCUSDT:LONG",
      {
        symbol: "BTCUSDT",
        stopLoss: 90,
        takeProfit: 110,
        slOrderId: "sl1",
        tpOrderId: "tp1"
      }
    ]
  ]);
  const nextEntries = [
    [
      "BTCUSDT:LONG",
      {
        symbol: "BTCUSDT",
        size: 0.01,
        stopLoss: 0,
        takeProfit: 0
      }
    ]
  ];
  const kept = rebuildPositionsKeepingStops(prevByKey, nextEntries);
  const row = kept.get("BTCUSDT:LONG");
  assert.equal(row.stopLoss, 90);
  assert.equal(row.takeProfit, 110);
  assert.equal(row.slOrderId, "sl1");
  assert.equal(row.size, 0.01);
});

test("rebuild after empty prev keeps zeros (fresh open before stops)", () => {
  const kept = rebuildPositionsKeepingStops(
    new Map(),
    [["ETHUSDT:LONG", { symbol: "ETHUSDT", size: 1, stopLoss: 0, takeProfit: 0 }]]
  );
  assert.equal(kept.get("ETHUSDT:LONG").stopLoss, 0);
});

test("pending revision blocks stale OLD stop price", () => {
  const revision = {
    target: "sl",
    price: 95,
    newOrderId: "sl-new",
    phase: "placed"
  };
  const decision = shouldAcceptIncomingStop(
    "sl",
    { stopLoss: 90, slOrderId: "sl-old" },
    { stopLoss: 90, slOrderId: "sl-old" },
    revision
  );
  assert.equal(decision.accept, false);

  const gated = mergePositionStopsWithRevisions(
    { stopLoss: 90, slOrderId: "sl-old", takeProfit: 110 },
    { stopLoss: 90, slOrderId: "sl-old", takeProfit: 110, size: 1 },
    { sl: revision }
  );
  assert.equal(gated.stopLoss, 95);
  assert.equal(gated.slOrderId, "sl-new");
});

test("matching new order id confirms and accepts", () => {
  const revision = {
    target: "sl",
    price: 95,
    newOrderId: "sl-new",
    phase: "placed"
  };
  const decision = shouldAcceptIncomingStop(
    "sl",
    null,
    { stopLoss: 95, slOrderId: "sl-new" },
    revision
  );
  assert.equal(decision.accept, true);
  assert.equal(decision.confirmed, true);
  assert.equal(
    isStopAmendConfirmedByPosition(revision, {
      stopLoss: 95,
      slOrderId: "sl-new"
    }),
    true
  );
});

test("confirmed phase accepts normal merge again", () => {
  const gated = mergePositionStopsWithRevisions(
    { stopLoss: 95, slOrderId: "sl-new" },
    { stopLoss: 0, takeProfit: 0 },
    { sl: { target: "sl", price: 95, phase: "confirmed" } }
  );
  assert.equal(gated.stopLoss, 95);
});

test("stopPricesMatch and stopAmendKey are stable", () => {
  assert.equal(stopPricesMatch(100, 100.0001), true);
  assert.equal(stopPricesMatch(100, 101), false);
  assert.equal(
    stopAmendKey("BTC-USDT", "LONG", "sl"),
    stopAmendKey("BTCUSDT", "LONG", "SL")
  );
});

test("applyStopAmendOverlay overlays requested TP", () => {
  const overlaid = applyStopAmendOverlay(
    { takeProfit: 110, tpOrderId: "old" },
    { target: "tp", price: 120, newOrderId: "new", phase: "requested" }
  );
  assert.equal(overlaid.takeProfit, 120);
  assert.equal(overlaid.tpOrderId, "new");
});

test("stop amend state begin/update/clear", () => {
  clearAllStopAmends();
  const rev = beginStopAmend({
    symbol: "BTCUSDT",
    positionSide: "LONG",
    target: "sl",
    price: 90,
    phase: "requested"
  });
  assert.equal(getStopAmend(rev.key)?.price, 90);
  updateStopAmend(rev.key, { phase: "placed", newOrderId: "abc" });
  assert.equal(getStopAmend(rev.key)?.newOrderId, "abc");
  clearStopAmend(rev.key);
  assert.equal(getStopAmend(rev.key), null);
  clearAllStopAmends();
});
