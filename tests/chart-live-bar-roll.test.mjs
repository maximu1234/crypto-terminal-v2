import test from "node:test";
import assert from "node:assert/strict";
import {
applyLiveLastPriceToCandles,
applyLiveOhlcBar,
collectKlineRows,
ensureOhlcRollover,
ingestLiveOhlcKline,
liveBarPeriodSec,
mergeCatchupOhlcBars,
mergeLiveBarIntoDisplay,
nextOhlcOpenTime,
queueKlineByTime,
sliceContiguousCatchupBars,
takeQueuedKlinesSorted,
UNIX_MONDAY_OPEN_SEC,
upsertOhlcBar
} from "../js/chart/live-bar-roll.js";

test("liveBarPeriodSec matches chart TFs", () => {
  assert.equal(liveBarPeriodSec("1"), 60);
  assert.equal(liveBarPeriodSec("60"), 3600);
  assert.equal(liveBarPeriodSec("D"), 86400);
});

test("ensureOhlcRollover opens the next bar when the period elapsed", () => {
  const candles = [
    { time: 1000, open: 10, high: 12, low: 9, close: 11, volume: 1 }
  ];
  assert.equal(ensureOhlcRollover(candles, 60, 1059), false);
  assert.equal(candles.length, 1);
  assert.equal(ensureOhlcRollover(candles, 60, 1060), true);
  assert.equal(candles.length, 2);
  assert.equal(candles[1].time, 1060);
  assert.equal(candles[1].open, 11);
  assert.equal(candles[1].close, 11);
});

test("ensureOhlcRollover fills trailing whitespace at the next open", () => {
  const candles = [
    { time: 1000, open: 10, high: 12, low: 9, close: 11, volume: 1 },
    { time: 1060 },
    { time: 1120 }
  ];
  assert.equal(ensureOhlcRollover(candles, 60, 1060), true);
  assert.equal(candles[1].close, 11);
  assert.equal(candles[2].time, 1120);
  assert.equal(candles.length, 3);
});

test("applyLiveOhlcBar keeps a late confirm of the closed bar after rollover", () => {
  const candles = [
    { time: 1000, open: 10, high: 12, low: 9, close: 11, volume: 1 },
    { time: 1060, open: 11, high: 11, low: 11, close: 11, volume: 0 }
  ];
  const kind = applyLiveOhlcBar(candles, {
    time: 1000,
    open: 10,
    high: 13,
    low: 8,
    close: 12,
    volume: 4
  });
  assert.equal(kind, "hist");
  assert.equal(candles[0].high, 13);
  assert.equal(candles[1].time, 1060);
});

test("applyLiveLastPriceToCandles ticks the last bar and opens the next on the clock", () => {
  const candles = [
    { time: 1000, open: 10, high: 12, low: 9, close: 11, volume: 1 }
  ];
  const sameBar = applyLiveLastPriceToCandles(candles, 12.5, 60, 1059);
  assert.equal(sameBar.rolled, false);
  assert.equal(candles.length, 1);
  assert.equal(candles[0].close, 12.5);
  assert.equal(candles[0].high, 12.5);

  const rolled = applyLiveLastPriceToCandles(candles, 13, 60, 1060);
  assert.equal(rolled.rolled, true);
  assert.equal(candles.length, 2);
  assert.equal(candles[1].time, 1060);
  assert.equal(candles[1].close, 13);
  assert.equal(candles[1].high, 13);
});

test("applyLiveOhlcBar appends a newer bar", () => {
  const candles = [
    { time: 1000, open: 10, high: 12, low: 9, close: 11, volume: 1 }
  ];
  assert.equal(
    applyLiveOhlcBar(candles, {
      time: 1060,
      open: 11,
      high: 12,
      low: 11,
      close: 12,
      volume: 1
    }),
    "new"
  );
  assert.equal(candles.length, 2);
});

test("mergeLiveBarIntoDisplay replaces first whitespace with the new OHLC bar", () => {
  const display = [
    { time: 1000, open: 10, high: 12, low: 9, close: 11 },
    { time: 1060 },
    { time: 1120 }
  ];
  const next = mergeLiveBarIntoDisplay(display, {
    time: 1060,
    open: 11,
    high: 12,
    low: 10,
    close: 12
  });
  assert.equal(next[1].close, 12);
  assert.equal(next[2].time, 1120);
  assert.equal(next.length, 3);
});

test("kline queue keeps both the closed bar and the new bar in time order", () => {
  const pending = new Map();
  queueKlineByTime(pending, "kline.1.BTCUSDT", {
    time: 1060,
    close: 2
  });
  queueKlineByTime(pending, "kline.1.BTCUSDT", {
    time: 1000,
    close: 1
  });
  const [batch] = takeQueuedKlinesSorted(pending);
  assert.equal(batch.candles.length, 2);
  assert.equal(batch.candles[0].time, 1000);
  assert.equal(batch.candles[1].time, 1060);
  assert.equal(pending.size, 0);
});

test("collectKlineRows uses every row, not only the first", () => {
  const rows = collectKlineRows([
    { start: 1, close: "1" },
    { start: 2, close: "2" }
  ]);
  assert.equal(rows.length, 2);
  assert.equal(rows[1].close, "2");
});

test("nextOhlcOpenTime keeps UTC midnight for daily bars", () => {
  const day = 1704067200;
  assert.equal(day % 86400, 0);
  assert.equal(nextOhlcOpenTime(day, 86400), day + 86400);
  assert.equal(nextOhlcOpenTime(day + 3, 86400), day + 86400);
});

test("nextOhlcOpenTime keeps a non-UTC daily session offset", () => {
  const utc8 = 1704067200 + 16 * 3600;
  assert.equal(nextOhlcOpenTime(utc8, 86400), utc8 + 86400);
});

