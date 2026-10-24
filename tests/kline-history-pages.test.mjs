import assert from "node:assert/strict";
import test from "node:test";

import {
klineGapFillEnds,
klineHistoryPageEnds,
klineTfToMs,
mapWithConcurrency,
shouldFetchKlinePagesInParallel
} from "../js/kline-history-pages.js";
import {
rsiTouchFlipSourceCoversChart
} from "../js/algo-trading/rsi-touch-flip-mtf.js";

test("klineTfToMs maps Bybit interval tokens", () => {
  assert.equal(klineTfToMs("1"), 60_000);
  assert.equal(klineTfToMs("5"), 300_000);
  assert.equal(klineTfToMs("60"), 3_600_000);
  assert.equal(klineTfToMs("D"), 86_400_000);
  assert.equal(klineTfToMs("W"), 604_800_000);
  assert.equal(klineTfToMs("nope"), 0);
});

test("klineHistoryPageEnds estimates 10 adjacent 1000-bar pages", () => {
  const end0 = 1_700_000_000_000;
  const ends = klineHistoryPageEnds(end0, "5", 10);
  assert.equal(ends.length, 10);
  assert.equal(ends[0], end0);
  const pageMs = 1000 * 5 * 60_000;
  assert.equal(ends[1], end0 - pageMs);
  assert.equal(ends[9], end0 - 9 * pageMs);
});

test("klineHistoryPageEnds is empty when tf is unknown", () => {
  assert.deepEqual(klineHistoryPageEnds(Date.now(), "xyz", 10), []);
});

test("shouldFetchKlinePagesInParallel only for long history with gap 0", () => {
  assert.equal(shouldFetchKlinePagesInParallel(2, 0), false);
  assert.equal(shouldFetchKlinePagesInParallel(10, 0), true);
  assert.equal(shouldFetchKlinePagesInParallel(10, 80), false);
});

test("klineGapFillEnds ignores a tight series and names a hole", () => {
  const start = 1_700_000_000;
  const tight = Array.from({ length: 5 }, (_, i) => ({ time: start + i * 60 }));
  assert.deepEqual(klineGapFillEnds(tight, "1"), []);
  const gapped = [
    { time: start },
    { time: start + 60 * 2500 }
  ];
  const ends = klineGapFillEnds(gapped, "1", 1000);
  assert.equal(ends.length, 3);
  assert.equal(ends[0], (start + 60 * 2500 - 60) * 1000);
});

test("mapWithConcurrency keeps order", async () => {
  const out = await mapWithConcurrency([1, 2, 3, 4], 2, async (n) => n * 10);
  assert.deepEqual(out, [10, 20, 30, 40]);
});

test("rsi source must cover the chart without a hole", () => {
  const chart = [
    { time: 1_000 },
    { time: 1_300 }
  ];
  const covered = [
    { time: 1_000 },
    { time: 1_060 },
    { time: 1_120 },
    { time: 1_180 },
    { time: 1_240 },
    { time: 1_300 },
    { time: 1_360 },
    { time: 1_420 },
    { time: 1_480 },
    { time: 1_540 }
  ];
  assert.equal(rsiTouchFlipSourceCoversChart(covered, chart, "5", "1"), true);
  const holed = covered.filter((row) => row.time !== 1_240);
  assert.equal(rsiTouchFlipSourceCoversChart(holed, chart, "5", "1"), false);
  const late = covered.filter((row) => row.time >= 1_480);
  assert.equal(rsiTouchFlipSourceCoversChart(late, chart, "5", "1"), false);
  const forming = covered.filter((row) => row.time <= 1_300);
  assert.equal(rsiTouchFlipSourceCoversChart(forming, chart, "5", "1"), true);
});
