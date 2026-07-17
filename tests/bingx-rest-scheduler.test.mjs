import test from "node:test";
import assert from "node:assert/strict";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const {
  PRIORITY,
  createBingxRequestScheduler
} = require("../desktop/trading/bingx-request-scheduler.cjs");

function createClock() {
  let now = 1_000_000;
  const timers = [];
  return {
    now: () => now,
    setTimeout(fn, delay) {
      const handle = {
        at: now + Math.max(0, delay || 0),
        fn,
        cleared: false
      };
      timers.push(handle);
      return handle;
    },
    clearTimeout(handle) {
      if (handle) {
        handle.cleared = true;
      }
    },
    async flush() {
      let guard = 0;
      while (timers.some((t) => !t.cleared) && guard < 200) {
        const next = timers
          .filter((t) => !t.cleared)
          .sort((a, b) => a.at - b.at)[0];
        if (!next) {
          break;
        }
        now = Math.max(now, next.at);
        next.cleared = true;
        next.fn();
        await Promise.resolve();
        guard += 1;
      }
    }
  };
}

test("critical place beats queued background diary GET", async () => {
  const clock = createClock();
  const scheduler = createBingxRequestScheduler({
    maxPerSecond: 100,
    maxConcurrent: 1,
    now: clock.now,
    setTimeout: clock.setTimeout,
    clearTimeout: clock.clearTimeout
  });

  const order = [];
  let releaseHold;
  const holdGate = new Promise((resolve) => {
    releaseHold = resolve;
  });

  const holdPromise = scheduler.enqueue({
    priority: PRIORITY.realtime,
    coalesceKey: "GET:positions:hold-order",
    run: async () => {
      order.push("hold-start");
      await holdGate;
      order.push("hold-end");
      return { ok: true, lane: "hold" };
    }
  });
  await clock.flush();

  const backgroundPromise = scheduler.enqueue({
    priority: PRIORITY.background,
    coalesceKey: "GET:income:test",
    cancelable: true,
    run: async () => {
      order.push("background");
      return { ok: true, lane: "background" };
    }
  });

  const criticalPromise = scheduler.enqueue({
    priority: PRIORITY.critical,
    run: async () => {
      order.push("critical");
      return { ok: true, lane: "critical" };
    }
  });

  const background = await backgroundPromise;
  assert.equal(background.dropped, true);

  releaseHold();
  await holdPromise;
  await clock.flush();
  const critical = await criticalPromise;
  assert.equal(critical.ok, true);
  assert.equal(critical.lane, "critical");
  assert.ok(order.includes("critical"));
  assert.ok(!order.includes("background"));
});

test("identical GET coalesce keys share one run", async () => {
  const clock = createClock();
  const scheduler = createBingxRequestScheduler({
    maxPerSecond: 100,
    maxConcurrent: 2,
    now: clock.now,
    setTimeout: clock.setTimeout,
    clearTimeout: clock.clearTimeout
  });

  let runs = 0;
  const makeJob = () =>
    scheduler.enqueue({
      priority: PRIORITY.realtime,
      coalesceKey: "GET:positions",
      run: async () => {
        runs += 1;
        return { ok: true, runs };
      }
    });

  const p1 = makeJob();
  const p2 = makeJob();
  await clock.flush();
  const [r1, r2] = await Promise.all([p1, p2]);
  assert.equal(runs, 1);
  assert.equal(r1.runs, 1);
  assert.equal(r2.runs, 1);
  assert.ok(scheduler.getStats().coalesced >= 1);
});

test("cooldown soft-blocks background but critical may still run", async () => {
  const clock = createClock();
  const scheduler = createBingxRequestScheduler({
    maxPerSecond: 100,
    maxConcurrent: 2,
    now: clock.now,
    setTimeout: clock.setTimeout,
    clearTimeout: clock.clearTimeout
  });

  scheduler.noteRateLimit();
  assert.ok(scheduler.getRateLimitBackoffMs() > 0);

  const blocked = await scheduler.enqueue({
    priority: PRIORITY.background,
    coalesceKey: "GET:income:cooldown",
    run: async () => ({ ok: true })
  });
  assert.equal(blocked.rateLimited, true);
  assert.equal(blocked.ok, false);

  const criticalPromise = scheduler.enqueue({
    priority: PRIORITY.critical,
    run: async () => ({ ok: true, lane: "critical" })
  });
  await clock.flush();
  const critical = await criticalPromise;
  assert.equal(critical.ok, true);
  assert.equal(critical.lane, "critical");
});

test("pending cancelable background is dropped when critical arrives", async () => {
  const clock = createClock();
  const scheduler = createBingxRequestScheduler({
    maxPerSecond: 100,
    maxConcurrent: 1,
    now: clock.now,
    setTimeout: clock.setTimeout,
    clearTimeout: clock.clearTimeout
  });

  let releaseFirst;
  const firstGate = new Promise((resolve) => {
    releaseFirst = resolve;
  });

  const first = scheduler.enqueue({
    priority: PRIORITY.realtime,
    coalesceKey: "GET:positions:hold",
    run: async () => {
      await firstGate;
      return { ok: true, lane: "first" };
    }
  });
  await clock.flush();

  const background = scheduler.enqueue({
    priority: PRIORITY.background,
    coalesceKey: "GET:income:drop-me",
    cancelable: true,
    run: async () => ({ ok: true, lane: "background" })
  });

  const critical = scheduler.enqueue({
    priority: PRIORITY.critical,
    run: async () => ({ ok: true, lane: "critical" })
  });

  const dropped = await background;
  assert.equal(dropped.dropped, true);

  releaseFirst();
  await first;
  await clock.flush();
  const criticalResult = await critical;
  assert.equal(criticalResult.lane, "critical");
});
