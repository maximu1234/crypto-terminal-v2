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

import {
applyHorizDrawingUnderlines,
resolveHorizDrawingLevels
} from "../js/scalping-dom/drawing-overlay.js";

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

function fillBookAround(book, midBid, levels = 80){
  const bids = [];
  const asks = [];
  for(let i = 0; i < levels; i++){
    asks.push([String(midBid + 1 + i), "1"]);
    bids.push([String(midBid - i), "1"]);
  }
  book.applySnapshot({ bids, asks });
}

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

test("hover freezes the ladder camera while the spread walks off-screen", () => {
  const book = createLiveBook();
  book.setNativeTick(1);
  fillBookAround(book, 100);

  const first = buildVisibleSliceFromTickBook(book, {
    priceScale: 1,
    viewRows: 20,
    viewOffset: 0,
    hover: true,
    autocenterPct: 85
  });
  const topPrice = first.rows[0].price;
  assert.equal(first.recentered, true);

  fillBookAround(book, 70);
  const hovered = buildVisibleSliceFromTickBook(book, {
    priceScale: 1,
    sticky: first.sticky,
    viewRows: 20,
    viewOffset: 0,
    hover: true,
    autocenterPct: 85
  });
  assert.equal(hovered.recentered, false);
  assert.equal(hovered.rows[0].price, topPrice);
  assert.ok(hovered.mid <= 71);
  assert.ok(hovered.rows[hovered.rows.length - 1].price > hovered.mid);
});

test("leaving the ladder recenters when the spread is off-screen", () => {
  const book = createLiveBook();
  book.setNativeTick(1);
  fillBookAround(book, 100);

  const first = buildVisibleSliceFromTickBook(book, {
    priceScale: 1,
    viewRows: 20,
    viewOffset: 0,
    hover: true,
    autocenterPct: 85
  });

  fillBookAround(book, 70);
  const left = buildVisibleSliceFromTickBook(book, {
    priceScale: 1,
    sticky: first.sticky,
    viewRows: 20,
    viewOffset: 0,
    hover: false,
    autocenterPct: 85
  });
  assert.equal(left.recentered, true);
  assert.equal(left.viewOffset, 0);
  const midRow = left.rows[Math.floor(left.rows.length / 2)];
  assert.ok(Math.abs(midRow.price - left.mid) <= 1);
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
  assert.match(source, /drawing-overlay/);
  assert.match(source, /drawings-updated/);
});

test("hline and hray underlines keep drawing color on the row above price", () => {
  const ladder = {
    rows: [
      { price: 102, side: "ask", size: 1 },
      { price: 101, side: "ask", size: 1 },
      { price: 100, side: "bid", size: 1 },
      { price: 99, side: "bid", size: 1 }
    ]
  };

  const next = applyHorizDrawingUnderlines(ladder, [
    { price: 100.5, color: "#ff00aa", width: 3, kind: "hline" },
    { price: 101.2, color: "#00ffcc", width: 1, kind: "hray" }
  ]);

  assert.deepEqual(
    next.rows.find((row) => row.price === 101)?.drawingLines,
    [{ color: "#ff00aa", width: 3, kind: "hline" }]
  );
  assert.deepEqual(
    next.rows.find((row) => row.price === 102)?.drawingLines,
    [{ color: "#00ffcc", width: 1, kind: "hray" }]
  );
});

test("resolveHorizDrawingLevels reads hline/hray from drawings storage", () => {
  const store = new Map();
  const prev = globalThis.localStorage;
  globalThis.localStorage = {
    getItem: (k) => (store.has(k) ? store.get(k) : null),
    setItem: (k, v) => {
      store.set(k, String(v));
    },
    removeItem: (k) => {
      store.delete(k);
    },
    get length() {
      return store.size;
    },
    key(i) {
      return [...store.keys()][i] ?? null;
    }
  };

  try {
    store.set(
      "drawings_bybit_BTCUSDT",
      JSON.stringify([
        {
          id: "h1",
          type: "hline",
          price: 100.4,
          color: "#aabbcc",
          lineWidth: 2
        },
        {
          id: "r1",
          type: "hray",
          price: 101.6,
          color: "#112233",
          lineWidth: 1
        },
        {
          id: "skip-alert",
          type: "hray",
          price: 99,
          color: "#ffff00",
          isAlert: true
        },
        {
          id: "skip-trend",
          type: "trendline",
          p1: { price: 50 },
          color: "#ffffff"
        }
      ])
    );

    const levels = resolveHorizDrawingLevels("BTCUSDT.P");
    assert.equal(levels.length, 2);
    assert.equal(levels[0].kind, "hline");
    assert.equal(levels[0].color, "#aabbcc");
    assert.equal(levels[0].price, 100.4);
    assert.equal(levels[1].kind, "hray");
    assert.equal(levels[1].color, "#112233");
  } finally {
    if (prev === undefined) {
      delete globalThis.localStorage;
    } else {
      globalThis.localStorage = prev;
    }
  }
});

test("empty visible window recenters onto the book even while hovered", () => {
  const book = createLiveBook();
  book.setNativeTick(1);
  fillBookAround(book, 100, 40);

  const slice = buildVisibleSliceFromTickBook(book, {
    priceScale: 1,
    viewRows: 20,
    viewOffset: 400,
    hover: true,
    autocenterPct: 85
  });

  assert.equal(slice.recentered, true);
  assert.equal(slice.viewOffset, 0);
  assert.ok(slice.rows.some((row) => row.size > 0 && row.side !== "hole"));
  const midRow = slice.rows[Math.floor(slice.rows.length / 2)];
  assert.ok(Math.abs(midRow.price - slice.mid) <= 1);
});

test("best bid and ask stay touched when the ladder scale compresses", () => {
  const book = createLiveBook();
  book.setNativeTick(1);
  book.applySnapshot({
    bids: [
      ["101", "2"],
      ["100", "1"],
      ["99", "1"]
    ],
    asks: [
      ["102", "3"],
      ["103", "1"],
      ["104", "1"]
    ]
  });

  const slice = buildVisibleSliceFromTickBook(book, {
    priceScale: 2,
    viewRows: 24,
    viewOffset: 0,
    autocenterPct: 85
  });

  const bidRow = slice.rows.find((row) => row.touchBid);
  const askRow = slice.rows.find((row) => row.touchAsk);
  assert.ok(bidRow, "compressed bid touch");
  assert.ok(askRow, "compressed ask touch");
  assert.equal(bidRow.price, 100);
  assert.equal(askRow.price, 102);

  const native = buildVisibleSliceFromTickBook(book, {
    priceScale: 1,
    viewRows: 24,
    viewOffset: 0,
    autocenterPct: 85
  });
  assert.ok(native.rows.some((row) => row.price === 101 && row.touchBid));
  assert.ok(native.rows.some((row) => row.price === 102 && row.touchAsk));
});

test("clear() drops native tick so the next snapshot can infer a new one", () => {
  const book = createLiveBook();
  book.setNativeTick(0.1);
  book.applySnapshot({
    bids: [["100", "1"]],
    asks: [["101", "1"]]
  });
  assert.equal(book.getNativeTick(), 0.1);

  book.clear();
  assert.equal(book.getNativeTick(), 0);
  assert.equal(book.isReady(), false);

  book.applySnapshot({
    bids: [["0.2036568", "2"]],
    asks: [["0.2036570", "3"]]
  });
  assert.ok(book.getNativeTick() > 0);
  assert.ok(book.getNativeTick() <= 1e-6);
  assert.equal(book.bestBid(), 0.2036568);
});

