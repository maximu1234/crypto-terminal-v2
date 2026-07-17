import assert from "node:assert/strict";
import test from "node:test";

const {
  DEFAULT_CHART_SYMBOL,
  pickSymbolFromLastView
} = await import("../js/terminal/exchange-last-symbol.js");

test("pickSymbolFromLastView keeps known last symbol for exchange", () => {
  assert.equal(
    pickSymbolFromLastView(
      { symbol: "ETHUSDT", tf: "60" },
      ["BTCUSDT", "ETHUSDT", "SOLUSDT"]
    ),
    "ETHUSDT"
  );
});

test("pickSymbolFromLastView falls back to BTC when last symbol missing on exchange", () => {
  assert.equal(
    pickSymbolFromLastView(
      { symbol: "NCCOALUMINIUM2USDUSDT", tf: "15" },
      ["BTCUSDT", "ETHUSDT", "SOLUSDT"]
    ),
    DEFAULT_CHART_SYMBOL
  );
});

test("pickSymbolFromLastView does not trust last symbol before list is loaded", () => {
  assert.equal(
    pickSymbolFromLastView(
      { symbol: "NCCOALUMINIUM2USDUSDT", tf: "15" },
      []
    ),
    DEFAULT_CHART_SYMBOL
  );
});

test("pickSymbolFromLastView uses BTC on first visit with empty last view", () => {
  assert.equal(
    pickSymbolFromLastView(
      { symbol: null, tf: "60" },
      ["ETHUSDT", "BTCUSDT", "SOLUSDT"]
    ),
    DEFAULT_CHART_SYMBOL
  );
});
