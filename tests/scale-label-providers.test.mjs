import test from "node:test";
import assert from "node:assert/strict";

import {
collectChartScaleLabelEntries,
registerChartScaleLabelProvider
} from "../js/chart/scale-label-providers.js";

test("registerChartScaleLabelProvider collects finite entries", () => {
  const unregister = registerChartScaleLabelProvider(() => [
    { yIdeal: 10, price: 100, color: "#0f0" },
    { yIdeal: NaN, price: 101, color: "#f00" },
    { yIdeal: 20, price: 102, color: "#00f" }
  ]);

  const entries = collectChartScaleLabelEntries();
  assert.equal(entries.length, 2);
  assert.equal(entries[0].price, 100);
  assert.equal(entries[0].pinToPrice, true);
  assert.equal(entries[1].price, 102);

  unregister();
  assert.equal(collectChartScaleLabelEntries().length, 0);
});

test("broken provider does not break collect", () => {
  const unregisterBad = registerChartScaleLabelProvider(() => {
    throw new Error("provider boom");
  });
  const unregisterOk = registerChartScaleLabelProvider(() => [
    { yIdeal: 1, price: 42, color: "#fff" }
  ]);

  const entries = collectChartScaleLabelEntries();
  assert.equal(entries.length, 1);
  assert.equal(entries[0].price, 42);

  unregisterBad();
  unregisterOk();
});
