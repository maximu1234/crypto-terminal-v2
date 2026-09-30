import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import {
  ALGO_ANALYSIS_BOT_IDS,
  ALGO_ANALYSIS_BOT_MACD_FLIP_TOUCH,
  normalizeAnalysisBotId
} from "../js/algo-trading/active-analysis-bot.js";

test("MACD Flip Touch is a known analysis bot id", () => {
  assert.ok(ALGO_ANALYSIS_BOT_IDS.includes(ALGO_ANALYSIS_BOT_MACD_FLIP_TOUCH));
  assert.equal(
    normalizeAnalysisBotId("macd-flip-touch"),
    ALGO_ANALYSIS_BOT_MACD_FLIP_TOUCH
  );
});

test("live MACD engine has no RSI Wilder/osLevel leftovers", () => {
  const enginePath = path.join(
    process.cwd(),
    "desktop/trading/algo-bot-macd-flip-touch-engine.cjs"
  );
  const src = fs.readFileSync(enginePath, "utf8");
  assert.doesNotMatch(src, /computeWilderRsiValues/);
  assert.doesNotMatch(src, /\bosLevel\b/);
  assert.doesNotMatch(src, /RSI Touch Flip/);
});
