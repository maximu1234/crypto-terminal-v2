import assert from "node:assert/strict";
import test from "node:test";

import {
createWheelDeadband,
WHEEL_PIXEL_DEADBAND
} from "../js/chart/chart-wheel-deadband.js";

import {
clampWheelZoomStep,
WHEEL_ZOOM_EVENT_MAX,
WHEEL_ZOOM_GESTURE_MAX
} from "../js/canvas-bench/live-plan.js";

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

test("wheel zoom allows normal pace but damps a trackpad burst", () => {
  const one = clampWheelZoomStep(-160, 1, 40);
  assert.ok(one.factor <= WHEEL_ZOOM_EVENT_MAX + 1e-9);
  assert.ok(one.factor > 1.15);

  let calmGain = 1;
  for (let i = 0; i < 20; i++) {
    const step = clampWheelZoomStep(-40, 1, 40);
    assert.ok(step.factor > 1.02);
    calmGain *= step.factor;
  }
  assert.ok(calmGain > 1.5);

  let burst = 1;
  for (let i = 0; i < 40; i++) {
    const step = clampWheelZoomStep(-80, burst, 4);
    burst = step.product;
    assert.ok(step.factor <= WHEEL_ZOOM_EVENT_MAX + 1e-9);
  }
  assert.ok(burst <= WHEEL_ZOOM_GESTURE_MAX + 1e-9);

  const blocked = clampWheelZoomStep(
    -80,
    WHEEL_ZOOM_GESTURE_MAX,
    Number.POSITIVE_INFINITY
  );
  assert.ok(Math.abs(blocked.factor - 1) < 1e-6);

  const notch = clampWheelZoomStep(-16, 1, 40);
  assert.ok(notch.factor > 1 && notch.factor < 1.05);
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
