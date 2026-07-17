import assert from "node:assert/strict";
import test from "node:test";

import {
  diaryAcceptDayCache,
  diarySanitizeTrade
} from "../js/trade/bybit/diary/policy.js";
import {
  diaryApplyDetailToTrade,
  diaryInterpretDetailResult
} from "../js/trade/bybit/diary/detail.js";

test("Bybit day-cache accepts empty array and incomplete sparse rows", () => {
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
});

test("Bybit sanitize is identity (no BingX sparse wipe)", () => {
  const trade = {
    side: "long",
    sparse: true,
    durationMs: 0,
    openTimeMs: 1,
    closeTimeMs: 1
  };
  assert.equal(diarySanitizeTrade(trade), trade);
});

test("Bybit detail succeeds without resolved and preserves list side", () => {
  const miss = diaryInterpretDetailResult({
    ok: true,
    executions: [],
    avgEntryPrice: 100
  });
  assert.equal(miss.ok, true);
  assert.equal(miss.detail?.ok, true);

  const fail = diaryInterpretDetailResult({
    ok: false,
    message: "nope"
  });
  assert.equal(fail.ok, false);

  const trade = { side: "short", avgEntryPrice: 1, avgExitPrice: 2 };
  diaryApplyDetailToTrade(trade, {
    ok: true,
    executions: [],
    avgEntryPrice: 0,
    avgExitPrice: 0
  });
  assert.equal(trade.side, "short");
});
