import test from "node:test";
import assert from "node:assert/strict";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);

const {
  buildCanonical,
  signPayload,
  validateParams
} = require("../desktop/trading/bingx-sign.cjs");

const {
  toBingxSymbol,
  toCanonicalSymbol,
  mapOrderRow,
  mapPositionRow,
  rawPositionFromBingx,
  enrichPositionsWithStopOrders,
  resolveCloseSidesSync,
  pickUsdtBalance,
  mapBingxPositionHistoryRow,
  mapBingxFillExecution,
  buildBingxRoundTripsFromPositionFills,
  matchBingxRoundTripByAnchor,
  mapApiError,
  isRateLimitError,
  selectPositionFromCandidates,
  normalizeBingxWsPositionRow,
  normalizeBingxWsOrderRow
} = (() => {
  // Stub electron before loading bingx-rest.
  const Module = require("module");
  const originalLoad = Module._load;
  Module._load = function (request, parent, isMain) {
    if (request === "electron") {
      return {
        net: {
          fetch: async () => {
            throw new Error("net.fetch stub — offline test");
          }
        },
        app: {
          getPath: () => "/tmp"
        }
      };
    }
    return originalLoad.apply(this, arguments);
  };
  try {
    return require("../desktop/trading/bingx-rest.cjs");
  } finally {
    Module._load = originalLoad;
  }
})();

test("mapBingxFillExecution parses ISO filledTime", () => {
  const ex = mapBingxFillExecution({
    symbol: "ZBT-USDT",
    side: "SELL",
    price: "0.0895",
    qty: "10",
    fee: "-0.01",
    filledTime: "2026-07-16T00:44:09.000+0700"
  });
  assert.ok(ex);
  assert.equal(ex.side, "Sell");
  assert.equal(ex.execPrice, 0.0895);
  assert.ok(Number.isFinite(ex.execTimeMs) && ex.execTimeMs > 1e12);
});

test("positionSide fill cycles preserve a multi-day short", () => {
  const fills = [
    mapBingxFillExecution({
      symbol: "BTC-USDT",
      side: "SELL",
      positionSide: "SHORT",
      filledTm: "2026-06-30T06:59:37.000Z",
      price: "59567.0",
      volume: "0.0040"
    }),
    mapBingxFillExecution({
      symbol: "BTC-USDT",
      side: "BUY",
      positionSide: "SHORT",
      filledTm: "2026-07-01T04:46:27.000Z",
      price: "59429.6",
      volume: "0.0040"
    })
  ];
  const trades = buildBingxRoundTripsFromPositionFills(fills);
  assert.equal(trades.length, 1);
  assert.equal(trades[0].side, "short");
  assert.equal(trades[0].entries[0].side, "Sell");
  assert.equal(trades[0].exits[0].side, "Buy");
  assert.equal(trades[0].avgEntryPrice, 59567);
  assert.equal(trades[0].avgExitPrice, 59429.6);
  assert.equal(
    trades[0].durationMs,
    Date.parse("2026-07-01T04:46:27.000Z") -
      Date.parse("2026-06-30T06:59:37.000Z")
  );
});

test("matchBingxRoundTripByAnchor finds short by close or open income time", () => {
  const openMs = Date.parse("2026-06-30T06:59:37.000Z");
  const closeMs = Date.parse("2026-07-01T04:46:27.000Z");
  const trips = buildBingxRoundTripsFromPositionFills([
    mapBingxFillExecution({
      symbol: "BTC-USDT",
      side: "SELL",
      positionSide: "SHORT",
      filledTm: "2026-06-30T06:59:37.000Z",
      price: "59567.0",
      volume: "0.0040"
    }),
    mapBingxFillExecution({
      symbol: "BTC-USDT",
      side: "BUY",
      positionSide: "SHORT",
      filledTm: "2026-07-01T04:46:27.000Z",
      price: "59429.6",
      volume: "0.0040"
    })
  ]);
  const byClose = matchBingxRoundTripByAnchor(trips, closeMs);
  const byOpen = matchBingxRoundTripByAnchor(trips, openMs);
  assert.ok(byClose);
  assert.ok(byOpen);
  assert.equal(byClose.side, "short");
  assert.equal(byOpen.side, "short");
  assert.equal(byClose.openTimeMs, openMs);
  assert.equal(byClose.closeTimeMs, closeMs);
  assert.equal(byOpen.openTimeMs, openMs);
  assert.equal(byOpen.closeTimeMs, closeMs);
});

