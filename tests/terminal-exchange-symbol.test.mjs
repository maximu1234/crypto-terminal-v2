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

test("pickSymbolFromLastView keeps last symbol while market list is still empty", () => {
  assert.equal(
    pickSymbolFromLastView(
      { symbol: "ETHUSDT", tf: "15" },
      []
    ),
    "ETHUSDT"
  );
});

test("pickSymbolFromLastView on moex drops crypto ticker while list empty", () => {
  assert.equal(
    pickSymbolFromLastView(
      { symbol: "BTCUSDT", tf: "60" },
      [],
      null,
      "SBER"
    ),
    "SBER"
  );
});

test("pickSymbolFromLastView keeps last symbol when symbols is missing", () => {
  assert.equal(
    pickSymbolFromLastView(
      { symbol: "SOLUSDT", tf: "5" },
      null
    ),
    "SOLUSDT"
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

test("pickSymbolFromLastView uses SBER default for moex when last missing", () => {
  assert.equal(
    pickSymbolFromLastView(
      { symbol: "BTCUSDT", tf: "60" },
      ["SBER", "GAZP", "LKOH"],
      null,
      "SBER"
    ),
    "SBER"
  );
});
