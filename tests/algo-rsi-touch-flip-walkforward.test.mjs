import test from "node:test";
import assert from "node:assert/strict";
import {
  isBetterRsiTouchFlipLaunch,
  listRsiTouchFlipOptimizeCombos,
  optimizeRsiTouchFlipParams,
  scoreRsiTouchFlipTrainOverview
} from "../js/algo-trading/rsi-touch-flip-optimize.js";
import {
  clampRsiTouchFlipTrainPct,
  formatRsiTouchFlipParamsBrief,
  rsiTouchFlipLaunchAdvice,
  rsiTouchFlipMinTestTrades,
  rsiTouchFlipSplitIndex,
  rsiTouchFlipTestVerdict,
  rsiTouchFlipTrainTestSplit
} from "../js/algo-trading/rsi-touch-flip-walkforward.js";

test("train pct clamps to 50..90", () => {
  assert.equal(clampRsiTouchFlipTrainPct(70), 70);
  assert.equal(clampRsiTouchFlipTrainPct(10), 50);
  assert.equal(clampRsiTouchFlipTrainPct(99), 90);
});

test("10000 bars at 70% split after last train bar", () => {
  assert.equal(rsiTouchFlipSplitIndex(10_000, 70), 7000);
  const candles = [];
  for (let i = 0; i < 10_000; i++) {
    candles.push({ time: 1_700_000_000 + i * 300 });
  }
  const split = rsiTouchFlipTrainTestSplit(candles, undefined, "5", 70);
  assert.equal(split.train.bars, 7000);
  assert.equal(split.test.bars, 3000);
  assert.ok(Math.abs(split.train.days - 7000 * 300 / 86400) < 1e-9);
  assert.ok(Math.abs(split.test.days - 3000 * 300 / 86400) < 1e-9);
});

test("short history cannot split", () => {
  assert.equal(rsiTouchFlipSplitIndex(50, 70), 0);
  assert.equal(rsiTouchFlipTrainTestSplit([], [], "5", 70), null);
});

test("test verdict requires profit, trades and PF", () => {
  const fail = rsiTouchFlipTestVerdict(
    {
      closedTrades: 2,
      netProfit: -5,
      profitFactor: 0.4,
      maxDrawdownPct: 40
    },
    { minTrades: 8, maxDdPct: 25 }
  );
  assert.equal(fail.ok, false);
  assert.ok(fail.reasons.length >= 3);

  const pass = rsiTouchFlipTestVerdict(
    {
      closedTrades: 12,
      netProfit: 8,
      profitFactor: 1.4,
      maxDrawdownPct: 10
    },
    { minTrades: 8, maxDdPct: 25 }
  );
  assert.equal(pass.ok, true);
});

test("launch advice tells to use Test, not full-chart Overview", () => {
  const idle = rsiTouchFlipLaunchAdvice(null);
  assert.equal(idle.canLaunch, false);
  assert.match(idle.detail, /Test/);

  const ok = rsiTouchFlipLaunchAdvice({ ok: true, reasons: [] });
  assert.equal(ok.canLaunch, true);
  assert.match(ok.title, /Запускать/);

  const fitted = rsiTouchFlipLaunchAdvice(
    { ok: false, reasons: ["Test не прибыльный"] },
    { netProfit: 40 },
    { netProfit: -12 }
  );
  assert.equal(fitted.canLaunch, false);
  assert.match(fitted.title, /не нашла/);
  assert.match(fitted.detail, /не «с чем запускать»|не рекомендация/);

  const keepFields = rsiTouchFlipLaunchAdvice(
    { ok: false, reasons: ["просадка Test 42.3% > 25%"] },
    { netProfit: 15 },
    { netProfit: 3 },
    { currentPassesTest: true }
  );
  assert.equal(keepFields.canLaunch, false);
  assert.match(keepFields.detail, /полях слева/);
});

