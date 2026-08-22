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
  readTerminalScanIndicatorSettings,
  normalizeScriptScanIndicatorId,
  SCRIPT_SCAN_INDICATOR_EARLY_T3,
  SCRIPT_SCAN_INDICATOR_PATTERN12,
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

test("Script scan source: original scene exposes setups independent of pt4 dots", async () => {
  const { computePattern12Scene, defaultPattern12Settings } = await import(
    "../js/indicators/pattern-12-math.js"
  );

  const candles = Array.from({ length: 40 }, (_, i) => ({
    time: i + 1,
    open: 100,
    high: 101,
    low: 99,
    close: 100
  }));

  const scene = computePattern12Scene(candles, {
    ...defaultPattern12Settings(),
    showLngPt4Dot: false,
    showShtPt4Dot: false
  });

  assert.ok(Array.isArray(scene.setups));
  assert.deepEqual(scene.pt4Dots, []);
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
    assert.equal(fallback.lngRsiLength, 17);

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
    assert.equal(snap.lngMicRsiLength, 1);
    assert.equal(snap.tempFastPt4, false);
    assert.equal(snap.tempFastPt4Bars, 2);

    store.set(
      TERMINAL_INDICATORS_STORAGE_KEY,
      JSON.stringify({
        "settings_pattern-12": {
          tempFastPt4: true,
          tempFastPt4Bars: 3
        }
      })
    );

    const fastSnap = readTerminalPattern12Settings();
    assert.equal(fastSnap.tempFastPt4, true);
    assert.equal(fastSnap.tempFastPt4Bars, 3);
  } finally {
    if (prev === undefined) {
      delete globalThis.localStorage;
    } else {
      globalThis.localStorage = prev;
    }
  }
});

function volatilePatternCandles() {
  const rows = [];
  let random = 1;
  let price = 100;
  for (let i = 0; i < 800; i++) {
    random = (1664525 * random + 1013904223) >>> 0;
    const open = price;
    const move =
      (random / 4294967296 - 0.5) * 3 + Math.sin(i / 17) * 0.25 + Math.sin(i / 53) * 0.15;
    price = Math.max(5, price + move);
    rows.push({
      time: i + 1,
      open,
      high: Math.max(open, price) + 0.4,
      low: Math.min(open, price) - 0.4,
      close: price
    });
  }
  return rows;
}

test("Script parse: tempFastPt4 changes hits in default lookback", async () => {
  const { defaultPattern12Settings } = await import("../js/indicators/pattern-12-math.js");
  const candles = volatilePatternCandles();
  const base = {
    ...defaultPattern12Settings(),
    lngRsiLength: 6,
    shtRsiLength: 6,
    lngMicRsiLength: 3,
    shtMicRsiLength: 3,
    decLowsBeforePt1: 0,
    ascHighsBeforePt1: 0,
    waveAMode: "both",
    tempFastPt4Bars: 1
  };

  const slow = findPattern12HitsInLookback(candles, PATTERN_SCAN_DEFAULT_LOOKBACK, "both", {
    ...base,
    tempFastPt4: false
  });
  const fast = findPattern12HitsInLookback(candles, PATTERN_SCAN_DEFAULT_LOOKBACK, "both", {
    ...base,
    tempFastPt4: true
  });

  assert.deepEqual(slow, []);
  assert.equal(fast.length, 1);
  assert.equal(fast[0].side, "short");
  assert.equal(fast[0].bar, 793);
});

test("normalizeScriptScanIndicatorId defaults to Pattern 1-2", () => {
  assert.equal(normalizeScriptScanIndicatorId(), SCRIPT_SCAN_INDICATOR_PATTERN12);
  assert.equal(normalizeScriptScanIndicatorId("nope"), SCRIPT_SCAN_INDICATOR_PATTERN12);
  assert.equal(
    normalizeScriptScanIndicatorId(SCRIPT_SCAN_INDICATOR_EARLY_T3),
    SCRIPT_SCAN_INDICATOR_EARLY_T3
  );
});

test("readTerminalScanIndicatorSettings reads EARLY T3 snapshot separately", () => {
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
    store.set(
      TERMINAL_INDICATORS_STORAGE_KEY,
      JSON.stringify({
        "settings_pattern-12": {
          lngRsiLength: 21
        },
        "settings_pattern-12-early-t3": {
          lngRsiLength: 14,
          onePt34Per12: true,
          earlyT3RsiLen: 5
        }
      })
    );

    const original = readTerminalScanIndicatorSettings(SCRIPT_SCAN_INDICATOR_PATTERN12);
    const early = readTerminalScanIndicatorSettings(SCRIPT_SCAN_INDICATOR_EARLY_T3);

    assert.equal(original.lngRsiLength, 21);
    assert.equal(early.lngRsiLength, 14);
    assert.equal(early.onePt34Per12, true);
    assert.equal(early.earlyT3RsiLen, 5);
    assert.notEqual(original.onePt34Per12, true);
  } finally {
    if (prev === undefined) {
      delete globalThis.localStorage;
    } else {
      globalThis.localStorage = prev;
    }
  }
});
