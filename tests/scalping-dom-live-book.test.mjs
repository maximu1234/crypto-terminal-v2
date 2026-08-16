import "./helpers/stub-browser.mjs";

import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

import {
createLiveBook
} from "../js/scalping-dom/live-book.js";

import {
buildVisibleSliceFromTickBook
} from "../js/scalping-dom/ladder-slice.js";

import {
buildLadderFromBook,
makeStickyPriceRange,
stickyRangeNeedsRecenter
} from "../js/scalping-dom/depth-store.js";

import {
applyAlertUnderlines
} from "../js/scalping-dom/alert-overlay.js";

import {
applyTriggerUnderlines
} from "../js/scalping-dom/trigger-order-overlay.js";

import {
applySlTpHighlights
} from "../js/scalping-dom/position-overlay.js";

test("tick-book delta is O(1) and resyncs on sequence gap", () => {
  const book = createLiveBook();
  book.setNativeTick(1);
  book.applySnapshot({
    u: 10,
    bids: [["100", "2"]],
    asks: [["101", "3"]]
  });
  assert.equal(book.bestBid(), 100);
  assert.equal(book.bestAsk(), 101);

  assert.equal(
    book.applyDelta({
      u: 11,
      pu: 10,
      bids: [["100", "5"]],
      asks: [["101", "1"]]
    }),
    "ok"
  );
  assert.equal(book.toBook().bids[0].size, 5);

  assert.equal(
    book.applyDelta({
      u: 99,
      pu: 50,
      bids: [["99", "1"]]
    }),
    "resync"
  );
  assert.equal(book.isReady(), false);
});

test("visible slice paints only the requested row count", () => {
  const book = createLiveBook();
  book.setNativeTick(1);
  const bids = [];
  const asks = [];
  for(let i = 0; i < 80; i++){
    asks.push([String(101 + i), "1"]);
    bids.push([String(100 - i), "1"]);
  }
  book.applySnapshot({ bids, asks });

  const slice = buildVisibleSliceFromTickBook(book, {
    priceScale: 1,
    viewRows: 24,
    viewOffset: 0,
    autocenterPct: 85
  });

  assert.ok(slice.rows.length <= 24);
  assert.ok(slice.rows.length >= 8);
  assert.equal(slice.tick, 1);
  assert.ok(slice.bestAsk >= 101);
  assert.ok(slice.bestBid <= 100);
});

test("live-book applies snapshot and deletes zero-size levels", () => {
  const book = createLiveBook();

  book.applySnapshot({
    bids: [
      ["100", "2"],
      ["99", "1"]
    ],
    asks: [
      ["101", "3"],
      ["102", "0.5"]
    ]
  });

  assert.equal(book.isReady(), true);
  let snap = book.toBook();
  assert.equal(snap.bids.length, 2);
  assert.equal(snap.asks.length, 2);
  assert.equal(snap.bids[0].price, 100);
  assert.equal(snap.asks[0].price, 101);

  book.applyDelta({
    bids: [["100", "0"]],
    asks: [["101", "4"]]
  });

  snap = book.toBook();
  assert.equal(snap.bids.length, 1);
  assert.equal(snap.bids[0].price, 99);
  assert.equal(snap.asks[0].size, 4);
});

test("buildLadderFromBook fills continuous ask/bid rows around mid", () => {
  const ladder = buildLadderFromBook(
    {
      asks: [
        { price: 101, size: 1 },
        { price: 102, size: 2 }
      ],
      bids: [
        { price: 100, size: 3 },
        { price: 99, size: 4 }
      ]
    },
    {
      maxLevels: 6,
      priceScale: 1
    }
  );

  assert.ok(ladder?.rows?.length >= 4);
  assert.ok(ladder.tick > 0);
  assert.ok(ladder.bestAsk === 101 || ladder.bestAsk > 100);
  assert.ok(ladder.bestBid === 100 || ladder.bestBid < 101);
});

test("BTC float noise snaps tick to 0.1 and formats clean prices", () => {
  const asks = [];
  const bids = [];
  for (let i = 0; i < 30; i++) {
    const ask = 64713.9 + i * 0.1 + (i % 3 === 0 ? 1e-11 : -1e-12);
    const bid = 64713.8 - i * 0.1 + (i % 2 === 0 ? -1e-11 : 1e-12);
    asks.push({ price: ask, size: 1 });
    bids.push({ price: bid, size: 1 });
  }

  const ladder = buildLadderFromBook(
    { asks, bids },
    { maxLevels: 20, priceScale: 1 }
  );

  assert.ok(ladder);
  assert.equal(ladder.tick, 0.1);
  for (const row of ladder.rows) {
    const fixed = row.price.toFixed(1);
    assert.equal(row.price, Number(fixed));
    assert.match(fixed, /^\d+\.\d$/);
  }
});


test("sticky range recenters when mid drifts past autocenter pct", () => {
  const range = makeStickyPriceRange(100, 1, 40);
  assert.ok(range);
  assert.equal(range.high, 140);
  assert.equal(range.low, 60);
  assert.equal(
    stickyRangeNeedsRecenter(range, 100, 85),
    false
  );
  // mid near the edge of the sticky window → recenter
  assert.equal(
    stickyRangeNeedsRecenter(range, 135, 85),
    true
  );
});

test("alert underline marks row above alert price", () => {
  const ladder = {
    rows: [
      { price: 102, side: "ask", size: 1 },
      { price: 101, side: "ask", size: 1 },
      { price: 100, side: "bid", size: 1 },
      { price: 99, side: "bid", size: 1 }
    ]
  };

  const next = applyAlertUnderlines(ladder, [100.5]);
  const marked = next.rows.filter((row) => row.alertUnderline);
  assert.equal(marked.length, 1);
  assert.equal(marked[0].price, 101);
});

test("trigger underline keeps long/short tone on matching row", () => {
  const ladder = {
    rows: [
      { price: 102, side: "ask", size: 1 },
      { price: 101, side: "ask", size: 1 },
      { price: 100, side: "bid", size: 1 }
    ]
  };

  const next = applyTriggerUnderlines(ladder, [
    { price: 100.4, tone: "long" },
    { price: 101.5, tone: "short" }
  ]);

  // Underline on the row just above the trigger price
  assert.equal(
    next.rows.find((row) => row.price === 101)?.triggerUnderline,
    "long"
  );
  assert.equal(
    next.rows.find((row) => row.price === 102)?.triggerUnderline,
    "short"
  );
});

test("SL/TP highlights mark nearest ladder rows by side", () => {
  const ladder = {
    rows: [
      { price: 105, side: "ask", size: 1 },
      { price: 104, side: "ask", size: 1 },
      { price: 100, side: "bid", size: 1 },
      { price: 99, side: "bid", size: 1 }
    ]
  };

  const next = applySlTpHighlights(ladder, [
    { price: 103.5, kind: "tp", long: true },
    { price: 99.4, kind: "sl", long: true }
  ]);

  assert.equal(
    next.rows.find((row) => row.price === 104)?.slTpMark,
    "tp-long"
  );
  assert.equal(
    next.rows.find((row) => row.price === 100)?.slTpMark,
    "sl-long"
  );
});

test("depth-feed does not poll REST on an interval", () => {
  const source = fs.readFileSync(
    new URL("../js/scalping-dom/depth-feed.js", import.meta.url),
    "utf8"
  );
  assert.doesNotMatch(source, /setInterval/);
  assert.doesNotMatch(source, /REST_RESYNC_MS|20000/);
  assert.match(source, /1800/);
  assert.match(source, /needResync/);
});
