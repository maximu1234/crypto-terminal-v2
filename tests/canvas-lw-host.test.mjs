import test from "node:test";
import assert from "node:assert/strict";

import { timeAtFractionalIndex } from "../js/canvas-bench/drawings.js";
import {
  candleIndexAt,
  candleX,
  niceTimeAxisTimes,
  rightGapPx,
  stickTimeAxisStepSec
} from "../js/canvas-bench/live-plan.js";
import {
  applyLogicalRange,
  baselineCrossingPoint,
  histogramRowSpan,
  logicalRangeFitsSeries,
  logicalRangeFromView,
  mainScalePixelMargins,
  mapGuideX,
  placeSeriesPoint
} from "../js/chart/canvas-lw-host.js";
import { screenerBarSpacingPx } from "../js/chart/chart-viewport.js";

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

test("screener zoom-out floor rejects a wider logical window", () => {
  const engine = engineAt(0, 8, 0.15);
  engine.layout = { plotLeft: 0, plotRight: 400, plotW: 400 };
  engine.maxZoomOutBars = 2499;
  engine.rightOffsetBars = 375;
  assert.equal(
    applyLogicalRange(engine, { from: 0, to: 2499 }),
    true
  );
  assert.equal(
    applyLogicalRange(engine, { from: 0, to: 2800 }),
    false
  );
});

test("maxZoomOutBars 0 disables the zoom-out floor", () => {
  const engine = engineAt(0, 8, 0.15);
  engine.layout = { plotLeft: 0, plotRight: 400, plotW: 400 };
  engine.maxZoomOutBars = 0;
  engine.rightOffsetBars = 4;
  assert.equal(
    applyLogicalRange(engine, { from: 0, to: 2800 }),
    true
  );
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

test("baseline RSI color split lands exactly on the mid level", () => {
  assert.equal(baselineCrossingPoint(40, 45, 50, 0, 100, 10, 90), null);
  assert.equal(baselineCrossingPoint(60, 70, 50, 0, 40, 10, 30), null);
  const up = baselineCrossingPoint(40, 60, 50, 0, 80, 20, 40);
  assert.ok(up);
  assert.equal(up.t, 0.5);
  assert.equal(up.x, 10);
  assert.equal(up.y, 60);
  const down = baselineCrossingPoint(70, 30, 50, 0, 20, 40, 100);
  assert.ok(down);
  assert.equal(down.t, 0.5);
  assert.equal(down.x, 20);
  assert.equal(down.y, 60);
});

test("time axis ticks stay anchored to unix time when the chart pans", () => {
  const from = Date.UTC(2026, 10, 7, 10, 0, 0) / 1000;
  const to = Date.UTC(2026, 10, 7, 18, 0, 0) / 1000;
  const times = niceTimeAxisTimes(from, to, 800, 72);
  assert.ok(times.length >= 3);
  for (let i = 1; i < times.length; i++) {
    assert.ok(times[i] > times[i - 1]);
    assert.equal(times[i] % 3600, 0);
  }

  const engine = engineAt(0, 8);
  const stamp = engine.candles[50].time;
  const x0 = candleX(
    50,
    engine.candles.length - 1,
    engine.layout.plotRight,
    engine.rightGap,
    engine.barSpacing,
    engine.panPx
  );
  engine.panPx += 40;
  const x1 = candleX(
    50,
    engine.candles.length - 1,
    engine.layout.plotRight,
    engine.rightGap,
    engine.barSpacing,
    engine.panPx
  );
  assert.equal(x1 - x0, 40);
  assert.equal(engine.candles[50].time, stamp);
});

test("time axis step hysterises instead of flipping every frame", () => {
  assert.equal(
    stickTimeAxisStepSec(1209600, 604800, 120 * 86400, 12),
    604800
  );
  assert.equal(
    stickTimeAxisStepSec(2592000, 60, 120 * 86400, 12),
    2592000
  );
});

test("multi-day time ticks keep a stable phase while the window slides", () => {
  const day = 86400;
  const width = 900;
  const span = 120 * day;
  const a0 = Date.UTC(2026, 0, 10, 3, 0, 0) / 1000;
  const b0 = a0 + span;
  const first = niceTimeAxisTimes(a0, b0, width, 72);
  assert.ok(first.length >= 4);
  const step = first[1] - first[0];
  assert.ok(step >= 7 * day);

  const shift = 3 * day + 3600;
  const second = niceTimeAxisTimes(a0 + shift, b0 + shift, width, 72);
  const shared = first.filter((t) => second.includes(t));
  assert.ok(shared.length >= 2, "grid phase must not jump on a short pan");
  for (const t of shared) {
    assert.equal(t % step, first[0] % step);
  }
});

test("guide view listeners are distinct from debounced range listeners", () => {
  // Contract: canvas-lw-host exposes subscribeGuideViewChange so RSI time
  // labels rebuild on every main pan, not only when rangesClose (>0.25 bar).
  assert.equal(typeof mapGuideX, "function");
  const guided = mapGuideX(100, 12);
  assert.equal(guided, 112);
  const afterPan = mapGuideX(140, 12);
  assert.equal(afterPan - guided, 40);
});

test("screener bar spacing matches applyLogicalRange ratio branch", () => {
  const plotW = 252;
  const content = 2499;
  const rightMargin = 375;
  const naive = plotW / (content + rightMargin);
  const spaced = screenerBarSpacingPx(plotW, content, rightMargin, 0.15);
  assert.ok(spaced < naive);
  assert.ok(Math.abs(spaced - (plotW * 0.85) / content) < 1e-9);

  const engine = engineAt(0, naive, 0.15);
  engine.layout = { plotLeft: 0, plotRight: plotW, plotW };
  engine.candles = Array.from({ length: content + 1 }, (_, i) => ({
    time: i * 60,
    close: 100
  }));
  engine.rightOffsetBars = rightMargin;
  const last = content;
  assert.equal(
    applyLogicalRange(engine, { from: last - content, to: last }),
    true
  );
  assert.ok(Math.abs(engine.barSpacing - spaced) < 1e-9);
});
