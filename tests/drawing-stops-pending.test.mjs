import assert from "node:assert/strict";
import test from "node:test";

import {
  __getDrawingStopsPendingForTests,
  __resetDrawingStopsForTests,
  clearDrawingStopsPending,
  consumeDrawingStopsPending,
  hasDrawingStopsPending,
  peekDrawingStopsPendingForSide,
  stashDrawingStopsFromDrawing,
  tryApplyDrawingStopsPending,
  wasDrawingStopsJustApplied
} from "../js/trade/bybit/drawing-stops.js";

test.beforeEach(() => {
  __resetDrawingStopsForTests();
  globalThis.window = globalThis.window || {};
  globalThis.window.cryptoTerminalDesktop = {
    trading: {
      async setPositionStop() {
        return { ok: true };
      }
    }
  };
});

test("stash then consume matching side", () => {
  assert.equal(
    stashDrawingStopsFromDrawing({
      symbol: "BTCUSDT.P",
      side: "long",
      slPrice: 90_000,
      tpPrice: 100_000
    }),
    true
  );

  const pending = __getDrawingStopsPendingForTests();
  assert.equal(pending.symbol, "BTCUSDT");
  assert.equal(pending.side, "Buy");

  const consumed = consumeDrawingStopsPending("BTCUSDT", {
    side: "Buy",
    size: 0.1
  });
  assert.ok(consumed);
  assert.equal(consumed.slPrice, 90_000);
  assert.equal(consumed.tpPrice, 100_000);
  assert.equal(__getDrawingStopsPendingForTests(), null);
});

test("side mismatch clears pending without payload", () => {
  stashDrawingStopsFromDrawing({
    symbol: "ETHUSDT",
    side: "short",
    slPrice: 4_000,
    tpPrice: 3_000
  });

  const consumed = consumeDrawingStopsPending("ETHUSDT", {
    side: "Buy",
    size: 1
  });
  assert.equal(consumed, null);
  assert.equal(__getDrawingStopsPendingForTests(), null);
});

test("second consume is null", () => {
  stashDrawingStopsFromDrawing({
    symbol: "SOLUSDT",
    side: "long",
    slPrice: 100,
    tpPrice: 120
  });
  assert.ok(
    consumeDrawingStopsPending("SOLUSDT", { side: "Buy", size: 2 })
  );
  assert.equal(
    consumeDrawingStopsPending("SOLUSDT", { side: "Buy", size: 2 }),
    null
  );
});

test("peek matches side without clearing", () => {
  stashDrawingStopsFromDrawing({
    symbol: "XRPUSDT",
    side: "long",
    slPrice: 0.5,
    tpPrice: 0.7
  });

  assert.ok(peekDrawingStopsPendingForSide("XRPUSDT", "Buy"));
  assert.equal(peekDrawingStopsPendingForSide("XRPUSDT", "Sell"), null);
  assert.ok(__getDrawingStopsPendingForTests());
});

test("tryApply sets suppress flag and clears pending", async () => {
  stashDrawingStopsFromDrawing({
    symbol: "BNBUSDT",
    side: "long",
    slPrice: 500,
    tpPrice: 600
  });

  const applied = await tryApplyDrawingStopsPending("BNBUSDT", {
    side: "Buy",
    size: 1,
    stopLoss: 0,
    takeProfit: 0
  });
  assert.equal(applied, true);
  assert.equal(__getDrawingStopsPendingForTests(), null);
  assert.equal(wasDrawingStopsJustApplied("BNBUSDT"), true);
});

test("clearDrawingStopsPending drops stash", () => {
  stashDrawingStopsFromDrawing({
    symbol: "ADAUSDT",
    side: "short",
    slPrice: 1,
    tpPrice: 0.5
  });
  clearDrawingStopsPending();
  assert.equal(__getDrawingStopsPendingForTests(), null);
});

test("hasDrawingStopsPending tracks armed state", () => {
  assert.equal(hasDrawingStopsPending("BTCUSDT"), false);
  stashDrawingStopsFromDrawing({
    symbol: "BTCUSDT",
    side: "long",
    slPrice: 90_000,
    tpPrice: 100_000
  });
  assert.equal(hasDrawingStopsPending("BTCUSDT"), true);
  assert.equal(hasDrawingStopsPending("ETHUSDT"), false);
  assert.equal(hasDrawingStopsPending(), true);
});

test("multiple symbols stay armed independently", () => {
  assert.equal(
    stashDrawingStopsFromDrawing({
      symbol: "BTCUSDT",
      side: "long",
      slPrice: 90_000,
      tpPrice: 100_000
    }),
    true
  );
  assert.equal(
    stashDrawingStopsFromDrawing({
      symbol: "ETHUSDT",
      side: "short",
      slPrice: 4_000,
      tpPrice: 3_000
    }),
    true
  );

  assert.equal(hasDrawingStopsPending("BTCUSDT"), true);
  assert.equal(hasDrawingStopsPending("ETHUSDT"), true);

  const eth = consumeDrawingStopsPending("ETHUSDT", {
    side: "Sell",
    size: 1
  });
  assert.ok(eth);
  assert.equal(eth.slPrice, 4_000);
  assert.equal(hasDrawingStopsPending("ETHUSDT"), false);
  assert.equal(hasDrawingStopsPending("BTCUSDT"), true);

  clearDrawingStopsPending("BTCUSDT");
  assert.equal(hasDrawingStopsPending("BTCUSDT"), false);
  assert.equal(hasDrawingStopsPending(), false);
});
