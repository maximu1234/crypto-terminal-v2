import test from "node:test";
import assert from "node:assert/strict";
import {
  mapClosedPnlRow,
  matchTradeExecutions
} from "../alert-worker/lib/trade/bybit-diary.js";

test("mapClosedPnlRow maps Bybit close-sell as long", () => {
  const trade = mapClosedPnlRow({
    symbol: "BTCUSDT",
    closedPnl: "12.5",
    cumEntryValue: "1000",
    openFee: "0.1",
    closeFee: "0.2",
    updatedTime: "1710000000000",
    createdTime: "1709990000000",
    side: "Sell",
    closedSize: "0.01",
    avgEntryPrice: "100000",
    avgExitPrice: "101000",
    leverage: "10",
    orderId: "abc"
  });
  assert.equal(trade.symbol, "BTCUSDT");
  assert.equal(trade.side, "long");
  assert.equal(trade.pnlUsd, 12.5);
  assert.equal(trade.orderId, "abc");
  assert.equal(trade.openTimeMs, 1709990000000);
  assert.equal(trade.closeTimeMs, 1710000000000);
});

test("matchTradeExecutions splits entry and exit fills by side", () => {
  const matched = matchTradeExecutions(
    {
      symbol: "ETHUSDT",
      side: "long",
      qty: 2,
      closeTimeMs: 1_000_000,
      orderId: "exit-1",
      avgEntryPrice: 2000
    },
    [
      {
        symbol: "ETHUSDT",
        side: "Buy",
        execQty: 2,
        execPrice: 2000,
        execTimeMs: 900_000,
        orderId: "entry-1",
        execId: "e1"
      },
      {
        symbol: "ETHUSDT",
        side: "Sell",
        execQty: 2,
        execPrice: 2100,
        execTimeMs: 1_000_000,
        orderId: "exit-1",
        execId: "x1"
      }
    ]
  );
  assert.equal(matched.entries.length, 1);
  assert.equal(matched.exits.length, 1);
  assert.equal(matched.avgEntryPrice, 2000);
  assert.equal(matched.avgExitPrice, 2100);
});
