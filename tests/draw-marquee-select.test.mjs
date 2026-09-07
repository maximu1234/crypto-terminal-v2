import test from "node:test";
import assert from "node:assert/strict";

import {
normalizeScreenRect,
pointInScreenRect,
screenRectsIntersect,
segmentIntersectsScreenRect
} from "../js/drawings/math.js";

import {
createDrawHitTester
} from "../js/drawings/draw-hit.js";

test("segmentIntersectsScreenRect crosses and misses", () => {
  const rect = normalizeScreenRect(10, 10, 40, 40);

  assert.equal(
    segmentIntersectsScreenRect(0, 25, 50, 25, rect),
    true
  );
  assert.equal(
    segmentIntersectsScreenRect(20, 20, 30, 30, rect),
    true
  );
  assert.equal(
    segmentIntersectsScreenRect(0, 0, 5, 5, rect),
    false
  );
  assert.equal(
    pointInScreenRect(10, 10, rect),
    true
  );
  assert.equal(
    screenRectsIntersect(rect, normalizeScreenRect(35, 35, 80, 80)),
    true
  );
  assert.equal(
    screenRectsIntersect(rect, normalizeScreenRect(50, 50, 80, 80)),
    false
  );
});

test("marquee selects drawings that the rect touches", () => {
  const hit = createDrawHitTester({
    toXY(pt) {
      if (!pt) {
        return null;
      }
      if (pt.time === 1) {
        return { x: 40, y: 50 };
      }
      if (pt.time === 2) {
        return { x: 180, y: 120 };
      }
      return null;
    },
    getPlotWidth: () => 400,
    series: {
      priceToCoordinate: price => 400 - price,
      priceScale: () => ({
        options: () => ({ mode: 0 })
      })
    },
    pointFromXY: (x, y) => ({ time: x, price: y }),
    getCandles: () => []
  });

  const line = {
    id: "line-a",
    type: "trendline",
    p1: { time: 1, price: 100 },
    p2: { time: 2, price: 200 }
  };
  const hline = {
    id: "hline-a",
    type: "hline",
    time: 1,
    price: 100
  };

  assert.deepEqual(
    hit.drawingsIntersectingRect([line, hline], 0, 40, 80, 70),
    ["line-a", "hline-a"]
  );
  assert.deepEqual(
    hit.drawingsIntersectingRect([line, hline], 0, 200, 10, 220),
    []
  );

  const rectShape = {
    id: "rect-a",
    type: "rectangle",
    p1: { time: 1, price: 100 },
    p2: { time: 2, price: 200 }
  };

  assert.ok(
    hit.drawingsIntersectingRect([rectShape], 50, 60, 90, 100).includes("rect-a")
  );
  assert.equal(
    hit.drawingsIntersectingRect([rectShape], 300, 0, 320, 10).includes("rect-a"),
    false
  );
});
