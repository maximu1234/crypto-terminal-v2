import { restDelete } from "./supabase-rest.js";
import {
  claimAlertById,
  fetchTelegramChatId
} from "./alerts-db.js";
import {
  formatAlertMessage,
  sendTelegramMessage
} from "./telegram.js";

/**
 * Атомарно «забирает» алерт, шлёт Telegram, удаляет строку.
 * Возвращает false, если алерт уже обработан другим процессом.
 */
export async function executeAlertTrigger(alertId) {

  const claimed = await claimAlertById(alertId);

  if (!claimed) {
    return { ok: false, reason: "not_claimed" };
  }

  const chatId =
    await fetchTelegramChatId(claimed.user_id);

  let telegram = false;

  if (chatId != null) {
    telegram = await sendTelegramMessage(
      chatId,
      formatAlertMessage({
        symbol: claimed.symbol,
        price: claimed.price,
        tf: claimed.tf
      })
    );
  }

  try{
    await restDelete(
      `price_alerts?id=eq.${encodeURIComponent(alertId)}`
    );
  }catch(err){
    console.warn(
      "execute trigger delete:",
      err.message
    );
  }

  return {
    ok: true,
    telegram,
    symbol: claimed.symbol,
    shape_id: claimed.shape_id
  };

}
