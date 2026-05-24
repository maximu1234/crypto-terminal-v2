import { getWorkerConfig } from "./config.js";

export function telegramConfigured() {

  return !!getWorkerConfig().telegramBotToken;

}

export async function sendTelegramMessage(chatId, text) {

  const token = getWorkerConfig().telegramBotToken;

  if (!token || chatId == null) {
    return false;
  }

  const res = await fetch(
    `https://api.telegram.org/bot${token}/sendMessage`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: chatId,
        text,
        disable_web_page_preview: true
      })
    }
  );

  if (!res.ok) {
    const body = await res.text();
    console.warn("telegram send:", res.status, body);
    return false;
  }

  return true;

}

export function formatAlertMessage(alert) {

  const sym = alert.symbol?.endsWith("USDT")
    ? `${alert.symbol.replace(/USDT$/, "")}/USDT`
    : alert.symbol;

  const tf = alert.tf || "—";
  const price = Number(alert.price);

  return `${sym} · ${tf}\nЦена пересекла уровень ${price}`;

}
