import { getWorkerConfig, readEnv } from "./config.js";
import {
  readJsonBody,
  setPublicCors
} from "./client-http.js";
import { sendTelegramMessage } from "./telegram.js";
import { getTelegramBotInfo } from "./telegram-bot-info.js";

function resolvePublicBaseUrl() {

  const explicit =
    readEnv("TELEGRAM_WEBHOOK_BASE_URL") ||
    readEnv("ALERT_WORKER_PUBLIC_URL");

  if (explicit) {
    return explicit.replace(/\/$/, "");
  }

  const railway =
    readEnv("RAILWAY_PUBLIC_DOMAIN");

  if (railway) {
    return `https://${railway.replace(/^https?:\/\//, "")}`;
  }

  return "";

}

export function formatChatIdReply(chatId) {

  return (
    "Ваш Chat ID для Multichart:\n\n" +
    `${chatId}\n\n` +
    "Скопируйте число → на сайте «Алерты» → поле Chat ID → «Сохранить»."
  );

}

function isChatIdCommand(text) {

  const t =
    String(text || "").trim().toLowerCase();

  return (
    t === "/start" ||
    t.startsWith("/start ") ||
    t === "/chatid" ||
    t === "/id"
  );

}

function webhookSecretOk(req) {

  const expected =
    readEnv("TELEGRAM_WEBHOOK_SECRET");

  if (!expected) {
    return true;
  }

  const got =
    req.headers["x-telegram-bot-api-secret-token"];

  return got === expected;

}

/**
 * Регистрирует webhook на Railway (один раз при старте, если известен публичный URL).
 */
export async function ensureTelegramWebhook() {

  if (readEnv("TELEGRAM_DISABLE_AUTO_WEBHOOK") === "1") {
    return;
  }

  const cfg =
    getWorkerConfig();

  if (!cfg.ready) {
    return;
  }

  const base =
    resolvePublicBaseUrl();

  if (!base) {
    console.log(
      "telegram webhook: skip (no TELEGRAM_WEBHOOK_BASE_URL / RAILWAY_PUBLIC_DOMAIN)"
    );
    return;
  }

  const url =
    `${base}/telegram/webhook`;
  const secret =
    readEnv("TELEGRAM_WEBHOOK_SECRET") || undefined;

  const res =
    await fetch(
      `https://api.telegram.org/bot${cfg.telegramBotToken}/setWebhook`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          url,
          secret_token: secret,
          allowed_updates: ["message"],
          drop_pending_updates: false
        })
      }
    );

  const body =
    await res.json().catch(() => ({}));

  if (!res.ok || body.ok === false) {
    console.warn(
      "telegram setWebhook:",
      res.status,
      body.description || body
    );
    return;
  }

  console.log(`telegram webhook ok → ${url}`);

}

/**
 * GET /telegram/info — ссылка на бота для страницы «Алерты».
 */
export async function handleTelegramInfo(
  req,
  res
) {

  const path =
    (req.url || "").split("?")[0];

  if (path !== "/telegram/info") {
    return false;
  }

  setPublicCors(res, req);

  if (req.method === "OPTIONS") {
    res.writeHead(204);
    res.end();
    return true;
  }

  if (req.method !== "GET") {
    res.writeHead(405);
    res.end("Method not allowed");
    return true;
  }

  const info =
    await getTelegramBotInfo();

  res.writeHead(200, {
    "Content-Type": "application/json"
  });
  res.end(JSON.stringify({
    ok: !!info,
    username: info?.username ?? null,
    link: info?.link ?? null
  }));

  return true;

}

/**
 * POST /telegram/webhook — ответ бота на /start с chat id.
 */
export async function handleTelegramWebhook(
  req,
  res
) {

  const path =
    (req.url || "").split("?")[0];

  if (path !== "/telegram/webhook") {
    return false;
  }

  if (req.method !== "POST") {
    res.writeHead(405);
    res.end();
    return true;
  }

  if (!webhookSecretOk(req)) {
    res.writeHead(403);
    res.end();
    return true;
  }

  if (!getWorkerConfig().telegramBotToken) {
    res.writeHead(503);
    res.end();
    return true;
  }

  let update;

  try{
    update = await readJsonBody(req);
  }catch{
    res.writeHead(400);
    res.end();
    return true;
  }

  const msg =
    update?.message;

  if (
    msg?.chat?.id != null &&
    isChatIdCommand(msg.text)
  ) {

    const chatId =
      msg.chat.id;

    await sendTelegramMessage(
      chatId,
      formatChatIdReply(chatId)
    );

  }

  res.writeHead(200, {
    "Content-Type": "application/json"
  });
  res.end(JSON.stringify({ ok: true }));

  return true;

}
