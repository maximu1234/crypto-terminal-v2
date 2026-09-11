import test from "node:test";
import assert from "node:assert/strict";
import { createRequire } from "node:module";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const require = createRequire(import.meta.url);
const ROOT = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  ".."
);

function read(relativePath) {
  return fs.readFileSync(path.join(ROOT, relativePath), "utf8");
}

test("login lockout trips after MAX_FAIL failures", async () => {
  const {
    MAX_FAIL,
    clientKey,
    isLocked,
    noteFailure,
    noteSuccess
  } = require("../api/site-gate/_rate-limit.js");
  const req = { headers: { "x-forwarded-for": "203.0.113.50" } };
  const key = clientKey(req, `lockout-${Date.now()}@example.com`);
  assert.equal(isLocked(key), false);
  for (let i = 0; i < MAX_FAIL; i += 1) {
    noteFailure(key);
  }
  assert.equal(isLocked(key), true);
  noteSuccess(key);
  assert.equal(isLocked(key), false);
});

test("browser Bybit fetch does not call Railway /bybit", () => {
  const source = read("js/bybit-fetch.js");
  assert.doesNotMatch(source, /\$\{[^}]*\}\/bybit\?path=/);
  assert.doesNotMatch(source, /worker-proxy/);
  assert.match(source, /\/api\/bybit\?path=/);
});

test("web trade stream authenticates after connect, not via query", () => {
  const client = read("js/trade-web/client.js");
  const stream = read("alert-worker/lib/trade/stream.js");
  assert.doesNotMatch(client, /access_token=/);
  assert.match(client, /type: "auth"/);
  assert.doesNotMatch(stream, /access_token/);
  assert.match(stream, /typ !== "trade"/);
});

test("Railway trade RPC is Bybit-only and does not echo secrets", () => {
  const rpc = read("alert-worker/lib/trade/rpc.js");
  const keys = read("alert-worker/lib/trade/keys-store.js");
  const index = read("alert-worker/index.js");
  assert.match(rpc, /Web trading: только Bybit/);
  assert.match(keys, /apiKey: ""/);
  assert.doesNotMatch(index, /handleBybitProxy/);
  assert.doesNotMatch(index, /tradeHealth\(\)/);
});

test("trade CORS allowlist rejects random sites", async () => {
  const { isAllowedTradeOrigin } = await import(
    "../alert-worker/lib/client-http.js"
  );
  assert.equal(
    isAllowedTradeOrigin("https://crypto-terminal-v2.vercel.app"),
    true
  );
  assert.equal(isAllowedTradeOrigin("https://evil.example"), false);
  assert.equal(isAllowedTradeOrigin("http://localhost:4173"), true);
});
