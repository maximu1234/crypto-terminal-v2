/**
 * Best-effort login throttle (per serverless isolate).
 * Not a global lockout — still slows naive brute force.
 */
const WINDOW_MS = 15 * 60 * 1000;
const MAX_FAIL = 8;
const FAIL_DELAY_MS = 400;
const hits = new Map();

function prune(now) {
  if (hits.size < 500) {
    return;
  }
  for (const [key, row] of hits) {
    if (row.until && row.until < now && row.n < MAX_FAIL) {
      hits.delete(key);
    }
    if (row.until && row.until + WINDOW_MS < now) {
      hits.delete(key);
    }
  }
}

function clientKey(req, email) {
  const fwd = String(req.headers["x-forwarded-for"] || "")
    .split(",")[0]
    .trim();
  const ip =
    fwd ||
    String(req.headers["x-real-ip"] || "").trim() ||
    req.socket?.remoteAddress ||
    "unknown";
  return `${ip}|${String(email || "").trim().toLowerCase()}`;
}

function isLocked(key) {
  const now = Date.now();
  prune(now);
  const row = hits.get(key);
  if (!row || !row.until) {
    return false;
  }
  if (now < row.until) {
    return true;
  }
  hits.delete(key);
  return false;
}

function noteFailure(key) {
  const now = Date.now();
  const row = hits.get(key) || { n: 0, until: 0 };
  row.n += 1;
  if (row.n >= MAX_FAIL) {
    row.until = now + WINDOW_MS;
  }
  hits.set(key, row);
}

function noteSuccess(key) {
  hits.delete(key);
}

function failDelay() {
  return new Promise((resolve) => {
    setTimeout(resolve, FAIL_DELAY_MS);
  });
}

module.exports = {
  WINDOW_MS,
  MAX_FAIL,
  FAIL_DELAY_MS,
  clientKey,
  isLocked,
  noteFailure,
  noteSuccess,
  failDelay
};
