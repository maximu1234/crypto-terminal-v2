import test from "node:test";
import assert from "node:assert/strict";

import {
parseTradingViewSymbolList,
normalizeTradingViewSymbolToken,
intersectFavoritesWithMarket,
scriptFavoritesFileName,
favoriteSidesForScanFilter
} from "../js/script-favorites-list.js";

test("normalizeTradingViewSymbolToken strips BYBIT: and .P", () => {
  assert.deepEqual(
    normalizeTradingViewSymbolToken("BYBIT:HYPEUSDT.P", "bybit"),
    { symbol: "HYPEUSDT", skippedForeign: false }
  );
});

test("normalizeTradingViewSymbolToken accepts bare symbol for bybit", () => {
  assert.deepEqual(
    normalizeTradingViewSymbolToken("NEARUSDT.P", "bybit"),
    { symbol: "NEARUSDT", skippedForeign: false }
  );
});

test("normalizeTradingViewSymbolToken skips foreign exchange prefix", () => {
  assert.deepEqual(
    normalizeTradingViewSymbolToken("BINGX:BTCUSDT.P", "bybit"),
    { symbol: null, skippedForeign: true }
  );
});

test("parseTradingViewSymbolList parses TV comma export", () => {
  const text =
    "BYBIT:HYPEUSDT.P,BYBIT:LABUSDT.P,BYBIT:FARTCOINUSDT.P,BYBIT:SHIB1000USDT.P";
  const parsed = parseTradingViewSymbolList(text, { exchangeId: "bybit" });
  assert.deepEqual(parsed.symbols, [
    "HYPEUSDT",
    "LABUSDT",
    "FARTCOINUSDT",
    "SHIB1000USDT"
  ]);
  assert.equal(parsed.skippedForeign, 0);
  assert.equal(parsed.totalTokens, 4);
});

test("parseTradingViewSymbolList skips foreign prefixes and dedupes", () => {
  const text =
    "BYBIT:BTCUSDT.P,BINGX:ETHUSDT.P,BTCUSDT.P,bybit:btcusdt.p";
  const parsed = parseTradingViewSymbolList(text, { exchangeId: "bybit" });
  assert.deepEqual(parsed.symbols, ["BTCUSDT"]);
  assert.equal(parsed.skippedForeign, 1);
});

test("parseTradingViewSymbolList accepts BINGX prefix for bingx", () => {
  const parsed = parseTradingViewSymbolList(
    "BINGX:SOLUSDT.P,SOLUSDT",
    { exchangeId: "bingx" }
  );
  assert.deepEqual(parsed.symbols, ["SOLUSDT"]);
});

test("scriptFavoritesFileName is exchange and side scoped", () => {
  assert.equal(
    scriptFavoritesFileName("bybit", "long"),
    "script-favorites-bybit-long.txt"
  );
  assert.equal(
    scriptFavoritesFileName("BINGX", "short"),
    "script-favorites-bingx-short.txt"
  );
});

test("favoriteSidesForScanFilter maps direction to files", () => {
  assert.deepEqual(favoriteSidesForScanFilter("long"), ["long"]);
  assert.deepEqual(favoriteSidesForScanFilter("short"), ["short"]);
  assert.deepEqual(favoriteSidesForScanFilter("both"), ["long", "short"]);
});

test("intersectFavoritesWithMarket keeps only live symbols", () => {
  assert.deepEqual(
    intersectFavoritesWithMarket(
      ["HYPEUSDT", "DEADUSDT", "hypeusdt.p", "NEARUSDT"],
      ["NEARUSDT", "HYPEUSDT", "BTCUSDT"]
    ),
    ["HYPEUSDT", "NEARUSDT"]
  );
});
