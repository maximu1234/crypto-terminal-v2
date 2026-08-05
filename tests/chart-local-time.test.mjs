import assert from "node:assert/strict";
import test from "node:test";
import {
  chartTimeToDate,
  formatChartCrosshairTimeLocal,
  formatChartTickMarkLocal,
  withChartLocalTime
} from "../js/chart/chart-local-time.js";

test("chartTimeToDate accepts unix seconds", () => {
  const d = chartTimeToDate(1_704_067_200); // 2024-01-01T00:00:00Z
  assert.ok(d instanceof Date);
  assert.equal(d.toISOString(), "2024-01-01T00:00:00.000Z");
});

test("formatChartTickMarkLocal Time uses local clock fields", () => {
  // Pick a UTC noon so local (any TZ) still formats HH:mm
  const label = formatChartTickMarkLocal(1_704_067_200 + 12 * 3600, 3, "en-GB");
  assert.match(label, /^\d{2}:\d{2}$/);
});

test("withChartLocalTime merges localization and keeps tickMarkFormatter", () => {
  const opts = withChartLocalTime({
    timeScale: { timeVisible: true, rightOffset: 4 }
  });
  assert.equal(opts.timeScale.timeVisible, true);
  assert.equal(opts.timeScale.rightOffset, 4);
  assert.equal(typeof opts.timeScale.tickMarkFormatter, "function");
  assert.equal(typeof opts.localization.timeFormatter, "function");
  assert.ok(
    formatChartCrosshairTimeLocal(1_704_067_200).length >
    0
  );
});
