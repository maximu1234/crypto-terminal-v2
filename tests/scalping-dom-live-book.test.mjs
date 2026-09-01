import "./helpers/stub-browser.mjs";

import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

import {
createLiveBook,
inferTickFromLevels
} from "../js/scalping-dom/live-book.js";

import {
buildVisibleSliceFromTickBook,
compressedBboPaintMode
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
applySlTpHighlights,
applyPositionOverlays
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

test("tick-book snaps BTC numeric REST prices to 0.1 so the first ladder is dense", () => {
  const asks = [];
  const bids = [];
  for(let i = 0; i < 30; i++){
    asks.push({
      price: 77459.1 + i * 0.1 + 1e-11,
      size: 1
    });
    bids.push({
      price: 77458.9 - i * 0.1 - 1e-12,
      size: 1
    });
  }
  assert.equal(inferTickFromLevels(asks.concat(bids)), 0.1);

  const book = createLiveBook();
  book.applySnapshot({ bids, asks });
  assert.equal(book.getNativeTick(), 0.1);

  const slice = buildVisibleSliceFromTickBook(book, {
    priceScale: 1,
    viewRows: 24,
    viewOffset: 0,
    autocenterPct: 85
  });
  const filled = slice.rows.filter((row) => row.size > 0).length;
  assert.ok(
    filled >= 20,
    `first BTC book must be dense at 0.1, got ${filled}/${slice.rows.length}`
  );
});

test("unpinned snapshot re-infers tick so a later WS book can fix REST float noise", () => {
  const book = createLiveBook();
  const noisyAsks = [];
  const noisyBids = [];
  for(let i = 0; i < 8; i++){
    noisyAsks.push({ price: 77459.1 + i * 0.1 + 1e-11, size: 1 });
    noisyBids.push({ price: 77458.9 - i * 0.1 - 1e-12, size: 1 });
  }
  book.applySnapshot({ bids: noisyBids, asks: noisyAsks });
  assert.equal(book.getNativeTick(), 0.1);

  const asks = [];
  const bids = [];
  for(let i = 0; i < 20; i++){
    asks.push([String((77459.1 + i * 0.1).toFixed(1)), "1"]);
    bids.push([String((77458.9 - i * 0.1).toFixed(1)), "1"]);
  }
  book.applySnapshot({ b: bids, a: asks });
  assert.equal(book.getNativeTick(), 0.1);
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
  assert.match(source, /restSnapshot\("boot"\)/);
  assert.match(source, /onlyIfEmpty/);
  assert.match(source, /drawing-overlay/);
  assert.match(source, /drawings-updated/);
});

test("empty-book deltas do not REST-overwrite a live WS snapshot", () => {
  const worker = fs.readFileSync(
    new URL("../js/scalping-dom/depth-worker.js", import.meta.url),
    "utf8"
  );
  const emptyGuard = worker.split("if(!book.isReady())")[1]?.split("const result")[0] || "";
  assert.match(emptyGuard, /return;/);
  assert.doesNotMatch(emptyGuard, /needResync/);
  assert.match(worker, /result === "resync"/);
  const feed = fs.readFileSync(
    new URL("../js/scalping-dom/depth-feed.js", import.meta.url),
    "utf8"
  );
  assert.match(feed, /onlyIfEmpty: reason === "boot" \|\| reason === "wait"/);
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

test("Bybit DOM subscribes to orderbook.1000, not a shallow 200 book", () => {
  const source = fs.readFileSync(
    new URL("../js/scalping-dom/depth-ws-bybit.js", import.meta.url),
    "utf8"
  );
  assert.match(source, /BYBIT_DOM_DEPTH =\s*\n1000/);
  assert.match(source, /orderbook\.\$\{DEPTH\}\.\$\{symbol\}/);
  assert.match(source, /binaryType/);
  assert.match(source, /ArrayBuffer/);
  assert.doesNotMatch(source, /BYBIT_DOM_DEPTH =\s*\n200/);
});

test("x10 compression of a 1000-level book fills the viewport with bid/ask", () => {
  const book = createLiveBook();
  book.setNativeTick(1);
  fillBookAround(book, 5000, 1000);

  const deep = buildVisibleSliceFromTickBook(book, {
    priceScale: 10,
    viewRows: 80,
    viewOffset: 0,
    autocenterPct: 85
  });
  const deepFilled = deep.rows.filter((row) => row.size > 0).length;
  assert.ok(deep.rows.length >= 70, "viewport still paints visible rows only");
  assert.ok(
    deepFilled >= 70,
    `1000-level x10 should fill the ladder, got ${deepFilled}/${deep.rows.length}`
  );

  const shallow = createLiveBook();
  shallow.setNativeTick(1);
  fillBookAround(shallow, 5000, 200);
  const thin = buildVisibleSliceFromTickBook(shallow, {
    priceScale: 10,
    viewRows: 80,
    viewOffset: 0,
    autocenterPct: 85
  });
  const thinFilled = thin.rows.filter((row) => row.size > 0).length;
  assert.ok(
    deepFilled > thinFilled,
    `deep book must outrange 200-level x10 (${deepFilled} vs ${thinFilled})`
  );
});

test("empty ticks without orders stay holes; the gap between BBO is the spread", () => {
  const book = createLiveBook();
  book.setNativeTick(1);
  book.applySnapshot({
    bids: [
      ["100", "2"],
      ["98", "1"]
    ],
    asks: [
      ["110", "3"],
      ["112", "1"]
    ]
  });

  const slice = buildVisibleSliceFromTickBook(book, {
    priceScale: 1,
    viewRows: 30,
    viewOffset: 0,
    autocenterPct: 85
  });

  const byPrice = Object.fromEntries(
    slice.rows.map((row) => [row.price, row])
  );
  assert.equal(byPrice[110]?.side, "ask");
  assert.equal(byPrice[110]?.touchAsk, true);
  assert.equal(byPrice[111]?.side, "hole");
  assert.equal(byPrice[111]?.size, 0);
  assert.equal(byPrice[100]?.side, "bid");
  assert.equal(byPrice[100]?.touchBid, true);
  assert.equal(byPrice[99]?.side, "hole");
  assert.equal(byPrice[99]?.size, 0);
  assert.equal(byPrice[105]?.side, "hole");
  assert.equal(byPrice[105]?.size, 0);
});

test("round display prices stay major at the active scale", () => {
  const book = createLiveBook();
  book.setNativeTick(1);
  book.applySnapshot({
    bids: [
      ["94", "2"],
      ["93", "1"],
      ["90", "4"]
    ],
    asks: [
      ["106", "3"],
      ["107", "1"],
      ["110", "5"]
    ]
  });

  const slice = buildVisibleSliceFromTickBook(book, {
    priceScale: 10,
    viewRows: 24,
    viewOffset: 0,
    autocenterPct: 85
  });

  const round110 = slice.rows.find((row) => row.price === 110);
  const round100 = slice.rows.find((row) => row.price === 100);
  const round90 = slice.rows.find((row) => row.price === 90);
  assert.equal(round110?.major, false);
  assert.equal(round100?.major, true);
  assert.equal(round90?.major, false);
  const askRow = slice.rows.find((row) => row.touchAsk);
  const bidRow = slice.rows.find((row) => row.touchBid);
  assert.ok(askRow, "compressed best ask");
  assert.ok(bidRow, "compressed best bid");
  assert.equal(askRow.price, 100);
  assert.equal(bidRow.price, 90);
});

test("x10 last ask and last bid stay adjacent with no hole", () => {
  const book = createLiveBook();
  book.setNativeTick(1);
  book.applySnapshot({
    bids: [
      ["94", "2"],
      ["93", "1"]
    ],
    asks: [
      ["106", "3"],
      ["107", "1"]
    ]
  });

  const slice = buildVisibleSliceFromTickBook(book, {
    priceScale: 10,
    viewRows: 24,
    viewOffset: 0,
    autocenterPct: 85
  });

  const askI = slice.rows.findIndex((row) => row.touchAsk);
  const bidI = slice.rows.findIndex((row) => row.touchBid);
  assert.ok(askI >= 0, "compressed last ask");
  assert.ok(bidI >= 0, "compressed last bid");
  assert.equal(slice.rows[askI].side, "ask");
  assert.equal(slice.rows[bidI].side, "bid");
  assert.equal(bidI, askI + 1, "no empty row between last ask and last bid");
  assert.equal(
    slice.rows.slice(askI + 1, bidI).some((row) => row.side === "spread" || row.side === "hole"),
    false
  );
});

test("x10 last ask and last bid share one compressed row when the native spread is inside one bucket", () => {
  const book = createLiveBook();
  book.setNativeTick(1);
  book.applySnapshot({
    bids: [
      ["101", "2"]
    ],
    asks: [
      ["102", "3"]
    ]
  });

  const slice = buildVisibleSliceFromTickBook(book, {
    priceScale: 10,
    viewRows: 24,
    viewOffset: 0,
    autocenterPct: 85
  });

  const askI = slice.rows.findIndex((row) => row.touchAsk);
  const bidI = slice.rows.findIndex((row) => row.touchBid);
  assert.equal(askI, bidI);
  assert.equal(slice.rows[askI].touchAsk, true);
  assert.equal(slice.rows[bidI].touchBid, true);
  assert.ok(!slice.rows.some((row) => row.side === "spread"));
});

test("dense x10 book never paints a sized hole between last ask and last bid", () => {
  const book = createLiveBook();
  book.setNativeTick(1);
  const bids = [];
  const asks = [];
  for(let i = 0; i < 80; i++){
    asks.push([String(101 + i), "10"]);
    bids.push([String(100 - i), "10"]);
  }
  book.applySnapshot({ bids, asks });

  const slice = buildVisibleSliceFromTickBook(book, {
    priceScale: 10,
    viewRows: 40,
    viewOffset: 0,
    autocenterPct: 85
  });

  const askI = slice.rows.findIndex((row) => row.touchAsk);
  const bidI = slice.rows.findIndex((row) => row.touchBid);
  assert.ok(askI >= 0);
  assert.ok(bidI >= 0);
  assert.ok(
    bidI === askI || bidI === askI + 1,
    "compressed BBO is one row or two adjacent rows"
  );
  for(const row of slice.rows){
    if(row.size > 0){
      assert.notEqual(row.side, "hole", `sized row ${row.price} must not be a hole`);
    }
  }
});

test("x10 ETH-like last ask 2449.75 is full red and last bid 2449.50 is full green", () => {
  const book = createLiveBook();
  book.setNativeTick(0.025);
  book.applySnapshot({
    bids: [
      ["2449.50", "200"],
      ["2449.25", "80"]
    ],
    asks: [
      ["2449.75", "40"],
      ["2450.00", "20"],
      ["2449.70", "1"]
    ]
  });

  const slice = buildVisibleSliceFromTickBook(book, {
    priceScale: 10,
    viewRows: 24,
    viewOffset: 0,
    autocenterPct: 85
  });

  const askRow = slice.rows.find((row) => row.touchAsk);
  const bidRow = slice.rows.find((row) => row.touchBid);
  assert.equal(askRow?.price, 2449.75);
  assert.equal(bidRow?.price, 2449.5);
  assert.notEqual(askRow, bidRow);
  assert.equal(compressedBboPaintMode(askRow), "ask");
  assert.equal(compressedBboPaintMode(bidRow), "bid");
});

test("leftover ask size inside the last bid row does not split that row", () => {
  const book = createLiveBook();
  book.setNativeTick(1);
  book.applySnapshot({
    bids: [
      ["94", "20"],
      ["93", "1"]
    ],
    asks: [
      ["106", "3"],
      ["107", "1"],
      ["99", "1"]
    ]
  });

  const slice = buildVisibleSliceFromTickBook(book, {
    priceScale: 10,
    viewRows: 24,
    viewOffset: 0,
    autocenterPct: 85
  });

  const askI = slice.rows.findIndex((row) => row.touchAsk);
  const bidI = slice.rows.findIndex((row) => row.touchBid);
  const askRow = slice.rows[askI];
  const bidRow = slice.rows[bidI];
  assert.equal(askRow.price, 100);
  assert.equal(bidRow.price, 90);
  assert.equal(bidI, askI + 1);
  assert.equal(askRow.touchBid, false);
  assert.equal(bidRow.touchAsk, false);
  assert.equal(compressedBboPaintMode(askRow), "ask");
  assert.equal(compressedBboPaintMode(bidRow), "bid");
});

test("collapsed last ask/bid still paints as split when a position fill covers the row", () => {
  assert.equal(
    compressedBboPaintMode({
      side: "ask",
      size: 201000,
      touch: true,
      touchAsk: true,
      touchBid: true,
      positionFill: "loss"
    }),
    "split"
  );
  assert.equal(
    compressedBboPaintMode({
      side: "ask",
      touchAsk: true,
      touchBid: false,
      positionFill: "loss"
    }),
    "ask"
  );
  assert.equal(
    compressedBboPaintMode({
      side: "bid",
      touchAsk: false,
      touchBid: true,
      positionFill: "profit"
    }),
    "bid"
  );

  const book = createLiveBook();
  book.setNativeTick(1);
  book.applySnapshot({
    bids: [["101", "2"]],
    asks: [["102", "3"]]
  });
  const slice = buildVisibleSliceFromTickBook(book, {
    priceScale: 10,
    viewRows: 24,
    viewOffset: 0,
    autocenterPct: 85
  });
  const bbo = slice.rows.find((row) => row.touchAsk && row.touchBid);
  assert.ok(bbo, "native spread inside one x10 bucket");
  const withPos = applyPositionOverlays(slice, [
    { entry: 90, current: 110, tone: "loss", long: false }
  ]);
  const filled = withPos.rows.find((row) => row.price === bbo.price);
  assert.equal(filled.positionFill, "loss");
  assert.equal(filled.size > 0, true);
  assert.equal(compressedBboPaintMode(filled), "split");
});

test("compressed position fill stops at last ask, not the ask row above it", () => {
  const book = createLiveBook();
  book.setNativeTick(0.1);
  const bids = [];
  const asks = [];
  for(let i = 0; i < 40; i++){
    asks.push([String((77925 + i * 0.1).toFixed(1)), "1"]);
    bids.push([String((77924.9 - i * 0.1).toFixed(1)), "1"]);
  }
  book.applySnapshot({ bids, asks });

  const slice = buildVisibleSliceFromTickBook(book, {
    priceScale: 25,
    viewRows: 40,
    viewOffset: 0,
    autocenterPct: 85
  });
  const lastAsk = slice.rows.find((row) => row.touchAsk);
  const lastBid = slice.rows.find((row) => row.touchBid);
  assert.equal(lastAsk?.price, 77925);
  assert.equal(lastBid?.price, 77922.5);

  const withPos = applyPositionOverlays(slice, [
    { entry: 77900, current: book.bestAsk(), tone: "loss", long: false }
  ]);
  const askAbove = withPos.rows.find((row) => row.price === 77927.5);
  const askRow = withPos.rows.find((row) => row.price === lastAsk.price);
  assert.equal(askRow?.positionFill, "loss");
  assert.equal(askAbove?.positionFill ?? null, null);
});

test("long fill live edge is the last bid row, not the last ask", () => {
  const book = createLiveBook();
  book.setNativeTick(0.1);
  const bids = [];
  const asks = [];
  for(let i = 0; i < 40; i++){
    asks.push([String((77925 + i * 0.1).toFixed(1)), "1"]);
    bids.push([String((77924.9 - i * 0.1).toFixed(1)), "1"]);
  }
  book.applySnapshot({ bids, asks });

  const slice = buildVisibleSliceFromTickBook(book, {
    priceScale: 25,
    viewRows: 40,
    viewOffset: 0,
    autocenterPct: 85
  });
  const lastAsk = slice.rows.find((row) => row.touchAsk);
  const lastBid = slice.rows.find((row) => row.touchBid);
  const withPos = applyPositionOverlays(slice, [
    { entry: 77900, current: book.bestBid(), tone: "profit", long: true }
  ]);
  assert.equal(
    withPos.rows.find((row) => row.price === lastBid.price)?.positionFill,
    "profit"
  );
  assert.equal(
    withPos.rows.find((row) => row.price === lastAsk.price)?.positionFill ?? null,
    null
  );
  assert.equal(
    withPos.rows.find((row) => row.price === 77927.5)?.positionFill ?? null,
    null
  );
});

test("losing short fills from entry through last bid up to last ask", () => {
  const book = createLiveBook();
  book.setNativeTick(0.1);
  const bids = [];
  const asks = [];
  for(let i = 0; i < 40; i++){
    asks.push([String((77925 + i * 0.1).toFixed(1)), "1"]);
    bids.push([String((77924.9 - i * 0.1).toFixed(1)), "1"]);
  }
  book.applySnapshot({ bids, asks });

  const slice = buildVisibleSliceFromTickBook(book, {
    priceScale: 25,
    viewRows: 40,
    viewOffset: 0,
    autocenterPct: 85
  });
  const lastAsk = slice.rows.find((row) => row.touchAsk);
  const lastBid = slice.rows.find((row) => row.touchBid);
  const withPos = applyPositionOverlays(slice, [
    { entry: 77880, current: book.bestAsk(), tone: "loss", long: false }
  ]);
  assert.equal(
    withPos.rows.find((row) => row.price === lastAsk.price)?.positionFill,
    "loss"
  );
  assert.equal(
    withPos.rows.find((row) => row.price === lastBid.price)?.positionFill,
    "loss"
  );
  assert.equal(
    withPos.rows.find((row) => row.price === 77880)?.positionFill,
    "loss"
  );
  assert.equal(withPos.positionExit, "ask");
});

test("profitable short fills ask rows from last ask up to entry", () => {
  const book = createLiveBook();
  book.setNativeTick(0.1);
  const bids = [];
  const asks = [];
  for(let i = 0; i < 40; i++){
    asks.push([String((77925 + i * 0.1).toFixed(1)), "1"]);
    bids.push([String((77924.9 - i * 0.1).toFixed(1)), "1"]);
  }
  book.applySnapshot({ bids, asks });

  const slice = buildVisibleSliceFromTickBook(book, {
    priceScale: 25,
    viewRows: 40,
    viewOffset: 0,
    autocenterPct: 85
  });
  const lastAsk = slice.rows.find((row) => row.touchAsk);
  const lastBid = slice.rows.find((row) => row.touchBid);
  const withPos = applyPositionOverlays(slice, [
    { entry: 77940, current: book.bestAsk(), tone: "profit", long: false }
  ]);
  assert.equal(
    withPos.rows.find((row) => row.price === lastAsk.price)?.positionFill,
    "profit"
  );
  assert.equal(
    withPos.rows.find((row) => row.price === 77927.5)?.positionFill,
    "profit"
  );
  assert.equal(
    withPos.rows.find((row) => row.price === 77940)?.positionFill,
    "profit"
  );
  assert.equal(
    withPos.rows.find((row) => row.price === lastBid.price)?.positionFill ?? null,
    null
  );
});

test("losing long fills ask rows from last bid up to the entry", () => {
  const book = createLiveBook();
  book.setNativeTick(0.1);
  const bids = [];
  const asks = [];
  for(let i = 0; i < 40; i++){
    asks.push([String((77925 + i * 0.1).toFixed(1)), "1"]);
    bids.push([String((77924.9 - i * 0.1).toFixed(1)), "1"]);
  }
  book.applySnapshot({ bids, asks });

  const slice = buildVisibleSliceFromTickBook(book, {
    priceScale: 25,
    viewRows: 40,
    viewOffset: 0,
    autocenterPct: 85
  });
  const lastAsk = slice.rows.find((row) => row.touchAsk);
  const lastBid = slice.rows.find((row) => row.touchBid);
  const withPos = applyPositionOverlays(slice, [
    { entry: 77940, current: book.bestBid(), tone: "loss", long: true }
  ]);
  assert.equal(
    withPos.rows.find((row) => row.price === lastBid.price)?.positionFill,
    "loss"
  );
  assert.equal(
    withPos.rows.find((row) => row.price === lastAsk.price)?.positionFill,
    "loss"
  );
  assert.equal(
    withPos.rows.find((row) => row.price === 77927.5)?.positionFill,
    "loss"
  );
  assert.equal(
    withPos.rows.find((row) => row.price === 77940)?.positionFill,
    "loss"
  );
  assert.equal(withPos.positionExit, "bid");
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

