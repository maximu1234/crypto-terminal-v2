import { getWorkerConfig } from "./config.js";

let cached = null;

/**
 * @returns {Promise<{ username: string, link: string } | null>}
 */
export async function getTelegramBotInfo() {

  if (cached) {
    return cached;
  }

  const token =
    getWorkerConfig().telegramBotToken;

  if (!token) {
    return null;
  }

  const res =
    await fetch(
      `https://api.telegram.org/bot${token}/getMe`
    );

  if (!res.ok) {
    console.warn("telegram getMe:", res.status);
    return null;
  }

  const json =
    await res.json();

  const username =
    json?.result?.username;

  if (!username) {
    return null;
  }

  cached = {
    username,
    link: `https://t.me/${username}`
  };

  return cached;

}
