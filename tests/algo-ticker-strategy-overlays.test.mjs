import assert from "node:assert/strict";
import test from "node:test";

import "./helpers/stub-browser.mjs";

const store = new Map();
globalThis.localStorage = {
  getItem(key){
    return store.has(key) ? store.get(key) : null;
  },
  setItem(key, value){
    store.set(String(key), String(value));
  },
  removeItem(key){
    store.delete(key);
  }
};

const {
getTickerStrategyOverlay,
hasTickerStrategyOverlay,
setTickerStrategyOverlay,
writeTickerStrategyOverlays,
normalizeTickerOverlaySymbol
} = await import("../js/algo-trading/ticker-strategy-overlays.js");

test("normalizeTickerOverlaySymbol strips .P", () => {
  assert.equal(normalizeTickerOverlaySymbol("btcusdt.p"), "BTCUSDT");
});

test("writeTickerStrategyOverlays stores patches per symbol", () => {
  const n = writeTickerStrategyOverlays("st1", [
    { symbol: "ETHUSDT.P", patch: { slPctOfX: 12, tpRr: 2 } },
    { symbol: "BTCUSDT", patch: { slPctOfX: 8, tpRr: 1.5 } }
  ]);
  assert.equal(n, 2);
  assert.equal(hasTickerStrategyOverlay("st1", "ETHUSDT"), true);
  assert.equal(getTickerStrategyOverlay("st1", "ethusdt.p")?.slPctOfX, 12);
  assert.equal(getTickerStrategyOverlay("st1", "BTCUSDT")?.tpRr, 1.5);
  assert.equal(getTickerStrategyOverlay("st2", "BTCUSDT"), null);
});

test("setTickerStrategyOverlay overwrites one ticker", () => {
  setTickerStrategyOverlay("st1", "BTCUSDT", { slPctOfX: 20, tpRr: 3 });
  assert.equal(getTickerStrategyOverlay("st1", "BTCUSDT")?.slPctOfX, 20);
  assert.equal(getTickerStrategyOverlay("st1", "ETHUSDT")?.slPctOfX, 12);
});

test("write st1 overlays does not clear st2 or st3", () => {
  writeTickerStrategyOverlays("st2", [
    { symbol: "BTCUSDT", patch: { tp1X: 0.7, slPctOfX: 40 } }
  ]);
  writeTickerStrategyOverlays("st3", [
    { symbol: "BTCUSDT", patch: { tp1Y: 0.6, slPctOfX: 55 } }
  ]);
  writeTickerStrategyOverlays("st1", [
    { symbol: "BTCUSDT", patch: { tpRr: 2.2, slPctOfX: 18 } }
  ]);
  assert.equal(getTickerStrategyOverlay("st1", "BTCUSDT")?.tpRr, 2.2);
  assert.equal(getTickerStrategyOverlay("st2", "BTCUSDT")?.tp1X, 0.7);
  assert.equal(getTickerStrategyOverlay("st3", "BTCUSDT")?.tp1Y, 0.6);
});
