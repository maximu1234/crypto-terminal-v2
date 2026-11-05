import test from "node:test";
import assert from "node:assert/strict";

import { timeAtFractionalIndex } from "../js/canvas-bench/drawings.js";
import { candleIndexAt, candleX, rightGapPx } from "../js/canvas-bench/live-plan.js";
import {
  applyLogicalRange,
  histogramRowSpan,
  logicalRangeFitsSeries,
  logicalRangeFromView,
  mainScalePixelMargins,
  mapGuideX,
  placeSeriesPoint
} from "../js/chart/canvas-lw-host.js";

function engineAt(panPx, barSpacing = 8, ratio = 0) {
  const candles = [];
  for (let i = 0; i < 100; i++) {
    candles.push({ time: i * 60, close: 100 + i });
  }
  return {
    candles,
    layout: { plotLeft: 0, plotRight: 400, plotW: 400 },
    barSpacing,
    panPx,
    rightOffsetBars: 12,
    rightMarginRatio: ratio,
    get rightGap() {
      return rightGapPx(
        this.barSpacing,
        this.rightOffsetBars,
        this.layout.plotW,
        this.rightMarginRatio
      );
    }
  };
}

test("a live candle still reaches its bar when future slots sit on the right", () => {
  const rows = [
    { time: 100, open: 1, high: 2, low: 0.5, close: 1.5 },
    { time: 160, open: 1.5, high: 2, low: 1, close: 1.8 },
    { time: 220 },
    { time: 280 }
  ];
  const bar = { time: 160, open: 1.5, high: 3, low: 1, close: 2.4 };
  assert.equal(placeSeriesPoint(rows, bar), true);
  assert.equal(rows[1].close, 2.4);
  assert.equal(rows.length, 4);
  assert.equal(rows[2].close, undefined);
  assert.equal(rows[3].time, 280);
});

test("indicator update lands on its bar when future slots are already appended", () => {
  const rows = [
    { time: 100, value: 40 },
    { time: 160, value: 55 },
    { time: 220 },
    { time: 280 }
  ];
  assert.equal(placeSeriesPoint(rows, { time: 160, value: 61 }), true);
  assert.equal(rows[1].value, 61);
  assert.equal(rows.length, 4);
  assert.equal(placeSeriesPoint(rows, { time: 200, value: 70 }), true);
  assert.deepEqual(rows.map((row) => row.time), [100, 160, 200, 220, 280]);
  assert.equal(rows[2].value, 70);
  assert.equal(placeSeriesPoint(rows, { time: 40, value: 1 }), false);
});

test("pane guide keeps the candle column instead of stretching a wider plot", () => {
  assert.equal(mapGuideX(640, 0), 640);
  assert.equal(mapGuideX(640, -8), 632);
  assert.equal(mapGuideX(Number.NaN, 0), null);
});

test("a previous window is not reused on a much shorter series", () => {
  assert.equal(
    logicalRangeFitsSeries({ from: 4800, to: 5000 }, 800, 4),
    false
  );
  assert.equal(
    logicalRangeFitsSeries({ from: 700, to: 799 }, 800, 4),
    true
  );
});

test("dense screener window is not clamped to 1.5px bars", () => {
  const engine = engineAt(0, 8);
  engine.layout = { plotLeft: 0, plotRight: 520, plotW: 520 };
  engine.rightOffsetBars = 375;
  const range = { from: 500, to: 500 + 2500 + 375 };
  assert.equal(applyLogicalRange(engine, range), true);
  assert.ok(engine.barSpacing < 1);
  assert.ok(engine.rightGap < engine.layout.plotW);
  const again = logicalRangeFromView(engine);
  assert.ok(Math.abs(again.from - range.from) < 0.05);
  assert.ok(Math.abs(again.to - range.to) < 0.05);
});

test("symmetric price margins do not leave a dead vertical band", () => {
  assert.deepEqual(mainScalePixelMargins(0.12, 0.12), { top: 0, bottom: 0 });
  assert.deepEqual(mainScalePixelMargins(0, 0), { top: 0, bottom: 0 });
  assert.deepEqual(mainScalePixelMargins(0.06, 0.18), { top: 0.06, bottom: 0.18 });
  assert.equal(mainScalePixelMargins(Number.NaN, 0.1), null);
});

test("last candle stays a share of the width off the price scale", () => {
  const engine = engineAt(0, 8, 0.15);
  engine.rightOffsetBars = 4;
  const last = engine.candles.length - 1;
  assert.equal(
    applyLogicalRange(engine, { from: last - 200, to: last }),
    true
  );
  const x = candleX(
    last,
    last,
    engine.layout.plotRight,
    engine.rightGap,
    engine.barSpacing,
    engine.panPx
  );
  const gap = engine.layout.plotRight - x;
  assert.ok(Math.abs(gap / engine.layout.plotW - 0.15) < 0.02);
  const again = logicalRangeFromView(engine);
  assert.ok(Math.abs(again.to - last) < 0.05);
});

test("histogram keeps bars that the pan moved into the right margin", () => {
  const engine = engineAt(0, 8, 0.15);
  engine.rightOffsetBars = 4;
  const last = engine.candles.length - 1;
  assert.equal(
    applyLogicalRange(engine, { from: last - 30, to: last }),
    true
  );
  engine.panPx += engine.rightGap * 0.85;
  const logical = logicalRangeFromView(engine);
  const rightIndex = candleIndexAt(
    engine.layout.plotRight,
    last,
    engine.layout.plotRight,
    engine.rightGap,
    engine.barSpacing,
    engine.panPx
  );
  assert.ok(rightIndex > logical.to + 1);
  const rows = engine.candles.map((bar) => ({ time: bar.time, value: 1 }));
  const clipped = histogramRowSpan(
    rows,
    rows[0].time,
    timeAtFractionalIndex(engine.candles, logical.to)
  );
  const shown = histogramRowSpan(
    rows,
    rows[0].time,
    timeAtFractionalIndex(engine.candles, rightIndex)
  );
  assert.ok(shown[1] > clipped[1]);
  assert.equal(shown[1], rows.length);
});

test("visible logical range round-trips through pan and bar spacing", () => {
  const engine = engineAt(24, 8);
  const range = logicalRangeFromView(engine);
  assert.ok(range.to > range.from);
  const next = engineAt(0, 4);
  assert.equal(applyLogicalRange(next, range), true);
  const again = logicalRangeFromView(next);
  assert.ok(Math.abs(again.from - range.from) < 0.02);
  assert.ok(Math.abs(again.to - range.to) < 0.02);
});
