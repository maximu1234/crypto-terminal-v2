import { getWorkerConfig } from "./config.js";

export function setCors(res, req) {

  const origin =
    req.headers.origin || "*";

  res.setHeader(
    "Access-Control-Allow-Origin",
    origin
  );
  res.setHeader(
    "Vary",
    "Origin"
  );
  res.setHeader(
    "Access-Control-Allow-Methods",
    "GET, POST, OPTIONS"
  );
  res.setHeader(
    "Access-Control-Allow-Headers",
    "Authorization, Content-Type"
  );

}

/** Публичные GET (ссылка на бота) — без Authorization. */
export function setPublicCors(res, req) {

  const origin =
    req.headers.origin || "*";

  res.setHeader(
    "Access-Control-Allow-Origin",
    origin
  );
  res.setHeader("Vary", "Origin");
  res.setHeader(
    "Access-Control-Allow-Methods",
    "GET, OPTIONS"
  );

}

export function readJsonBody(req) {

  return new Promise((resolve, reject) => {

    let data = "";

    req.on("data", chunk => {
      data += chunk;
      if (data.length > 1e6) {
        reject(new Error("body too large"));
      }
    });

    req.on("end", () => {
      try{
        resolve(
          data
            ? JSON.parse(data)
            : {}
        );
      }catch{
        reject(new Error("invalid json"));
      }
    });

    req.on("error", reject);

  });

}

/** @type {Map<string, { user: { id: string, email?: string }, expiresAt: number }>} */
const verifyUserCache =
  new Map();

/** Tokens already confirmed via /auth/v1/user — trust local JWT exp until expiry. */
/** @type {Map<string, { user: { id: string, email?: string }, expMs: number }>} */
const authConfirmedTokens =
  new Map();

const VERIFY_USER_TTL_MS =
  30 *
  60 *
  1000;

const VERIFY_USER_CACHE_MAX =
  64;

const AUTH_CONFIRMED_MAX =
  128;

/**
 * Decode JWT payload without signature verify (egress cut after first Auth hit).
 * @param {string} token
 * @returns {{ sub?: string, email?: string, exp?: number } | null}
 */
function decodeJwtPayload(token) {

  const parts =
    String(token || "").split(".");

  if (parts.length < 2) {
    return null;
  }

  try{
    const json =
      Buffer.from(
        parts[1],
        "base64url"
      ).toString("utf8");
    const payload =
      JSON.parse(json);

    return payload &&
      typeof payload === "object"
      ? payload
      : null;
  }catch{
    try{
      const json =
        Buffer.from(
          parts[1].replace(/-/g, "+").replace(/_/g, "/"),
          "base64"
        ).toString("utf8");
      const payload =
        JSON.parse(json);

      return payload &&
        typeof payload === "object"
        ? payload
        : null;
    }catch{
      return null;
    }
  }

}

function rememberVerifiedUser(
  token,
  user
) {

  if (
    verifyUserCache.size >=
    VERIFY_USER_CACHE_MAX
  ) {
    const first =
      verifyUserCache.keys().next().value;

    if (first) {
      verifyUserCache.delete(first);
    }
  }

  verifyUserCache.set(
    token,
    {
      user,
      expiresAt:
        Date.now() +
        VERIFY_USER_TTL_MS
    }
  );

  const payload =
    decodeJwtPayload(token);
  const expSec =
    Number(payload?.exp);
  const expMs =
    Number.isFinite(expSec) &&
    expSec > 0
      ? expSec * 1000
      : Date.now() + VERIFY_USER_TTL_MS;

  if (
    authConfirmedTokens.size >=
    AUTH_CONFIRMED_MAX
  ) {
    const first =
      authConfirmedTokens.keys().next().value;

    if (first) {
      authConfirmedTokens.delete(first);
    }
  }

  authConfirmedTokens.set(
    token,
    {
      user,
      expMs
    }
  );

}

/**
 * Проверка JWT без @supabase/supabase-js (на Node 20 без ws не падает).
 * После первого /auth/v1/user — local JWT exp decode (remote status не бьёт Auth).
 * Короткий кэш 30 мин + authConfirmed до exp.
 */
export async function verifyUserToken(token) {

  const cfg = getWorkerConfig();

  if (
    !cfg.supabaseUrl ||
    !token
  ) {
    return null;
  }

  const cached =
    verifyUserCache.get(token);

  if (
    cached &&
    cached.expiresAt >
      Date.now()
  ) {
    return cached.user;
  }

  const confirmed =
    authConfirmedTokens.get(token);

  if (
    confirmed &&
    confirmed.expMs >
      Date.now() + 5000
  ) {
    rememberVerifiedUser(
      token,
      confirmed.user
    );
    return confirmed.user;
  }

  /*
   * Fast path: token previously Auth-confirmed is gone from map, but payload
   * still has sub+exp — only safe after we have seen this token via Auth once
   * in this process OR we accept first-seen decode only when confirmed map
   * had it. For brand-new tokens always hit Auth below.
   *
   * If confirmed expired / missing → Auth.
   */

  const apikey =
    cfg.supabaseAnonKey ||
    cfg.supabaseServiceRoleKey;

  if (!apikey) {
    return null;
  }

  const base =
    cfg.supabaseUrl.replace(/\/$/, "");

  try{
    const res =
      await fetch(
        `${base}/auth/v1/user`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            apikey
          }
        }
      );

    if (!res.ok) {
      verifyUserCache.delete(token);
      authConfirmedTokens.delete(token);
      return null;
    }

    const data =
      await res.json();

    if (!data?.id) {
      return null;
    }

    const user = {
      id: data.id,
      email: data.email
    };

    rememberVerifiedUser(
      token,
      user
    );

    return user;

  }catch{
    return null;
  }

}

export async function verifyUserFromRequest(req) {

  const auth =
    req.headers.authorization || "";
  const token =
    auth.startsWith("Bearer ")
      ? auth.slice(7).trim()
      : "";

  if (!token) {
    return null;
  }

  return verifyUserToken(token);

}
