import test from "node:test";
import assert from "node:assert/strict";
import {
  projectClosedSourceRsiOntoChart,
  resolveRsiTouchFlipChartRsi,
  rsiTouchFlipSourcePages,
  rsiTouchFlipChartDays
} from "../js/algo-trading/rsi-touch-flip-mtf.js";

test("1m RSI on 5m chart uses the last 1m bar inside the 5m close", () => {
  const chart = [{ time: 0, close: 1 }, { time: 300, close: 1 }];
  const source = [];
  const rsi = [];
  for (let t = 0; t <= 540; t += 60) {
    source.push({ time: t, close: 1 });
    rsi.push(t / 60);
  }
  const out = projectClosedSourceRsiOntoChart(
    chart,
    "5",
    source,
    "1",
    rsi
  );
  // 5m [0,300): last 1m open 240 → index 4
  assert.equal(out[0], 4);
  // 5m [300,600): last 1m open 540 → index 9
  assert.equal(out[1], 9);
});

test("15m RSI on 5m chart waits until the 15m bar has closed", () => {
  const chart = [
    { time: 0, close: 1 },
    { time: 300, close: 1 },
    { time: 600, close: 1 }
  ];
  const source = [{ time: 0, close: 1 }];
  const rsi = [42];
  const out = projectClosedSourceRsiOntoChart(
    chart,
    "5",
    source,
    "15",
    rsi
  );
  assert.ok(Number.isNaN(out[0]));
  assert.ok(Number.isNaN(out[1]));
  assert.equal(out[2], 42);
});

test("1m history pages cover the 5m chart span", () => {
  const chart = [];
  for (let i = 0; i < 10_000; i++) {
    chart.push({ time: 1_700_000_000 + i * 300 });
  }
  const pages = rsiTouchFlipSourcePages(chart, "5", "1", 12);
  assert.ok(pages >= 50);
  assert.ok(pages <= 60);
});

test("chart days is span from first open to last close", () => {
  const chart = [];
  for (let i = 0; i < 10_000; i++) {
    chart.push({ time: 1_700_000_000 + i * 300 });
  }
  const days = rsiTouchFlipChartDays(chart, "5");
  assert.ok(Math.abs(days - 10_000 * 300 / 86400) < 1e-9);
});

test("missing RSI TF history throws instead of using chart RSI", async () => {
  const chart = [];
  for (let i = 0; i < 40; i++) {
    chart.push({ time: 1_700_000_000 + i * 300, close: 100 + i });
  }
  await assert.rejects(
    () =>
      resolveRsiTouchFlipChartRsi(chart, { rsiLen: 14, rsiTf: "1" }, {
        chartTf: "5",
        symbol: "BTCUSDT",
        loadHistory: async () => []
      }),
    /нет свечей RSI ТФ/
  );
});

test("invalid RSI TF throws instead of silent chart RSI", async () => {
  const chart = [{ time: 1, close: 1 }, { time: 2, close: 2 }];
  await assert.rejects(
    () =>
      resolveRsiTouchFlipChartRsi(chart, { rsiLen: 14, rsiTf: "1" }, {
        chartTf: "nope",
        symbol: "BTCUSDT",
        loadHistory: async () => [{ time: 1, close: 1 }]
      }),
    /некорректный ТФ RSI/
  );
});
