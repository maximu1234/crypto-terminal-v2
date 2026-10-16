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
    keysStatus,
    setTradeKeysOwner
  } = await import("../alert-worker/lib/trade/keys-store.js");
  setTradeKeysOwner("");
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

test("trade keys are namespaced by gate email", async () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "trade-keys-owner-"));
  process.env.TRADE_KEYS_DIR = dir;
  process.env.TRADE_KEYS_KEY = "b".repeat(64);
  const {
    saveTradeKeys,
    loadTradeKeys,
    setTradeKeysOwner,
    clearTradeKeys
  } = await import("../alert-worker/lib/trade/keys-store.js");
  setTradeKeysOwner("alice@example.com");
  saveTradeKeys("bybit", {
    apiKey: "alice-key",
    apiSecret: "alice-secret",
    testnet: false
  });
  const files = fs.readdirSync(dir);
  assert.equal(files.length, 1);
  assert.match(files[0], /^bybit-[0-9a-f]{16}\.enc$/);
  assert.equal(loadTradeKeys("bybit")?.apiKey, "alice-key");
  setTradeKeysOwner("bob@example.com");
  assert.equal(loadTradeKeys("bybit"), null);
  saveTradeKeys("bybit", {
    apiKey: "bob-key",
    apiSecret: "bob-secret",
    testnet: false
  });
  assert.equal(loadTradeKeys("bybit")?.apiKey, "bob-key");
  setTradeKeysOwner("alice@example.com");
  assert.equal(loadTradeKeys("bybit")?.apiKey, "alice-key");
  clearTradeKeys("bybit");
  assert.equal(loadTradeKeys("bybit"), null);
});
