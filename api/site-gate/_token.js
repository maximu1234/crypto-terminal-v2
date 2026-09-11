/**
 * HMAC token for the site login wall (Node). Same format as middleware.js.
 */
const crypto = require("crypto");

function b64url(buf) {
  return Buffer.from(buf)
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/g, "");
}

function fromB64url(s) {
  const pad = s.length % 4 === 0 ? "" : "=".repeat(4 - (s.length % 4));
  return Buffer.from(
    String(s).replace(/-/g, "+").replace(/_/g, "/") + pad,
    "base64"
  );
}

function signSiteGateToken(secret, payload) {
  const body = b64url(JSON.stringify(payload));
  const sig = crypto
    .createHmac("sha256", secret)
    .update(`v1.${body}`)
    .digest("hex");
  return `v1.${body}.${sig}`;
}

function verifySiteGateToken(secret, token) {
  const raw = String(token || "");
  const parts = raw.split(".");
  if (parts.length !== 3 || parts[0] !== "v1") {
    return null;
  }
  const [, body, sig] = parts;
  const expect = crypto
    .createHmac("sha256", secret)
    .update(`v1.${body}`)
    .digest("hex");
  const a = Buffer.from(sig);
  const b = Buffer.from(expect);
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) {
    return null;
  }
  try {
    const payload = JSON.parse(fromB64url(body).toString("utf8"));
    if (!payload || typeof payload !== "object") {
      return null;
    }
    if (!Number.isFinite(payload.exp) || payload.exp * 1000 < Date.now()) {
      return null;
    }
    const email = String(payload.email || "").trim().toLowerCase();
    if (!email) {
      return null;
    }
    return { email, exp: payload.exp };
  } catch {
    return null;
  }
}

function timingEqual(a, b) {
  const left = Buffer.from(String(a || ""), "utf8");
  const right = Buffer.from(String(b || ""), "utf8");
  const n = Math.max(left.length, right.length, 1);
  const x = Buffer.alloc(n);
  const y = Buffer.alloc(n);
  left.copy(x);
  right.copy(y);
  return crypto.timingSafeEqual(x, y) && left.length === right.length;
}

module.exports = {
  signSiteGateToken,
  verifySiteGateToken,
  timingEqual
};
