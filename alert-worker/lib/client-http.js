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

const VERIFY_USER_TTL_MS =
  5 *
  60 *
  1000;

const VERIFY_USER_CACHE_MAX =
  64;

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

}

/**
 * Проверка JWT без @supabase/supabase-js (на Node 20 без ws не падает).
 * Кэш 5 мин — remote reconnect/status не бьют Auth на каждый запрос.
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
