import { createClient } from "@supabase/supabase-js";
import WebSocket from "ws";
import { getWorkerConfig } from "./config.js";
import {
  restGet,
  restPatch,
  restDelete,
  restPatchReturning
} from "./supabase-rest.js";

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
      `user_settings?select=user_id,telegram_chat_id,alerts_cloud_disabled&user_id=in.(${inList})&telegram_chat_id=not.is.null`
    );
  }catch(err){
    console.warn("fetch settings (REST):", err.message);
    return [];
  }

  const chatByUser = new Map(
    (settings || [])
      .filter(s => !s.alerts_cloud_disabled)
      .map(s => [s.user_id, Number(s.telegram_chat_id)])
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

/**
 * Забирает алерт (triggered_at), чтобы не сработало дважды (браузер + worker).
 * @returns {object|null} строка price_alerts
 */
export async function claimAlertById(alertId) {

  const cfg = getWorkerConfig();

  if (!cfg.ready || !alertId) {
    return null;
  }

  const triggeredAt =
    new Date().toISOString();

  try{
    const rows = await restPatchReturning(
      "price_alerts?id=eq." +
      encodeURIComponent(alertId) +
      "&triggered_at=is.null",
      { triggered_at: triggeredAt }
    );

    return rows?.[0] || null;
  }catch(err){
    console.warn(
      "claim alert:",
      err.message
    );
    return null;
  }

}

export async function fetchTelegramChatId(userId) {

  const cfg = getWorkerConfig();

  if (
    !cfg.ready ||
    !userId
  ) {
    return null;
  }

  try{
    const rows = await restGet(
      "user_settings?select=telegram_chat_id&user_id=eq." +
      encodeURIComponent(userId) +
      "&telegram_chat_id=not.is.null"
    );

    const id = rows?.[0]?.telegram_chat_id;

    return id != null ? Number(id) : null;
  }catch(err){
    console.warn(
      "fetch telegram chat:",
      err.message
    );
    return null;
  }

}

export async function markAlertTriggered(alertId) {

  const { executeAlertTrigger } =
    await import("./execute-trigger.js");

  const result =
    await executeAlertTrigger(alertId);

  return result.ok;

}
