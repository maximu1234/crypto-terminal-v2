import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

import {
parseMinVolumeFilter,
normalizeMinVolume,
filterSymbolsByMinVolume,
filterMarketItemsByMinVolume,
formatMinVolumeFilter,
formatMinVolumeInputText,
syncMinVolumeFilterInput
} from "../js/screener-volume-filter.js";

test("parseMinVolumeFilter: empty means no filter", () => {
  assert.equal(parseMinVolumeFilter(""), 0);
  assert.equal(parseMinVolumeFilter("   "), 0);
  assert.equal(parseMinVolumeFilter(null), 0);
});

test("formatMinVolumeFilter groups thousands with commas", () => {
  assert.equal(formatMinVolumeFilter(0), "");
  assert.equal(formatMinVolumeFilter(100000), "100,000");
  assert.equal(formatMinVolumeFilter(1000000), "1,000,000");
  assert.equal(formatMinVolumeFilter(1500000), "1,500,000");
});

test("formatMinVolumeInputText groups while typing, keeps k/m/b", () => {
  assert.equal(formatMinVolumeInputText(""), "");
  assert.equal(formatMinVolumeInputText("1000000"), "1,000,000");
  assert.equal(formatMinVolumeInputText("1,000000"), "1,000,000");
  assert.equal(formatMinVolumeInputText("1.5M"), "1.5M");
  assert.equal(formatMinVolumeInputText("100k"), "100k");
});

test("parseMinVolumeFilter: spaces and commas", () => {
  assert.equal(parseMinVolumeFilter("100 000"), 100000);
  assert.equal(parseMinVolumeFilter("100,000"), 100000);
  assert.equal(parseMinVolumeFilter("100000"), 100000);
  assert.equal(parseMinVolumeFilter("1,000,000"), 1000000);
});

test("parseMinVolumeFilter: k/m/b suffixes", () => {
  assert.equal(parseMinVolumeFilter("100k"), 100000);
  assert.equal(parseMinVolumeFilter("1.5M"), 1500000);
  assert.equal(parseMinVolumeFilter("2b"), 2000000000);
});

test("parseMinVolumeFilter: rejects junk", () => {
  assert.equal(parseMinVolumeFilter("abc"), 0);
  assert.equal(parseMinVolumeFilter("-10"), 0);
  assert.equal(parseMinVolumeFilter("0"), 0);
});

test("normalizeMinVolume drops non-positive", () => {
  assert.equal(normalizeMinVolume(100000), 100000);
  assert.equal(normalizeMinVolume(0), 0);
  assert.equal(normalizeMinVolume(-1), 0);
  assert.equal(normalizeMinVolume("nope"), 0);
});

test("filterSymbolsByMinVolume hides below threshold", () => {
  const volumes = {
    AAA: 50000,
    BBB: 100000,
    CCC: 200000,
    DDD: NaN
  };

  const out = filterSymbolsByMinVolume(
    ["AAA", "BBB", "CCC", "DDD"],
    100000,
    (sym) => volumes[sym]
  );

  assert.deepEqual(out, ["BBB", "CCC"]);
});

test("filterSymbolsByMinVolume empty threshold keeps all", () => {
  assert.deepEqual(
    filterSymbolsByMinVolume(["AAA", "BBB"], 0, () => 1),
    ["AAA", "BBB"]
  );
});

test("filterMarketItemsByMinVolume hides rows below 24h volume", () => {
  const rows = [
    { symbol: "AAA", volume24: 50000 },
    { symbol: "BBB", volume24: 100000 },
    { symbol: "CCC", volume24: 200000 },
    { symbol: "DDD", volume24: NaN }
  ];
  const out = filterMarketItemsByMinVolume(rows, 100000);
  assert.deepEqual(
    out.map((row) => row.symbol),
    ["BBB", "CCC"]
  );
});

test("filterMarketItemsByMinVolume empty threshold keeps all", () => {
  const rows = [{ symbol: "AAA", volume24: 1 }];
  assert.equal(
    filterMarketItemsByMinVolume(rows, 0).length,
    1
  );
});

test("screener header places volume filter between invert and search", () => {
  const html = readFileSync(
    new URL("../screener.html", import.meta.url),
    "utf8"
  );
  const invert = html.indexOf('id="screener-invert-charts"');
  const volume = html.indexOf('id="screener-volume-filter"');
  const search = html.indexOf('id="screener-symbol-search"');
  assert.ok(invert > 0 && volume > invert && search > volume);
});

test("syncMinVolumeFilterInput restores grouped thousands", () => {
  const input = { value: "" };
  syncMinVolumeFilterInput(input, 500000);
  assert.equal(input.value, "500,000");
  syncMinVolumeFilterInput(input, 0);
  assert.equal(input.value, "");
});

test("terminal restores and flushes the volume filter with coins prefs", () => {
  const src = readFileSync(
    new URL("../js/terminal.js", import.meta.url),
    "utf8"
  );
  assert.match(src, /bootstrapCoinsPageState\(\);\s*syncCoinVolumeFilterInput\(\)/);
  assert.match(src, /applyCoinsPrefs\(\);\s*mountCoinVolumeFilter\(\)/);
  assert.match(
    src,
    /function flushCoinsPrefs\(\)\s*\{\s*commitCoinVolumeFilterFromInput\(\)/
  );
});

test("terminal list places volume filter under search", () => {
  const html = readFileSync(
    new URL("../terminal.html", import.meta.url),
    "utf8"
  );
  const search = html.indexOf('id="coin-search"');
  const volume = html.indexOf('id="coin-volume-filter"');
  const refresh = html.indexOf('id="coins-list-refresh"');
  assert.ok(search > 0 && volume > search && refresh > volume);
});
