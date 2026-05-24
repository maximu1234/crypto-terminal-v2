const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;

export function telegramConfigured() {

  return !!BOT_TOKEN;

}

export async function sendTelegramMessage(chatId, text) {

  if (!BOT_TOKEN || chatId == null) {
    return false;
  }

  const res = await fetch(
    `https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`,
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
