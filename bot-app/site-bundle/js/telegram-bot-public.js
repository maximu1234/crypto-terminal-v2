/**
 * Публичный @username бота (не секрет). Меняйте при смене бота в BotFather.
 * Ссылка на странице «Алерты» работает без запроса к worker.
 */
export const TELEGRAM_BOT_USERNAME =
"multichart_alerts_bot";

export function getTelegramBotUrl() {

  const u =
    String(TELEGRAM_BOT_USERNAME || "")
      .trim()
      .replace(/^@/, "");

  return u
    ? `https://t.me/${u}`
    : "";

}
