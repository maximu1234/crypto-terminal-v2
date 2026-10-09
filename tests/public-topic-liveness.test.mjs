import test from "node:test";
import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { planPublicTopicLiveness } from "../js/public-topic-liveness.js";

const require = createRequire(import.meta.url);
const desktop = require("../desktop/trading/public-topic-liveness.cjs");

const now = 1_000_000;

function both(state) {
  const fromJs = planPublicTopicLiveness(state);
  const fromDesktop = desktop.planPublicTopicLiveness(state);
  assert.deepEqual(fromDesktop, fromJs);
  return fromJs;
}

test("a live ticker keeps a dead kline on resubscribe only", () => {
  const plan = both({
    now,
    topics: ["kline.1.BTCUSDT", "tickers.BTCUSDT"],
    lastAt: {
      "tickers.BTCUSDT": now - 1000
    },
    subscribedAt: {
      "kline.1.BTCUSDT": now - 50_000,
      "tickers.BTCUSDT": now - 50_000
    }
  });
  assert.deepEqual(plan, {
    resubscribe: ["kline.1.BTCUSDT"],
    reconnect: false
  });
});

test("every topic silent reconnects the socket once", () => {
  const plan = both({
    now,
    topics: ["kline.1.ETHUSDT", "tickers.ETHUSDT"],
    lastAt: {},
    subscribedAt: {
      "kline.1.ETHUSDT": now - 70_000,
      "tickers.ETHUSDT": now - 70_000
    }
  });
  assert.equal(plan.reconnect, true);
  assert.deepEqual(plan.resubscribe, []);
});

test("a fresh subscribe is not stale", () => {
  const plan = both({
    now,
    topics: ["kline.60.SOLUSDT"],
    lastAt: {},
    subscribedAt: {
      "kline.60.SOLUSDT": now - 1000
    }
  });
  assert.deepEqual(plan.resubscribe, []);
  assert.equal(plan.reconnect, false);
});
