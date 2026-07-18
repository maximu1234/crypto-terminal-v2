import test from "node:test";
import assert from "node:assert/strict";

import {
createLiveBook
} from "../js/scalping-dom/live-book.js";

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
