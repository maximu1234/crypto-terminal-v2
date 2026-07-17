/**
 * BingX-only REST request scheduler.
 * Priorities, coalesce, IP budget, and cooldown.
 * Do not import exchange adapters from here.
 */

const PRIORITY = {
  critical: 0,
  realtime: 1,
  normal: 2,
  background: 3
};

const PRIORITY_NAME = {
  0: "critical",
  1: "realtime",
  2: "normal",
  3: "background"
};

/** Conservative steady budget under BingX per-IP caps (~2/s on many trade endpoints). */
const DEFAULT_MAX_PER_SECOND = 1.5;
const DEFAULT_MAX_CONCURRENT = 2;
const DEFAULT_BACKOFF_BASE_MS = 2000;
const DEFAULT_BACKOFF_MAX_MS = 60000;

function createBingxRequestScheduler(options = {}) {
  const maxPerSecond = Number(options.maxPerSecond) || DEFAULT_MAX_PER_SECOND;
  const maxConcurrent = Math.max(
    1,
    Number(options.maxConcurrent) || DEFAULT_MAX_CONCURRENT
  );
  const nowFn =
    typeof options.now === "function" ? options.now : () => Date.now();
  const setTimeoutFn =
    typeof options.setTimeout === "function"
      ? options.setTimeout
      : setTimeout;
  const clearTimeoutFn =
    typeof options.clearTimeout === "function"
      ? options.clearTimeout
      : clearTimeout;

  let rateLimitUntilMs = 0;
  let backoffStepMs = DEFAULT_BACKOFF_BASE_MS;
  let inFlight = 0;
  let drainTimer = null;
  let nextTokenAtMs = 0;
  const queue = [];
  const inflightByKey = new Map();
  const stats = {
    enqueued: 0,
    started: 0,
    completed: 0,
    coalesced: 0,
    rateLimited: 0,
    dropped: 0,
    byPriority: {
      critical: 0,
      realtime: 0,
      normal: 0,
      background: 0
    }
  };

  function getRateLimitBackoffMs() {
    return Math.max(0, rateLimitUntilMs - nowFn());
  }

  function peekRateLimitBlock() {
    const ms = getRateLimitBackoffMs();
    if (ms <= 0) {
      return null;
    }
    return {
      ok: false,
      message: "BingX rate limit — подождите",
      rateLimited: true,
      retryAfterMs: ms
    };
  }

  function noteRateLimit() {
    const jitter = Math.floor(Math.random() * 250);
    const wait = Math.min(
      DEFAULT_BACKOFF_MAX_MS,
      Math.max(DEFAULT_BACKOFF_BASE_MS, backoffStepMs)
    );
    rateLimitUntilMs = Math.max(rateLimitUntilMs, nowFn() + wait + jitter);
    backoffStepMs = Math.min(DEFAULT_BACKOFF_MAX_MS, wait * 2);
  }

  function noteSuccess() {
    backoffStepMs = DEFAULT_BACKOFF_BASE_MS;
  }

  function normalizePriority(raw) {
    if (typeof raw === "number" && Number.isFinite(raw)) {
      return Math.max(0, Math.min(3, Math.floor(raw)));
    }
    const key = String(raw || "normal").toLowerCase();
    if (Object.prototype.hasOwnProperty.call(PRIORITY, key)) {
      return PRIORITY[key];
    }
    return PRIORITY.normal;
  }

  function sortQueue() {
    queue.sort((a, b) => {
      if (a.priority !== b.priority) {
        return a.priority - b.priority;
      }
      return a.seq - b.seq;
    });
  }

  function dropPendingBackgroundGets() {
    for (let i = queue.length - 1; i >= 0; i--) {
      const item = queue[i];
      if (
        item.cancelable &&
        item.priority >= PRIORITY.background
      ) {
        queue.splice(i, 1);
        stats.dropped += 1;
        if (item.coalesceKey && inflightByKey.get(item.coalesceKey) === item) {
          inflightByKey.delete(item.coalesceKey);
        }
        item.resolve({
          ok: false,
          message: "BingX request dropped for critical trade",
          dropped: true
        });
      }
    }
  }

  function scheduleDrain(delayMs = 0) {
    if (drainTimer) {
      return;
    }
    drainTimer = setTimeoutFn(() => {
      drainTimer = null;
      void drain();
    }, Math.max(0, delayMs));
  }

  async function drain() {
    while (inFlight < maxConcurrent && queue.length) {
      const blockedMs = getRateLimitBackoffMs();
      const head = queue[0];
      const isCritical = head.priority === PRIORITY.critical;

      if (blockedMs > 0 && !isCritical && !head.allowDuringRateLimit) {
        /* Soft-fail non-critical waiting work instead of busy-waiting. */
        while (queue.length) {
          const item = queue[0];
          if (
            item.priority === PRIORITY.critical ||
            item.allowDuringRateLimit
          ) {
            break;
          }
          queue.shift();
          stats.rateLimited += 1;
          if (item.coalesceKey && inflightByKey.get(item.coalesceKey) === item) {
            inflightByKey.delete(item.coalesceKey);
          }
          item.resolve(peekRateLimitBlock());
        }
        if (!queue.length) {
          scheduleDrain(blockedMs);
          return;
        }
      }

      const next = queue[0];
      if (!next) {
        return;
      }

      const now = nowFn();
      if (nextTokenAtMs > now) {
        scheduleDrain(nextTokenAtMs - now);
        return;
      }

      queue.shift();
      nextTokenAtMs = now + Math.ceil(1000 / maxPerSecond);
      inFlight += 1;
      stats.started += 1;
      const pName = PRIORITY_NAME[next.priority] || "normal";
      stats.byPriority[pName] = (stats.byPriority[pName] || 0) + 1;

      void (async () => {
        try {
          if (
            getRateLimitBackoffMs() > 0 &&
            next.priority !== PRIORITY.critical &&
            !next.allowDuringRateLimit
          ) {
            stats.rateLimited += 1;
            next.resolve(peekRateLimitBlock());
            return;
          }
          const result = await next.run();
          if (result?.rateLimited) {
            noteRateLimit();
          } else if (result?.ok) {
            noteSuccess();
          }
          next.resolve(result);
        } catch (err) {
          next.resolve({
            ok: false,
            message: err?.message || String(err)
          });
        } finally {
          inFlight -= 1;
          stats.completed += 1;
          if (next.coalesceKey && inflightByKey.get(next.coalesceKey) === next) {
            inflightByKey.delete(next.coalesceKey);
          }
          scheduleDrain(0);
        }
      })();
    }
  }

  let seq = 0;

  function enqueue(job = {}) {
    const priority = normalizePriority(job.priority);
    const coalesceKey =
      job.coalesceKey != null && String(job.coalesceKey).trim() !== ""
        ? String(job.coalesceKey)
        : null;
    const allowDuringRateLimit =
      job.allowDuringRateLimit === true || priority === PRIORITY.critical;
    const cancelable = job.cancelable === true;
    const run = job.run;

    if (typeof run !== "function") {
      return Promise.resolve({
        ok: false,
        message: "BingX scheduler: missing run()"
      });
    }

    if (coalesceKey && inflightByKey.has(coalesceKey)) {
      stats.coalesced += 1;
      return inflightByKey.get(coalesceKey).promise;
    }

    if (priority === PRIORITY.critical) {
      dropPendingBackgroundGets();
    }

    if (
      getRateLimitBackoffMs() > 0 &&
      !allowDuringRateLimit
    ) {
      stats.rateLimited += 1;
      return Promise.resolve(peekRateLimitBlock());
    }

    let resolveFn;
    const promise = new Promise((resolve) => {
      resolveFn = resolve;
    });

    const item = {
      seq: ++seq,
      priority,
      coalesceKey,
      allowDuringRateLimit,
      cancelable,
      run,
      resolve: resolveFn,
      promise
    };

    if (coalesceKey) {
      inflightByKey.set(coalesceKey, item);
    }

    queue.push(item);
    sortQueue();
    stats.enqueued += 1;
    scheduleDrain(0);
    return promise;
  }

  function getStats() {
    return {
      ...stats,
      queueDepth: queue.length,
      inFlight,
      rateLimitBackoffMs: getRateLimitBackoffMs(),
      backoffStepMs
    };
  }

  function resetForTests() {
    queue.length = 0;
    inflightByKey.clear();
    inFlight = 0;
    rateLimitUntilMs = 0;
    backoffStepMs = DEFAULT_BACKOFF_BASE_MS;
    nextTokenAtMs = 0;
    if (drainTimer) {
      clearTimeoutFn(drainTimer);
      drainTimer = null;
    }
    stats.enqueued = 0;
    stats.started = 0;
    stats.completed = 0;
    stats.coalesced = 0;
    stats.rateLimited = 0;
    stats.dropped = 0;
    stats.byPriority = {
      critical: 0,
      realtime: 0,
      normal: 0,
      background: 0
    };
  }

  return {
    PRIORITY,
    enqueue,
    noteRateLimit,
    noteSuccess,
    getRateLimitBackoffMs,
    peekRateLimitBlock,
    getStats,
    resetForTests
  };
}

const sharedScheduler = createBingxRequestScheduler();

module.exports = {
  PRIORITY,
  createBingxRequestScheduler,
  enqueueBingxRequest: (job) => sharedScheduler.enqueue(job),
  noteBingxRateLimit: () => sharedScheduler.noteRateLimit(),
  noteBingxSuccess: () => sharedScheduler.noteSuccess(),
  getBingxRateLimitBackoffMs: () => sharedScheduler.getRateLimitBackoffMs(),
  peekBingxRateLimitBlock: () => sharedScheduler.peekRateLimitBlock(),
  getBingxSchedulerStats: () => sharedScheduler.getStats(),
  resetBingxSchedulerForTests: () => sharedScheduler.resetForTests(),
  sharedScheduler
};
