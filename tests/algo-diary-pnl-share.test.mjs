import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const {
  buildDiaryPayload
} = await import("../js/algo-trading/diary/pnl-share-modal.js");

const ROOT = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  ".."
);

test("algo diary share payload uses closed trade PnL and Bybit card", () => {
  const payload = buildDiaryPayload({
    symbol: "btcUSDT",
    side: "Sell",
    avgEntryPrice: 100,
    avgExitPrice: 90,
    pnlPct: 20,
    leverage: 2
  });

  assert.equal(payload.variant, "diary");
  assert.equal(payload.exchange, "bybit");
  assert.equal(payload.ticker, "BTCUSDT");
  assert.equal(payload.side, "short");
  assert.equal(payload.leverage, 2);
  assert.equal(payload.roiPct, 20);
  assert.equal(payload.entryPrice, 100);
  assert.equal(payload.marketPrice, 90);
});

test("algo diary share infers leverage from price move when missing", () => {
  const payload = buildDiaryPayload({
    symbol: "ETHUSDT",
    side: "Buy",
    avgEntryPrice: 100,
    avgExitPrice: 110,
    pnlPct: 20
  });

  assert.equal(payload.side, "long");
  assert.equal(payload.leverage, 2);
});

test("algo diary modules do not import Terminal Bybit/BingX trade code", () => {
  const dir = path.join(ROOT, "js/algo-trading/diary");
  for (const name of fs.readdirSync(dir)) {
    if (!name.endsWith(".js")) {
      continue;
    }
    const source = fs.readFileSync(path.join(dir, name), "utf8");
    assert.doesNotMatch(
      source,
      /trade\/bybit|trade\/bingx|trade-pnl-share-modal\.js/,
      name
    );
  }
});
