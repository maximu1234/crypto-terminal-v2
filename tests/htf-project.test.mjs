import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import {
  mergeChartTailIntoHtf,
  sourceHistoryRequests,
  fetchHtfCandles,
  clearAllHtfCache,
  tfPeriodSec
} from "../js/indicators/htf-loader.js";

const src = readFileSync(
  join(dirname(fileURLToPath(import.meta.url)), "../js/indicators/htf-project.js"),
  "utf8"
);

function projectHtfPointsOntoChart(chartCandles, htfPoints) {
  const chart = Array.isArray(chartCandles) ? chartCandles : [];
  const points = Array.isArray(htfPoints) ? htfPoints : [];
  if (!chart.length || !points.length) {
    return [];
  }
  const out = [];
  let i = 0;
  for (const bar of chart) {
    const t = Number(bar?.time);
    if (!Number.isFinite(t)) {
      continue;
    }
    while (i + 1 < points.length && Number(points[i + 1].time) <= t) {
      i++;
    }
    const srcPt = points[i];
    const srcTime = Number(srcPt?.time);
    const value = Number(srcPt?.value);
    if (Number.isFinite(srcTime) && srcTime <= t && Number.isFinite(value)) {
      out.push({ time: t, value });
    } else {
      out.push({ time: t });
    }
  }
  return out;
}

function projectLtfPointsOntoChart(chartCandles, ltfPoints, chartTf, sourceTf) {
  const chartSec = tfPeriodSec(chartTf);
  const srcSec = tfPeriodSec(sourceTf);
  if (!(chartSec > 0) || !(srcSec > 0) || srcSec >= chartSec) {
    return projectHtfPointsOntoChart(chartCandles, ltfPoints);
  }
  const chart = Array.isArray(chartCandles) ? chartCandles : [];
  const points = Array.isArray(ltfPoints) ? ltfPoints : [];
  if (!chart.length || !points.length) {
    return [];
  }
  const out = [];
  let i = 0;
  for (const bar of chart) {
    const t = Number(bar?.time);
    if (!Number.isFinite(t)) {
      continue;
    }
    const cutoff = t + chartSec - srcSec;
    while (i + 1 < points.length && Number(points[i + 1].time) <= cutoff) {
      i++;
    }
    const srcPt = points[i];
    const srcTime = Number(srcPt?.time);
    const value = Number(srcPt?.value);
    if (Number.isFinite(srcTime) && srcTime <= cutoff && Number.isFinite(value)) {
      out.push({ time: t, value });
    } else {
      out.push({ time: t });
    }
  }
  return out;
}

test("htf-project.js still exports the HTF mapper used by RSI/MACD/MA", () => {
  assert.match(src, /export function projectHtfPointsOntoChart/);
  assert.match(src, /export function projectLtfPointsOntoChart/);
  assert.match(src, /export async function buildChartRsiPoints/);
  assert.match(src, /Таймфрейм/);
});

test("4h RSI holds across 5m bars until the next 4h close", () => {
  const chart = [
    { time: 100 },
    { time: 200 },
    { time: 300 },
    { time: 400 }
  ];
  const htf = [
    { time: 100, value: 40 },
    { time: 300, value: 55 }
  ];
  assert.deepEqual(projectHtfPointsOntoChart(chart, htf), [
    { time: 100, value: 40 },
    { time: 200, value: 40 },
    { time: 300, value: 55 },
    { time: 400, value: 55 }
  ]);
});

test("1m RSI on 5m chart uses the last closed 1m inside the 5m bar", () => {
  const chart = [{ time: 0 }, { time: 300 }];
  const ltf = [];
  for (let t = 0; t <= 540; t += 60) {
    ltf.push({ time: t, value: t / 60 });
  }
  assert.deepEqual(projectLtfPointsOntoChart(chart, ltf, "5", "1"), [
    { time: 0, value: 4 },
    { time: 300, value: 9 }
  ]);
});

test("1m RSI on 5m chart keeps a point for every chart bar (whitespace prefix)", () => {
  const chart = [
    { time: 0 },
    { time: 300 },
    { time: 600 },
    { time: 900 },
    { time: 1200 }
  ];
  const ltf = [
    { time: 900, value: 42 },
    { time: 960, value: 44 },
    { time: 1200, value: 47 }
  ];
  const out = projectHtfPointsOntoChart(chart, ltf);
  assert.equal(out.length, chart.length);
  assert.deepEqual(out, [
    { time: 0 },
    { time: 300 },
    { time: 600 },
    { time: 900, value: 42 },
    { time: 1200, value: 47 }
  ]);
});

