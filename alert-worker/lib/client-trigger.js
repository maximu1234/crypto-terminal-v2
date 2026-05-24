import { restGet } from "./supabase-rest.js";
import { executeAlertTrigger } from "./execute-trigger.js";
import {
  readJsonBody,
  setCors,
  verifyUserFromRequest
} from "./client-http.js";

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

  const user =
    await verifyUserFromRequest(req);

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

  const alertId =
    String(
      body.alert_id ||
      body.alertId ||
      ""
    ).trim();

  if (alertId) {

    try{
      const result =
        await executeAlertTrigger(alertId);

      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify(result));
      return true;
    }catch(err){
      res.writeHead(500, { "Content-Type": "application/json" });
      res.end(JSON.stringify({
        ok: false,
        error: err.message
      }));
      return true;
    }

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
      ok: false,
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
