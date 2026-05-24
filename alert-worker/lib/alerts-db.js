import { createClient } from "@supabase/supabase-js";
import WebSocket from "ws";
import { getWorkerConfig } from "./config.js";
import { restGet, restPatch, restDelete } from "./supabase-rest.js";

let client = null;

export function getSupabaseAdmin() {

  const cfg = getWorkerConfig();

  if (!cfg.ready) {
    throw new Error(
      `Missing env: ${cfg.missing.join(", ")}`
    );
  }

  if (!client) {
    client = createClient(
      cfg.supabaseUrl,
      cfg.supabaseServiceRoleKey,
      {
        auth: {
          persistSession: false,
          autoRefreshToken: false
        },
        realtime: {
          WebSocket
        }
      }
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

  const cfg = getWorkerConfig();

  if (!cfg.ready) {
    return [];
  }

  let alerts;
  let settings;

  try{
    alerts = await restGet(
      "price_alerts?select=id,user_id,symbol,shape_id,price,tf&triggered_at=is.null"
    );
  }catch(err){
    console.warn("fetch alerts (REST):", err.message);
    return [];
  }

  if (!alerts?.length) {
    return [];
  }

  const userIds = [...new Set(alerts.map(a => a.user_id))];
  const inList = userIds.join(",");

  try{
    settings = await restGet(
      `user_settings?select=user_id,telegram_chat_id&user_id=in.(${inList})&telegram_chat_id=not.is.null`
    );
  }catch(err){
    console.warn("fetch settings (REST):", err.message);
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

/** Для /health — почему alerts может быть 0 */
export async function fetchAlertDiagnostics() {

  const cfg = getWorkerConfig();

  if (!cfg.ready) {
    return {
      activeInDb: 0,
      withTelegramChat: 0,
      loadedForWorker: 0
    };
  }

  let alerts;
  let settings;

  try{
    alerts = await restGet(
      "price_alerts?select=user_id&triggered_at=is.null"
    );
  }catch(err){
    return {
      activeInDb: 0,
      withTelegramChat: 0,
      loadedForWorker: 0,
      alertsError: err.message
    };
  }

  const activeInDb = alerts?.length || 0;

  if (!activeInDb) {
    return {
      activeInDb: 0,
      withTelegramChat: 0,
      loadedForWorker: 0
    };
  }

  const userIds = [...new Set(alerts.map(a => a.user_id))];
  const inList = userIds.join(",");

  try{
    settings = await restGet(
      `user_settings?select=user_id,telegram_chat_id&user_id=in.(${inList})&telegram_chat_id=not.is.null`
    );
  }catch(err){
    return {
      activeInDb,
      withTelegramChat: 0,
      loadedForWorker: 0,
      settingsError: err.message
    };
  }

  const usersWithChat = new Set(
    (settings || []).map(s => s.user_id)
  );

  let withTelegramChat = 0;

  for (const row of alerts) {
    if (usersWithChat.has(row.user_id)) {
      withTelegramChat += 1;
    }
  }

  const loaded = await fetchTelegramAlerts();

  return {
    activeInDb,
    withTelegramChat,
    loadedForWorker: loaded.length
  };

}

export async function markAlertTriggered(alertId) {

  const cfg = getWorkerConfig();

  if (!cfg.ready) {
    return false;
  }

  try{
    await restDelete(
      `price_alerts?id=eq.${encodeURIComponent(alertId)}`
    );
    return true;
  }catch(err){
    console.warn(
      "mark triggered (delete):",
      err.message
    );
  }

  const triggeredAt =
    new Date().toISOString();

  try{
    await restPatch(
      `price_alerts?id=eq.${encodeURIComponent(alertId)}`,
      { triggered_at: triggeredAt }
    );
    return true;
  }catch(err){
    console.warn(
      "mark triggered (patch):",
      err.message
    );
    return false;
  }

}
