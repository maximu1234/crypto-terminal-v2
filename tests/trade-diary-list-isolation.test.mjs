import assert from "node:assert/strict";
import test from "node:test";

import {
  diaryCollectCachedTrades as collectBybit,
  diaryLoadPeriod as loadBybit
} from "../js/trade/bybit/diary/list.js";

import {
  diaryCollectCachedTrades as collectBingx,
  diaryLoadPeriod as loadBingx
} from "../js/trade/bingx/diary/list.js";

function memoryStorage() {
  const values = new Map();
  return {
    getItem(key) {
      return values.has(key) ? values.get(key) : null;
    },
    setItem(key, value) {
      values.set(key, String(value));
    },
    removeItem(key) {
      values.delete(key);
    }
  };
}

function sparseTrade(closeTimeMs) {
  return {
    symbol: "ETHUSDT",
    orderId: `order-${closeTimeMs}`,
    openTimeMs: closeTimeMs,
    closeTimeMs,
    durationMs: 0,
    side: "",
    sparse: true
  };
}

test("Bybit and BingX diary lists own independent fetch/cache policies", async () => {
  const previousWindow = globalThis.window;
  const previousLocalStorage = globalThis.localStorage;
  const storage = memoryStorage();
  const requests = [];

  const period = {
    startMs: Date.parse("2026-07-15T00:00:00Z"),
    endMs: Date.parse("2026-07-15T23:59:59Z")
  };
  const row = sparseTrade(Date.parse("2026-07-15T12:00:00Z"));

  globalThis.localStorage = storage;
  globalThis.window = {
    localStorage: storage,
    cryptoTerminalDesktop: {
      trading: {
        async getClosedPnl(options) {
          requests.push(options);
          return { ok: true, trades: [row] };
        }
      }
    }
  };

  try {
    const bybit = await loadBybit(period, { forceRefresh: true });
    assert.equal(bybit.ok, true);
    assert.equal(requests[0].exchangeId, "bybit");
    assert.equal(collectBybit(period).length, 1);

    const bingx = await loadBingx(period, { forceRefresh: true });
    assert.equal(bingx.ok, true);
    assert.equal(requests[1].exchangeId, "bingx");
    assert.equal(
      collectBingx(period).length,
      1,
      "BingX must persist past day-cache even when rows are still sparse"
    );

    assert.equal(
      collectBybit(period).length,
      1,
      "BingX cache writes must not affect the Bybit cache bucket"
    );
  } finally {
    globalThis.window = previousWindow;
    globalThis.localStorage = previousLocalStorage;
  }
});