test("mapBingxPositionHistoryRow maps closed position", () => {
  const trade = mapBingxPositionHistoryRow({
    positionId: "1861675561156571136",
    symbol: "LTC-USDT",
    positionSide: "LONG",
    openTime: 1732693017000,
    updateTime: 1733310292000,
    avgPrice: "95.18",
    avgClosePrice: "129.48",
    realisedProfit: "102.89",
    netProfit: "99.63",
    positionAmt: "30.0",
    closePositionAmt: "30.0",
    leverage: 6,
    positionCommission: "-0.337"
  });
  assert.ok(trade);
  assert.equal(trade.symbol, "LTCUSDT");
  assert.equal(trade.side, "long");
  assert.equal(trade.pnlUsd, 99.63);
  assert.equal(trade.avgEntryPrice, 95.18);
  assert.equal(trade.avgExitPrice, 129.48);
  assert.equal(trade.qty, 30);
  assert.ok(trade.commissionUsd > 0);
});

test("executionsFromBingxClosedTrades: short entry is Sell, exit is Buy", () => {
  const openMs = Date.parse("2026-06-30T13:59:37+07:00");
  const closeMs = Date.parse("2026-07-01T11:46:27+07:00");
  const { executionsFromBingxClosedTrades } = require("../desktop/trading/bingx-rest.cjs");
  const ex = executionsFromBingxClosedTrades([
    {
      openTimeMs: openMs,
      closeTimeMs: closeMs,
      side: "short"
    }
  ]);
  assert.equal(ex.length, 2);
  assert.equal(ex[0].side, "Sell");
  assert.equal(ex[0].execTimeMs, openMs);
  assert.equal(ex[1].side, "Buy");
  assert.equal(ex[1].execTimeMs, closeMs);
});

test("pickUsdtBalance prefers equity over zero availableMargin", () => {
  assert.equal(
    pickUsdtBalance({
      code: 0,
      data: {
        balance: {
          asset: "USDT",
          availableMargin: "0.0000",
          balance: "150.5",
          equity: "162.25"
        }
      }
    }),
    "162.25"
  );
});

test("pickUsdtBalance reads USDT from balance array", () => {
  assert.equal(
    pickUsdtBalance({
      data: {
        balance: [
          {
            asset: "BTC",
            equity: "0.01",
            balance: "0.01"
          },
          {
            asset: "USDT",
            equity: "88.2",
            availableMargin: "10"
          }
        ]
      }
    }),
    "88.2"
  );
});

test("buildCanonical sorts params alphabetically", () => {
  assert.equal(
    buildCanonical({
      symbol: "BTC-USDT",
      timestamp: 1649404670162,
      side: "BUY"
    }),
    "side=BUY&symbol=BTC-USDT&timestamp=1649404670162"
  );
});

test("signPayload is stable HMAC SHA256 hex", () => {
  const params = {
    side: "BUY",
    symbol: "BTC-USDT",
    timestamp: 1649404670162
  };
  const sig = signPayload("test-secret", params);
  assert.match(sig, /^[a-f0-9]{64}$/);
  assert.equal(sig, signPayload("test-secret", params));
});

test("validateParams rejects forbidden characters", () => {
  assert.throws(
    () => validateParams({ symbol: "BTC-USDT&evil=1" }),
    /forbidden char/i
  );
});

test("toBingxSymbol maps canonical USDT symbols", () => {
  assert.equal(toBingxSymbol("BTCUSDT"), "BTC-USDT");
  assert.equal(toBingxSymbol("BTC-USDT"), "BTC-USDT");
  assert.equal(toCanonicalSymbol("btc-usdt"), "BTCUSDT");
});

test("mapOrderRow maps BingX TRIGGER_MARKET pending order", () => {
  const mapped = mapOrderRow({
    symbol: "1INCH-USDT",
    side: "BUY",
    type: "TRIGGER_MARKET",
    status: "PENDING",
    stopPrice: "0.12287",
    quantity: "81.2",
    orderID: "123456789012345"
  });
  assert.ok(mapped);
  assert.equal(mapped.symbol, "1INCHUSDT");
  assert.equal(mapped.orderKind, "stop");
  assert.equal(mapped.side, "Buy");
  assert.equal(mapped.price, 0.12287);
});

