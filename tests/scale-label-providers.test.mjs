import test from "node:test";
import assert from "node:assert/strict";

import {
collectChartScaleLabelEntries,
registerChartScaleLabelProvider
} from "../js/chart/scale-label-providers.js";

test("registerChartScaleLabelProvider collects finite entries", () => {
  const scope = {};
  const unregister = registerChartScaleLabelProvider(() => [
    { yIdeal: 10, price: 100, color: "#0f0" },
    { yIdeal: NaN, price: 101, color: "#f00" },
    { yIdeal: 20, price: 102, color: "#00f" }
  ], scope);

  const entries = collectChartScaleLabelEntries(scope);
  assert.equal(entries.length, 2);
  assert.equal(entries[0].price, 100);
  assert.equal(entries[0].pinToPrice, true);
  assert.equal(entries[1].price, 102);

  unregister();
  assert.equal(collectChartScaleLabelEntries(scope).length, 0);
});

test("broken provider does not break collect", () => {
  const scope = {};
  const unregisterBad = registerChartScaleLabelProvider(() => {
    throw new Error("provider boom");
  }, scope);
  const unregisterOk = registerChartScaleLabelProvider(() => [
    { yIdeal: 1, price: 42, color: "#fff" }
  ], scope);

  const entries = collectChartScaleLabelEntries(scope);
  assert.equal(entries.length, 1);
  assert.equal(entries[0].price, 42);

  unregisterBad();
  unregisterOk();
});

test("providers are isolated by chart scope", () => {
  const chartA = { id: "a" };
  const chartB = { id: "b" };
  const unA = registerChartScaleLabelProvider(
    () => [{ yIdeal: 1, price: 111, color: "#a00" }],
    chartA
  );
  const unB = registerChartScaleLabelProvider(
    () => [{ yIdeal: 2, price: 222, color: "#0a0" }],
    chartB
  );

  assert.equal(collectChartScaleLabelEntries(chartA).length, 1);
  assert.equal(collectChartScaleLabelEntries(chartA)[0].price, 111);
  assert.equal(collectChartScaleLabelEntries(chartB)[0].price, 222);
  assert.equal(collectChartScaleLabelEntries({}).length, 0);

  unA();
  unB();
});
