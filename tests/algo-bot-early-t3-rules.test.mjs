import test from "node:test";
import assert from "node:assert/strict";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const {
  setupBrokenTowardPt3,
  setupBoxT3T4Broken
} = require("../desktop/trading/algo-bot-early-t3-rules.cjs");

test("Early T3 long cancels when low breaks below pt3", () => {
  assert.equal(
    setupBrokenTowardPt3("long", { low: 99, high: 101 }, 100),
    true
  );
  assert.equal(
    setupBrokenTowardPt3("long", { low: 100, high: 101 }, 100),
    false
  );
});

test("Early T3 short cancels when high breaks above pt3", () => {
  assert.equal(
    setupBrokenTowardPt3("short", { low: 99, high: 101 }, 100),
    true
  );
  assert.equal(
    setupBrokenTowardPt3("short", { low: 99, high: 100 }, 100),
    false
  );
});

test("Early T3 cancel ignores invalid pt3", () => {
  assert.equal(setupBrokenTowardPt3("long", { low: 1 }, 0), false);
  assert.equal(setupBrokenTowardPt3("long", null, 10), false);
});

test("Early T3 long box breaks on t3 or t4 wick", () => {
  const setup = { side: "long", p3: 100, p4: 110 };
  assert.equal(
    setupBoxT3T4Broken(setup, { low: 99, high: 105 }),
    "t3"
  );
  assert.equal(
    setupBoxT3T4Broken(setup, { low: 101, high: 111 }),
    "t4"
  );
  assert.equal(
    setupBoxT3T4Broken(setup, { low: 100, high: 110 }),
    null
  );
});

test("Early T3 short box breaks on t3 or t4 wick", () => {
  const setup = { side: "short", p3: 110, p4: 100 };
  assert.equal(
    setupBoxT3T4Broken(setup, { low: 105, high: 111 }),
    "t3"
  );
  assert.equal(
    setupBoxT3T4Broken(setup, { low: 99, high: 105 }),
    "t4"
  );
  assert.equal(
    setupBoxT3T4Broken(setup, { low: 100, high: 110 }),
    null
  );
});
