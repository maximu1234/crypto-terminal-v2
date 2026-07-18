import test from "node:test";
import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { Module } from "node:module";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const require = createRequire(import.meta.url);
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

function read(relativePath) {
  return fs.readFileSync(path.join(ROOT, relativePath), "utf8");
}

function loadStreamFacade({ active = "bybit" } = {}) {
  const calls = [];
  const bybitStream = {
    setTradingStreamTarget: () => calls.push("bybit-target"),
    startTradingStream: () => {
      calls.push("bybit-start");
      return { ok: true };
    },
    stopTradingStream: () => calls.push("bybit-stop"),
    seedFromRest: () => {
      calls.push("bybit-seed");
      return { ok: true };
    },
    replayTradingStream: () => calls.push("bybit-replay"),
    removeStreamOrder: () => calls.push("bybit-remove-order"),
    removeStreamPosition: () => calls.push("bybit-remove-pos"),
    upsertStreamPosition: () => calls.push("bybit-upsert"),
    getTradingSnapshot: () => ({ ok: true, exchangeId: "bybit", positions: [] })
  };
  const bingxStream = {
    setTradingStreamTarget: () => calls.push("bingx-target"),
    startTradingStream: () => {
      calls.push("bingx-start");
      return { ok: true };
    },
    stopTradingStream: () => calls.push("bingx-stop"),
    seedFromRest: () => {
      calls.push("bingx-seed");
      return { ok: true };
    },
    replayTradingStream: () => calls.push("bingx-replay"),
    getTradingSnapshot: () => ({ ok: true, exchange: "bingx", positions: [] }),
    requestStreamSeed: () => {
      calls.push("bingx-request-seed");
      return { ok: true, requested: true };
    }
  };

  let activeExchange = active;
  const originalLoad = Module._load;
  Module._load = function (request, parent, isMain) {
    if (request === "./trading-router.cjs") {
      return {
        getActiveExchange: () => activeExchange
      };
    }
    if (request === "./bybit-trading-stream.cjs") {
      return bybitStream;
    }
    if (request === "./bingx-trading-stream.cjs") {
      return bingxStream;
    }
    return originalLoad(request, parent, isMain);
  };

  try {
    delete require.cache[require.resolve("../desktop/trading/trading-stream.cjs")];
    const facade = require("../desktop/trading/trading-stream.cjs");
    return { facade, calls, setActive: (id) => { activeExchange = id; } };
  } finally {
    Module._load = originalLoad;
  }
}

test("trading-stream facade stops the other exchange before start", () => {
  const { facade, calls, setActive } = loadStreamFacade({ active: "bingx" });
  facade.startTradingStream();
  assert.deepEqual(calls, ["bybit-stop", "bingx-start"]);

  calls.length = 0;
  setActive("bybit");
  // reload with new active — facade already closed over getActiveExchange
  facade.startTradingStream();
  assert.deepEqual(calls, ["bingx-stop", "bybit-start"]);
});

test("trading-stream snapshot delegated on Bybit and BingX", () => {
  const bybit = loadStreamFacade({ active: "bybit" });
  const snapBybit = bybit.facade.getTradingSnapshot();
  assert.equal(snapBybit.ok, true);
  assert.equal(snapBybit.exchangeId, "bybit");

  const seedBybit = bybit.facade.requestStreamSeed();
  assert.equal(seedBybit.ok, true);
  assert.ok(bybit.calls.includes("bybit-seed"));

  const bingx = loadStreamFacade({ active: "bingx" });
  const snapBingx = bingx.facade.getTradingSnapshot();
  assert.equal(snapBingx.ok, true);
  assert.equal(snapBingx.exchange, "bingx");

  const seedBingx = bingx.facade.requestStreamSeed();
  assert.equal(seedBingx.requested, true);
  assert.ok(bingx.calls.includes("bingx-request-seed"));
});

test("Bybit stream exports snapshot without BingX-only poll constants", () => {
  const bybit = read("desktop/trading/bybit-trading-stream.cjs");
  assert.match(bybit, /function getTradingSnapshot/);
  assert.doesNotMatch(bybit, /EXTERNAL_SYNC_POLL_MS/);
});
