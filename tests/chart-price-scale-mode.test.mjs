import test from "node:test";
import assert from "node:assert/strict";
import {
CHART_PRICE_SCALE_MODE_LOGARITHMIC,
CHART_PRICE_SCALE_MODE_REGULAR,
normalizeChartPriceScaleMode,
lwPriceScaleModeId,
isLwPriceScaleModeLogarithmic,
isChartPriceScaleLogarithmic,
applyChartPriceScaleMode
} from "../js/chart/price-scale-mode.js";

test("normalizeChartPriceScaleMode defaults to logarithmic", () => {
  assert.equal(
    normalizeChartPriceScaleMode(),
    CHART_PRICE_SCALE_MODE_LOGARITHMIC
  );
  assert.equal(
    normalizeChartPriceScaleMode("LOGARITHMIC"),
    CHART_PRICE_SCALE_MODE_LOGARITHMIC
  );
  assert.equal(
    normalizeChartPriceScaleMode("bogus"),
    CHART_PRICE_SCALE_MODE_LOGARITHMIC
  );
  assert.equal(
    normalizeChartPriceScaleMode(" Regular "),
    CHART_PRICE_SCALE_MODE_REGULAR
  );
});

test("lwPriceScaleModeId maps Regular to 0 and Logarithmic to 1", () => {
  assert.equal(lwPriceScaleModeId(CHART_PRICE_SCALE_MODE_REGULAR), 0);
  assert.equal(lwPriceScaleModeId(CHART_PRICE_SCALE_MODE_LOGARITHMIC), 1);
  assert.equal(lwPriceScaleModeId("unknown"), 1);
});

test("isLwPriceScaleModeLogarithmic treats 1 as log and 0 as regular", () => {
  assert.equal(isLwPriceScaleModeLogarithmic(1), true);
  assert.equal(isLwPriceScaleModeLogarithmic(0), false);
  assert.equal(isLwPriceScaleModeLogarithmic(2), false);
});

test("isChartPriceScaleLogarithmic reads LW scale mode", () => {
  assert.equal(
    isChartPriceScaleLogarithmic({
      priceScale(){
        return {
          options(){
            return {
              mode: 0
            };
          }
        };
      }
    }),
    false
  );
  assert.equal(
    isChartPriceScaleLogarithmic({
      priceScale(){
        return {
          options(){
            return {
              mode: 1
            };
          }
        };
      }
    }),
    true
  );
  assert.equal(isChartPriceScaleLogarithmic(null), true);
});

test("applyChartPriceScaleMode writes LW mode id", () => {
  const applied = [];
  const wrote = applyChartPriceScaleMode(
    {
      applyOptions(opts){
        applied.push(["chart", opts]);
      },
      priceScale(){
        return {
          applyOptions(opts){
            applied.push(["scale", opts]);
          }
        };
      }
    },
    CHART_PRICE_SCALE_MODE_REGULAR
  );
  assert.equal(wrote, true);
  assert.deepEqual(applied, [
    ["chart", { rightPriceScale: { mode: 0 } }],
    ["scale", { mode: 0 }]
  ]);
});

test("applyChartPriceScaleMode returns false without a chart", () => {
  assert.equal(applyChartPriceScaleMode(null, CHART_PRICE_SCALE_MODE_REGULAR), false);
});
