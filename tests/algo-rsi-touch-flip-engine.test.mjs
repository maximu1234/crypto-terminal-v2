import test from "node:test";
import assert from "node:assert/strict";
import {
  notionalAt,
  computeWilderRsiValues,
  runRsiTouchFlip,
  rsiTouchFlipCycleSlHit
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
  assert.equal(launch.cycleSlEnabled, false);
  const withSl = pickRsiTouchFlipLaunchPrefs({
    cycleSlEnabled: true,
    cycleSlPct: 40
  });
  assert.equal(withSl.cycleSlEnabled, true);
  assert.equal(withSl.cycleSlPct, 40);
  assert.equal("marginMode" in launch, false);
});

test("normalized prefs drop initialCapital; analysis percents use budget", () => {
  const prefs = normalizeRsiTouchFlipPrefs({
    budget: 50,
    initialCapital: 10000
  });
  assert.equal(prefs.initialCapital, undefined);
  assert.equal(prefs.budget, 50);
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
      commissionPct: 0
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
  const texts = result.marks.map((m) => m.text);
  assert.ok(texts.includes("SELL ALL"));
  assert.equal(result.closedTrades[0].comment, "SELL ALL @ OB");
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

test("RSI Touch Flip OS cover of shorts is BUY ALL", () => {
  const candles = candlesAt(100, 4);
  const rsiValues = rsiSeries([40, 80, 40, 25]);
  const result = runRsiTouchFlip(
    candles,
    {
      rsiLen: 14,
      osLevel: 30,
      obLevel: 70,
      commissionPct: 0,
      budget: 90
    },
    { rsiValues }
  );
  assert.equal(result.closedTrades[0].side, "short");
  assert.equal(result.closedTrades[0].comment, "BUY ALL @ OS");
  const closeMark = result.marks.find(
    (m) => m.kind === "close"
  );
  assert.equal(closeMark?.text, "BUY ALL");
  assert.equal(result.openTrades[0].side, "long");
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
      commissionPct: 0.04
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
  assert.ok(
    Math.abs(result.overview.netProfitPct - result.overview.netProfit) < 1e-9
  );
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

test("markers merge BUY ALL with long entry below the bar", () => {
  const markers = marksToSeriesMarkers([
    { time: 100, kind: "close", text: "BUY ALL" },
    { time: 100, kind: "long", text: "L1" },
    { time: 100, kind: "os", text: "OS" }
  ]);
  assert.equal(markers.length, 1);
  assert.equal(markers[0].text, "BUY ALL L1");
  assert.equal(markers[0].position, "belowBar");
  assert.equal(markers[0].color, "#26a69a");
});

test("markers merge SELL ALL with short entry above the bar", () => {
  const markers = marksToSeriesMarkers([
    { time: 200, kind: "close", text: "SELL ALL" },
    { time: 200, kind: "short", text: "S1" },
    { time: 200, kind: "ob", text: "OB" }
  ]);
  assert.equal(markers.length, 1);
  assert.equal(markers[0].text, "SELL ALL S1");
  assert.equal(markers[0].position, "aboveBar");
  assert.equal(markers[0].color, "#ef5350");
});

test("OS and OB touch markers are gray, not trade colors", () => {
  const os = marksToSeriesMarkers([{ time: 300, kind: "os", text: "OS" }]);
  const ob = marksToSeriesMarkers([{ time: 400, kind: "ob", text: "OB" }]);
  assert.equal(os[0].text, "OS");
  assert.equal(os[0].color, "#9ca3af");
  assert.equal(ob[0].text, "OB");
  assert.equal(ob[0].color, "#9ca3af");
});

test("cycle SL is off unless the checkbox flag is true", () => {
  assert.equal(
    rsiTouchFlipCycleSlHit(-40, 100, { cycleSlEnabled: false, cycleSlPct: 30 }),
    false
  );
  assert.equal(
    rsiTouchFlipCycleSlHit(-31, 100, { cycleSlEnabled: true, cycleSlPct: 30 }),
    true
  );
  assert.equal(
    rsiTouchFlipCycleSlHit(-29, 100, { cycleSlEnabled: true, cycleSlPct: 30 }),
    false
  );
});

test("max trade MAE tracks worst open PnL even if close is green", () => {
  const candles = [];
  const prices = [100, 100, 100, 73, 100, 100];
  for (let i = 0; i < prices.length; i++) {
    candles.push({
      time: 1_700_000_000 + i * 60,
      open: prices[i],
      high: prices[i],
      low: prices[i],
      close: prices[i]
    });
  }
  const rsiValues = rsiSeries([40, 40, 25, 40, 65, 75]);
  const result = runRsiTouchFlip(
    candles,
    {
      osLevel: 30,
      obLevel: 70,
      maxStack: 1,
      budget: 100,
      commissionPct: 0,
      tradeSide: "LONG"
    },
    { rsiValues }
  );
  assert.equal(result.closedTrades[0].pnl, 0);
  assert.ok(Math.abs(result.overview.maxTradeMae - 27) < 0.01);
  assert.ok(Math.abs(result.overview.maxTradeMaePct - 27) < 0.1);
});

test("compound sizing shrinks next stack after realized loss", () => {
  const candles = [];
  const prices = [100, 100, 100, 90, 90, 90, 90, 90];
  for (let i = 0; i < prices.length; i++) {
    candles.push({
      time: 1_700_000_000 + i * 60,
      open: prices[i],
      high: prices[i],
      low: prices[i],
      close: prices[i]
    });
  }
  const rsiValues = rsiSeries([40, 40, 25, 40, 65, 75, 40, 25]);
  const result = runRsiTouchFlip(
    candles,
    {
      osLevel: 30,
      obLevel: 70,
      maxStack: 1,
      budget: 100,
      commissionPct: 0,
      tradeSide: "LONG",
      compoundEnabled: true
    },
    { rsiValues }
  );
  assert.equal(result.closedTrades.length, 1);
  assert.ok(result.closedTrades[0].pnl < 0);
  assert.equal(result.openTrades.length, 1);
  assert.equal(result.openTrades[0].side, "long");
  const secondNotional = result.openTrades[0].qty * 90;
  assert.ok(Math.abs(secondNotional - 90) < 1e-6);
  assert.ok(Math.abs(secondNotional - 100) > 1);
});

test("compound off keeps fixed budget after realized loss", () => {
  const candles = [];
  const prices = [100, 100, 100, 90, 90, 90, 90, 90];
  for (let i = 0; i < prices.length; i++) {
    candles.push({
      time: 1_700_000_000 + i * 60,
      open: prices[i],
      high: prices[i],
      low: prices[i],
      close: prices[i]
    });
  }
  const rsiValues = rsiSeries([40, 40, 25, 40, 65, 75, 40, 25]);
  const result = runRsiTouchFlip(
    candles,
    {
      osLevel: 30,
      obLevel: 70,
      maxStack: 1,
      budget: 100,
      commissionPct: 0,
      tradeSide: "LONG",
      compoundEnabled: false
    },
    { rsiValues }
  );
  assert.equal(result.openTrades.length, 1);
  const secondNotional = result.openTrades[0].qty * 90;
  assert.ok(Math.abs(secondNotional - 100) < 1e-6);
});

test("full liquidation halts trading and marks LIQ", () => {
  const candles = candlesAt(100, 4);
  candles[3] = {
    ...candles[3],
    open: 350,
    high: 350,
    low: 350,
    close: 350
  };
  const rsiValues = rsiSeries([40, 68, 72, 40]);
  const result = runRsiTouchFlip(
    candles,
    {
      osLevel: 30,
      obLevel: 70,
      maxStack: 1,
      budget: 100,
      commissionPct: 0
    },
    { rsiValues }
  );
  assert.equal(result.overview.liquidations, 1);
  assert.equal(result.overview.tradingHalted, true);
  assert.ok(
    result.marks.some((m) => m.kind === "liquidation" && m.text === "LIQ")
  );
  const liqMarker = marksToSeriesMarkers(
    result.marks.filter((m) => m.kind === "liquidation")
  )[0];
  assert.equal(liqMarker?.text, "LIQ");
  assert.equal(liqMarker?.shape, "circle");
});

test("cycle SL closes the stack and does not re-enter while RSI stays in the zone", () => {
  const candles = [
    ...candlesAt(100, 3),
    { time: 1_700_000_000 + 3 * 60, open: 69, high: 69, low: 69, close: 69 },
    { time: 1_700_000_000 + 4 * 60, open: 69, high: 69, low: 69, close: 69 },
    { time: 1_700_000_000 + 5 * 60, open: 69, high: 69, low: 69, close: 69 },
    { time: 1_700_000_000 + 6 * 60, open: 69, high: 69, low: 69, close: 69 }
  ];
  const rsiValues = rsiSeries([40, 40, 25, 20, 20, 40, 25]);
  const prefs = {
    osLevel: 30,
    obLevel: 70,
    maxStack: 1,
    budget: 100,
    commissionPct: 0,
    cycleSlEnabled: true,
    cycleSlPct: 30
  };
  const withSl = runRsiTouchFlip(candles, prefs, { rsiValues });
  assert.equal(withSl.closedTrades.length, 1);
  assert.equal(withSl.closedTrades[0].comment, "CYCLE SL");
  assert.ok(withSl.marks.some((mark) => mark.text === "SL"));
  assert.equal(withSl.openTrades.length, 1);
  assert.equal(withSl.openTrades[0].side, "long");

  const off = runRsiTouchFlip(
    candles,
    { ...prefs, cycleSlEnabled: false },
    { rsiValues }
  );
  assert.equal(off.closedTrades.length, 0);
  assert.equal(off.openTrades.length, 1);
});
