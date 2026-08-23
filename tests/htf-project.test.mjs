import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

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
    if (!Number.isFinite(srcTime) || srcTime > t || !Number.isFinite(value)) {
      continue;
    }
    out.push({ time: t, value });
  }
  return out;
}

test("htf-project.js still exports the HTF mapper used by RSI/MACD/MA", () => {
  assert.match(src, /export function projectHtfPointsOntoChart/);
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
