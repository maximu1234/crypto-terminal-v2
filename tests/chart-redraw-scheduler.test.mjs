import assert from "node:assert/strict";
import test from "node:test";

import {
  CHART_REDRAW_REASON,
  createChartRedrawScheduler,
  isChromeRedrawReason,
  isPaintRedrawReason
} from "../js/chart-redraw-scheduler.js";

test("chrome redraw reasons are filtered", () => {
  assert.equal(isChromeRedrawReason(CHART_REDRAW_REASON.CHROME), true);
  assert.equal(isChromeRedrawReason(CHART_REDRAW_REASON.CHROME_PANEL), true);
  assert.equal(isPaintRedrawReason(CHART_REDRAW_REASON.CANDLES), true);
  assert.equal(isPaintRedrawReason(CHART_REDRAW_REASON.CHROME), false);
});

test("scheduler ignores chrome and coalesces paint", async () => {
  let paints = 0;
  const scheduler = createChartRedrawScheduler({
    useDoubleRaf: false,
    paint: () => {
      paints += 1;
    }
  });

  globalThis.requestAnimationFrame = (fn) => {
    fn();
    return 1;
  };
  globalThis.cancelAnimationFrame = () => {};

  assert.equal(scheduler.request(CHART_REDRAW_REASON.CHROME), false);
  assert.equal(paints, 0);

  assert.equal(scheduler.request(CHART_REDRAW_REASON.DRAWINGS), true);
  assert.equal(paints, 1);

  scheduler.request(CHART_REDRAW_REASON.LAYOUT);
  scheduler.request(CHART_REDRAW_REASON.TRADE_OVERLAY);
  assert.equal(paints, 3);
});
