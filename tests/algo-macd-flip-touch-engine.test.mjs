import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";
import {
  decideMacdFlipTouchBar,
  runMacdFlipTouch
} from "../js/algo-trading/macd-flip-touch-engine.js";
import {
  normalizeMacdFlipTouchPrefs,
  pickMacdFlipTouchLaunchPrefs
} from "../js/algo-trading/macd-flip-touch-prefs.js";

const require = createRequire(import.meta.url);
const liveMath = require("../desktop/trading/algo-bot-macd-flip-touch-math.cjs");
const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");

test("MACD Flip Touch long cross: prev below signal, macd above", () => {
  const d = decideMacdFlipTouchBar({
    macd: 1,
    prevMacd: -0.5,
    signal: 0,
    prevSignal: 0.2,
    stack: 0,
    position: "flat",
    maxStack: 3,
    allowLong: true,
    allowShort: true
  });
  assert.equal(d.crossLong, true);
  assert.equal(d.openLong, true);
});

test("MACD Flip Touch short cross closes long stack semantics", () => {
  const d = decideMacdFlipTouchBar({
    macd: -0.1,
    prevMacd: 0.5,
    signal: 0,
    prevSignal: -0.1,
    stack: 2,
    position: "long",
    maxStack: 3,
    allowLong: true,
    allowShort: true
  });
  assert.equal(d.crossShort, true);
  assert.equal(d.closeLong, true);
});

test("live math decide matches analysis engine", () => {
  const bar = {
    macd: 2,
    prevMacd: 0,
    signal: 1,
    prevSignal: 1.5,
    stack: 1,
    position: "short",
    maxStack: 3,
    allowLong: true,
    allowShort: true
  };
  assert.deepEqual(
    decideMacdFlipTouchBar(bar),
    liveMath.decideMacdFlipTouchBar(bar)
  );
});

test("macd flip touch modules do not import rsi-touch-flip", () => {
  const dir = path.join(root, "js/algo-trading");
  const hits = [];
  for (const name of fs.readdirSync(dir)) {
    if (!name.startsWith("macd-flip-touch-")) continue;
    const text = fs.readFileSync(path.join(dir, name), "utf8");
    if (/rsi-touch-flip/.test(text)) {
      hits.push(name);
    }
  }
  assert.deepEqual(hits, []);
});

test("launch prefs use MACD lengths not RSI", () => {
  const launch = pickMacdFlipTouchLaunchPrefs({
    fastLength: 10,
    slowLength: 22,
    signalLength: 7,
    macdTf: "15"
  });
  assert.equal(launch.fastLength, 10);
  assert.equal(launch.slowLength, 22);
  assert.equal(launch.signalLength, 7);
  assert.equal(launch.macdTf, "15");
  assert.equal(launch.rsiLen, undefined);
});

test("runMacdFlipTouch accepts injected macd series", () => {
  const candles = [];
  for (let i = 0; i < 40; i++) {
    candles.push({
      time: 1_700_000_000 + i * 300,
      open: 100 + i * 0.1,
      high: 101 + i * 0.1,
      low: 99 + i * 0.1,
      close: 100 + i * 0.1
    });
  }
  const prefs = normalizeMacdFlipTouchPrefs({ budget: 100, maxStack: 1 });
  const result = runMacdFlipTouch(candles, prefs, {
    macdValues: new Array(candles.length).fill(0),
    signalValues: new Array(candles.length).fill(0)
  });
  assert.ok(result.overview);
});
