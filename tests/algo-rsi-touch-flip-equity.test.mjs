import test from "node:test";
import assert from "node:assert/strict";
import {
  runRsiTouchFlip
} from "../js/algo-trading/rsi-touch-flip-engine.js";
import {
  buildRsiTouchFlipEquityModel,
  buildRsiTouchFlipTradeHistogram,
  normalizeRsiTouchFlipEquityCurve
} from "../js/algo-trading/rsi-touch-flip-equity.js";

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
  return values.map((value) => (value == null ? NaN : value));
}

test("runRsiTouchFlip skips equity curve unless collectEquity", () => {
  const candles = candlesAt(100, 6);
  const rsiValues = rsiSeries([40, 40, 25, 40, 80, 80]);
  const prefs = {
    rsiLen: 14,
    osLevel: 30,
    obLevel: 70,
    maxStack: 3,
    budget: 90,
    commissionPct: 0
  };
  const idle = runRsiTouchFlip(candles, prefs, { rsiValues });
  assert.equal(idle.equityCurve.length, 0);

  const collected = runRsiTouchFlip(candles, prefs, {
    rsiValues,
    collectEquity: true
  });
  assert.equal(collected.equityCurve.length, candles.length);
  const last = collected.equityCurve[collected.equityCurve.length - 1];
  assert.ok(Math.abs(last.value - collected.overview.netProfitPct) < 1e-8);
});

test("equity curve last point matches closed net while a trade is open at a moved price", () => {
  const candles = candlesAt(100, 6);
  candles[5] = {
    ...candles[5],
    open: 100,
    high: 100,
    low: 80,
    close: 80
  };
  const rsiValues = rsiSeries([40, 40, 25, 40, 80, 80]);
  const collected = runRsiTouchFlip(
    candles,
    {
      rsiLen: 14,
      osLevel: 30,
      obLevel: 70,
      maxStack: 3,
      budget: 90,
      commissionPct: 0
    },
    { rsiValues, collectEquity: true }
  );
  assert.equal(collected.openTrades.length, 1);
  assert.equal(collected.openTrades[0].side, "short");
  assert.ok(collected.overview.openPnl > 0);
  const last = collected.equityCurve[collected.equityCurve.length - 1];
  assert.ok(Math.abs(last.value - collected.overview.netProfitPct) < 1e-8);
  const mtmPct = (collected.overview.finalEquity - 90) / 90 * 100;
  assert.ok(Math.abs(mtmPct - last.value) > 0.5);
});

test("trade histogram sums PnL on the same exit bar as % of budget", () => {
  const candles = candlesAt(100, 4);
  const rows = buildRsiTouchFlipTradeHistogram(
    [
      { exitIndex: 2, pnl: 9 },
      { exitIndex: 2, pnl: -3 },
      { exitIndex: 3, pnl: 4.5 }
    ],
    candles,
    90
  );
  assert.equal(rows.length, 2);
  assert.equal(rows[0].time, candles[2].time);
  assert.ok(Math.abs(rows[0].value - 6 / 90 * 100) < 1e-10);
  assert.equal(rows[0].color, "#26a69a");
  assert.equal(rows[1].time, candles[3].time);
  assert.ok(Math.abs(rows[1].value - 4.5 / 90 * 100) < 1e-10);
});

test("equity model splits Train / Test on the walk-forward index", () => {
  const n = 200;
  const candles = candlesAt(100, n);
  const curve = candles.map((row, i) => ({
    time: row.time,
    value: i * 0.1
  }));
  const model = buildRsiTouchFlipEquityModel({
    equityCurve: curve,
    closedTrades: [{ exitIndex: 190, pnl: 2 }],
    candles,
    capital: 100,
    trainPct: 70
  });
  assert.equal(model.hasSplit, true);
  assert.equal(model.splitTime, candles[140].time);
  assert.equal(model.train[model.train.length - 1].time, candles[139].time);
  assert.equal(model.test[0].time, candles[139].time);
  assert.equal(model.test[1].time, candles[140].time);
  assert.equal(model.histogram.length, 1);
  assert.equal(model.histogram[0].time, candles[190].time);
  assert.equal(model.fromTime, curve[0].time);
  assert.equal(model.toTime, curve[curve.length - 1].time);
  assert.equal(model.line.length, curve.length);
  assert.equal(model.line[0].time, curve[0].time);
  assert.equal(model.line[model.line.length - 1].value, curve[curve.length - 1].value);
});

test("normalize equity curve keeps last point for duplicate timestamps", () => {
  const rows = normalizeRsiTouchFlipEquityCurve([
    { time: 100, value: 1 },
    { time: 100, value: 2 },
    { time: 101, value: 3 }
  ]);
  assert.deepEqual(rows, [
    { time: 100, value: 2 },
    { time: 101, value: 3 }
  ]);
});
