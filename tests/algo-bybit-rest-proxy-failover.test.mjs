import assert from "node:assert/strict";
import test from "node:test";
import { createRequire } from "node:module";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const require = createRequire(import.meta.url);

const {
  orderedApiBases,
  timeoutMsForApiHost,
  selectBybitFetchTransport
} = (() => {
  const Module = require("module");
  const originalLoad = Module._load;
  Module._load = function (request, parent, isMain) {
    if (request === "electron") {
      return {
        net: {
          fetch: async () => {
            throw new Error("net.fetch stub — offline test");
          }
        },
        app: {
          getPath: () => "/tmp"
        }
      };
    }
    if (request === "electron-log") {
      return {
        info() {},
        warn() {},
        error() {},
        debug() {}
      };
    }
    return originalLoad.apply(this, arguments);
  };
  try {
    return require("../desktop/trading/algo-bybit-rest.cjs");
  } finally {
    Module._load = originalLoad;
  }
})();

test("without proxy, mainnet still prefers api.bybit.com", () => {
  assert.deepEqual(orderedApiBases(false, false), [
    "https://api.bybit.com",
    "https://api.bytick.com"
  ]);
});

test("direct Bybit REST skips Chromium session when SOCKS is off", () => {
  assert.equal(selectBybitFetchTransport(false, false), "direct");
  assert.equal(selectBybitFetchTransport(true, false), "relay");
  assert.equal(selectBybitFetchTransport(false, true), "session");
});

test("with SOCKS relay, mainnet tries api.bytick.com first", () => {
  assert.deepEqual(orderedApiBases(false, true), [
    "https://api.bytick.com",
    "https://api.bybit.com"
  ]);
});

test("testnet stays on api-testnet even with proxy", () => {
  assert.deepEqual(orderedApiBases(true, true), [
    "https://api-testnet.bybit.com"
  ]);
});

test("unknown proxy host fails over in 800ms, last host keeps 12s", () => {
  const first = timeoutMsForApiHost(
    "https://api.bybit.com/v5/market/time",
    "https://api.bybit.com",
    false
  );
  const last = timeoutMsForApiHost(
    "https://api.bytick.com/v5/market/time",
    "https://api.bytick.com",
    true
  );
  assert.equal(first, 800);
  assert.equal(last, 12000);
});

test("algo kline and private WS pass the SOCKS relay agent", () => {
  const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
  const kline = fs.readFileSync(
    path.join(root, "desktop/trading/algo-bybit-kline-ws.cjs"),
    "utf8"
  );
  const priv = fs.readFileSync(
    path.join(root, "desktop/trading/algo-bybit-private-ws.cjs"),
    "utf8"
  );

  assert.match(kline, /getRelayHttpsAgent/);
  assert.match(kline, /new Ws\(\s*WS_URL,\s*\{\s*agent/);
  assert.match(priv, /getRelayHttpsAgent/);
  assert.match(priv, /new Ws\(\s*url,\s*\{\s*agent/);
});
