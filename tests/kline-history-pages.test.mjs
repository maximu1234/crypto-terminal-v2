import assert from "node:assert/strict";
import test from "node:test";

import {
klineHistoryPageEnds,
klineTfToMs,
shouldFetchKlinePagesInParallel
} from "../js/kline-history-pages.js";

test("klineTfToMs maps Bybit interval tokens", () => {
  assert.equal(klineTfToMs("1"), 60_000);
  assert.equal(klineTfToMs("5"), 300_000);
  assert.equal(klineTfToMs("60"), 3_600_000);
  assert.equal(klineTfToMs("D"), 86_400_000);
  assert.equal(klineTfToMs("W"), 604_800_000);
  assert.equal(klineTfToMs("nope"), 0);
});

test("klineHistoryPageEnds estimates 10 adjacent 1000-bar pages", () => {
  const end0 = 1_700_000_000_000;
  const ends = klineHistoryPageEnds(end0, "5", 10);
  assert.equal(ends.length, 10);
  assert.equal(ends[0], end0);
  const pageMs = 1000 * 5 * 60_000;
  assert.equal(ends[1], end0 - pageMs);
  assert.equal(ends[9], end0 - 9 * pageMs);
});

test("klineHistoryPageEnds is empty when tf is unknown", () => {
  assert.deepEqual(klineHistoryPageEnds(Date.now(), "xyz", 10), []);
});

test("shouldFetchKlinePagesInParallel only for long history with gap 0", () => {
  assert.equal(shouldFetchKlinePagesInParallel(2, 0), false);
  assert.equal(shouldFetchKlinePagesInParallel(10, 0), true);
  assert.equal(shouldFetchKlinePagesInParallel(10, 80), false);
});
