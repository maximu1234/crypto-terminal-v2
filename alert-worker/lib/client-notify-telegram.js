import { notifyTelegramOnly } from "./execute-trigger.js";
import {
  readJsonBody,
  setCors,
  verifyUserFromRequest
} from "./client-http.js";

/**
 * POST /notify-telegram — строка уже удалена worker'ом, дослать Telegram.
 */
export async function handleClientNotifyTelegram(
  req,
  res
) {

  const path =
    (req.url || "").split("?")[0];

  if (path !== "/notify-telegram") {
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

  const result =
    await notifyTelegramOnly(
      user.id,
      body
    );

  res.writeHead(200, { "Content-Type": "application/json" });
  res.end(JSON.stringify(result));
  return true;

}