test("mergeChartTailIntoHtf does not append 5m bars onto a 1m series", () => {
  const chart = [
    { time: 0, open: 1, high: 2, low: 1, close: 1.5, volume: 1 },
    { time: 300, open: 1.5, high: 3, low: 1, close: 2, volume: 1 }
  ];
  const oneMin = [
    { time: 0, open: 1, high: 1, low: 1, close: 1, volume: 1 },
    { time: 60, open: 1, high: 1, low: 1, close: 1, volume: 1 }
  ];
  assert.equal(mergeChartTailIntoHtf(chart, oneMin, "1"), oneMin);
});

test("1m on a 5m chart asks for enough kline pages to cover the visible span", () => {
  assert.equal(sourceHistoryRequests("1", "5", 2500, 0), 13);
  assert.equal(sourceHistoryRequests("1", "5", 5000, 0), 13);
  assert.equal(sourceHistoryRequests("60", "5", 5000, 5), 5);
  assert.equal(sourceHistoryRequests("5", "5", 5000, 5), 5);
});

test("mergeChartTailIntoHtf still updates 1h HTF from a 5m chart tail", () => {
  const chart = [
    { time: 0, open: 1, high: 2, low: 1, close: 1.2, volume: 1 },
    { time: 300, open: 1.2, high: 1.8, low: 1.1, close: 1.5, volume: 2 }
  ];
  const oneHour = [
    { time: 0, open: 1, high: 1.1, low: 1, close: 1.05, volume: 1 }
  ];
  const merged = mergeChartTailIntoHtf(chart, oneHour, "60");
  assert.equal(merged.length, 1);
  assert.equal(merged[0].time, 0);
  assert.equal(merged[0].close, 1.5);
  assert.equal(merged[0].high, 2);
});

test("fetchHtfCandles asks loadHistory for extra 1m pages on a 5m chart", async () => {
  clearAllHtfCache();
  const seen = [];
  const chart = [
    { time: 0, open: 1, high: 1, low: 1, close: 1, volume: 1 },
    { time: 300, open: 1, high: 1, low: 1, close: 1, volume: 1 }
  ];
  for (let i = 2; i < 2500; i++) {
    chart.push({
      time: i * 300,
      open: 1,
      high: 1,
      low: 1,
      close: 1,
      volume: 1
    });
  }
  const loaded = await fetchHtfCandles(
    "ETHUSDT.P",
    "1",
    async (sym, tf, requests) => {
      seen.push({ sym, tf, requests });
      return [
        { time: 0, open: 1, high: 1, low: 1, close: 1, volume: 1 },
        { time: 60, open: 1, high: 1, low: 1, close: 1, volume: 1 }
      ];
    },
    chart,
    "5"
  );
  assert.equal(seen.length, 1);
  assert.equal(seen[0].tf, "1");
  assert.equal(seen[0].requests, 13);
  assert.equal(loaded.length, 2);
  clearAllHtfCache();
});

test("fetchHtfCandles refetches 1m tail when 5m chart advances ahead of cache", async () => {
  clearAllHtfCache();
  const calls = [];
  const chart1 = [
    { time: 0, open: 1, high: 1, low: 1, close: 1, volume: 1 },
    { time: 300, open: 1, high: 1, low: 1, close: 1, volume: 1 }
  ];
  const loader = async (sym, tf, requests) => {
    calls.push(requests);
    if (calls.length === 1) {
      return [
        { time: 0, open: 1, high: 1, low: 1, close: 1, volume: 1 },
        { time: 60, open: 1, high: 1, low: 1, close: 1, volume: 1 },
        { time: 120, open: 1, high: 1, low: 1, close: 1, volume: 1 }
      ];
    }
    return [
      { time: 0, open: 1, high: 1, low: 1, close: 1, volume: 1 },
      { time: 60, open: 1, high: 1, low: 1, close: 1, volume: 1 },
      { time: 120, open: 1, high: 1, low: 1, close: 1, volume: 1 },
      { time: 360, open: 1, high: 1, low: 1, close: 1, volume: 1 },
      { time: 420, open: 1, high: 1, low: 1, close: 1, volume: 1 }
    ];
  };
  await fetchHtfCandles("BTCUSDT", "1", loader, chart1, "5");
  const chart2 = [
    ...chart1,
    { time: 600, open: 1, high: 1, low: 1, close: 1, volume: 1 }
  ];
  const loaded = await fetchHtfCandles("BTCUSDT", "1", loader, chart2, "5");
  assert.equal(calls.length, 2);
  assert.equal(calls[1], 2);
  assert.ok(loaded.some((bar) => bar.time >= 360));
  clearAllHtfCache();
});
