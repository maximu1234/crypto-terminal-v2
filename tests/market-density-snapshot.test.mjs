import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import {
  DENSITY_BOOK_DEPTH,
  wallsFromBook
} from "../js/market-density-snapshot.js";

test("density walls use a shallow book and keep only large notionals", () => {
  assert.equal(DENSITY_BOOK_DEPTH, 50);
  const walls = wallsFromBook({
    bids: [
      { price: 100, size: 10 },
      { price: 99, size: 2000 }
    ],
    asks: [
      { price: 101, size: 5 },
      { price: 110, size: 2000 }
    ]
  }, 100000);
  assert.equal(walls.length, 2);
  assert.equal(walls[0].side, "ask");
  assert.equal(walls[0].notional, 220000);
  assert.equal(walls[1].side, "bid");
  assert.ok(walls[1].distancePct < 0);
  assert.ok(walls[0].distancePct > 0);
});

test("density walls are empty when the book has no mid", () => {
  assert.deepEqual(wallsFromBook({ bids: [], asks: [] }), []);
});

test("default floor keeps a wall around a few thousand USDT", () => {
  const walls = wallsFromBook({
    bids: [{ price: 0.08, size: 100 }],
    asks: [{ price: 0.081, size: 28000 }]
  });
  assert.equal(walls.length, 1);
  assert.equal(walls[0].side, "ask");
});

test("density ticker links to the terminal chart without a timeframe", () => {
  const src = readFileSync(
    new URL("../js/screener.js", import.meta.url),
    "utf8"
  );
  const hrefFn = src.slice(
    src.indexOf("function densityTerminalHref"),
    src.indexOf("function renderDensitySnapshot")
  );
  assert.match(hrefFn, /\/terminal\.html\?/);
  assert.match(hrefFn, /symbol:/);
  assert.doesNotMatch(hrefFn, /currentTF|["']tf["']/);
  assert.match(
    src,
    /<a class="screener-density-symbol" href="\$\{escapeHtml\(densityTerminalHref\(row\.symbol\)\)\}">/
  );
});

test("offscreen screener cells drop the chart instance and the kline socket", () => {
  const src = readFileSync(
    new URL("../js/screener-widgets.js", import.meta.url),
    "utf8"
  );
  assert.match(src, /function parkWidgetSurface/);
  assert.match(src, /isScreenerWidgetInView\(\s*widget\.root\s*\)/);
  assert.match(src, /widget\.mountCharts =\s*mountWidgetCharts;\s*mountWidgetCharts\(\)/);
  assert.match(src, /deps\.updateWidgetRsiData\(\s*widget\s*\)/);
  assert.match(src, /widget\.chart\?\.remove\(\)/);
  assert.match(src, /widget\.chart =\s*null/);
  assert.match(src, /widget\.unsubKline\?\.()/);
  assert.match(src, /function resumeWidgetSurface/);
  assert.doesNotMatch(src, /orderbook\.1000/);
});
