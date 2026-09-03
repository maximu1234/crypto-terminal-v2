import test from "node:test";
import assert from "node:assert/strict";

import {
  collapseDiaryPositions,
  cumulativePnlSeries,
  diaryChartTimeTicks,
  rankDiaryPnlBySymbol,
  summarizeDiaryPeriodAnalytics,
  tradeVolumeUsd
} from "../js/diary-period-analytics.js";

test("tradeVolumeUsd uses qty * entry, then pnl/pct fallback", () => {
  assert.equal(
    tradeVolumeUsd({ qty: 2, avgEntryPrice: 100 }),
    200
  );
  assert.equal(
    tradeVolumeUsd({ pnlUsd: 10, pnlPct: 10 }),
    100
  );
  assert.equal(
    tradeVolumeUsd({ pnlUsd: 5 }),
    0
  );
});

test("summarizeDiaryPeriodAnalytics uses only the given trades", () => {
  const trades = [
    {
      symbol: "BTCUSDT",
      side: "long",
      pnlUsd: 20,
      pnlPct: 10,
      qty: 1,
      avgEntryPrice: 200,
      closeTimeMs: 2,
      orderId: "a"
    },
    {
      symbol: "ETHUSDT",
      side: "short",
      pnlUsd: -5,
      qty: 2,
      avgEntryPrice: 50,
      closeTimeMs: 1,
      orderId: "b"
    }
  ];
  const stats = summarizeDiaryPeriodAnalytics(trades);
  assert.equal(stats.count, 2);
  assert.equal(stats.totalPnl, 15);
  assert.equal(stats.volumeUsd, 300);
  assert.equal(stats.wins, 1);
  assert.equal(stats.losses, 1);
  assert.equal(stats.winRatePct, 50);
  assert.equal(stats.longCount, 1);
  assert.equal(stats.shortCount, 1);
  assert.equal(stats.longPnl, 20);
  assert.equal(stats.shortPnl, -5);
  assert.equal(stats.longWinRatePct, 100);
  assert.equal(stats.shortWinRatePct, 0);
  assert.deepEqual(
    stats.series.map((p) => p.v),
    [-5, 15]
  );
  assert.equal(stats.ranking[0].symbol, "BTCUSDT");
  assert.equal(stats.ranking[0].pnl, 20);
});

test("collapseDiaryPositions merges the same positionId", () => {
  const rows = collapseDiaryPositions([
    {
      positionId: "p1",
      symbol: "BTCUSDT",
      side: "long",
      pnlUsd: 3,
      closeTimeMs: 1,
      qty: 1
    },
    {
      positionId: "p1",
      symbol: "BTCUSDT",
      side: "long",
      pnlUsd: 4,
      closeTimeMs: 2,
      qty: 1
    },
    {
      positionId: "p2",
      symbol: "ETHUSDT",
      side: "short",
      pnlUsd: -1,
      closeTimeMs: 3,
      qty: 1
    }
  ]);
  assert.equal(rows.length, 2);
  const btc = rows.find((row) => row.positionId === "p1");
  assert.equal(btc.pnlUsd, 7);
  const stats = summarizeDiaryPeriodAnalytics(
    [
      {
        positionId: "p1",
        symbol: "BTCUSDT",
        side: "long",
        pnlUsd: 3,
        closeTimeMs: 1
      },
      {
        positionId: "p1",
        symbol: "BTCUSDT",
        side: "long",
        pnlUsd: 4,
        closeTimeMs: 2
      }
    ],
    { mode: "positions" }
  );
  assert.equal(stats.count, 1);
  assert.equal(stats.totalPnl, 7);
});

test("cumulativePnlSeries sorts by close time", () => {
  assert.deepEqual(
    cumulativePnlSeries([
      { closeTimeMs: 30, pnlUsd: 5 },
      { closeTimeMs: 10, pnlUsd: -2 }
    ]).map((p) => [p.t, p.v]),
    [
      [10, -2],
      [30, 3]
    ]
  );
});

test("rankDiaryPnlBySymbol sorts by signed pnl", () => {
  const trades = [
    { symbol: "AAAUSDT", pnlUsd: 1 },
    { symbol: "BTCUSDT", pnlUsd: -8 },
    { symbol: "ETHUSDT", pnlUsd: 3 }
  ];
  const desc = rankDiaryPnlBySymbol(trades);
  assert.equal(desc[0].symbol, "ETHUSDT");
  assert.equal(desc[1].symbol, "AAAUSDT");
  assert.equal(desc[2].symbol, "BTCUSDT");
  const asc = rankDiaryPnlBySymbol(trades, 8, "asc");
  assert.equal(asc[0].symbol, "BTCUSDT");
  assert.equal(asc[1].symbol, "AAAUSDT");
  assert.equal(asc[2].symbol, "ETHUSDT");
});

test("diaryChartTimeTicks keeps endpoints and interior days", () => {
  assert.deepEqual(
    diaryChartTimeTicks(50, 50),
    [50]
  );
  const lo = Date.UTC(2026, 7, 4, 12);
  const hi = Date.UTC(2026, 8, 3, 12);
  const ticks = diaryChartTimeTicks(lo, hi);
  assert.equal(ticks[0], lo);
  assert.equal(ticks[ticks.length - 1], hi);
  assert.ok(ticks.length >= 4);
  for (let i = 1; i < ticks.length; i += 1) {
    assert.ok(ticks[i] > ticks[i - 1]);
  }
});
