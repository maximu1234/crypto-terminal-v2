import test from "node:test";
import assert from "node:assert/strict";
import "./helpers/stub-browser.mjs";

const {
  normalizePatternScanSideFilter,
  matchesPatternScanSideFilter,
  filterPatternScanRowsBySide,
  findPattern12HitsInLookback,
  findLatestPattern12InLookback,
  readTerminalPattern12Settings,
  TERMINAL_INDICATORS_STORAGE_KEY,
  PATTERN_SCAN_DEFAULT_LOOKBACK
} = await import("../js/pattern-12-scanner.js");

test("normalizePatternScanSideFilter maps all→both and rejects junk", () => {
  assert.equal(normalizePatternScanSideFilter("all"), "both");
  assert.equal(normalizePatternScanSideFilter("long"), "long");
  assert.equal(normalizePatternScanSideFilter("SHORT"), "short");
  assert.equal(normalizePatternScanSideFilter("nope"), "both");
  assert.equal(normalizePatternScanSideFilter(""), "both");
});

test("matchesPatternScanSideFilter and row filter", () => {
  assert.equal(matchesPatternScanSideFilter("long", "both"), true);
  assert.equal(matchesPatternScanSideFilter("long", "long"), true);
  assert.equal(matchesPatternScanSideFilter("short", "long"), false);

  const rows = [
    { symbol: "BTCUSDT", side: "long" },
    { symbol: "ETHUSDT", side: "short" }
  ];
  assert.equal(filterPatternScanRowsBySide(rows, "both").length, 2);
  assert.deepEqual(
    filterPatternScanRowsBySide(rows, "short").map((r) => r.symbol),
    ["ETHUSDT"]
  );
  assert.deepEqual(filterPatternScanRowsBySide(null, "long"), []);
});

test("findPattern12HitsInLookback returns [] for short series", () => {
  assert.deepEqual(findPattern12HitsInLookback([], PATTERN_SCAN_DEFAULT_LOOKBACK), []);
  assert.deepEqual(
    findPattern12HitsInLookback([{ close: 1 }, { close: 2 }], 50),
    []
  );
});

test("findLatestPattern12InLookback is null-safe", () => {
  assert.equal(findLatestPattern12InLookback(null, 20), null);
  assert.equal(findLatestPattern12InLookback([], 20), null);
});

test("readTerminalPattern12Settings snapshots chart_indicators_v1", () => {
  const prev = globalThis.localStorage;
  const store = new Map();
  globalThis.localStorage = {
    getItem: (k) => (store.has(k) ? store.get(k) : null),
    setItem: (k, v) => {
      store.set(k, String(v));
    },
    removeItem: (k) => {
      store.delete(k);
    }
  };

  try {
    const fallback = readTerminalPattern12Settings();
    assert.equal(fallback.lngRsiLength, 14);

    store.set(
      TERMINAL_INDICATORS_STORAGE_KEY,
      JSON.stringify({
        "settings_pattern-12": {
          lngRsiLength: 21,
          shtRsiLength: 9,
          decLowsBeforePt1: 2
        }
      })
    );

    const snap = readTerminalPattern12Settings();
    assert.equal(snap.lngRsiLength, 21);
    assert.equal(snap.shtRsiLength, 9);
    assert.equal(snap.decLowsBeforePt1, 2);
    assert.equal(snap.lngMicRsiLength, 4);
  } finally {
    if (prev === undefined) {
      delete globalThis.localStorage;
    } else {
      globalThis.localStorage = prev;
    }
  }
});
