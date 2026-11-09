import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";

const require = createRequire(import.meta.url);
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

function read(relativePath) {
  return fs.readFileSync(path.join(root, relativePath), "utf8");
}

test("worker trade token fails closed when the gate secret is empty", () => {
  const { signTradeToken } = require("../api/site-gate/_token.js");
  const { verifySiteGateToken } = require("../alert-worker/lib/trade/gate-token.js");
  const forged = signTradeToken("", "max@example.com");
  assert.equal(verifySiteGateToken("", forged), null);
  assert.equal(verifySiteGateToken(undefined, forged), null);
  const secret = "unit-test-secret-key";
  const token = signTradeToken(secret, "max@example.com");
  assert.equal(verifySiteGateToken(secret, token).typ, "trade");
  assert.equal(verifySiteGateToken("", token), null);
});

test("BingX close tombstone stays on the closed leg", () => {
  const source = read("desktop/trading/bingx-trading-stream.cjs");
  const closeFn = source.slice(
    source.indexOf("function tryInstantCloseFromOrder"),
    source.indexOf("function isEntryFillOrderType")
  );
  assert.match(closeFn, /applyOptimisticFillFromOrder/);
  assert.doesNotMatch(closeFn, /markRecentlyClosedSymbol/);
  assert.doesNotMatch(closeFn, /removePositionsForSymbol/);
  assert.match(closeFn, /markRecentlyClosedKey/);
  const overlay = read("js/trade/bingx/chart-overlay.js");
  assert.match(
    overlay,
    /removeTradePositionFromCache\(\s*\nsymbol,\s*\nhintOpts/
  );
});

test("position upsert does not clear a close tombstone by itself", () => {
  for (const file of [
    "js/trade/bybit/positions-cache.js",
    "js/trade/bingx/positions-cache.js"
  ]) {
    const source = read(file);
    assert.match(source, /allowReviveClosed/);
    assert.match(source, /options\.allowReviveClosed/);
  }
  assert.match(
    read("js/trade/bybit/market-entry.js"),
    /allowReviveClosed:\s*\ntrue/
  );
  assert.match(
    read("js/trade/bingx/market-entry.js"),
    /allowReviveClosed:\s*\ntrue/
  );
});

test("web reconcile is wired and reduce-only replacement is explicit", () => {
  const rpc = read("alert-worker/lib/trade/rpc.js");
  assert.match(rpc, /reconcileOrdersOnPositionOpen/);
  assert.doesNotMatch(
    rpc,
    /case "reconcileOrdersOnPositionOpen":\s*\n\s*case "reconcileOrdersOnPositionClose":\s*\n\s*return \{ ok: true \}/
  );
  assert.match(rpc, /if \(!secret\)/);
  const ops = read("alert-worker/lib/trade/bybit-ops.js");
  assert.match(ops, /export async function reconcileOrdersOnPositionOpen/);
  assert.match(ops, /export async function reconcileOrdersOnPositionClose/);
  assert.match(ops, /forceReduceOnly/);
});

test("telegram webhook and external navigation fail closed", () => {
  const webhook = read("alert-worker/lib/telegram-webhook.js");
  assert.match(webhook, /if \(!expected\) \{\s*\n\s*return false;/);
  assert.match(webhook, /timingSafeEqual/);
  assert.match(webhook, /TELEGRAM_WEBHOOK_SECRET is required/);
  for (const file of ["desktop/main.js", "bot-app/main.js"]) {
    const source = read(file);
    assert.match(source, /function isExternalHttpUrl/);
    assert.match(source, /isExternalHttpUrl\(\s*\nurl/);
  }
});

test("macOS secrets skip the login keychain and algo live checks are re-read", () => {
  for (const file of ["desktop/user-store.cjs", "bot-app/user-store.cjs"]) {
    const source = read(file);
    assert.match(source, /process\.platform ===\s*\n"darwin"/);
    assert.match(source, /return false;/);
    assert.match(source, /isLegacySafeStorageBlob/);
    assert.match(source, /safeStorage\.isEncryptionAvailable/);
  }
  const runtime = read("desktop/trading/algo-trading-runtime.cjs");
  assert.match(runtime, /exchangeId !==\s*\n"bybit"/);
  assert.match(runtime, /getAlgoCredentials\(\s*\n"bybit"/);
  const engine = read("desktop/trading/algo-bot-pattern-engine.cjs");
  const modeFn = engine.slice(
    engine.indexOf("function isManualTradingMode"),
    engine.indexOf("async function cancelArmedSetup")
  );
  assert.match(modeFn, /getAlgoTradingMode\(\) ===\s*\n"manual"/);
  assert.doesNotMatch(modeFn, /engineConfig\?\.tradingMode/);
  const executor = read("desktop/trading/algo-bot-order-executor.cjs");
  assert.match(executor, /Ручной режим: ордер не отправлен/);
  const lan = read("desktop/trading/algo-bot-session-log-server.cjs");
  assert.match(lan, /function channelTokensMatch/);
  assert.match(lan, /crypto\.timingSafeEqual/);
});
