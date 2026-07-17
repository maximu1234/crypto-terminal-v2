import assert from "node:assert/strict";
import test from "node:test";

import {
  fetchTradeHistoryForSymbol as fetchBybitHistory
} from "../js/trade/bybit/history/fetch.js";

import {
  fetchTradeHistoryForSymbol as fetchBingxHistory
} from "../js/trade/bingx/history/fetch.js";

const MARCH_OPEN = Date.parse("2026-03-03T08:57:29Z");
const JULY_CLOSE = Date.parse("2026-07-15T13:02:19Z");
const WRONG_OPEN = Date.parse("2026-07-15T08:00:00Z");

function withTradingApi(trading, run) {
  const previousWindow = globalThis.window;
  globalThis.window = {
    cryptoTerminalDesktop: { trading }
  };
  return Promise.resolve()
    .then(run)
    .finally(() => {
      globalThis.window = previousWindow;
    });
}

test("Bybit history resolves long-held open via diary detail matcher", async () => {
  let listRequest = null;
  let detailRequest = null;

  const result = await withTradingApi(
    {
      async getClosedPnl(options) {
        listRequest = options;
        return {
          ok: true,
          trades: [{
            symbol: "ETHUSDT",
            side: "short",
            /* List often collapses open≈close when executions were skipped. */
            openTimeMs: WRONG_OPEN,
            closeTimeMs: JULY_CLOSE,
            durationMs: JULY_CLOSE - WRONG_OPEN,
            qty: 0.05,
            orderId: "close-1",
            avgEntryPrice: 1948.21,
            avgExitPrice: 1937.75
          }]
        };
      },
      async getTradeDiaryDetail(options) {
        detailRequest = options;
        return {
          ok: true,
          openTimeMs: MARCH_OPEN,
          closeTimeMs: JULY_CLOSE,
          durationMs: JULY_CLOSE - MARCH_OPEN,
          avgEntryPrice: 1948.21,
          avgExitPrice: 1937.75,
          entries: [{ execTimeMs: MARCH_OPEN, side: "Sell" }],
          exits: [{ execTimeMs: JULY_CLOSE, side: "Buy" }]
        };
      }
    },
    () => fetchBybitHistory(
      "ETHUSDT",
      MARCH_OPEN / 1000 - 60
    )
  );

  assert.equal(listRequest.exchangeId, "bybit");
  assert.equal(listRequest.skipExecutions, true);
  assert.equal(detailRequest.avgEntryPrice, 1948.21);
  assert.equal(detailRequest.closeTimeMs, JULY_CLOSE);
  assert.equal(result.trades.length, 1);
  assert.equal(result.trades[0].openTimeMs, MARCH_OPEN);
  assert.equal(result.executions.length, 2);
  assert.equal(result.executions[0].execTimeMs, MARCH_OPEN);
  assert.equal(result.executions[0].side, "Sell");
  assert.equal(result.executions[1].execTimeMs, JULY_CLOSE);
  assert.equal(result.executions[1].side, "Buy");
});

test("BingX history keeps its own income/fills policy", async () => {
  let request = null;
  const result = await withTradingApi(
    {
      async getClosedPnl(options) {
        request = options;
        return {
          ok: true,
          trades: [{
            symbol: "ETHUSDT",
            side: "short",
            openTimeMs: MARCH_OPEN,
            closeTimeMs: JULY_CLOSE,
            durationMs: JULY_CLOSE - MARCH_OPEN,
            sparse: false
          }]
        };
      }
    },
    () => fetchBingxHistory("ETHUSDT", MARCH_OPEN / 1000)
  );

  assert.equal(request.exchangeId, "bingx");
  assert.equal(request.skipExecutions, true);
  assert.equal(request.forceRefresh, true);
  assert.equal(request.enrich, true);
  assert.equal(result.executions.length, 2);
});
