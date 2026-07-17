import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  ".."
);

function read(relativePath) {
  return fs.readFileSync(path.join(ROOT, relativePath), "utf8");
}

test("BingX stream exports snapshot and request seed", () => {
  const source = read("desktop/trading/bingx-trading-stream.cjs");
  assert.match(source, /function getTradingSnapshot/);
  assert.match(source, /function requestStreamSeed/);
  assert.match(source, /getTradingSnapshot,/);
  assert.match(source, /scheduleAccountReconcile/);
  assert.doesNotMatch(source, /TRIGGER_ORDERS_REFRESH_MS/);
  assert.match(
    source,
    /forceRefresh:\s*\n\s*true/,
    "seed must bypass stale REST cache for exchange-side opens/closes"
  );
  assert.match(source, /EXTERNAL_SYNC_POLL_MS\s*=\s*\n2500/);
});

test("trading stream facade and IPC expose snapshot thinly", () => {
  const facade = read("desktop/trading/trading-stream.cjs");
  assert.match(facade, /getTradingSnapshot/);
  assert.match(facade, /requestStreamSeed/);

  const ipc = read("desktop/trading/register-ipc.cjs");
  assert.match(ipc, /trading:getStreamSnapshot/);
  assert.match(ipc, /trading:requestStreamSeed/);

  const preload = read("desktop/preload.js");
  assert.match(preload, /getStreamSnapshot/);
  assert.match(preload, /requestStreamSeed/);
});

test("BingX positions cache prefers stream snapshot over REST", () => {
  const source = read("js/trade/bingx/positions-cache.js");
  assert.match(source, /getStreamSnapshot/);
  assert.match(source, /fromSnapshot/);
  assert.match(source, /requestStreamSeed/);
});
