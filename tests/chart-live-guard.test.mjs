import test from "node:test";
import assert from "node:assert/strict";

import {
canonicalChartSymbol,
shouldApplyLivePriceToChart
} from "../js/terminal/chart-live-guard.js";

test("canonicalChartSymbol strips perpetual suffix", ()=>{

assert.equal(
canonicalChartSymbol(
"ETHUSDT.P"
),
"ETHUSDT"
);
assert.equal(
canonicalChartSymbol(
"ethusdt"
),
"ETHUSDT"
);

});

test("live last price does not apply while candles still belong to the previous symbol", ()=>{

assert.equal(
shouldApplyLivePriceToChart({
sourceSymbol: "ETHUSDT",
currentSymbol: "ETHUSDT",
chartCandlesSymbol: "BTCUSDT"
}),
false
);

assert.equal(
shouldApplyLivePriceToChart({
sourceSymbol: "ETHUSDT.P",
currentSymbol: "ETHUSDT",
chartCandlesSymbol: ""
}),
false
);

});

test("live last price applies only when tick, chart, and candle series match", ()=>{

assert.equal(
shouldApplyLivePriceToChart({
sourceSymbol: "ETHUSDT.P",
currentSymbol: "ETHUSDT",
chartCandlesSymbol: "ETHUSDT.P"
}),
true
);

assert.equal(
shouldApplyLivePriceToChart({
sourceSymbol: "BTCUSDT",
currentSymbol: "ETHUSDT",
chartCandlesSymbol: "ETHUSDT"
}),
false
);

});
