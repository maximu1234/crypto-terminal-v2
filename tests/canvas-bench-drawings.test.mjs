import test from "node:test";
import assert from "node:assert/strict";

import {
  drawingScreenPoints,
  fractionalIndexAtTime,
  hitDrawing,
  sampleDrawings,
  timeAtFractionalIndex
} from "../js/canvas-bench/drawings.js";

test("time and bar index round-trip inside the series", () => {
  const candles = [];
  for (let i = 0; i < 10; i++) {
    candles.push({ time: 1_000 + i * 60, close: 100 + i });
  }
  const index = fractionalIndexAtTime(candles, 1_000 + 4.25 * 60);
  assert.ok(Math.abs(index - 4.25) < 1e-9);
  assert.equal(
    timeAtFractionalIndex(candles, index),
    1_000 + 4.25 * 60
  );
});

test("sample drawings cover the terminal coordinate tools", () => {
  const candles = [];
  for (let i = 0; i < 100; i++) {
    candles.push({
      time: i * 60,
      open: 100,
      high: 110,
      low: 90,
      close: 105
    });
  }
  const types = sampleDrawings(candles).map(item => item.type);
  assert.deepEqual(types, [
    "hline",
    "hray",
    "trendline",
    "rectangle",
    "fib",
    "channel",
    "arrow",
    "long"
  ]);
});

test("a horizontal line stays on its price when the chart scrolls", () => {
  const drawing = {
    type: "hline",
    points: [{ time: 0, price: 100 }]
  };
  const yOf = price => 200 - price;
  const still = drawingScreenPoints(drawing, () => 10, yOf, 0, 400);
  const scrolled = drawingScreenPoints(drawing, () => 80, yOf, 0, 400);
  assert.equal(still[0].y, scrolled[0].y);
  assert.equal(still[0].y, 100);
  assert.equal(scrolled[1].x, 400);
});

test("hit testing finds the line under the cursor and misses empty space", () => {
  const drawing = {
    type: "trendline",
    points: [
      { time: 0, price: 0 },
      { time: 10, price: 10 }
    ]
  };
  const xOf = time => time * 10;
  const yOf = price => price * 10;
  assert.equal(
    hitDrawing(drawing, xOf, yOf, 50, 50, 0, 200, 4),
    true
  );
  assert.equal(
    hitDrawing(drawing, xOf, yOf, 50, 80, 0, 200, 4),
    false
  );
});
