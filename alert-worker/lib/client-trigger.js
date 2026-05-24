import { restGet } from "./supabase-rest.js";
import {
  executeAlertTrigger,
  notifyTelegramOnly
} from "./execute-trigger.js";
import {
  readJsonBody,
  setCors,
  verifyUserFromRequest
} from "./client-http.js";

function notifyPayloadFromBody(body) {

  const sym =
    String(body.symbol || "").trim().toUpperCase();
  const price =
    Number(body.price);

  if (
    !sym ||
    !Number.isFinite(price)
  ) {
    return null;
  }

  return {
    symbol: sym,
    price,
    tf: body.tf
  };

}

/**
 * POST /trigger — браузер: Telegram + удаление (service role).
 * Если строки уже нет — Telegram по symbol/price/tf из тела.
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

    let owned;

    try{
      owned = await restGet(
        "price_alerts?select=id&id=eq." +
        encodeURIComponent(alertId) +
        "&user_id=eq." +
        encodeURIComponent(user.id)
      );
    }catch(err){
      res.writeHead(500, { "Content-Type": "application/json" });
      res.end(JSON.stringify({
        ok: false,
        error: err.message
      }));
      return true;
    }

    if (!owned?.length) {

      const payload =
        notifyPayloadFromBody(body);

      if (payload) {
        const result =
          await notifyTelegramOnly(
            user.id,
            payload
          );

        res.writeHead(200, { "Content-Type": "application/json" });
        res.end(JSON.stringify(result));
        return true;
      }

      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify({
        ok: false,
        skipped: "not_found"
      }));
      return true;

    }

    try{
      let result =
        await executeAlertTrigger(alertId);

      if (
        !result.ok &&
        result.reason === "not_claimed"
      ) {
        const payload =
          notifyPayloadFromBody(body);

        if (payload) {
          result =
            await notifyTelegramOnly(
              user.id,
              payload
            );
        }

      }

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
      encodeURIComponent(sid)
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

    const payload =
      notifyPayloadFromBody(body);

    if (payload) {
      const result =
        await notifyTelegramOnly(
          user.id,
          payload
        );

      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify(result));
      return true;
    }

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
