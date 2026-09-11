import crypto from "node:crypto";

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

export function verifySiteGateToken(secret, token) {
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
    const typ = payload.typ === "trade" ? "trade" : "gate";
    return { email, exp: payload.exp, typ };
  } catch {
    return null;
  }
}

export { b64url };
