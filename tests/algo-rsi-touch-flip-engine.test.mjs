import test from "node:test";
import assert from "node:assert/strict";
import {
  notionalAt,
  computeWilderRsiValues,
  runRsiTouchFlip
} from "../js/algo-trading/rsi-touch-flip-engine.js";
import {
  normalizeRsiTouchFlipPrefs,
  pickRsiTouchFlipLaunchPrefs,
  RSI_TOUCH_FLIP_SIZE_AVERAGE,
  RSI_TOUCH_FLIP_SIZE_EQUAL
} from "../js/algo-trading/rsi-touch-flip-prefs.js";
import {
  marksToSeriesMarkers
} from "../js/algo-trading/rsi-touch-flip-overlay.js";

function candlesAt(price, count) {
  const rows = [];
  for (let i = 0; i < count; i++) {
    rows.push({
      time: 1_700_000_000 + i * 60,
      open: price,
      high: price,
      low: price,
      close: price
    });
  }
  return rows;
}

function rsiSeries(values) {
  return values.map((value) =>
    value == null ? NaN : value
  );
}

test("RSI Touch Flip equal size splits budget across stack", () => {
  const settings = normalizeRsiTouchFlipPrefs({
    maxStack: 3,
    budget: 90,
    sizeMode: RSI_TOUCH_FLIP_SIZE_EQUAL
  });
  assert.equal(notionalAt(0, settings), 30);
  assert.equal(notionalAt(2, settings), 30);
});

test("launch prefs copy strategy fields and drop analysis-only", () => {
  const launch = pickRsiTouchFlipLaunchPrefs({
    rsiLen: 12,
    osLevel: 25,
    obLevel: 80,
    initialCapital: 99999,
    showMarks: false,
    commissionPct: 1
  });
  assert.equal(launch.rsiLen, 12);
  assert.equal(launch.osLevel, 25);
  assert.equal(launch.obLevel, 80);
  assert.equal(launch.initialCapital, undefined);
  assert.equal(launch.showMarks, undefined);
  assert.equal(launch.commissionPct, undefined);
});

test("RSI Touch Flip averaging uses geometric slices", () => {
  const settings = normalizeRsiTouchFlipPrefs({
    maxStack: 3,
    budget: 100,
    sizeMode: RSI_TOUCH_FLIP_SIZE_AVERAGE,
    sizeMult: 1.5
  });
  const a = notionalAt(0, settings);
  const b = notionalAt(1, settings);
  const c = notionalAt(2, settings);
  assert.ok(Math.abs(a + b + c - 100) < 1e-9);
  assert.ok(Math.abs(b / a - 1.5) < 1e-9);
  assert.ok(Math.abs(c / b - 1.5) < 1e-9);
});

test("RSI Touch Flip OS opens long, OB closes and opens short", () => {
  const candles = candlesAt(100, 6);
  const rsiValues = rsiSeries([
    40, 40, 25, 40, 80, 80
  ]);
  const result = runRsiTouchFlip(
    candles,
    {
      rsiLen: 14,
      osLevel: 30,
      obLevel: 70,
      maxStack: 3,
      budget: 90,
      commissionPct: 0,
      initialCapital: 10000
    },
    { rsiValues }
  );
  assert.equal(result.overview.closedTrades, 1);
  assert.equal(result.openTrades.length, 1);
  assert.equal(result.openTrades[0].side, "short");
  assert.equal(result.closedTrades[0].side, "long");
  assert.equal(result.closedTrades[0].tag, "L1");
  const kinds = result.marks.map((m) => m.kind);
  assert.ok(kinds.includes("os"));
  assert.ok(kinds.includes("ob"));
  assert.ok(kinds.includes("long"));
  assert.ok(kinds.includes("short"));
  assert.ok(kinds.includes("close"));
});

test("RSI Touch Flip stacks then flips the whole stack", () => {
  const candles = candlesAt(100, 8);
  const rsiValues = rsiSeries([
    40, 25, 50, 25, 50, 25, 50, 80
  ]);
  const result = runRsiTouchFlip(
    candles,
    {
      maxStack: 3,
      budget: 90,
      commissionPct: 0,
      tradeSide: "BOTH"
    },
    { rsiValues }
  );
  assert.equal(result.closedTrades.length, 3);
  assert.deepEqual(
    result.closedTrades.map((t) => t.tag),
    ["L1", "L2", "L3"]
  );
  assert.equal(result.openTrades.length, 1);
  assert.equal(result.openTrades[0].tag, "S1");
});

test("RSI Touch Flip SHORT only does not open longs", () => {
  const candles = candlesAt(100, 4);
  const rsiValues = rsiSeries([40, 25, 40, 80]);
  const result = runRsiTouchFlip(
    candles,
    {
      tradeSide: "SHORT",
      commissionPct: 0,
      budget: 90
    },
    { rsiValues }
  );
  assert.equal(result.closedTrades.length, 0);
  assert.equal(result.openTrades.length, 1);
  assert.equal(result.openTrades[0].side, "short");
});

test("RSI Touch Flip Overview deducts commission and fills factor", () => {
  const candles = candlesAt(100, 5);
  candles[4].close = 110;
  candles[4].high = 110;
  candles[4].low = 110;
  candles[4].open = 110;
  const rsiValues = rsiSeries([40, 25, 40, 40, 80]);
  const result = runRsiTouchFlip(
    candles,
    {
      budget: 100,
      maxStack: 1,
      commissionPct: 0.04,
      initialCapital: 10000
    },
    { rsiValues }
  );
  const trade = result.closedTrades[0];
  assert.ok(trade);
  const qty = 100 / 100;
  const entryFee = qty * 100 * 0.0004;
  const exitFee = qty * 110 * 0.0004;
  const expected = (110 - 100) * qty - entryFee - exitFee;
  assert.ok(Math.abs(trade.pnl - expected) < 1e-9);
  assert.equal(result.overview.closedTrades, 1);
  assert.ok(result.overview.netProfit > 0);
  assert.equal(result.overview.longProfit, result.overview.netProfit);
  assert.equal(result.overview.shortProfit, 0);
  assert.equal(result.overview.percentProfitable, 100);
  assert.equal(result.overview.profitFactor, Infinity);
  assert.equal(result.overview.avgBars, 3);
});

test("Wilder RSI is 100 on a strictly rising series after warmup", () => {
  const rows = [];
  for (let i = 0; i < 20; i++) {
    rows.push({
      time: i,
      close: 100 + i
    });
  }
  const rsi = computeWilderRsiValues(rows, 14);
  assert.ok(Number.isNaN(rsi[13]));
  assert.equal(rsi[14], 100);
  assert.equal(rsi[19], 100);
});

test("markers merge SELL ALL and entry on the same bar", () => {
  const markers = marksToSeriesMarkers([
    { time: 100, kind: "close", text: "SELL ALL" },
    { time: 100, kind: "long", text: "L1" },
    { time: 100, kind: "os", text: "OS" }
  ]);
  assert.equal(markers.length, 1);
  assert.equal(markers[0].text, "SELL ALL L1");
  assert.equal(markers[0].position, "belowBar");
});
