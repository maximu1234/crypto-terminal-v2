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

function triggerBodyForNotify(body) {

  const sym =
    String(body.symbol || "").trim().toUpperCase();
  const sid =
    String(body.shape_id || body.shapeId || "").trim();
  const price =
    Number(body.price);

  if (
    !sym ||
    !sid ||
    !Number.isFinite(price)
  ) {
    return null;
  }

  return {
    symbol: sym,
    shape_id: sid,
    price,
    tf: body.tf,
    source: body.source,
    exchange_id:
      body.exchange_id ||
      body.exchangeId
  };

}

async function finishAlreadyHandled(
  user,
  body,
  res
) {

  const payload =
    triggerBodyForNotify(body);

  if (!payload) {
    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(JSON.stringify({
      ok: true,
      telegram: false,
      skipped: "already_handled"
    }));
    return true;
  }

  const notify =
    await notifyTelegramOnly(
      user.id,
      payload
    );

  res.writeHead(200, { "Content-Type": "application/json" });
  res.end(JSON.stringify({
    ok: true,
    telegram: !!notify.telegram,
    skipped: "already_handled",
    notify: notify.skipped || notify.reason || null
  }));
  return true;

}

/**
 * POST /trigger — браузер: DELETE + Telegram (service role).
 * Если строка уже удалена worker'ом — дослать Telegram через notifyTelegramOnly.
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
      const triggerMeta = {
        trigger_price: Number(body.price)
      };

      const result =
        await executeAlertTrigger(
          alertId,
          triggerMeta
        );

      if (
        !result.ok &&
        result.reason === "not_claimed"
      ) {
        return finishAlreadyHandled(
          user,
          body,
          res
        );
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
    return finishAlreadyHandled(
      user,
      body,
      res
    );
  }

  const triggerMeta = {
    trigger_price: Number(body.price)
  };

  const result =
    await executeAlertTrigger(
      rows[0].id,
      triggerMeta
    );

  if (
    !result.ok &&
    result.reason === "not_claimed"
  ) {
    return finishAlreadyHandled(
      user,
      body,
      res
    );
  }

  res.writeHead(200, { "Content-Type": "application/json" });
  res.end(JSON.stringify(result));
  return true;

}
