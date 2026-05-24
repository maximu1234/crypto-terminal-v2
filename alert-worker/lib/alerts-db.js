import { createClient } from "@supabase/supabase-js";

function requireEnv(name) {

  const v = process.env[name];

  if (!v) {
    throw new Error(`Missing env: ${name}`);
  }

  return v;

}

let client = null;

export function getSupabaseAdmin() {

  if (!client) {
    client = createClient(
      requireEnv("SUPABASE_URL"),
      requireEnv("SUPABASE_SERVICE_ROLE_KEY"),
      { auth: { persistSession: false, autoRefreshToken: false } }
    );
  }

  return client;

}

/**
 * @returns {Promise<Array<{
 *   id: string,
 *   user_id: string,
 *   symbol: string,
 *   shape_id: string,
 *   price: number,
 *   tf: string,
 *   telegram_chat_id: number
 * }>>}
 */
export async function fetchTelegramAlerts() {

  const sb = getSupabaseAdmin();

  const { data: alerts, error: alertsErr } = await sb
    .from("price_alerts")
    .select("id, user_id, symbol, shape_id, price, tf")
    .is("triggered_at", null);

  if (alertsErr) {
    console.warn("fetch alerts:", alertsErr.message);
    return [];
  }

  if (!alerts?.length) {
    return [];
  }

  const userIds = [...new Set(alerts.map(a => a.user_id))];

  const { data: settings, error: setErr } = await sb
    .from("user_settings")
    .select("user_id, telegram_chat_id")
    .in("user_id", userIds)
    .not("telegram_chat_id", "is", null);

  if (setErr) {
    console.warn("fetch settings:", setErr.message);
    return [];
  }

  const chatByUser = new Map(
    (settings || []).map(s => [s.user_id, Number(s.telegram_chat_id)])
  );

  const out = [];

  for (const row of alerts) {

    const chatId = chatByUser.get(row.user_id);

    if (chatId == null) {
      continue;
    }

    out.push({
      id: row.id,
      user_id: row.user_id,
      symbol: row.symbol,
      shape_id: row.shape_id,
      price: Number(row.price),
      tf: row.tf || "60",
      telegram_chat_id: chatId
    });

  }

  return out;

}

export async function markAlertTriggered(alertId) {

  const sb = getSupabaseAdmin();

  const { error } = await sb
    .from("price_alerts")
    .update({ triggered_at: new Date().toISOString() })
    .eq("id", alertId);

  if (error) {
    console.warn("mark triggered:", error.message);
    return false;
  }

  return true;

}
