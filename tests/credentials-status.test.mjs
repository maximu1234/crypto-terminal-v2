import assert from "node:assert/strict";
import test from "node:test";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const {
  maskApiKeyHint,
  buildCredentialsStatus
} = require("../desktop/trading/credentials-status.cjs");

test("maskApiKeyHint keeps last 4 chars", () => {
  assert.equal(maskApiKeyHint(""), "");
  assert.equal(maskApiKeyHint("abcd"), "••••");
  assert.equal(maskApiKeyHint("ABCDEFGHIJ"), "••••GHIJ");
});

test("buildCredentialsStatus hides apiKey without reveal", () => {
  const status = buildCredentialsStatus({
    exchangeId: "bybit",
    creds: {
      apiKey: "SECRETKEY1234",
      apiSecret: "sec",
      testnet: false
    },
    revealApiKey: false,
    encryptionAvailable: true
  });

  assert.equal(status.configured, true);
  assert.equal(status.apiKey, "");
  assert.equal(status.apiKeyHint, "");
  assert.equal(status.hasSecret, true);
  assert.equal(status.encryptionAvailable, true);
});

test("buildCredentialsStatus reveals apiKey when asked", () => {
  const status = buildCredentialsStatus({
    exchangeId: "bingx",
    creds: {
      apiKey: "SECRETKEY1234",
      apiSecret: "sec",
      testnet: true
    },
    revealApiKey: true,
    encryptionAvailable: false
  });

  assert.equal(status.apiKey, "SECRETKEY1234");
  assert.equal(status.apiKeyHint, "••••1234");
  assert.equal(status.testnet, true);
  assert.equal(status.encryptionAvailable, false);
});

test("buildCredentialsStatus unconfigured when secret missing", () => {
  const status = buildCredentialsStatus({
    exchangeId: "bybit",
    creds: {
      apiKey: "only-key",
      apiSecret: ""
    },
    revealApiKey: true
  });

  assert.equal(status.configured, false);
  assert.equal(status.hasSecret, false);
});
