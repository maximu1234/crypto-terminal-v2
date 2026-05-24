import { createClient } from "@supabase/supabase-js";
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
    "POST, OPTIONS"
  );
  res.setHeader(
    "Access-Control-Allow-Headers",
    "Authorization, Content-Type"
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

export async function verifyUserToken(token) {

  const cfg = getWorkerConfig();

  if (
    !cfg.supabaseUrl ||
    !cfg.supabaseAnonKey
  ) {
    return null;
  }

  const sb = createClient(
    cfg.supabaseUrl,
    cfg.supabaseAnonKey,
    {
      auth: {
        persistSession: false,
        autoRefreshToken: false
      }
    }
  );

  const { data, error } =
    await sb.auth.getUser(token);

  if (
    error ||
    !data?.user
  ) {
    return null;
  }

  return data.user;

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
