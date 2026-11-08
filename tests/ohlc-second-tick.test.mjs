import test from "node:test";
import assert from "node:assert/strict";

import {
  _resetOhlcSecondTickForTests,
  ohlcSecondTickSubscriberCount,
  subscribeOhlcSecondTick
} from "../js/chart/ohlc-second-tick.js";

test("ohlc second tick shares one interval across subscribers", () => {
  _resetOhlcSecondTickForTests();
  const a = subscribeOhlcSecondTick(() => {});
  const b = subscribeOhlcSecondTick(() => {});
  assert.equal(ohlcSecondTickSubscriberCount(), 2);
  a();
  assert.equal(ohlcSecondTickSubscriberCount(), 1);
  b();
  assert.equal(ohlcSecondTickSubscriberCount(), 0);
  _resetOhlcSecondTickForTests();
});