test("nextOhlcOpenTime uses Monday UTC for weekly bars, not Unix Thursday", () => {
  assert.equal(nextOhlcOpenTime(UNIX_MONDAY_OPEN_SEC, 604800), UNIX_MONDAY_OPEN_SEC + 604800);
  assert.equal(nextOhlcOpenTime(0, 604800), UNIX_MONDAY_OPEN_SEC);
  assert.equal(nextOhlcOpenTime(604800, 604800), UNIX_MONDAY_OPEN_SEC + 604800);
});

test("ensureOhlcRollover opens the next UTC day from a midnight daily bar", () => {
  const day = 1704067200;
  const candles = [
    { time: day, open: 10, high: 12, low: 9, close: 11, volume: 1 }
  ];
  assert.equal(ensureOhlcRollover(candles, 86400, day + 86399), false);
  assert.equal(ensureOhlcRollover(candles, 86400, day + 86400), true);
  assert.equal(candles[1].time, day + 86400);
});

test("ensureOhlcRollover does not use the Unix-week Thursday grid", () => {
  const candles = [
    { time: 0, open: 10, high: 12, low: 9, close: 11, volume: 1 }
  ];
  assert.equal(ensureOhlcRollover(candles, 604800, UNIX_MONDAY_OPEN_SEC - 1), false);
  assert.equal(ensureOhlcRollover(candles, 604800, UNIX_MONDAY_OPEN_SEC), true);
  assert.equal(candles[1].time, UNIX_MONDAY_OPEN_SEC);
});

test("ingestLiveOhlcKline reports a shifted cap and keeps a hist confirm", () => {
  const candles = [
    { time: 1000, open: 10, high: 12, low: 9, close: 11, volume: 1 },
    { time: 1060, open: 11, high: 11, low: 11, close: 11, volume: 0 }
  ];
  const hist = ingestLiveOhlcKline(
    candles,
    { time: 1000, open: 10, high: 13, low: 8, close: 12, volume: 4 },
    60,
    8,
    1060
  );
  assert.equal(hist.kind, "hist");
  assert.equal(hist.shifted, false);
  assert.equal(candles[0].high, 13);

  const capped = [
    { time: 1000, open: 1, high: 1, low: 1, close: 1, volume: 1 },
    { time: 1060, open: 1, high: 1, low: 1, close: 1, volume: 1 }
  ];
  const next = ingestLiveOhlcKline(
    capped,
    { time: 1120, open: 2, high: 2, low: 2, close: 2, volume: 1 },
    60,
    2,
    1060
  );
  assert.equal(next.kind, "new");
  assert.equal(next.shifted, true);
  assert.equal(capped.length, 2);
  assert.equal(capped[0].time, 1060);
});

test("applyLiveOhlcBar refuses a jump that would leave a hole", () => {
  const candles = [
    { time: 1000, open: 10, high: 12, low: 9, close: 11, volume: 1 }
  ];
  assert.equal(
    applyLiveOhlcBar(
      candles,
      {
        time: 1180,
        open: 11,
        high: 12,
        low: 11,
        close: 12,
        volume: 1
      },
      0,
      60
    ),
    null
  );
  assert.equal(candles.length, 1);
  assert.equal(candles[0].time, 1000);
});

test("applyLiveOhlcBar still appends the next contiguous period", () => {
  const candles = [
    { time: 1000, open: 10, high: 12, low: 9, close: 11, volume: 1 }
  ];
  assert.equal(
    applyLiveOhlcBar(
      candles,
      {
        time: 1060,
        open: 11,
        high: 12,
        low: 11,
        close: 12,
        volume: 1
      },
      0,
      60
    ),
    "new"
  );
  assert.equal(candles.length, 2);
});

test("upsertOhlcBar inserts a missing middle bar", () => {
  const candles = [
    { time: 1000, open: 10, high: 12, low: 9, close: 11, volume: 1 },
    { time: 1120, open: 12, high: 13, low: 12, close: 12.5, volume: 1 }
  ];
  assert.equal(
    upsertOhlcBar(candles, {
      time: 1060,
      open: 11,
      high: 11.5,
      low: 10.5,
      close: 11.2,
      volume: 1
    }),
    "insert"
  );
  assert.equal(candles.length, 3);
  assert.equal(candles[1].time, 1060);
  assert.equal(candles[0].time, 1000);
  assert.equal(candles[2].time, 1120);
});

test("mergeCatchupOhlcBars keeps older history and drops a disconnected suffix", () => {
  const candles = [
    { time: 900, open: 9, high: 10, low: 8, close: 9.5, volume: 1 },
    { time: 1000, open: 10, high: 12, low: 9, close: 11, volume: 1 }
  ];
  const result = mergeCatchupOhlcBars(
    candles,
    [
      { time: 1000, open: 10, high: 13, low: 9, close: 12, volume: 2 },
      { time: 1060, open: 12, high: 12.5, low: 11.5, close: 12.2, volume: 1 },
      { time: 2000, open: 20, high: 21, low: 19, close: 20, volume: 1 }
    ],
    0,
    60
  );
  assert.equal(result.appended, 1);
  assert.equal(result.patched, true);
  assert.equal(candles[0].time, 900);
  assert.equal(candles[1].high, 13);
  assert.equal(candles[2].time, 1060);
  assert.equal(candles.length, 3);
});

test("sliceContiguousCatchupBars stops before a missing period", () => {
  const rows = sliceContiguousCatchupBars(1000, 60, [
    { time: 1000, close: 1 },
    { time: 1060, close: 2 },
    { time: 1180, close: 4 }
  ]);
  assert.equal(rows.length, 2);
  assert.equal(rows[1].time, 1060);
});
