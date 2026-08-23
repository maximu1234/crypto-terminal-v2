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

export function buildCoinsChartUrl(
symbol,
tf,
exchangeId
) {

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

  const ex =
    String(
      exchangeId ||
      ""
    ).trim().toLowerCase();

  if (
    ex ===
    "bybit" ||
    ex ===
    "bingx"
  ) {
    params.set(
      "exchange",
      ex
    );
  }

  /* open.html → desktop if running, else web terminal.html */
  return `${getSitePublicUrl()}/open.html?${params}`;

}

function formatAlertTicker(
symbol,
exchangeId
){

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

  const ex =
    String(
      exchangeId ||
      "bybit"
    ).trim().toLowerCase();

  if (
    ex ===
    "bybit" &&
    raw.endsWith("USDT")
  ) {
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

function formatIndicatorLevelForTelegram(
n
){

  if (!Number.isFinite(n)) {
    return "—";
  }

  return n.toFixed(2);

}

function alertCrossHeadline(
source
){

  const src =
    String(
      source ||
      ""
    ).trim().toLowerCase();

  if (
    src ===
    "rsi"
  ) {
    return "Цена пересекла RSI";
  }

  if (
    src ===
    "macd"
  ) {
    return "Цена пересекла MACD";
  }

  return "Цена пересекла уровень";

}

const EXCHANGE_LABELS = {
  bybit: "Bybit",
  bingx: "BingX"
};

export function exchangeLabelForTelegram(
exchangeId
){

  const id =
    String(
      exchangeId ||
      "bybit"
    ).trim().toLowerCase();

  return EXCHANGE_LABELS[id] ||
    EXCHANGE_LABELS.bybit;

}

export function formatAlertMessage(alert) {

  const exchangeId =
    alert.exchange_id ||
    alert.exchangeId ||
    "bybit";
  const sym =
    formatAlertTicker(
      alert.symbol,
      exchangeId
    );
  const tfRaw =
    String(alert.tf || "60");
  const tf =
    TF_LABELS[tfRaw] || tfRaw;
  const source =
    alert.source ||
    alert.kind ||
    "";
  const isIndicator =
    String(
      source
    ).trim().toLowerCase() ===
    "rsi" ||
    String(
      source
    ).trim().toLowerCase() ===
    "macd";
  const price =
    isIndicator
      ? formatIndicatorLevelForTelegram(
        Number(alert.price)
      )
      : formatPriceForTelegram(
        Number(alert.price)
      );
  const exchangeLabel =
    exchangeLabelForTelegram(
      exchangeId
    );
  const chartUrl =
    buildCoinsChartUrl(
      alert.symbol,
      tfRaw,
      exchangeId
    );

  const symHtml =
    chartUrl
      ? `<a href="${escapeHtml(chartUrl)}">${escapeHtml(sym)}</a>`
      : escapeHtml(sym);

  return {
    text: (
      `${symHtml} - ${escapeHtml(tf)}\n` +
      `${escapeHtml(alertCrossHeadline(source))}\n` +
      `${escapeHtml(price)} (${escapeHtml(exchangeLabel)})`
    ),
    parse_mode: "HTML"
  };

}
