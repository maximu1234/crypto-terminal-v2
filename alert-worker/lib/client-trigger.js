import { createClient } from "@supabase/supabase-js";
import { getWorkerConfig } from "./config.js";
import { restGet } from "./supabase-rest.js";
import { executeAlertTrigger } from "./execute-trigger.js";

function setCors(res, req) {

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

function readJsonBody(req) {

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

async function verifyUserToken(token) {

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

/**
 * POST /trigger — браузер сообщает о срабатывании (Telegram + delete с service role).
 */
export async function handleClientTrigger(
  req,
  res
) {

  const path =
    (req.url || "").split("?")[0];

  if (path !== "/trigger") {
    return false;
  }

  setCors(res, req);

  if (req.method === "OPTIONS") {
    res.writeHead(204);
    res.end();
    return true;
  }

  if (req.method !== "POST") {
    res.writeHead(405);
    res.end("Method not allowed");
    return true;
  }

  const auth =
    req.headers.authorization || "";
  const token =
    auth.startsWith("Bearer ")
      ? auth.slice(7).trim()
      : "";

  if (!token) {
    res.writeHead(401, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ ok: false, error: "missing_token" }));
    return true;
  }

  const user =
    await verifyUserToken(token);

  if (!user) {
    res.writeHead(401, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ ok: false, error: "invalid_token" }));
    return true;
  }

  let body;

  try{
    body = await readJsonBody(req);
  }catch(err){
    res.writeHead(400, { "Content-Type": "application/json" });
    res.end(JSON.stringify({
      ok: false,
      error: err.message
    }));
    return true;
  }

  const sym =
    String(body.symbol || "").trim().toUpperCase();
  const sid =
    String(body.shape_id || body.shapeId || "").trim();

  if (!sym || !sid) {
    res.writeHead(400, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ ok: false, error: "bad_body" }));
    return true;
  }

  let rows;

  try{
    rows = await restGet(
      "price_alerts?select=id&user_id=eq." +
      encodeURIComponent(user.id) +
      "&symbol=eq." +
      encodeURIComponent(sym) +
      "&shape_id=eq." +
      encodeURIComponent(sid) +
      "&triggered_at=is.null"
    );
  }catch(err){
    res.writeHead(500, { "Content-Type": "application/json" });
    res.end(JSON.stringify({
      ok: false,
      error: err.message
    }));
    return true;
  }

  if (!rows?.length) {
    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(JSON.stringify({
      ok: true,
      skipped: "not_found"
    }));
    return true;
  }

  const result =
    await executeAlertTrigger(rows[0].id);

  res.writeHead(200, { "Content-Type": "application/json" });
  res.end(JSON.stringify(result));
  return true;

}
