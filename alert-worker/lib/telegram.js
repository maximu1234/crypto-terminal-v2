import { getWorkerConfig } from "./config.js";

const DEFAULT_SITE_URL =
"https://crypto-terminal-v2.vercel.app";

export function telegramConfigured() {

  return !!getWorkerConfig().telegramBotToken;

}

export async function sendTelegramMessage(
chatId,
text,
options = {}
) {

  const token = getWorkerConfig().telegramBotToken;

  if (!token || chatId == null) {
    return false;
  }

  const body = {
    chat_id: chatId,
    text,
    disable_web_page_preview: true
  };

  if (options.parse_mode) {
    body.parse_mode = options.parse_mode;
  }

  const res = await fetch(
    `https://api.telegram.org/bot${token}/sendMessage`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body)
    }
  );

  if (!res.ok) {
    const errBody = await res.text();
    console.warn("telegram send:", res.status, errBody);
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
  "D": "1D",
  "W": "W"
};

function escapeHtml(value) {

  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");

}

export function getSitePublicUrl() {

  const raw =
    getWorkerConfig().sitePublicUrl ||
    "";

  if (!raw) {
    return DEFAULT_SITE_URL;
  }

  const trimmed =
    raw.replace(/\/$/, "");

  if (
    trimmed.startsWith("http://") ||
    trimmed.startsWith("https://")
  ) {
    return trimmed;
  }

  return `https://${trimmed}`;

}

function symbolForCoinsUrl(symbol) {

  const raw =
    String(symbol || "").trim().toUpperCase();

  if (!raw) {
    return "";
  }

  return raw.replace(/\.P$/i, "");

}

export function buildCoinsChartUrl(symbol, tf) {

  const sym =
    symbolForCoinsUrl(symbol);

  if (!sym) {
    return "";
  }

  const params =
    new URLSearchParams({
      symbol: sym,
      tf: String(tf || "60")
    });

  return `${getSitePublicUrl()}/terminal.html?${params}`;

}

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
  const chartUrl =
    buildCoinsChartUrl(
      alert.symbol,
      tfRaw
    );

  const symHtml =
    chartUrl
      ? `<a href="${escapeHtml(chartUrl)}">${escapeHtml(sym)}</a>`
      : escapeHtml(sym);

  return {
    text: (
      `${symHtml} - ${escapeHtml(tf)}\n` +
      "Цена пересекла уровень\n" +
      escapeHtml(price)
    ),
    parse_mode: "HTML"
  };

}
