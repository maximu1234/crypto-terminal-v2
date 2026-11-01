import "./helpers/stub-browser.mjs";
import test from "node:test";
import assert from "node:assert/strict";

import {
  btcQuoteButtonLabel,
  ensureBtcQuoteCandles,
  quoteCandlesToBtc,
  setBtcQuoteActive,
  usdtBase
} from "../js/chart/btc-quote.js";

test("btc quote label hides BTCUSDT and non-USDT", () => {
  assert.equal(btcQuoteButtonLabel("ETHUSDT"), "ETH/BTC");
  assert.equal(btcQuoteButtonLabel("ETHUSDT.P"), "ETH/BTC");
  assert.equal(btcQuoteButtonLabel("BTCUSDT"), "");
  assert.equal(btcQuoteButtonLabel("ETHBTC"), "");
  assert.equal(usdtBase("solusdt"), "SOL");
});

test("quoteCandlesToBtc divides each bar by matching BTCUSDT", async () => {
  setBtcQuoteActive(false);

  const host = {
    currentTF: `test-${Date.now()}`,
    getActiveExchangeId: () => "bybit",
    terminalHistoryInitialRequests: () => 1,
    loadMarketHistory: async () => [
      { time: 100, open: 100, high: 110, low: 90, close: 100 },
      { time: 200, open: 200, high: 220, low: 180, close: 200 }
    ]
  };

  assert.equal(await ensureBtcQuoteCandles(host), true);
  setBtcQuoteActive(true);

  const out = quoteCandlesToBtc([
    { time: 100, open: 200, high: 220, low: 180, close: 200 },
    { time: 200, open: 400, high: 440, low: 360, close: 400 }
  ]);

  assert.equal(out[0].close, 2);
  assert.equal(out[1].close, 2);
  assert.ok(out[0].high >= out[0].close);
  assert.ok(out[0].low <= out[0].close);

  setBtcQuoteActive(false);
  assert.equal(
    quoteCandlesToBtc([
      { time: 100, open: 200, high: 220, low: 180, close: 200 }
    ])[0].close,
    200
  );
});
