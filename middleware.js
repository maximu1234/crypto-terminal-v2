/**
 * Site login wall for Vercel. Desktop .app does not hit this.
 * Static assets stay public; HTML pages require mc_site_gate cookie.
 */

const TOKEN_TTL_SEC = 30 * 24 * 60 * 60;

function isPublicPath(pathname) {
  if (pathname === "/login" || pathname === "/login.html") {
    return true;
  }
  if (pathname.startsWith("/api/site-gate")) {
    return true;
  }
  if (
    pathname.startsWith("/css/") ||
    pathname.startsWith("/js/") ||
    pathname.startsWith("/vendor/") ||
    pathname.startsWith("/icons/") ||
    pathname.startsWith("/assets/") ||
    pathname.startsWith("/fonts/")
  ) {
    return true;
  }
  return /\.(css|js|mjs|map|png|jpe?g|svg|webp|ico|woff2?|json|txt)$/i.test(
    pathname
  );
}

function fromB64url(s) {
  const pad = s.length % 4 === 0 ? "" : "=".repeat(4 - (s.length % 4));
  const bin = atob(String(s).replace(/-/g, "+").replace(/_/g, "/") + pad);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) {
    bytes[i] = bin.charCodeAt(i);
  }
  return bytes;
}

async function hmacHex(secret, text) {
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const sig = await crypto.subtle.sign(
    "HMAC",
    key,
    new TextEncoder().encode(text)
  );
  return [...new Uint8Array(sig)]
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

async function verifyCookie(secret, token) {
  const parts = String(token || "").split(".");
  if (parts.length !== 3 || parts[0] !== "v1") {
    return false;
  }
  const [, body, sig] = parts;
  const expect = await hmacHex(secret, `v1.${body}`);
  if (expect.length !== sig.length || expect !== sig) {
    return false;
  }
  try {
    const json = new TextDecoder().decode(fromB64url(body));
    const payload = JSON.parse(json);
    if (!payload?.email || !Number.isFinite(payload.exp)) {
      return false;
    }
    if (payload.exp * 1000 < Date.now()) {
      return false;
    }
    if (payload.exp > Date.now() / 1000 + TOKEN_TTL_SEC + 60) {
      return false;
    }
    return true;
  } catch {
    return false;
  }
}

function readCookie(header, name) {
  const raw = String(header || "");
  const parts = raw.split(";");
  for (const part of parts) {
    const [k, ...rest] = part.trim().split("=");
    if (k === name) {
      return rest.join("=");
    }
  }
  return "";
}

export default async function middleware(request) {
  const url = new URL(request.url);
  if (isPublicPath(url.pathname)) {
    return;
  }

  const secret = String(process.env.SITE_GATE_SECRET || "").trim();
  if (!secret) {
    const login = new URL("/login", url.origin);
    login.searchParams.set("next", url.pathname);
    login.searchParams.set("setup", "1");
    return Response.redirect(login, 302);
  }

  const token = readCookie(request.headers.get("cookie"), "mc_site_gate");
  if (await verifyCookie(secret, token)) {
    return;
  }

  const login = new URL("/login", url.origin);
  login.searchParams.set("next", url.pathname + url.search);
  return Response.redirect(login, 302);
}
