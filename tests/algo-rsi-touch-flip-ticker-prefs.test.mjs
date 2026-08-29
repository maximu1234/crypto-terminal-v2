import test from "node:test";
import assert from "node:assert/strict";

function makeStorage() {
  const map = new Map();
  return {
    getItem(key) {
      return map.has(key) ? map.get(key) : null;
    },
    setItem(key, value) {
      map.set(key, String(value));
    },
    removeItem(key) {
      map.delete(key);
    }
  };
}

const {
  RSI_TOUCH_FLIP_TICKER_PREFS_KEY,
  defaultRsiTouchFlipPrefs,
  hydrateRsiTouchFlipPrefsForSymbol,
  hasRsiTouchFlipTickerPrefs,
  loadRsiTouchFlipTickerPrefs,
  saveRsiTouchFlipTickerPrefs
} = await import("../js/algo-trading/rsi-touch-flip-prefs.js");

test.beforeEach(() => {
  globalThis.localStorage = makeStorage();
});

test("ticker prefs are isolated per symbol", () => {
  saveRsiTouchFlipTickerPrefs("btcusdt.p", { rsiLen: 9, osLevel: 28 });
  saveRsiTouchFlipTickerPrefs("ethusdt", { rsiLen: 21, obLevel: 72 });

  assert.equal(loadRsiTouchFlipTickerPrefs("BTCUSDT")?.rsiLen, 9);
  assert.equal(loadRsiTouchFlipTickerPrefs("ETHUSDT")?.rsiLen, 21);
  assert.equal(loadRsiTouchFlipTickerPrefs("SOLUSDT"), null);
  assert.equal(hasRsiTouchFlipTickerPrefs("BTCUSDT"), true);
  assert.equal(hasRsiTouchFlipTickerPrefs("SOLUSDT"), false);
});

test("hydrate writes global buffer from ticker store", () => {
  saveRsiTouchFlipTickerPrefs("BTCUSDT", { maxStack: 5, budget: 250 });
  const hydrated = hydrateRsiTouchFlipPrefsForSymbol("BTCUSDT");

  assert.equal(hydrated.maxStack, 5);
  assert.equal(hydrated.budget, 250);
  assert.equal(
    JSON.parse(globalThis.localStorage.getItem("algo_trading_rsi_touch_flip_v1")).maxStack,
    5
  );
});

test("hydrate falls back to defaults when ticker unseen", () => {
  const hydrated = hydrateRsiTouchFlipPrefsForSymbol("NEWCOIN");
  const defaults = defaultRsiTouchFlipPrefs();

  assert.equal(hydrated.rsiLen, defaults.rsiLen);
  assert.equal(hasRsiTouchFlipTickerPrefs("NEWCOIN"), false);
});
