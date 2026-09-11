/**
 * POST /api/site-gate/login  { email, password }
 * Sets httpOnly cookie (gate) and returns a short-lived tradeToken for Railway.
 */
const {
  GATE_TTL_SEC,
  signGateCookieToken,
  signTradeToken,
  timingEqual
} = require("./_token.js");
const {
  clientKey,
  isLocked,
  noteFailure,
  noteSuccess,
  failDelay
} = require("./_rate-limit.js");

function readEnv(name) {
  const v = String(process.env[name] || "").trim();
  return v;
}

function cookieHeader(token, secure) {
  const parts = [
    `mc_site_gate=${token}`,
    "Path=/",
    "HttpOnly",
    "SameSite=Lax",
    `Max-Age=${GATE_TTL_SEC}`
  ];
  if (secure) {
    parts.push("Secure");
  }
  return parts.join("; ");
}

module.exports = async function handler(req, res) {
  res.setHeader("Cache-Control", "no-store");
  if (req.method === "OPTIONS") {
    res.status(204).end();
    return;
  }
  if (req.method !== "POST") {
    res.status(405).json({ ok: false, error: "method" });
    return;
  }

  const emailAllow = readEnv("SITE_GATE_EMAIL").toLowerCase();
  const password = readEnv("SITE_GATE_PASSWORD");
  const secret = readEnv("SITE_GATE_SECRET");

  if (!emailAllow || !password || !secret) {
    res.status(503).json({ ok: false, error: "gate_not_configured" });
    return;
  }

  let body = req.body;
  if (typeof body === "string") {
    try {
      body = JSON.parse(body);
    } catch {
      body = {};
    }
  }
  if (!body || typeof body !== "object") {
    body = {};
  }
  const email = String(body.email || "").trim().toLowerCase();
  const pass = String(body.password || "");
  const limitKey = clientKey(req, email || "missing");

  if (isLocked(limitKey)) {
    res.status(429).json({ ok: false, error: "locked" });
    return;
  }

  if (!email || !pass) {
    noteFailure(limitKey);
    await failDelay();
    res.status(400).json({ ok: false, error: "missing" });
    return;
  }

  const emailOk = timingEqual(email, emailAllow);
  const passOk = timingEqual(pass, password);
  if (!emailOk || !passOk) {
    noteFailure(limitKey);
    await failDelay();
    res.status(401).json({ ok: false, error: "invalid" });
    return;
  }

  noteSuccess(limitKey);
  const cookieToken = signGateCookieToken(secret, email);
  const tradeToken = signTradeToken(secret, email);
  const proto = String(
    req.headers["x-forwarded-proto"] || ""
  ).split(",")[0].trim();
  const secure = proto === "https";

  res.setHeader("Set-Cookie", cookieHeader(cookieToken, secure));
  res.status(200).json({ ok: true, tradeToken });
};