test("params brief lists the launch fields", () => {
  const text = formatRsiTouchFlipParamsBrief({
    rsiLen: 14,
    osLevel: 25,
    obLevel: 75,
    maxStack: 2,
    rsiTf: "5",
    tradeSide: "BOTH"
  });
  assert.match(text, /RSI 14/);
  assert.match(text, /OS 25/);
  assert.match(text, /OB 75/);
  assert.match(text, /стек 2/);
  assert.match(text, /5m/);
});

test("optimize grid is every integer in RSI/OS/OB/stack ranges", () => {
  const combos = listRsiTouchFlipOptimizeCombos();
  assert.equal(combos.length, 17 * 21 * 21 * 10);
  assert.equal(combos[0].rsiLen, 5);
  assert.equal(combos[combos.length - 1].rsiLen, 21);
  assert.equal(combos[0].osLevel, 15);
  assert.equal(
    combos.some((c) => c.osLevel === 16 && c.obLevel === 66 && c.maxStack === 10),
    true
  );
  assert.equal(
    combos.every((c) => c.obLevel > c.osLevel),
    true
  );
  assert.equal(
    combos.some((c) => c.rsiLen === 6),
    true
  );
});

test("launch pick prefers a passing Test over a richer failing Train", () => {
  const passing = {
    verdict: { ok: true },
    test: {
      closedTrades: 20,
      netProfit: 8,
      profitFactor: 1.5,
      maxDrawdownPct: 10
    }
  };
  const failing = {
    verdict: { ok: false, reasons: ["Test не прибыльный"] },
    test: {
      closedTrades: 40,
      netProfit: 40,
      profitFactor: 0.5,
      maxDrawdownPct: 30
    }
  };
  assert.equal(isBetterRsiTouchFlipLaunch(passing, failing), true);
  assert.equal(isBetterRsiTouchFlipLaunch(failing, passing), false);
});

test("train score prefers higher net profit", () => {
  const low = scoreRsiTouchFlipTrainOverview({
    closedTrades: 10,
    netProfit: 1,
    profitFactor: 2,
    maxDrawdownPct: 5
  });
  const high = scoreRsiTouchFlipTrainOverview({
    closedTrades: 10,
    netProfit: 20,
    profitFactor: 1.2,
    maxDrawdownPct: 8
  });
  assert.ok(high > low);
});

test("min test trades scales with window length", () => {
  assert.equal(rsiTouchFlipMinTestTrades(40), 4);
  assert.equal(rsiTouchFlipMinTestTrades(3000), 8);
});

function oscillatingSeries(count) {
  const candles = [];
  const rsi = [];
  for (let i = 0; i < count; i++) {
    const phase = i % 6;
    const os = phase <= 1;
    const ob = phase === 3 || phase === 4;
    const price = ob ? 110 : 100;
    candles.push({
      time: 1_700_000_000 + i * 60,
      open: price,
      high: price,
      low: price,
      close: price
    });
    rsi.push(os ? 25 : ob ? 80 : 50);
  }
  return { candles, rsi };
}

test("optimize picks a combo on Train and scores Test separately", async () => {
  const { candles, rsi } = oscillatingSeries(240);
  const rsiByLen = new Map([
    [7, rsi],
    [10, rsi],
    [14, rsi],
    [21, rsi]
  ]);
  const result = await optimizeRsiTouchFlipParams({
    candles,
    rsiByLen,
    combos: [
      { rsiLen: 7, osLevel: 25, obLevel: 80, maxStack: 1 },
      { rsiLen: 14, osLevel: 25, obLevel: 80, maxStack: 2 },
      { rsiLen: 21, osLevel: 30, obLevel: 70, maxStack: 3 }
    ],
    basePrefs: {
      commissionPct: 0,
      budget: 90,
      maxStack: 3,
      initialCapital: 10000,
      tradeSide: "BOTH"
    },
    chartTf: "1",
    trainPct: 70,
    yieldEvery: 0
  });
  assert.equal(result.cancelled, false);
  assert.ok(result.best);
  assert.ok(result.best.prefs.rsiLen);
  assert.ok(result.best.train.closedTrades >= 8);
  assert.ok(result.best.test);
  assert.ok(result.best.verdict);
  assert.notEqual(result.best.train.netProfit, result.best.test.netProfit);
});
