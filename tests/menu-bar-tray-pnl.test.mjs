import assert from "node:assert/strict";
import test from "node:test";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const {
calcUnrealisedPnl,
resolvePositionPnl,
withResolvedPnl
} = require("../desktop/menu-bar-tray-pnl.cjs");

test("calcUnrealisedPnl matches Terminal Buy/Sell formula", () => {
  assert.equal(calcUnrealisedPnl("Buy", 100, 110, 2), 20);
  assert.equal(calcUnrealisedPnl("Sell", 100, 90, 2), 20);
  assert.equal(calcUnrealisedPnl("Sell", 100, 110, 2), -20);
});

test("calcUnrealisedPnl rejects incomplete inputs", () => {
  assert.equal(calcUnrealisedPnl("Buy", 0, 110, 2), null);
  assert.equal(calcUnrealisedPnl("Buy", 100, 110, 0), null);
  assert.equal(calcUnrealisedPnl("Buy", "x", 110, 2), null);
});

test("resolvePositionPnl prefers mark formula over stale row.pnl", () => {
  assert.equal(
    resolvePositionPnl({
      side: "Buy",
      avgPrice: 100,
      markPrice: 105,
      size: 1,
      pnl: 999
    }),
    5
  );
  assert.equal(
    resolvePositionPnl({
      side: "Buy",
      avgPrice: 0,
      markPrice: 0,
      size: 1,
      pnl: 12.5
    }),
    12.5
  );
});

test("withResolvedPnl copies row and overwrites pnl", () => {
  const next = withResolvedPnl({
    symbol: "BTCUSDT",
    side: "Buy",
    avgPrice: 100,
    markPrice: 101,
    size: 3,
    pnl: 0
  });
  assert.equal(next.symbol, "BTCUSDT");
  assert.equal(next.pnl, 3);
});