test("mapOrderRow hides position STOP_MARKET / TAKE_PROFIT as chart stop orders", () => {
  assert.equal(
    mapOrderRow({
      symbol: "BTC-USDT",
      side: "SELL",
      type: "STOP_MARKET",
      status: "NEW",
      stopPrice: "60000",
      quantity: "0.01",
      reduceOnly: true,
      orderId: "sl1"
    }),
    null
  );
  assert.equal(
    mapOrderRow({
      symbol: "BTC-USDT",
      side: "SELL",
      type: "TAKE_PROFIT_MARKET",
      status: "NEW",
      stopPrice: "70000",
      quantity: "0.01",
      reduceOnly: true,
      orderId: "tp1"
    }),
    null
  );
});

test("mapOrderRow maps LIMIT order", () => {
  const mapped = mapOrderRow({
    symbol: "ETH-USDT",
    side: "SELL",
    type: "LIMIT",
    status: "NEW",
    price: "3500",
    quantity: "0.1",
    orderId: "99"
  });
  assert.ok(mapped);
  assert.equal(mapped.orderKind, "limit");
  assert.equal(mapped.side, "Sell");
});

test("rawPositionFromBingx + mapPositionRow hedge LONG", () => {
  const raw = rawPositionFromBingx({
    symbol: "BTC-USDT",
    positionSide: "LONG",
    positionAmt: "0.01",
    avgPrice: "60000",
    markPrice: "61000",
    unrealizedProfit: "10",
    leverage: "10",
    marginType: "CROSSED"
  });
  assert.ok(raw);
  assert.equal(raw.side, "Buy");
  const mapped = mapPositionRow(raw);
  assert.equal(mapped.symbol, "BTCUSDT");
  assert.equal(mapped.side, "Buy");
  assert.equal(mapped.size, 0.01);
});

test("rawPositionFromBingx hedge SHORT uses Sell side", () => {
  const raw = rawPositionFromBingx({
    symbol: "ETH-USDT",
    positionSide: "SHORT",
    positionAmt: "-1.5",
    avgPrice: "3000",
    markPrice: "2900",
    unrealizedProfit: "150",
    leverage: "5",
    marginType: "CROSSED"
  });
  assert.ok(raw);
  assert.equal(raw.side, "Sell");
  assert.equal(raw.size, 1.5);
});

test("resolveCloseSidesSync SHORT closes with BUY / SHORT in hedge", () => {
  const sides = resolveCloseSidesSync(
    {
      side: "Sell",
      positionSide: "SHORT",
      size: 1.5,
      positionAmt: -1.5
    },
    true
  );
  assert.equal(sides.side, "BUY");
  assert.equal(sides.positionSide, "SHORT");
});

test("resolveCloseSidesSync LONG closes with SELL / LONG in hedge", () => {
  const sides = resolveCloseSidesSync(
    {
      side: "Buy",
      positionSide: "LONG",
      size: 0.01
    },
    true
  );
  assert.equal(sides.side, "SELL");
  assert.equal(sides.positionSide, "LONG");
});

test("resolveCloseSidesSync returns null when side unknown", () => {
  assert.equal(
    resolveCloseSidesSync(
      {
        size: 1,
        positionSide: "BOTH"
      },
      true
    ),
    null
  );
});

test("enrichPositionsWithStopOrders matches positionSide in hedge", () => {
  const positions = [
    {
      symbol: "BTCUSDT",
      side: "Buy",
      positionSide: "LONG",
      stopLoss: 0,
      takeProfit: 0
    },
    {
      symbol: "BTCUSDT",
      side: "Sell",
      positionSide: "SHORT",
      stopLoss: 0,
      takeProfit: 0
    }
  ];
  const enriched = enrichPositionsWithStopOrders(positions, [
    {
      symbol: "BTC-USDT",
      type: "STOP_MARKET",
      positionSide: "LONG",
      stopPrice: "58000",
      orderId: "sl-long"
    },
    {
      symbol: "BTC-USDT",
      type: "STOP_MARKET",
      positionSide: "SHORT",
      stopPrice: "62000",
      orderId: "sl-short"
    }
  ]);
  assert.equal(enriched[0].stopLoss, 58000);
  assert.equal(enriched[0].slOrderId, "sl-long");
  assert.equal(enriched[1].stopLoss, 62000);
  assert.equal(enriched[1].slOrderId, "sl-short");
});

test("enrichPositionsWithStopOrders reads STOP/TP from open orders", () => {
  const positions = [
    {
      symbol: "BTCUSDT",
      stopLoss: 0,
      takeProfit: 0
    }
  ];
  const enriched = enrichPositionsWithStopOrders(positions, [
    {
      symbol: "BTC-USDT",
      type: "STOP_MARKET",
      stopPrice: "58000",
      orderId: "sl1"
    },
    {
      symbol: "BTC-USDT",
      type: "TAKE_PROFIT_MARKET",
      stopPrice: "65000",
      orderId: "tp1"
    }
  ]);
  assert.equal(enriched[0].stopLoss, 58000);
  assert.equal(enriched[0].takeProfit, 65000);
  assert.equal(enriched[0].slOrderId, "sl1");
  assert.equal(enriched[0].tpOrderId, "tp1");
});

