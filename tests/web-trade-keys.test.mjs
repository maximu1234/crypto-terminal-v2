import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

test("trade keys encrypt to disk and never store plaintext secret file", async () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "trade-keys-"));
  process.env.TRADE_KEYS_DIR = dir;
  process.env.TRADE_KEYS_KEY = "a".repeat(64);
  const {
    saveTradeKeys,
    loadTradeKeys,
    clearTradeKeys,
    keysStatus
  } = await import("../alert-worker/lib/trade/keys-store.js");
  saveTradeKeys("bybit", {
    apiKey: "abc123xyz",
    apiSecret: "super-secret",
    testnet: false
  });
  const files = fs.readdirSync(dir);
  assert.deepEqual(files, ["bybit.enc"]);
  const raw = fs.readFileSync(path.join(dir, "bybit.enc"), "utf8");
  assert.equal(raw.includes("super-secret"), false);
  const creds = loadTradeKeys("bybit");
  assert.equal(creds.apiKey, "abc123xyz");
  assert.equal(creds.apiSecret, "super-secret");
  const status = keysStatus("bybit");
  assert.equal(status.configured, true);
  assert.equal(status.hasSecret, true);
  assert.equal(status.apiKey, "");
  assert.equal(status.apiKeyHint.endsWith("xyz"), true);
  clearTradeKeys("bybit");
  assert.equal(loadTradeKeys("bybit"), null);
});
