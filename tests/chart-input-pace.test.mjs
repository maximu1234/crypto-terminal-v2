import assert from "node:assert/strict";
import test from "node:test";

import {
createWheelDeadband,
WHEEL_PIXEL_DEADBAND
} from "../js/chart/chart-wheel-deadband.js";

import {
clampHistoryPageLimit,
isSlowHistoryLink,
noteHistoryTransfer,
resetHistoryLinkPace,
slowHistoryPageLimit
} from "../js/history-link-pace.js";

test("wheel deadband swallows trackpad noise and passes a real flick", () => {
  const gate = createWheelDeadband();
  const noise = { deltaX: 0, deltaY: 1, deltaMode: 0 };
  assert.equal(gate.ignore(noise, 0), true);
  assert.equal(gate.ignore(noise, 16), true);
  let passedAt = null;
  for (let t = 32; t < 400; t += 16) {
    if (!gate.ignore(noise, t)) {
      passedAt = t;
      break;
    }
  }
  assert.equal(passedAt, (WHEEL_PIXEL_DEADBAND - 1) * 16);
  assert.equal(gate.ignore(noise, passedAt + 20), false);
  assert.equal(gate.ignore(noise, passedAt + 400), true);
});

test("wheel deadband lets mouse notches and pinch through", () => {
  const gate = createWheelDeadband();
  assert.equal(gate.ignore({ deltaY: 1, deltaMode: 1 }, 0), false);
  assert.equal(gate.ignore({ deltaY: 1, deltaMode: 0, ctrlKey: true }, 0), false);
  assert.equal(gate.ignore({ deltaY: 40, deltaMode: 0 }, 0), false);
});

test("slow history link shrinks only the background page size", () => {
  resetHistoryLinkPace();
  assert.equal(slowHistoryPageLimit(1_000), 1000);
  noteHistoryTransfer(1000, 2000, 1_000);
  assert.equal(isSlowHistoryLink(1_000), true);
  assert.equal(slowHistoryPageLimit(1_000), 50);
  assert.equal(isSlowHistoryLink(1_000 + 61_000), false);
  noteHistoryTransfer(1000, 2000, 2_000);
  noteHistoryTransfer(1000, 100, 2_100);
  assert.equal(isSlowHistoryLink(2_100), false);
  noteHistoryTransfer(10, 5000, 3_000);
  assert.equal(isSlowHistoryLink(3_000), false);
  assert.equal(clampHistoryPageLimit(undefined), 1000);
  assert.equal(clampHistoryPageLimit(50), 50);
  assert.equal(clampHistoryPageLimit(5000), 1000);
});
