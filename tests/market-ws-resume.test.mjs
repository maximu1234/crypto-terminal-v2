import test from "node:test";
import assert from "node:assert/strict";
import {
catchupHistoryPages,
shouldCatchupFromBackground
} from "../js/market-ws-resume-policy.js";

test("shouldCatchupFromBackground skips the desktop app", () => {
  assert.equal(
    shouldCatchupFromBackground({
      isDesktop: true,
      visible: true,
      hiddenMs: 60_000,
      appleMobile: true
    }),
    false
  );
});

test("shouldCatchupFromBackground runs on iPad after a short hide", () => {
  assert.equal(
    shouldCatchupFromBackground({
      isDesktop: false,
      visible: true,
      hiddenMs: 800,
      appleMobile: true
    }),
    true
  );
  assert.equal(
    shouldCatchupFromBackground({
      isDesktop: false,
      visible: true,
      hiddenMs: 200,
      appleMobile: true
    }),
    false
  );
});

test("shouldCatchupFromBackground ignores a brief desktop-web tab flick", () => {
  assert.equal(
    shouldCatchupFromBackground({
      isDesktop: false,
      visible: true,
      hiddenMs: 2_000,
      appleMobile: false
    }),
    false
  );
  assert.equal(
    shouldCatchupFromBackground({
      isDesktop: false,
      visible: true,
      hiddenMs: 15_000,
      appleMobile: false
    }),
    true
  );
});

test("catchupHistoryPages covers the missed window without a 1000-bar hole", () => {
  assert.equal(catchupHistoryPages(1_000, 60, 1_000 + 60 * 10), 1);
  assert.equal(catchupHistoryPages(1_000, 60, 1_000 + 60 * 2_000), 3);
  assert.equal(catchupHistoryPages(1_000, 60, 1_000 + 60 * 20_000), 8);
});
