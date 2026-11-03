import "./helpers/stub-browser.mjs";
import test from "node:test";
import assert from "node:assert/strict";

import {
  applyChartPriceFormat
} from "../js/chart/chart-options.js";

test("applyChartPriceFormat skips applyOptions while precision stays", () => {
  const calls = [];
  const series = {
    applyOptions(opts){
      calls.push(opts.priceFormat.minMove);
    }
  };

  applyChartPriceFormat(series, 67234.5);
  applyChartPriceFormat(series, 67240.1);
  applyChartPriceFormat(series, 0.42);

  assert.deepEqual(calls, [0.01, 0.000001]);
});