test("mapApiError maps rate limit to friendly Russian", () => {
  assert.equal(isRateLimitError({ code: 100410, msg: "limit" }), true);
  assert.match(mapApiError({ code: 100410, msg: "frequency" }), /лимит/i);
});

test("selectPositionFromCandidates rejects hedge ambiguity without side", () => {
  const both = [
    { symbol: "BTCUSDT", positionSide: "LONG", side: "Buy" },
    { symbol: "BTCUSDT", positionSide: "SHORT", side: "Sell" }
  ];
  const ambiguous = selectPositionFromCandidates(both, null);
  assert.equal(ambiguous.ok, false);
  assert.equal(ambiguous.ambiguous, true);

  const longOnly = selectPositionFromCandidates(both, "LONG");
  assert.equal(longOnly.ok, true);
  assert.equal(longOnly.position.positionSide, "LONG");

  const single = selectPositionFromCandidates([both[0]], null);
  assert.equal(single.ok, true);
  assert.equal(single.position.side, "Buy");
});

test("normalizeBingxWsPositionRow expands compact ACCOUNT_UPDATE fields", () => {
  const row = normalizeBingxWsPositionRow({
    s: "SNXX-USDT",
    pa: "-0.58",
    ep: "17.26",
    up: "0.01",
    mt: "cross",
    ps: "SHORT"
  });
  assert.ok(row);
  assert.equal(row.symbol, "SNXXUSDT");
  assert.equal(row.positionSide, "SHORT");
  assert.equal(row.side, "Sell");
  assert.equal(row.size, 0.58);
  assert.equal(row.avgPrice, 17.26);

  const mapped = mapPositionRow(row);
  assert.ok(mapped);
  assert.equal(mapped.side, "Sell");
  assert.ok(mapped.size > 0);
});

test("normalizeBingxWsOrderRow expands compact ORDER_TRADE_UPDATE fields", () => {
  const order = normalizeBingxWsOrderRow({
    s: "BTC-USDT",
    S: "SELL",
    o: "TRIGGER_MARKET",
    q: "0.01",
    p: "0",
    X: "FILLED",
    i: "12345",
    ps: "SHORT",
    sp: "65000"
  });
  assert.ok(order);
  assert.equal(order.symbol, "BTCUSDT");
  assert.equal(order.side, "Sell");
  assert.equal(order.status, "FILLED");
  assert.equal(order.orderId, "12345");
  assert.equal(order.type, "TRIGGER_MARKET");
  assert.equal(order.stopPrice, "65000");

  const withFills = normalizeBingxWsOrderRow({
    s: "BTC-USDT",
    S: "BUY",
    o: "MARKET",
    q: "0.02",
    X: "PARTIALLY_FILLED",
    i: "99",
    ps: "LONG",
    z: "0.015",
    l: "0.005",
    ap: "65010"
  });
  assert.equal(withFills.executedQty, "0.015");
  assert.equal(withFills.lastFilledQty, "0.005");
  assert.equal(withFills.avgPrice, "65010");
});

test("private WS positionStreamKey is hedge-side aware", () => {
  const Module = require("module");
  const originalLoad = Module._load;
  Module._load = function (request, parent, isMain) {
    if (request === "electron") {
      return {
        net: { fetch: async () => { throw new Error("offline"); } },
        app: { getPath: () => "/tmp" }
      };
    }
    if (request === "./exchange-credentials.cjs") {
      return { getCredentials: () => null };
    }
    return originalLoad.apply(this, arguments);
  };
  try {
    const { positionStreamKey, resolveWsBase } = require(
      "../desktop/trading/bingx-private-ws.cjs"
    );
    assert.equal(
      positionStreamKey({ symbol: "BTCUSDT", positionSide: "LONG" }),
      "BTCUSDT:LONG"
    );
    assert.equal(
      positionStreamKey({ symbol: "BTC-USDT", side: "Sell" }),
      "BTCUSDT:SHORT"
    );
    assert.equal(
      resolveWsBase({ testnet: true }),
      resolveWsBase({ testnet: false })
    );
  } finally {
    Module._load = originalLoad;
  }
});
