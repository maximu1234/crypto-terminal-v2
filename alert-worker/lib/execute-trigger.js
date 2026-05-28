import {
  restDeleteReturning
} from "./supabase-rest.js";
import {
  fetchTelegramChatId
} from "./alerts-db.js";
import {
  formatAlertMessage,
  sendTelegramMessage
} from "./telegram.js";
import {
isTelegramAlertDeduped,
markTelegramAlertSent
} from "./telegram-dedup.js";

/**
 * Удаляет активную строку, шлёт Telegram. Без «зависших» triggered_at.
 */
export async function executeAlertTrigger(alertId) {

  let rows;

  try{
    rows = await restDeleteReturning(
      "price_alerts?id=eq." +
      encodeURIComponent(alertId)
    );
  }catch(err){
    console.warn(
      "execute trigger delete:",
      err.message
    );
    return {
      ok: false,
      reason: "delete_failed",
      error: err.message
    };
  }

  if (!rows?.length) {
    return { ok: false, reason: "not_claimed" };
  }

  const claimed = rows[0];

  const chatId =
    await fetchTelegramChatId(claimed.user_id);

  let telegram = false;

  if (chatId != null) {

    if (
      isTelegramAlertDeduped(
        claimed.user_id,
        claimed.symbol,
        claimed.shape_id
      )
    ) {
      return {
        ok: true,
        telegram: false,
        skipped: "telegram_dedup",
        symbol: claimed.symbol,
        shape_id: claimed.shape_id
      };
    }

    const msg =
      formatAlertMessage({
        symbol: claimed.symbol,
        price: claimed.price,
        tf: claimed.tf
      });

    telegram = await sendTelegramMessage(
      chatId,
      msg.text,
      { parse_mode: msg.parse_mode }
    );

    if (telegram) {
      markTelegramAlertSent(
        claimed.user_id,
        claimed.symbol,
        claimed.shape_id
      );
    }

  }

  return {
    ok: true,
    telegram,
    symbol: claimed.symbol,
    shape_id: claimed.shape_id
  };

}

/**
 * Telegram без строки в price_alerts (браузер уже удалил).
 */
export async function notifyTelegramOnly(
  userId,
  alert
) {

  const sym =
    String(alert?.symbol || "").trim().toUpperCase();
  const price =
    Number(alert?.price);

  if (
    !sym ||
    !Number.isFinite(price)
  ) {
    return {
      ok: false,
      reason: "bad_body"
    };
  }

  const chatId =
    await fetchTelegramChatId(userId);

  if (chatId == null) {
    return {
      ok: true,
      telegram: false,
      reason: "no_chat"
    };
  }

  const shapeId =
    String(
      alert?.shape_id ||
      alert?.shapeId ||
      ""
    ).trim();

  if (
    shapeId &&
    isTelegramAlertDeduped(
      userId,
      sym,
      shapeId
    )
  ) {
    return {
      ok: true,
      telegram: false,
      skipped: "telegram_dedup"
    };
  }

  const msg =
    formatAlertMessage({
      symbol: sym,
      price,
      tf: alert?.tf
    });

  const telegram =
    await sendTelegramMessage(
      chatId,
      msg.text,
      { parse_mode: msg.parse_mode }
    );

  if (
    telegram &&
    shapeId
  ) {
    markTelegramAlertSent(
      userId,
      sym,
      shapeId
    );
  }

  return {
    ok: true,
    telegram
  };

}
