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

const TF_LABELS = {
  "1": "1m",
  "5": "5m",
  "15": "15m",
  "60": "1h",
  "240": "4h",
  "D": "1D"
};

function formatAlertTicker(symbol) {

  const raw =
    String(symbol || "").trim().toUpperCase();

  if (!raw) {
    return "—";
  }

  if (raw.includes("/")) {
    return raw;
  }

  if (raw.endsWith(".P")) {
    return raw;
  }

  if (raw.endsWith("USDT")) {
    return `${raw}.P`;
  }

  return raw;

}

function formatPriceForTelegram(n) {

  if (!Number.isFinite(n)) {
    return "—";
  }

  return n.toFixed(4);

}

export function formatAlertMessage(alert) {

  const sym =
    formatAlertTicker(alert.symbol);
  const tfRaw =
    String(alert.tf || "60");
  const tf =
    TF_LABELS[tfRaw] || tfRaw;
  const price =
    formatPriceForTelegram(
      Number(alert.price)
    );

  return (
    `${sym} - ${tf}\n` +
    "Цена пересекла уровень\n" +
    price
  );

}
