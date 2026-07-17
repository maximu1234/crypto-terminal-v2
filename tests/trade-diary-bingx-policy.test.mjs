import assert from "node:assert/strict";
import test from "node:test";

import {
  diaryAcceptDayCache,
  diarySanitizeTrade,
  isCompleteDiaryListTrade
} from "../js/trade/bingx/diary/policy.js";
import {
  diaryInterpretDetailResult
} from "../js/trade/bingx/diary/detail.js";

test("BingX day-cache reuses any stored day (past days must not re-fetch)", () => {
  assert.equal(diaryAcceptDayCache([]), true);
  assert.equal(diaryAcceptDayCache(null), false);
  assert.equal(
    diaryAcceptDayCache([
      {
        sparse: true,
        side: "",
        durationMs: 0,
        openTimeMs: 1,
        closeTimeMs: 1
      }
    ]),
    true
  );
  assert.equal(
    diaryAcceptDayCache([
      {
        sparse: false,
        side: "short",
        durationMs: 1000,
        openTimeMs: 1,
        closeTimeMs: 2
      }
    ]),
    true
  );
});

test("BingX sanitize clears poisoned side on sparse rows", () => {
  const sparse = diarySanitizeTrade({
    side: "long",
    sparse: true,
    durationMs: 0,
    openTimeMs: 10,
    closeTimeMs: 10
  });
  assert.equal(sparse.side, "");
  assert.equal(sparse.sparse, true);

  const resolved = diarySanitizeTrade({
    side: "short",
    resolved: true,
    sparse: false,
    durationMs: 100,
    openTimeMs: 1,
    closeTimeMs: 2
  });
  assert.equal(resolved.side, "short");
  assert.equal(resolved.sparse, false);
  assert.equal(isCompleteDiaryListTrade(resolved), true);
});

test("BingX detail hard-fails on resolved:false", () => {
  const fail = diaryInterpretDetailResult({
    ok: false,
    resolved: false,
    message: "miss"
  });
  assert.equal(fail.ok, false);

  const soft = diaryInterpretDetailResult({
    ok: true,
    resolved: false
  });
  assert.equal(soft.ok, false);
});
