import test from "node:test";
import assert from "node:assert/strict";

import {
  writeExchangeCredentials,
  readExchangeCredentials,
  readExchangeCredentialsRaw,
  clearExchangeCredentials
} from "../js/exchange-credentials.js";

const store = new Map();

globalThis.localStorage = {
  getItem(key) {
    return store.has(key) ? store.get(key) : null;
  },
  setItem(key, value) {
    store.set(key, String(value));
  },
  removeItem(key) {
    store.delete(key);
  }
};

test("writeExchangeCredentials never persists apiSecret", () => {
  store.clear();
  writeExchangeCredentials("bybit", {
    apiKey: "abc123",
    apiSecret: "super-secret"
  });

  const raw = JSON.parse(store.get("multichart_exchange_credentials_v1_bybit"));
  assert.equal(raw.apiKey, "abc123");
  assert.equal(raw.hasSecret, true);
  assert.equal(raw.apiSecret, undefined);

  const read = readExchangeCredentials("bybit");
  assert.equal(read.hasSecret, true);
  assert.equal(read.apiKey, "abc123");
});

test("readExchangeCredentialsRaw scrubs a leftover apiSecret from storage", () => {
  store.clear();
  store.set(
    "multichart_exchange_credentials_v1_bingx",
    JSON.stringify({
      apiKey: "k",
      apiSecret: "leaked",
      hasSecret: true
    })
  );

  const parsed = readExchangeCredentialsRaw("bingx");
  assert.equal(parsed.apiSecret, undefined);
  assert.equal(parsed.hasSecret, true);

  const stored = JSON.parse(store.get("multichart_exchange_credentials_v1_bingx"));
  assert.equal(stored.apiSecret, undefined);
});

test("clearExchangeCredentials removes the key", () => {
  store.clear();
  writeExchangeCredentials("bybit", { apiKey: "x", apiSecret: "y" });
  clearExchangeCredentials("bybit");
  assert.equal(readExchangeCredentials("bybit"), null);
});
